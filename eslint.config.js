// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-web/*', '.claude/*', '.expo/*'],
  },
  {
    files: ['**/*.test.js', '**/*.test.jsx', '__mocks__/**/*.js'],
    languageOptions: {
      globals: require('globals').jest,
    },
  },
  {
    files: ['components/**/*.js', 'components/**/*.jsx'],
    ignores: ['components/context/**', '**/*.test.js', '**/*.test.jsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: 'context/use.*Context$',
              message:
                'Componentes em components/ devem ser presentacionais e receber dados via props.',
            },
          ],
        },
      ],
    },
  },
]);
