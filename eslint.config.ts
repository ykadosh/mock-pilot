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
      'no-empty': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',

      // File size
      'max-lines': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],

      // Function size (React components will trigger this — that's intentional for phased cleanup)
      'max-lines-per-function': ['warn', { max: 40, skipBlankLines: true, skipComments: true }],

      // Complexity
      complexity: ['warn', 10],
      'max-depth': ['warn', 3],
      'max-params': ['warn', 3],

      // General quality
      'no-console': 'warn',
      'prefer-const': 'warn',
      'no-nested-ternary': 'warn',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // React
      'react/jsx-no-useless-fragment': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // Tailwind
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-contradicting-classname': 'warn',
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn',
      'tailwindcss/enforces-shorthand': 'warn',
      'tailwindcss/no-custom-classname': 'off', // Project uses custom theme utilities (Tailwind v4 CSS-based)

      // File naming conventions
      'check-file/filename-naming-convention': ['warn', {
        'src/renderer/components/**/*.tsx': 'PASCAL_CASE',
        'src/renderer/pages/**/*.tsx': 'PASCAL_CASE',
        'src/**/*.hooks.ts': 'PASCAL_CASE',
        'src/**/*.utils.ts': 'PASCAL_CASE',
      }, { ignoreMiddleExtensions: true }],
      'check-file/folder-naming-convention': ['warn', {
        'src/renderer/**': 'CAMEL_CASE',
      }],
    },
  },
  {
    ignores: ['dist/**', 'out/**', '.vite/**', 'node_modules/**'],
  },
);
