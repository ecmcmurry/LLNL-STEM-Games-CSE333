// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.unit.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageReporters: ['text', 'lcov'],
  verbose: true,
};
