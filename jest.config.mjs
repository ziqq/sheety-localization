import baseConfig from './jest.config.base.mjs';

export default {
  ...baseConfig,
  testMatch: ['<rootDir>/test/**/*.test.mjs'],
  coverageDirectory: 'coverage',
};
