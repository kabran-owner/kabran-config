/**
 * Semantic Release Configuration
 *
 * Analyzes conventional commits and automates:
 * - Version bumping (patch/minor/major)
 * - CHANGELOG.md generation
 * - npm publishing
 * - GitHub releases
 *
 * Commit types and their effect on version:
 * - fix:      → patch (1.0.0 → 1.0.1)
 * - feat:     → minor (1.0.0 → 1.1.0)
 * - feat!:    → major (1.0.0 → 2.0.0)
 * - BREAKING CHANGE: in footer → major
 *
 * Other types (docs, chore, refactor, test, ci) don't trigger release
 * unless they have BREAKING CHANGE.
 */

export default {
  branches: ['main'],
  plugins: [
    // Analyze commits using conventional-changelog
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          {type: 'feat', release: 'minor'},
          {type: 'fix', release: 'patch'},
          {type: 'perf', release: 'patch'},
          {type: 'refactor', release: 'patch'},
          {type: 'docs', scope: 'README', release: 'patch'},
          {breaking: true, release: 'major'},
        ],
      },
    ],

    // Generate release notes
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            {type: 'feat', section: 'Features'},
            {type: 'fix', section: 'Bug Fixes'},
            {type: 'perf', section: 'Performance'},
            {type: 'refactor', section: 'Code Refactoring'},
            {type: 'docs', section: 'Documentation'},
            {type: 'test', section: 'Tests', hidden: true},
            {type: 'chore', section: 'Maintenance', hidden: true},
            {type: 'ci', section: 'CI/CD', hidden: true},
          ],
        },
      },
    ],

    // Update CHANGELOG.md
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],

    // Update package.json version and publish to npm
    '@semantic-release/npm',

    // Commit the changed files (CHANGELOG.md, package.json)
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],

    // Create GitHub release
    '@semantic-release/github',
  ],
};
