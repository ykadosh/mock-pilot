import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import checkFile from 'eslint-plugin-check-file';
import tailwindcss from 'eslint-plugin-tailwindcss';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tailwindcss.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'check-file': checkFile,
    },
    settings: {
      react: { version: 'detect' },
      tailwindcss: {
        // Tailwind v4 uses CSS-based config; the plugin can't resolve it automatically
        config: {},
      },
    },
    rules: {
      // Downgrade base rules that conflict with Electron main process patterns
      'no-empty': 'error',
      '@typescript-eslint/no-require-imports': 'error',

      // File size
      'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }],

      // Function size (React components will trigger this — that's intentional for phased cleanup)
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],

      // Complexity
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],

      // General quality
      'no-console': 'error',
      'prefer-const': 'error',
      'no-nested-ternary': 'error',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // React
      'react/jsx-no-useless-fragment': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // Tailwind
      'tailwindcss/classnames-order': 'error',
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-unnecessary-arbitrary-value': 'error',
      'tailwindcss/enforces-shorthand': 'error',
      'tailwindcss/no-custom-classname': 'off', // Project uses custom theme utilities (Tailwind v4 CSS-based)

      // File naming conventions
      'check-file/filename-naming-convention': ['error', {
        'src/renderer/components/**/*.tsx': 'PASCAL_CASE',
        'src/renderer/pages/**/*.tsx': 'PASCAL_CASE',
        'src/**/*.hooks.ts': 'PASCAL_CASE',
        'src/**/*.utils.ts': 'PASCAL_CASE',
      }, { ignoreMiddleExtensions: true }],
      'check-file/folder-naming-convention': ['error', {
        'src/renderer/**': 'CAMEL_CASE',
      }],
    },
  },
  {
    ignores: ['dist/**', 'out/**', '.vite/**', 'node_modules/**'],
  },
);
