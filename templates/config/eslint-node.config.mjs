import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/node';

export default [
  ...kabranConfig,
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules'],
  },
];
