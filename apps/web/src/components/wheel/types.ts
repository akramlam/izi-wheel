export interface WheelSegment {
  id?: string;
  label: string;
  color: string;
  iconUrl?: string;
  isWinning?: boolean;
  /**
   * Optional original position index coming from the backend configuration.
   * This helps map API responses back to the exact frontend segment.
   */
  position?: number;

}

export interface WheelSpinResult {
  /**
   * Zero-based index of the segment detected under the physical pointer when
   * the animation finished. Always clamped to the available segment range.
   */
  pointerIndex: number;
  /**
   * Zero-based index that the consumer requested for the spin. Allows the
   * caller to detect and react to any discrepancies.
   */
  expectedIndex: number;
  /**
   * Indicates whether the detected pointer index already matched the expected
   * index without needing any consumer-side correction.
   */
  isAligned: boolean;
}

export interface WheelConfig {
  segments: WheelSegment[];
  pointerIconUrl?: string;
  // Degrees clockwise from top (0° at top). Allows pointer calibration if needed.
  pointerAngleDeg?: number;
  spinDurationMin: number;
  spinDurationMax: number;
  colors?: {
    border?: string;
    background?: string;
    primaryGradient?: string;
    secondaryGradient?: string;
    pointer?: string;
    pointerBorder?: string;
  };
  sounds?: {
    tick?: boolean;
    win?: boolean;
  };
  hapticFeedback?: boolean;
  centerLogo?: string;
} 