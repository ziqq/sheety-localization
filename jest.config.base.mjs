export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^\\./generator/(.*)\\.js$': '<rootDir>/src/generator/$1.ts',
    '^\\./(manifest|output|shared|spreadsheet|types)\\.js$':
      '<rootDir>/src/generator/$1.ts',
  },
  transform: {
    '^.+\\.ts$': '<rootDir>/test/esbuild-jest-transform.cjs',
  },
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!src/generator/types.ts'],
  coverageReporters: ['lcov', 'json-summary'],
};
