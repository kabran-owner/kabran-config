import {describe, it, expect} from 'vitest';
import {
  parseOutdatedPackages,
  categorizePackages,
} from '../../src/scripts/dependency-report.mjs';

describe('dependency-report', () => {
  describe('parseOutdatedPackages', () => {
    it('returns empty array for empty output', () => {
      expect(parseOutdatedPackages('')).toEqual([]);
    });

    it('returns empty array for whitespace-only output', () => {
      expect(parseOutdatedPackages('   \n  ')).toEqual([]);
    });

    it('parses npm outdated output correctly', () => {
      // npm outdated uses multiple spaces (2+) as delimiter
      const output = `Package  Current  Wanted  Latest  Location  Depended by
lodash  4.17.0  4.17.21  4.17.21  node_modules/lodash  my-project
axios  0.21.0  0.21.4  1.6.0  node_modules/axios  my-project`;

      const result = parseOutdatedPackages(output);
      expect(result).toHaveLength(2);

      expect(result[0].name).toBe('lodash');
      expect(result[0].current).toBe('4.17.0');
      expect(result[0].wanted).toBe('4.17.21');
      expect(result[0].latest).toBe('4.17.21');

      expect(result[1].name).toBe('axios');
      expect(result[1].current).toBe('0.21.0');
    });

    it('handles output with only header', () => {
      const output = 'Package  Current  Wanted  Latest  Location  Depended by';
      expect(parseOutdatedPackages(output)).toEqual([]);
    });

    it('handles malformed lines gracefully', () => {
      const output = `Package  Current  Wanted  Latest  Location  Depended by
malformed-line
lodash   4.17.0   4.17.21 4.17.21 node_modules/lodash  my-project`;

      const result = parseOutdatedPackages(output);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('lodash');
    });

    it('handles missing location field', () => {
      const output = `Package  Current  Wanted  Latest
lodash  4.17.0  4.17.21  4.17.21`;

      const result = parseOutdatedPackages(output);
      expect(result).toHaveLength(1);
      expect(result[0].location).toBe('');
    });
  });

  describe('categorizePackages', () => {
    it('categorizes major version differences', () => {
      const packages = [
        {name: 'axios', current: '0.21.0', wanted: '0.21.4', latest: '1.6.0'},
      ];

      const result = categorizePackages(packages);
      expect(result.major).toHaveLength(1);
      expect(result.major[0].name).toBe('axios');
      expect(result.minor).toHaveLength(0);
      expect(result.patch).toHaveLength(0);
    });

    it('categorizes minor version differences', () => {
      const packages = [
        {name: 'lodash', current: '4.16.0', wanted: '4.17.21', latest: '4.17.21'},
      ];

      const result = categorizePackages(packages);
      expect(result.major).toHaveLength(0);
      expect(result.minor).toHaveLength(1);
      expect(result.minor[0].name).toBe('lodash');
      expect(result.patch).toHaveLength(0);
    });

    it('categorizes patch version differences', () => {
      const packages = [
        {name: 'lodash', current: '4.17.0', wanted: '4.17.21', latest: '4.17.21'},
      ];

      const result = categorizePackages(packages);
      expect(result.major).toHaveLength(0);
      expect(result.minor).toHaveLength(0);
      expect(result.patch).toHaveLength(1);
      expect(result.patch[0].name).toBe('lodash');
    });

    it('handles empty packages array', () => {
      const result = categorizePackages([]);
      expect(result.major).toHaveLength(0);
      expect(result.minor).toHaveLength(0);
      expect(result.patch).toHaveLength(0);
    });

    it('categorizes multiple packages correctly', () => {
      const packages = [
        {name: 'pkg1', current: '1.0.0', wanted: '2.0.0', latest: '2.0.0'},  // major
        {name: 'pkg2', current: '1.0.0', wanted: '1.1.0', latest: '1.1.0'},  // minor
        {name: 'pkg3', current: '1.0.0', wanted: '1.0.1', latest: '1.0.1'},  // patch
        {name: 'pkg4', current: '2.0.0', wanted: '3.0.0', latest: '3.0.0'},  // major
      ];

      const result = categorizePackages(packages);
      expect(result.major).toHaveLength(2);
      expect(result.minor).toHaveLength(1);
      expect(result.patch).toHaveLength(1);
    });

    it('handles pre-release versions', () => {
      const packages = [
        {name: 'pkg', current: '1.0.0-beta.1', wanted: '1.0.0', latest: '1.0.0'},
      ];

      const result = categorizePackages(packages);
      // Both start with 1, so it's treated as patch
      expect(result.patch).toHaveLength(1);
    });
  });

  describe('version parsing edge cases', () => {
    it('handles versions with v prefix', () => {
      const packages = [
        {name: 'pkg', current: 'v1.0.0', wanted: 'v2.0.0', latest: 'v2.0.0'},
      ];

      // Current implementation doesn't strip v prefix
      // This test documents the behavior
      const result = categorizePackages(packages);
      // 'v1' !== 'v2' as strings, so it will be categorized
      expect(result.major.length + result.minor.length + result.patch.length).toBe(1);
    });

    it('handles versions with only major.minor', () => {
      const packages = [
        {name: 'pkg', current: '1.0', wanted: '1.1', latest: '1.1'},
      ];

      const result = categorizePackages(packages);
      expect(result.minor).toHaveLength(1);
    });
  });
});
