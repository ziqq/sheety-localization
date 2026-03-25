import baseConfig from './jest.config.base.mjs';

export default {
  ...baseConfig,
  testMatch: ['<rootDir>/test/generate.generated-runtime.test.mjs'],
  collectCoverageFrom: ['src/generator/manifest.ts', 'src/generator/output.ts'],
  coverageDirectory: 'coverage/generated-runtime',
};
