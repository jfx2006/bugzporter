import html from "eslint-plugin-html";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("eslint:recommended", "plugin:prettier/recommended"), {
    plugins: {
        html,
        "no-unsanitized": noUnsanitized,
        prettier,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.webextensions,
        },

        ecmaVersion: 12,
        sourceType: "module",
    },

    rules: {
        quotes: ["error", "double", {
            avoidEscape: true,
            allowTemplateLiterals: false,
        }],

        semi: ["error", "never"],
        "no-eval": "error",
        curly: ["error", "all"],

        "no-unused-vars": ["error", {
            args: "none",
            vars: "local",
        }],

        "max-len": ["error", {
            code: 99,
            tabWidth: 2,
            ignoreUrls: true,
        }],
    },
}, {
    files: ["**/eslint.config.mjs", "**/web-ext-config.js"],

    languageOptions: {
        globals: {
            ...globals.node,
            ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
        },

        ecmaVersion: 12,
        sourceType: "commonjs",
    },
}];