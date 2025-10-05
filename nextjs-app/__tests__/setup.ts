/**
 * Jest Test Setup
 * Fire Department Radio Transcription System
 *
 * Global configuration for all test files.
 * Sets up test environment, mocks, and global utilities.
 */

// Set test timeout to 10 seconds (for OpenAI mock delays)
jest.setTimeout(10000);

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Suppress console output during tests (optional - uncomment to enable)
// global.console = {
//   ...console,
//   error: jest.fn(), // Mock console.error
//   warn: jest.fn(),  // Mock console.warn
//   log: jest.fn(),   // Mock console.log
// };

/**
 * Global test utilities
 */
export {};
