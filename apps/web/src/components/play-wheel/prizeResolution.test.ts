import { describe, it, expect, vi } from 'vitest';
import { resolvePrizeFromResponse, updateSpinResultWithPointer } from './prizeResolution';
import type { WheelSlot, PlayResponse } from './types';

// Mock console.log to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Prize Resolution Logic', () => {
  const mockSegments: WheelSlot[] = [
    { id: 'slot-1', label: 'Prize A', color: '#FF0000', weight: 25, isWinning: true, position: 0 },
    { id: 'slot-2', label: 'Prize B', color: '#00FF00', weight: 25, isWinning: true, position: 1 },
    { id: 'slot-3', label: 'No Prize', color: '#0000FF', weight: 25, isWinning: false, position: 2 },
    { id: 'slot-4', label: 'Prize C', color: '#FFFF00', weight: 25, isWinning: true, position: 3 },
  ];

  describe('resolvePrizeFromResponse', () => {
    it('should resolve prize by exact ID match (highest priority)', () => {
      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'slot-2', label: 'Prize B', position: 1 },
        prizeIndex: 999, // Should be ignored in favor of ID match
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: mockSegments
      });

      expect(result.resolvedPrizeIndex).toBe(1); // slot-2 is at index 1
      expect(result.resolvedSegment?.id).toBe('slot-2');
      expect(result.resolvedSegment?.label).toBe('Prize B');
      expect(result.normalizedResult.slot.id).toBe('slot-2');
    });

    it('should resolve prize by position match when ID not found', () => {
      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'unknown-slot', label: 'Prize B', position: 3 },
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: mockSegments
      });

      expect(result.resolvedPrizeIndex).toBe(3); // position 3 = slot-4
      expect(result.resolvedSegment?.id).toBe('slot-4');
      expect(result.resolvedSegment?.label).toBe('Prize C');
    });

    it('should resolve prize by label match when ID and position not found', () => {
      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'unknown-slot', label: 'No Prize', position: 999 },
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: mockSegments
      });

      expect(result.resolvedPrizeIndex).toBe(2); // "No Prize" is at index 2
      expect(result.resolvedSegment?.id).toBe('slot-3');
      expect(result.resolvedSegment?.label).toBe('No Prize');
    });

    it('should fall back to backend index when no matches found', () => {
      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'unknown-slot', label: 'Unknown Prize', position: 999 },
        prizeIndex: 1,
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: mockSegments
      });

      expect(result.resolvedPrizeIndex).toBe(1); // Backend provided index
      expect(result.resolvedSegment?.id).toBe('slot-2');
    });

    it('should default to index 0 when everything fails', () => {
      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'unknown-slot', label: 'Unknown Prize', position: 999 },
        prizeIndex: 999, // Invalid index
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: mockSegments
      });

      expect(result.resolvedPrizeIndex).toBe(0); // Default fallback
      expect(result.resolvedSegment?.id).toBe('slot-1');
    });

    it('should handle empty segments array gracefully', () => {
      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'slot-1', label: 'Prize A' },
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: []
      });

      expect(result.resolvedPrizeIndex).toBe(0);
      expect(result.resolvedSegment).toBeNull();
      expect(result.normalizedResult.resolvedSegment).toBeUndefined();
    });

    it('should handle case-insensitive label matching', () => {
      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'unknown', label: 'PRIZE A', position: null }, // Uppercase
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: mockSegments
      });

      expect(result.resolvedPrizeIndex).toBe(0); // "Prize A" matches "PRIZE A"
      expect(result.resolvedSegment?.label).toBe('Prize A');
    });

    it('should handle null positions correctly', () => {
      const segmentsWithNullPositions: WheelSlot[] = [
        { id: 'slot-1', label: 'Prize A', color: '#FF0000', weight: 25, isWinning: true, position: null },
        { id: 'slot-2', label: 'Prize B', color: '#00FF00', weight: 25, isWinning: true, position: 1 },
      ];

      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'slot-1', label: 'Prize A', position: null },
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: segmentsWithNullPositions
      });

      expect(result.resolvedPrizeIndex).toBe(1); // slot-1 should be sorted after slot-2 due to null position
      expect(result.resolvedSegment?.id).toBe('slot-1');
    });
  });

  describe('updateSpinResultWithPointer', () => {
    const mockSpinResult: PlayResponse = {
      play: { id: 'play-1', result: 'WIN' },
      slot: { id: 'slot-1', label: 'Old Label' },
      resolvedPrizeIndex: 0,
      resolvedSegment: {
        id: 'slot-1',
        label: 'Old Label',
        isWinning: true,
        position: 0
      }
    };

    it('should update spin result with pointer position', () => {
      const result = updateSpinResultWithPointer(mockSpinResult, 2, mockSegments);

      expect(result.resolvedPrizeIndex).toBe(2);
      expect(result.slot.label).toBe('No Prize'); // segment at index 2
      expect(result.resolvedSegment?.id).toBe('slot-3');
    });

    it('should clamp invalid pointer indices', () => {
      const result = updateSpinResultWithPointer(mockSpinResult, 999, mockSegments);

      expect(result.resolvedPrizeIndex).toBe(3); // Clamped to max index
      expect(result.slot.label).toBe('Prize C');
    });

    it('should handle negative pointer indices', () => {
      const result = updateSpinResultWithPointer(mockSpinResult, -5, mockSegments);

      expect(result.resolvedPrizeIndex).toBe(0); // Clamped to 0
      expect(result.slot.label).toBe('Prize A');
    });

    it('should return original result if segments empty', () => {
      const result = updateSpinResultWithPointer(mockSpinResult, 1, []);

      expect(result).toEqual(mockSpinResult); // Unchanged
    });

    it('should detect changes correctly', () => {
      // This test ensures the change detection logic works
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      updateSpinResultWithPointer(mockSpinResult, 2, mockSegments);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Synchronizing spin result metadata'),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined/null data gracefully', () => {
      const result = resolvePrizeFromResponse({
        data: null,
        segments: mockSegments
      });

      expect(result.resolvedPrizeIndex).toBe(0);
      expect(result.resolvedSegment?.id).toBe('slot-1');
    });

    it('should handle malformed segment data', () => {
      const malformedSegments = [
        { id: '', label: '', color: '', weight: 0, isWinning: false, position: null },
        ...mockSegments
      ];

      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'slot-1', label: 'Prize A' },
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: malformedSegments
      });

      // Should still work and find slot-1 at index 1 (after empty slot)
      expect(result.resolvedPrizeIndex).toBe(1);
      expect(result.resolvedSegment?.id).toBe('slot-1');
    });

    it('should handle extremely large segment arrays', () => {
      const largeSegments = Array.from({ length: 1000 }, (_, i) => ({
        id: `slot-${i}`,
        label: `Prize ${i}`,
        color: '#000000',
        weight: 1,
        isWinning: i % 2 === 0,
        position: i
      }));

      const mockData = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'slot-500', label: 'Prize 500' },
      };

      const result = resolvePrizeFromResponse({
        data: mockData,
        segments: largeSegments
      });

      expect(result.resolvedPrizeIndex).toBe(500);
      expect(result.resolvedSegment?.id).toBe('slot-500');
    });
  });
});