import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// React runs whatever an effect returns as its clean-up. An arrow without braces returns
// its value, and some phones' WebViews return values where desktop browsers don't, so
// `useEffect(() => window.scrollTo(0, 0))` crashed igo on Android on the first tap.
const effect = 'CallExpression[callee.name=/^use(Layout|Insertion)?Effect$/]';

export default tseslint.config(
  { ignores: ['dist', 'android', 'ios', 'node_modules', 'scripts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: `${effect} > ArrowFunctionExpression[body.type!='BlockStatement']`,
          message: 'Wrap the effect body in braces: React runs whatever an effect returns as its clean-up.',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
);
