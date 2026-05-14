/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["<rootDir>/e2e/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/browser"],
  maxWorkers: 1, // Run e2e tests serially to avoid faucet rate limiting
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "tsconfig.e2e.json", useESM: true },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
