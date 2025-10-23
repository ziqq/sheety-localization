import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'public/**', 'src/solid/**', 'src/vendor/**', 'src/opus-recorder/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        // убираем project для исключения проблем с TS Program (позже можно вернуть)
        project: undefined,
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'max-len': 'off',
      'keyword-spacing': [
        'error',
        {
          after: true,
          overrides: {
            if: { before: true, after: false },
            else: { before: true },
            catch: { before: true, after: false },
            for: { after: false },
            while: { after: false },
            switch: { after: false },
          },
        },
      ],
      'linebreak-style': ['error', 'unix'],
      'eol-last': 'error',
      indent: [
        'error',
        2,
        {
          CallExpression: { arguments: 1 },
          FunctionDeclaration: { body: 1, parameters: 1 },
          FunctionExpression: { body: 1, parameters: 1 },
          MemberExpression: 0,
          ObjectExpression: 1,
          SwitchCase: 1,
          ignoredNodes: ['ConditionalExpression'],
        },
      ],
      'space-before-function-paren': ['error', 'never'],
      'prefer-promise-reject-errors': 'off',
      curly: 'off',
      'comma-dangle': ['error', 'never'],
      'comma-spacing': 'error',
      'comma-style': 'error',
      'quote-props': ['error', 'consistent'],
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      'space-before-blocks': ['error', 'always'],
      'spaced-comment': ['error', 'always'],
      'prefer-spread': 'off',
      'prefer-const': ['error', { destructuring: 'all' }],
      'object-curly-spacing': ['error', 'never'],
      'array-bracket-spacing': ['error', 'never'],
      'switch-colon-spacing': 'error',
      'operator-linebreak': ['error', 'after'],
      'padded-blocks': ['error', 'never'],
      'no-useless-call': 'error',
      'no-trailing-spaces': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-tabs': 'error',
      'no-multi-str': 'error',
      'no-new-wrappers': 'error',
      'no-irregular-whitespace': [
        'error',
        {
          skipStrings: true,
          skipComments: true,
          skipRegExps: true,
          skipTemplates: true,
        },
      ],
      'no-unexpected-multiline': 'error',
      'no-return-await': 'error',
      // '@typescript-eslint/await-thenable': 'error',
    },
  },
];
