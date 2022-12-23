/* Copyright 2022 - jfx2006. */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 12,
  },
  root: true,
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  plugins: ["html", "no-unsanitized", "prettier"],
  rules: {
    quotes: [
      "error",
      "double",
      { avoidEscape: true, allowTemplateLiterals: false },
    ],
    semi: ["error", "never"],
    "no-eval": "error",
    curly: ["error", "all"],
    "no-unused-vars": ["error", { args: "none", vars: "local" }],
    "max-len": [
      "error",
      {
        code: 99,
        tabWidth: 2,
        ignoreUrls: true,
      },
    ],
  },
  overrides: [
    {
      files: [".eslintrc.cjs", "web-ext-config.js"],
      parserOptions: {
        ecmaVersion: 12,
      },
      env: {
        node: true,
        browser: false,
      },
    },
  ],
}
