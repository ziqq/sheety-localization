import baseConfig from './jest.config.base.mjs';

export default {
  ...baseConfig,
  testMatch: ['<rootDir>/test/generate.cli-result.test.mjs'],
  collectCoverageFrom: ['src/generate.ts'],
  coverageDirectory: 'coverage/cli-result',
};
