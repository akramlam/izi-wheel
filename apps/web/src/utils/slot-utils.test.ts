import { describe, it, expect, vi } from 'vitest';
import {
  applyStableSorting,
  validateSlotAlignment,
  findSlotIndex,
  debugSlotOrdering
} from './slot-utils';

// Mock console for cleaner test output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Slot Utilities', () => {
  const mockSlots = [
    { id: 'c', position: 2 },
    { id: 'a', position: 1 },
    { id: 'd', position: null },
    { id: 'b', position: 1 }, // Same position as 'a' - should use ID for tiebreaker
    { id: 'e', position: null }, // Another null position
  ];

  describe('applyStableSorting', () => {
    it('should sort by position first, then by ID', () => {
      const result = applyStableSorting(mockSlots);

      expect(result.map(s => s.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
      // Positions: 1, 1, 2, null(999), null(999)
      // Within same position, sorted by ID: a < b, d < e
    });

    it('should treat null positions as 999', () => {
      const slots = [
        { id: 'high', position: 1000 },
        { id: 'null1', position: null },
        { id: 'low', position: 1 },
      ];

      const result = applyStableSorting(slots);
      expect(result.map(s => s.id)).toEqual(['low', 'high', 'null1']);
    });

    it('should be stable - same input produces same output', () => {
      const result1 = applyStableSorting(mockSlots);
      const result2 = applyStableSorting(mockSlots);

      expect(result1).toEqual(result2);
    });

    it('should not modify original array', () => {
      const original = [...mockSlots];
      applyStableSorting(mockSlots);

      expect(mockSlots).toEqual(original);
    });

    it('should handle empty array', () => {
      const result = applyStableSorting([]);
      expect(result).toEqual([]);
    });

    it('should handle single item', () => {
      const single = [{ id: 'only', position: 5 }];
      const result = applyStableSorting(single);

      expect(result).toEqual(single);
    });

    it('should handle all null positions', () => {
      const allNull = [
        { id: 'z', position: null },
        { id: 'a', position: null },
        { id: 'm', position: null },
      ];

      const result = applyStableSorting(allNull);
      expect(result.map(s => s.id)).toEqual(['a', 'm', 'z']); // Sorted by ID
    });
  });

  describe('validateSlotAlignment', () => {
    const fronendSlots = [
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
    ];

    it('should return true for identical slot arrays', () => {
      const backendSlots = [
        { id: 'a', position: 1 },
        { id: 'b', position: 2 },
        { id: 'c', position: 3 },
      ];

      const result = validateSlotAlignment(fronendSlots, backendSlots);
      expect(result).toBe(true);
    });

    it('should return false for different slot counts', () => {
      const backendSlots = [
        { id: 'a', position: 1 },
        { id: 'b', position: 2 },
      ];

      const result = validateSlotAlignment(fronendSlots, backendSlots);
      expect(result).toBe(false);
    });

    it('should return false for mismatched IDs after sorting', () => {
      const backendSlots = [
        { id: 'a', position: 1 },
        { id: 'x', position: 2 }, // Different ID
        { id: 'c', position: 3 },
      ];

      const result = validateSlotAlignment(fronendSlots, backendSlots);
      expect(result).toBe(false);
    });

    it('should warn about position mismatches but still return true', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const backendSlots = [
        { id: 'a', position: 1 },
        { id: 'b', position: 999 }, // Different position but same ID
        { id: 'c', position: 3 },
      ];

      const result = validateSlotAlignment(fronendSlots, backendSlots);

      expect(result).toBe(true); // Same IDs in same order
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Position mismatch for slot b'),
        expect.any(Object)
      );
    });

    it('should use custom context in error messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = validateSlotAlignment(fronendSlots, [], 'test-wheel');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slot count mismatch in test-wheel'),
        expect.any(Object)
      );
    });
  });

  describe('findSlotIndex', () => {
    const slots = [
      { id: 'first', position: 1 },
      { id: 'second', position: 2 },
      { id: 'third', position: null },
    ];

    it('should find correct index for existing slot', () => {
      const index = findSlotIndex(slots, 'second');
      expect(index).toBe(1);
    });

    it('should return 0 for non-existent slot', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const index = findSlotIndex(slots, 'nonexistent');

      expect(index).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Slot not found: nonexistent');
    });

    it('should work with sorted array', () => {
      // The slots will be sorted: first(pos:1), second(pos:2), third(pos:null->999)
      const index = findSlotIndex(slots, 'third');
      expect(index).toBe(2); // third should be at index 2 after sorting
    });

    it('should handle empty array', () => {
      const index = findSlotIndex([], 'any');
      expect(index).toBe(0);
    });
  });

  describe('debugSlotOrdering', () => {
    it('should not run in non-development environment', () => {
      // Mock window to exist (browser environment) and DEV to be false
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      // Mock import.meta.env.DEV to be false
      vi.stubGlobal('import', {
        meta: { env: { DEV: false } }
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      debugSlotOrdering(mockSlots, 'test');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log slot ordering information in development', () => {
      // Remove window to simulate Node environment (DEV check will pass)
      delete (global as any).window;

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      debugSlotOrdering(mockSlots, 'test-wheel');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎯 test-wheel ordering'),
        expect.objectContaining({
          original: expect.any(Array),
          sorted: expect.any(Array)
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency between all utility functions', () => {
      const testSlots = [
        { id: 'z', position: 3 },
        { id: 'a', position: 1 },
        { id: 'b', position: 1 },
        { id: 'c', position: null },
      ];

      // Sort slots
      const sorted = applyStableSorting(testSlots);

      // Find indices
      const indexA = findSlotIndex(testSlots, 'a');
      const indexB = findSlotIndex(testSlots, 'b');
      const indexZ = findSlotIndex(testSlots, 'z');
      const indexC = findSlotIndex(testSlots, 'c');

      // Verify sorting order: a(1) < b(1) < z(3) < c(null)
      expect(sorted.map(s => s.id)).toEqual(['a', 'b', 'z', 'c']);

      // Verify indices match sorted positions
      expect(indexA).toBe(0);
      expect(indexB).toBe(1);
      expect(indexZ).toBe(2);
      expect(indexC).toBe(3);

      // Validate alignment with itself should always be true
      expect(validateSlotAlignment(testSlots, testSlots)).toBe(true);
    });

    it('should handle complex real-world scenario', () => {
      // Simulate real wheel data that might come from database
      const databaseSlots = [
        { id: 'uuid-1', position: null },      // Created first, no position set
        { id: 'uuid-2', position: 0 },        // Explicitly set to first position
        { id: 'uuid-3', position: 1 },        // Second position
        { id: 'uuid-4', position: 1 },        // Same position (user error)
        { id: 'uuid-5', position: 2 },        // Third position
      ];

      const sorted = applyStableSorting(databaseSlots);

      // Expected order: position 0, then position 1 (uuid-2 before uuid-4 by ID), then position 2, then null
      expect(sorted.map(s => s.id)).toEqual([
        'uuid-2', 'uuid-3', 'uuid-4', 'uuid-5', 'uuid-1'
      ]);

      // Verify we can find each slot at its correct sorted position
      expect(findSlotIndex(databaseSlots, 'uuid-2')).toBe(0);
      expect(findSlotIndex(databaseSlots, 'uuid-3')).toBe(1);
      expect(findSlotIndex(databaseSlots, 'uuid-4')).toBe(2);
      expect(findSlotIndex(databaseSlots, 'uuid-5')).toBe(3);
      expect(findSlotIndex(databaseSlots, 'uuid-1')).toBe(4);
    });
  });
});