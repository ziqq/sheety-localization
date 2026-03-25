import baseConfig from './jest.config.base.mjs';

export default {
  ...baseConfig,
  testMatch: ['<rootDir>/test/generate.source.test.mjs'],
  collectCoverageFrom: [
    'src/generator/shared.ts',
    'src/generator/spreadsheet.ts',
  ],
  coverageDirectory: 'coverage/source',
};
