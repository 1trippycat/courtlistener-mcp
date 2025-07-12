# Jest Testing Setup Guide for TypeScript MCP Projects

This guide documents the testing setup and best practices learned from implementing comprehensive tests for the CourtListener MCP server.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Dependencies Setup](#dependencies-setup)
3. [Configuration Files](#configuration-files)
4. [Environment Variables](#environment-variables)
5. [Test Organization](#test-organization)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Security Testing Best Practices](#security-testing-best-practices)
8. [API Testing Patterns](#api-testing-patterns)

## Project Structure

```
project/
├── src/
│   └── index.ts              # Main application file
├── tests/
│   ├── setup.ts              # Test environment setup
│   ├── basic.test.ts         # Basic functionality tests
│   ├── security.test.ts      # Security and integration tests
│   └── security-standalone.test.ts  # Standalone security tests
├── .env                      # Environment variables (DO NOT COMMIT)
├── .env.example              # Example environment file
├── jest.config.cjs           # Jest configuration
├── tsconfig.json            # TypeScript config for app
├── tsconfig.test.json       # TypeScript config for tests
└── package.json             # Dependencies and scripts
```

## Dependencies Setup

### Required Dependencies

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/node": "^24.0.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.4.0",
    "typescript": "^5.8.3"
  },
  "dependencies": {
    "dotenv": "^17.2.0",
    "zod": "^3.25.76"
  }
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:security": "jest tests/security.test.ts",
    "check-env": "node check-env.js"
  }
}
```

## Configuration Files

### Jest Configuration (jest.config.cjs)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
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
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 60000,  // Increased for API calls
  forceExit: true,
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Handle open handles from fetch requests
  detectOpenHandles: true,
  verbose: true
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
    "types": ["node", "jest"]
  },
  "include": ["tests/**/*", "src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

### Test Setup File (tests/setup.ts)

```typescript
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Mock global fetch for tests that don't need real API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock console methods to reduce test noise (optional)
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

// Set test environment
process.env.NODE_ENV = 'test';
```

## Environment Variables

### .env.example Template

```bash
# CourtListener MCP Server Environment Configuration
# Copy this file to .env and fill in your actual values

# API Configuration
COURTLISTENER_API_TOKEN=your_api_token_here

# Server Configuration
NODE_ENV=development
PORT=3000

# Security Configuration
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
REQUEST_TIMEOUT_MS=30000

# Development Configuration
LOG_LEVEL=debug
```

### Environment Check Script (check-env.js)

```javascript
#!/usr/bin/env node
import dotenv from 'dotenv';

dotenv.config();

console.log('Environment Configuration Check:');
console.log('================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`API_TOKEN: ${process.env.COURTLISTENER_API_TOKEN ? 'set (' + process.env.COURTLISTENER_API_TOKEN.length + ' characters)' : 'not set'}`);

if (!process.env.COURTLISTENER_API_TOKEN) {
    console.log('\n⚠️  WARNING: API token is not set!');
    console.log('Please add your API key to the .env file to test API functionality.');
} else {
    console.log('\n✅ Environment is configured for API testing!');
}
```

## Test Organization

### 1. Basic Tests (tests/basic.test.ts)
Simple unit tests that don't require external dependencies:

```typescript
describe('Basic Test Suite', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### 2. Security Tests (tests/security.test.ts)
Comprehensive security and integration tests:

```typescript
import { sanitizeString, validateApiToken, RateLimiter } from '../src/index.js';

const TEST_API_KEY = process.env.COURTLISTENER_API_TOKEN;
const EXAMPLE_API_KEY_FORMAT = 'a'.repeat(40);

describe('Security Utilities', () => {
  describe('sanitizeString', () => {
    test('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeString(input);
      expect(result).not.toContain('<script>');
    });
  });
});
```

### 3. Conditional API Tests
Tests that skip when no API key is available:

```typescript
describe('API Integration Tests', () => {
  beforeEach(() => {
    if (!TEST_API_KEY) {
      console.log('Skipping API tests - no API token set');
    }
  });

  test('should successfully make API calls', async () => {
    if (!TEST_API_KEY) {
      console.log('Skipping test - no API key available');
      return;
    }

    // Actual API test here
    const result = await makeApiCall();
    expect(result).toBeTruthy();
  });
});
```

## Common Issues & Solutions

### 1. Multiple Jest Configuration Files

**Problem**: Error "Multiple configurations found: jest.config.js and jest.config.cjs"

**Solution**:
```bash
# Remove duplicate configuration files
rm jest.config.js  # Keep only jest.config.cjs
```

Use only one Jest configuration file. Prefer `.cjs` for better CommonJS compatibility.

### 2. Import/Export Issues

**Problem**: Functions not being exported properly for testing

**Solution**: 
- Export functions individually: `export function functionName() {}`
- Avoid duplicate exports in the same file
- Use consistent import paths in tests

### 3. ES Modules vs CommonJS

**Problem**: `import.meta` syntax not supported in Jest/CommonJS

**Solution**:
```typescript
// Instead of: if (import.meta.url === `file://${process.argv[1]}`)
// Use: if (require.main === module) // For CommonJS
// Or: if (process.argv[1]?.endsWith('index.js')) // For ES modules in tests
```

### 4. Server Starting During Tests

**Problem**: MCP server starts when importing modules for testing

**Solution**:
```typescript
// Conditional server startup
if (process.argv[1]?.endsWith('index.js') && process.env.NODE_ENV !== 'test') {
  main().catch(console.error);
}
```

### 5. Open Handles Warning

**Problem**: Jest warns about open handles from fetch requests

**Solution**:
- Use `forceExit: true` in Jest config for test environment
- Add proper cleanup in tests
- Use `detectOpenHandles: true` to identify issues

### 6. Slow API Tests

**Problem**: Tests take long time due to real API calls and rate limiting

**Solution**:
- Increase Jest timeout: `testTimeout: 60000`
- Use conditional tests that skip when no API key
- Be patient - real API tests are valuable!
- Consider separate test suites for unit vs integration tests

## Security Testing Best Practices

### 1. Input Sanitization Tests

```typescript
test('should sanitize malicious input', () => {
  const maliciousInputs = [
    '<script>alert("xss")</script>',
    'javascript:alert(1)',
    '../../etc/passwd'
  ];
  
  maliciousInputs.forEach(input => {
    const sanitized = sanitizeString(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('javascript:');
  });
});
```

### 2. Authentication Validation

```typescript
test('should validate API tokens properly', () => {
  // Valid token format (40 hex characters)
  expect(validateApiToken('a'.repeat(40))).toBe(true);
  
  // Invalid formats
  expect(validateApiToken('invalid')).toBe(false);
  expect(validateApiToken('a'.repeat(39))).toBe(false);
  expect(validateApiToken('a'.repeat(41))).toBe(false);
});
```

### 3. Rate Limiting Tests

```typescript
test('should enforce rate limits', () => {
  const limiter = new RateLimiter(5, 1000); // 5 requests per second
  
  // Should allow first 5 requests
  for (let i = 0; i < 5; i++) {
    expect(limiter.isAllowed('client1')).toBe(true);
  }
  
  // Should deny 6th request
  expect(limiter.isAllowed('client1')).toBe(false);
});
```

## API Testing Patterns

### 1. Conditional API Tests

Always check for API credentials before making real API calls:

```typescript
const API_KEY = process.env.COURTLISTENER_API_TOKEN;

test('should make successful API call', async () => {
  if (!API_KEY) {
    console.log('Skipping test - no API key available');
    return;
  }
  
  const result = await makeApiCall(API_KEY);
  expect(result).toBeTruthy();
});
```

### 2. Error Handling Tests

Test both success and failure scenarios:

```typescript
test('should handle API errors gracefully', async () => {
  const result = await makeApiCall('invalid-token');
  expect(result).toBeNull();
});

test('should handle network errors', async () => {
  // Mock fetch to simulate network error
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  
  const result = await makeApiCall();
  expect(result).toBeNull();
});
```

### 3. Response Validation

Validate API response structure:

```typescript
test('should return properly structured data', async () => {
  if (!API_KEY) return;
  
  const result = await searchDockets({ q: 'test' });
  
  if (result) {
    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('count');
    expect(Array.isArray(result.results)).toBe(true);
  }
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/security.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Check environment setup
npm run check-env
```

### Test Output Interpretation

- **Skipping test messages**: Normal when API key not available
- **Rate limit delays**: Expected for real API tests - be patient!
- **Open handles warnings**: Usually harmless for API tests
- **Console errors**: May be expected for error handling tests

## Best Practices Summary

1. **Environment Setup**: Always use `.env` files for sensitive data
2. **Conditional Testing**: Skip API tests when credentials not available
3. **Realistic Timeouts**: Set appropriate timeouts for API calls (60s+)
4. **Security First**: Test input validation, authentication, and rate limiting
5. **Patient Testing**: Real API tests take time - don't be impatient!
6. **Clean Separation**: Separate unit tests from integration tests
7. **Proper Exports**: Export functions needed for testing
8. **Error Handling**: Test both success and failure scenarios
9. **Documentation**: Document test patterns and common issues
10. **Continuous Improvement**: Update this guide as you learn more!

Remember: Good tests take time to run, especially when they're testing real API interactions with proper rate limiting. This is a feature, not a bug!
