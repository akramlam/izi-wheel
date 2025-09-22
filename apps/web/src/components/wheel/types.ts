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