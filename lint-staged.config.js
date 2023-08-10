export default {
    "src/**/*.{js,ts}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "examples/**/*.{js,mjs,jsx}": [
      "prettier --write"
    ],
  
    "package.json": ["prettier --write"],
    "src/**/*.ts": () => "tsc --noEmit",
  };
  