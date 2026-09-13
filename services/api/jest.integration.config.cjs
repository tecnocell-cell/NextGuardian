const base = require('./jest.config.cjs');
module.exports = { ...base, testMatch: ['**/test/**/*.integration.spec.ts'], testPathIgnorePatterns: ['/node_modules/'], testTimeout: 15000 };
