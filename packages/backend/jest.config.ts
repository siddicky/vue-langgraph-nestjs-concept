import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@todos/shared$': '<rootDir>/../shared/src/index.ts',
    // Resolve .js extensions in ESM-style imports (shared package uses .js in import paths)
    '^(.*)\\.js$': '$1',
  },
};

export default config;
