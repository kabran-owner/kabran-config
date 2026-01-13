import {describe, it, expect} from 'vitest';
import {
  isProhibited,
  isWarning,
  PROHIBITED_LICENSES,
  WARNING_LICENSES,
} from '../../src/scripts/license-check.mjs';

describe('license-check', () => {
  describe('PROHIBITED_LICENSES', () => {
    it('includes GPL licenses', () => {
      expect(PROHIBITED_LICENSES).toContain('GPL');
      expect(PROHIBITED_LICENSES).toContain('GPL-2.0');
      expect(PROHIBITED_LICENSES).toContain('GPL-3.0');
    });

    it('includes AGPL licenses', () => {
      expect(PROHIBITED_LICENSES).toContain('AGPL');
      expect(PROHIBITED_LICENSES).toContain('AGPL-3.0');
    });

    it('includes LGPL licenses', () => {
      expect(PROHIBITED_LICENSES).toContain('LGPL-2.0');
      expect(PROHIBITED_LICENSES).toContain('LGPL-3.0');
    });

    it('includes EUPL licenses', () => {
      expect(PROHIBITED_LICENSES).toContain('EUPL-1.0');
      expect(PROHIBITED_LICENSES).toContain('EUPL-1.2');
    });
  });

  describe('WARNING_LICENSES', () => {
    it('includes CC-BY-NC', () => {
      expect(WARNING_LICENSES).toContain('CC-BY-NC');
    });

    it('includes SSPL', () => {
      expect(WARNING_LICENSES).toContain('SSPL');
    });
  });

  describe('isProhibited', () => {
    it('returns true for GPL licenses', () => {
      expect(isProhibited('GPL')).toBe(true);
      expect(isProhibited('GPL-2.0')).toBe(true);
      expect(isProhibited('GPL-3.0-only')).toBe(true);
      expect(isProhibited('GPL-3.0-or-later')).toBe(true);
    });

    it('returns true for AGPL licenses', () => {
      expect(isProhibited('AGPL')).toBe(true);
      expect(isProhibited('AGPL-3.0')).toBe(true);
      expect(isProhibited('AGPL-3.0-only')).toBe(true);
    });

    it('returns true for LGPL licenses', () => {
      expect(isProhibited('LGPL-2.0')).toBe(true);
      expect(isProhibited('LGPL-2.1')).toBe(true);
      expect(isProhibited('LGPL-3.0')).toBe(true);
    });

    it('returns false for MIT', () => {
      expect(isProhibited('MIT')).toBe(false);
    });

    it('returns false for Apache-2.0', () => {
      expect(isProhibited('Apache-2.0')).toBe(false);
    });

    it('returns false for BSD licenses', () => {
      expect(isProhibited('BSD-2-Clause')).toBe(false);
      expect(isProhibited('BSD-3-Clause')).toBe(false);
    });

    it('returns false for ISC', () => {
      expect(isProhibited('ISC')).toBe(false);
    });

    it('handles case variations', () => {
      expect(isProhibited('gpl')).toBe(true);
      expect(isProhibited('Gpl-2.0')).toBe(true);
      expect(isProhibited('AGPL-3.0')).toBe(true);
      expect(isProhibited('mit')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isProhibited(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isProhibited(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isProhibited('')).toBe(false);
    });
  });

  describe('isWarning', () => {
    it('returns true for CC-BY-NC', () => {
      expect(isWarning('CC-BY-NC')).toBe(true);
    });

    it('returns true for CC-BY-NC-SA', () => {
      expect(isWarning('CC-BY-NC-SA')).toBe(true);
    });

    it('returns true for SSPL', () => {
      expect(isWarning('SSPL')).toBe(true);
    });

    it('returns true for OSL-3.0', () => {
      expect(isWarning('OSL-3.0')).toBe(true);
    });

    it('returns false for MIT', () => {
      expect(isWarning('MIT')).toBe(false);
    });

    it('returns false for Apache-2.0', () => {
      expect(isWarning('Apache-2.0')).toBe(false);
    });

    it('returns false for GPL (prohibited, not warning)', () => {
      expect(isWarning('GPL')).toBe(false);
    });

    it('handles case variations', () => {
      expect(isWarning('sspl')).toBe(true);
      expect(isWarning('Sspl')).toBe(true);
      expect(isWarning('cc-by-nc')).toBe(true);
    });

    it('returns false for null', () => {
      expect(isWarning(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isWarning(undefined)).toBe(false);
    });
  });

  describe('license categorization', () => {
    it('MIT is neither prohibited nor warning', () => {
      expect(isProhibited('MIT')).toBe(false);
      expect(isWarning('MIT')).toBe(false);
    });

    it('GPL is prohibited but not warning', () => {
      expect(isProhibited('GPL-3.0')).toBe(true);
      expect(isWarning('GPL-3.0')).toBe(false);
    });

    it('SSPL is warning but not prohibited', () => {
      expect(isProhibited('SSPL')).toBe(false);
      expect(isWarning('SSPL')).toBe(true);
    });
  });
});
