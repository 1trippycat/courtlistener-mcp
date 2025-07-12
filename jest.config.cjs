module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: './tsconfig.test.json'
    }],
    '^.+\\.js$': ['babel-jest'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 1,
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch)/)'
  ],
  extensionsToTreatAsEsm: ['.ts'],
};
