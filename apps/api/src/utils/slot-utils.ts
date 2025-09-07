import { Slot } from '@prisma/client';

/**
 * Apply stable sorting to slots to ensure consistent ordering between backend and frontend
 * Sorts by position first, then by ID as a tiebreaker for stability
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

/**
 * Format slot data for public API response
 */
export function formatSlotForResponse(slot: {
  id: string;
  label: string;
  color: string | null;
  weight: number;
  isWinning: boolean;
  position: number | null;
}) {
  return {
    id: slot.id,
    label: slot.label,
    color: slot.color,
    weight: slot.weight,
    isWinning: slot.isWinning,
    position: slot.position
  };
}

/**
 * Format wheel data for public API response
 */
export function formatWheelResponse(wheel: {
  id: string;
  name: string;
  formSchema: any;
  socialNetwork?: string | null;
  redirectUrl?: string | null;
  redirectText?: string | null;
  playLimit?: string | null;
  gameRules?: string | null;
  footerText?: string | null;
  mainTitle?: string | null;
  bannerImage?: string | null;
  backgroundImage?: string | null;
  slots: Array<{
    id: string;
    label: string;
    color: string | null;
    weight: number;
    isWinning: boolean;
    position: number | null;
  }>;
}) {
  return {
    wheel: {
      id: wheel.id,
      name: wheel.name,
      formSchema: wheel.formSchema,
      socialNetwork: wheel.socialNetwork,
      redirectUrl: wheel.redirectUrl,
      redirectText: wheel.redirectText,
      playLimit: wheel.playLimit,
      gameRules: wheel.gameRules,
      footerText: wheel.footerText,
      mainTitle: wheel.mainTitle,
      bannerImage: wheel.bannerImage,
      backgroundImage: wheel.backgroundImage,
      slots: applyStableSorting(wheel.slots).map(formatSlotForResponse)
    }
  };
}
