import crypto from 'crypto';

export interface Slot {
  id: string;
  label: string;
  weight: number;
  isWinning: boolean;
  position: number;
}

export interface SelectionResult {
  slot: Slot;
  index: number;
}

/**
 * PrizeSelector - Implements weighted random selection (Roulette Wheel Selection)
 * Uses cumulative probability distribution for O(log n) selection via binary search
 */
export class PrizeSelector {
  /**
   * Selects a prize using weighted probability
   * @param slots - Array of slots with weights
   * @param seed - Optional seed for deterministic selection (testing)
   * @param strictMode - If true, requires weights to sum to exactly 100 (default: false)
   * @returns Selected slot with its index, or null if no prize won
   */
  selectPrize(slots: Slot[], seed?: string, strictMode: boolean = false): SelectionResult {
    if (!slots || slots.length === 0) {
      throw new Error('No slots available for selection');
    }

    // Calculate total weight
    const totalWeight = slots.reduce((sum, s) => sum + s.weight, 0);

    // In strict mode, require exactly 100
    if (strictMode && totalWeight !== 100) {
      throw new Error(`Slot weights must sum to 100, got ${totalWeight}`);
    }

    // Validate total weight doesn't exceed 100
    if (totalWeight > 100) {
      throw new Error(`Slot weights cannot exceed 100, got ${totalWeight}`);
    }

    // Generate random value (0-100)
    const random = seed
      ? this.seededRandom(seed) * 100
      : Math.random() * 100;

    console.log(`🎯 Random value: ${random.toFixed(2)}, Total weight: ${totalWeight}`);

    // If random value exceeds total weight, no prize won
    if (random > totalWeight) {
      console.log(`❌ No prize won (${random.toFixed(2)} > ${totalWeight})`);
      // Return first non-winning slot or first slot
      const loseSlot = slots.find(s => !s.isWinning) || slots[0];
      return {
        slot: loseSlot,
        index: slots.findIndex(s => s.id === loseSlot.id)
      };
    }

    // Build cumulative distribution array
    const cumulative: number[] = [];
    let sum = 0;
    for (const slot of slots) {
      sum += slot.weight;
      cumulative.push(sum);
    }

    // Binary search for selected slot
    const index = this.binarySearch(cumulative, random);

    console.log(`🎯 Prize won: index=${index}, slot="${slots[index].label}"`);

    return {
      slot: slots[index],
      index
    };
  }

  /**
   * Selects a prize from winning slots only (ALL_WIN mode)
   * @param slots - Array of slots
   * @returns Selected winning slot with its index
   */
  selectWinningPrize(slots: Slot[]): SelectionResult {
    const winningSlots = slots.filter(s => s.isWinning);

    if (winningSlots.length === 0) {
      throw new Error('No winning slots available in ALL_WIN mode');
    }

    // Normalize weights to sum to 100
    const totalWeight = winningSlots.reduce((sum, s) => sum + s.weight, 0);
    const normalizedSlots = winningSlots.map(slot => ({
      ...slot,
      weight: (slot.weight / totalWeight) * 100
    }));

    const result = this.selectPrize(normalizedSlots, undefined, true); // strict mode for ALL_WIN

    // Find original index in full slots array
    const originalIndex = slots.findIndex(s => s.id === result.slot.id);

    return {
      slot: result.slot,
      index: originalIndex
    };
  }

  /**
   * Binary search to find slot based on cumulative probability
   * @param cumulative - Cumulative probability array
   * @param value - Random value to search for
   * @returns Index of selected slot
   */
  private binarySearch(cumulative: number[], value: number): number {
    let left = 0;
    let right = cumulative.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);

      if (value <= cumulative[mid]) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    return left;
  }

  /**
   * Generates deterministic random number from seed (for testing)
   * @param seed - String seed value
   * @returns Pseudo-random number between 0 and 1
   */
  private seededRandom(seed: string): number {
    const hash = crypto.createHash('sha256').update(seed).digest();
    const num = hash.readUInt32BE(0);
    return num / 0xFFFFFFFF;
  }

  /**
   * Validates slot configuration
   * @param slots - Array of slots to validate
   * @throws Error if validation fails
   */
  validateSlots(slots: Slot[]): void {
    if (!slots || slots.length === 0) {
      throw new Error('At least one slot is required');
    }

    const totalWeight = slots.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight !== 100) {
      throw new Error(`Slot weights must sum to 100, got ${totalWeight}`);
    }

    for (const slot of slots) {
      if (slot.weight < 0 || slot.weight > 100) {
        throw new Error(`Slot "${slot.label}" has invalid weight: ${slot.weight}`);
      }
    }
  }
}

// Export singleton instance
export const prizeSelector = new PrizeSelector();
