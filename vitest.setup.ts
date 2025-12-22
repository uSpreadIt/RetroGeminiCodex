import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case (important for React Testing Library)
afterEach(() => {
  cleanup();
});

// Add custom matchers
expect.extend({});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
