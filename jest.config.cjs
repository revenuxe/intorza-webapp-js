const nextJest = require('next/jest');

module.exports = nextJest({ dir: './' })({
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/*.test.[tj]s?(x)'],
});
