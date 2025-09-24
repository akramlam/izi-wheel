import type { PlayResponse, WheelSlot } from './types';
import type { WheelConfig } from '../wheel/types';

export interface PrizeResolutionInput {
  data: any; // Backend response data
  segments: WheelSlot[]; // Frontend wheel segments
}

export interface PrizeResolutionResult {
  resolvedPrizeIndex: number;
  resolvedSegment: WheelSlot | null;
  normalizedResult: PlayResponse;
}

/**
 * Normalize ID values for consistent comparison
 */
function normalizeId(id: any): string | null {
  if (typeof id === 'string') {
    return id.trim().toLowerCase();
  }
  if (typeof id === 'number') {
    return String(id);
  }
  return null;
}

/**
 * Clamp index to valid segment range
 */
function clampIndex(index: number, maxLength: number): number {
  if (!Number.isFinite(index) || maxLength === 0) {
    return 0;
  }
  return Math.max(0, Math.min(maxLength - 1, Math.trunc(index)));
}

/**
 * Find the correct segment index based on backend response
 * Priority: ID match > Position match > Label match > Backend index > Default (0)
 */
function findSegmentIndex(data: any, segments: WheelSlot[]): number {
  const safeSegmentsLength = segments.length;

  if (safeSegmentsLength === 0) {
    return 0;
  }

  const normalizedSlotId = normalizeId(data?.slot?.id);
  const normalizedSlotLabel = typeof data?.slot?.label === 'string'
    ? data.slot.label.trim().toLowerCase()
    : null;
  const normalizedSlotPosition = typeof data?.slot?.position === 'number'
    ? data.slot.position
    : null;

  // 1. Try to match by ID (highest priority)
  if (normalizedSlotId) {
    const byId = segments.findIndex((segment) => normalizeId(segment.id) === normalizedSlotId);
    if (byId !== -1) {
      console.log('✅ Prize resolved by slot ID match:', { slotId: normalizedSlotId, index: byId });
      return byId;
    }
  }

  // 2. Try to match by position
  if (normalizedSlotPosition !== null) {
    const byPosition = segments.findIndex((segment) =>
      typeof segment.position === 'number' && segment.position === normalizedSlotPosition
    );
    if (byPosition !== -1) {
      console.log('✅ Prize resolved by position match:', { position: normalizedSlotPosition, index: byPosition });
      return byPosition;
    }
  }

  // 3. Try to match by label
  if (normalizedSlotLabel) {
    const byLabel = segments.findIndex((segment) =>
      segment.label?.trim().toLowerCase() === normalizedSlotLabel
    );
    if (byLabel !== -1) {
      console.log('✅ Prize resolved by label match:', { label: normalizedSlotLabel, index: byLabel });
      return byLabel;
    }
  }

  // 4. Fall back to backend index if provided
  if (typeof data?.prizeIndex === 'number') {
    const backendIndex = clampIndex(data.prizeIndex, safeSegmentsLength);
    if (backendIndex >= 0 && backendIndex < safeSegmentsLength) {
      console.log('⚠️ Prize resolved by backend index fallback:', { backendIndex });
      return backendIndex;
    }
  }

  // 5. Default to first segment
  console.log('⚠️ Prize resolution failed, using default index 0');
  return 0;
}

/**
 * Resolve prize information from backend response and frontend segments
 * This ensures the UI shows the correct prize that matches the wheel position
 */
export function resolvePrizeFromResponse({ data, segments }: PrizeResolutionInput): PrizeResolutionResult {
  const safeSegmentsLength = segments.length;

  if (safeSegmentsLength === 0) {
    console.error('❌ No segments available for prize resolution');
    return {
      resolvedPrizeIndex: 0,
      resolvedSegment: null,
      normalizedResult: {
        ...data,
        slot: data?.slot || { id: '', label: '', position: undefined },
        resolvedPrizeIndex: 0,
        resolvedSegment: null,
      },
    };
  }

  const resolvedPrizeIndex = clampIndex(findSegmentIndex(data, segments), safeSegmentsLength);
  const resolvedSegment = segments[resolvedPrizeIndex] ?? null;

  console.log('🎯 Prize resolution summary:', {
    backendPrizeIndex: data?.prizeIndex,
    backendSlotId: data?.slot?.id,
    backendSlotLabel: data?.slot?.label,
    backendSlotPosition: data?.slot?.position,
    resolvedPrizeIndex,
    resolvedSegmentId: resolvedSegment?.id,
    resolvedSegmentLabel: resolvedSegment?.label,
    resolvedSegmentPosition: resolvedSegment?.position,
  });

  // Create normalized result with resolved information
  const normalizedSlotId = normalizeId(resolvedSegment?.id) ?? normalizeId(data?.slot?.id) ?? '';
  const normalizedSlotLabel = resolvedSegment?.label ?? data?.slot?.label ?? '';
  const normalizedSlotPosition = resolvedSegment?.position ?? data?.slot?.position;

  const normalizedResult: PlayResponse = {
    ...data,
    slot: {
      id: normalizedSlotId,
      label: normalizedSlotLabel,
      position: normalizedSlotPosition,
    },
    resolvedPrizeIndex,
    resolvedSegment: resolvedSegment ? {
      id: normalizeId(resolvedSegment.id) ?? normalizedSlotId,
      label: resolvedSegment.label,
      isWinning: resolvedSegment.isWinning,
      position: resolvedSegment.position,
    } : undefined,
  };

  return {
    resolvedPrizeIndex,
    resolvedSegment,
    normalizedResult,
  };
}

/**
 * Update spin result with pointer-based detection for real-time sync
 * This ensures the result modal shows the correct prize even during wheel animation
 */
export function updateSpinResultWithPointer(
  currentResult: PlayResponse,
  pointerIndex: number,
  segments: WheelSlot[]
): PlayResponse {
  if (!currentResult || segments.length === 0) {
    return currentResult;
  }

  const resolvedPointerIndex = clampIndex(pointerIndex, segments.length);
  const pointerSegment = segments[resolvedPointerIndex];

  if (!pointerSegment) {
    return currentResult;
  }

  const derivedId = normalizeId(pointerSegment.id) ?? normalizeId(currentResult.slot?.id) ?? '';

  const updatedResult: PlayResponse = {
    ...currentResult,
    slot: {
      ...currentResult.slot,
      id: derivedId,
      label: pointerSegment.label,
      position: pointerSegment.position,
    },
    resolvedPrizeIndex: resolvedPointerIndex,
    resolvedSegment: currentResult.resolvedSegment
      ? {
          ...currentResult.resolvedSegment,
          id: currentResult.resolvedSegment.id || derivedId,
          label: pointerSegment.label,
          position: pointerSegment.position,
        }
      : {
          id: derivedId,
          label: pointerSegment.label,
          isWinning: pointerSegment.isWinning,
          position: pointerSegment.position,
        },
  };

  const hasResultChanged =
    currentResult.resolvedPrizeIndex !== updatedResult.resolvedPrizeIndex ||
    currentResult.slot.label !== updatedResult.slot.label ||
    currentResult.slot.id !== updatedResult.slot.id;

  if (hasResultChanged) {
    console.log('✅ Synchronizing spin result metadata with pointer detection', {
      pointerIndex: resolvedPointerIndex,
      segmentLabel: updatedResult.resolvedSegment?.label,
      segmentId: updatedResult.resolvedSegment?.id,
    });
  }

  return updatedResult;
}