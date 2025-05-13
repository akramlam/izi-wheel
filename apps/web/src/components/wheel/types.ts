export interface WheelSegment {
  label: string;
  color: string;
  iconUrl?: string;
  isWinning?: boolean;
}

export interface WheelConfig {
  segments: WheelSegment[];
  pointerIconUrl?: string;
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