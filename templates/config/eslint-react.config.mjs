import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/react';

export default [
  ...kabranConfig,
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules'],
  },
];
