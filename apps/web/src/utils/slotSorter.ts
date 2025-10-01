/**
 * SlotSorter - CRITICAL utility for consistent slot ordering
 *
 * MUST BE IDENTICAL TO BACKEND VERSION
 * Any discrepancy will cause wheel misalignment
 */

export interface SlotBase {
  id: string;
  position: number;
  [key: string]: any;
}

/**
 * Sort slots by position (ascending), with ID as tiebreaker
 * This ensures deterministic ordering across backend and frontend
 *
 * @param slots - Array of slots to sort
 * @returns Sorted array (new array, original not mutated)
 */
export function sortSlots<T extends SlotBase>(slots: T[]): T[] {
  if (!slots || slots.length === 0) {
    return [];
  }

  // Create shallow copy to avoid mutation
  return [...slots].sort((a, b) => {
    // Primary sort: position ascending
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    // Tiebreaker: ID ascending (lexicographic)
    // This ensures stable sort when positions are equal
    return a.id.localeCompare(b.id);
  });
}

/**
 * Find the array index of a slot by ID in sorted array
 * This is the critical "prizeIndex" that aligns backend with frontend
 *
 * @param slots - Array of slots
 * @param selectedSlotId - ID of selected slot
 * @returns Array index of selected slot
 * @throws Error if slot not found
 */
export function findPrizeIndex<T extends SlotBase>(slots: T[], selectedSlotId: string): number {
  const sorted = sortSlots(slots);
  const index = sorted.findIndex(s => s.id === selectedSlotId);

  if (index === -1) {
    throw new Error(`Slot with ID "${selectedSlotId}" not found in array`);
  }

  return index;
}

/**
 * Debug function to log slot ordering
 * @param slots - Array of slots
 * @param label - Label for debugging
 */
export function debugSlotOrder<T extends SlotBase>(slots: T[], label: string = 'Slots'): void {
  const sorted = sortSlots(slots);

  console.log(`\n🎯 ${label} Ordering:`);
  sorted.forEach((slot, index) => {
    console.log(`  [${index}] pos=${slot.position}, id=${slot.id.substring(0, 8)}...`);
  });
  console.log('');
}
