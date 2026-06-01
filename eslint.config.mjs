import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: ['eslint.config.mjs', 'next.config.js'],
  },
  ...nextVitals,
  {
    settings: {
      react: {
        version: '19.2.6',
      },
    },
  },
];
