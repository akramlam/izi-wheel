// Shared slot utilities for consistent ordering between frontend and backend
// This ensures wheel position alignment and prevents prize mismatches

export interface SlotBase {
  id: string;
  position: number | null;
}

/**
 * Apply stable sorting to slots - matches the backend implementation exactly
 * Primary sort: by position field (ascending, nulls treated as 999)
 * Secondary sort: by id field (lexicographic) for deterministic ordering
 */
export function applyStableSorting<T extends SlotBase>(slots: T[]): T[] {
  return [...slots].sort((a, b) => {
    // Primary sort: position (nulls treated as 999)
    const posA = a.position ?? 999;
    const posB = b.position ?? 999;

    if (posA !== posB) {
      return posA - posB;
    }

    // Secondary sort: ID (lexicographic)
    return a.id.localeCompare(b.id);
  });
}

/**
 * Validate that slot positions are correctly synchronized
 * This can be used in development to detect mismatches early
 */
export function validateSlotAlignment<T extends SlotBase>(
  frontendSlots: T[],
  backendSlots: T[],
  context: string = 'wheel'
): boolean {
  if (frontendSlots.length !== backendSlots.length) {
    console.error(`❌ Slot count mismatch in ${context}:`, {
      frontend: frontendSlots.length,
      backend: backendSlots.length
    });
    return false;
  }

  const sortedFrontend = applyStableSorting(frontendSlots);
  const sortedBackend = applyStableSorting(backendSlots);

  for (let i = 0; i < sortedFrontend.length; i++) {
    const frontendSlot = sortedFrontend[i];
    const backendSlot = sortedBackend[i];

    if (frontendSlot.id !== backendSlot.id) {
      console.error(`❌ Slot ID mismatch at index ${i} in ${context}:`, {
        frontend: { id: frontendSlot.id, position: frontendSlot.position },
        backend: { id: backendSlot.id, position: backendSlot.position }
      });
      return false;
    }

    if (frontendSlot.position !== backendSlot.position) {
      console.warn(`⚠️ Position mismatch for slot ${frontendSlot.id} in ${context}:`, {
        frontend: frontendSlot.position,
        backend: backendSlot.position
      });
    }
  }

  console.log(`✅ Slot alignment validated for ${context}: ${frontendSlots.length} slots`);
  return true;
}

/**
 * Find slot index after stable sorting - this is what the wheel animation uses
 */
export function findSlotIndex<T extends SlotBase>(
  slots: T[],
  targetId: string
): number {
  const sortedSlots = applyStableSorting(slots);
  const index = sortedSlots.findIndex(slot => slot.id === targetId);

  if (index === -1) {
    console.warn(`⚠️ Slot not found: ${targetId}`);
    return 0;
  }

  return index;
}

/**
 * Debug function to log slot ordering for troubleshooting
 */
export function debugSlotOrdering<T extends SlotBase>(
  slots: T[],
  label: string = 'slots'
): void {
  if (typeof window !== 'undefined' && !import.meta.env.DEV) {
    return;
  }

  const sorted = applyStableSorting(slots);
  console.log(`🎯 ${label} ordering (${sorted.length} slots):`, {
    original: slots.map((s, i) => ({ index: i, id: s.id, position: s.position })),
    sorted: sorted.map((s, i) => ({ index: i, id: s.id, position: s.position }))
  });
}
