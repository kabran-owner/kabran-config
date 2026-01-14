export default {
  readme: {
    required: ['Setup', 'API', 'License'],
    recommended: ['Examples'],
  },
  env: {
    detectPatterns: ['process.env', 'MY_CUSTOM_ENV'],
  },
  quality: {
    standardPath: 'custom/path/quality.md',
  },
};
