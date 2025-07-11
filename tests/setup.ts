// Test setup file
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
