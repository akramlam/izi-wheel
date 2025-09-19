/**
 * Apply stable sorting to slots - matches backend logic exactly
 * When positions are equal, uses slot ID as tiebreaker for consistent ordering
 */
export function applyStableSorting<T extends { id: string; position?: number | null }>(
  slots: T[]
): T[] {
  return [...slots].sort((a, b) => {
    const posA = a.position ?? 999;
    const posB = b.position ?? 999;
    
    // If positions are equal, use slot ID as stable tiebreaker
    if (posA === posB) {
      return a.id.localeCompare(b.id);
    }
    
    return posA - posB;
  });
}
