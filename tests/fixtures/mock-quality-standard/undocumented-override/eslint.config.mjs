import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/node';

export default [
  ...kabranConfig,
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules'],
  },
  {
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
