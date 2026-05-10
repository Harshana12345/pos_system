import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['coverage/**', 'frontend/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  prettier,
];
