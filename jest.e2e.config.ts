/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/browser'],
};
