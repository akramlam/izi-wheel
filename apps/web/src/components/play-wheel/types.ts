// Play wheel related types and interfaces

export interface FormSchema {
  fields?: FormField[];
  [key: string]: any;
}

export interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

export interface WheelSlot {
  id: string;
  label: string;
  color: string;
  weight: number;
  isWinning: boolean;
  position?: number;
}

export interface Prize {
  pin: string;
  qrLink: string;
}

export interface PlayData {
  id: string;
  result: 'WIN' | 'LOSE';
  prize?: Prize;
}

export type WheelData = {
  id: string;
  name: string;
  formSchema: FormSchema | null;
  slots: WheelSlot[];
  socialNetwork?: string;
  redirectUrl?: string;
  redirectText?: string;
  playLimit?: string;
  gameRules?: string;
  footerText?: string;
  mainTitle?: string;
  bannerImage?: string;
  backgroundImage?: string;
};

export type PlayResponse = {
  play: PlayData;
  slot: {
    id: string;
    label: string;
    position?: number;
  };
  /**
   * Frontend-resolved information to keep the UI in sync with the wheel animation.
   * These fields are not guaranteed to exist in the backend response but allow
   * us to normalise what we display to the player.
   */
  resolvedPrizeIndex?: number;
  resolvedSegment?: {
    id: string;
    label: string;
    isWinning?: boolean;
    position?: number;
  };
};

export type UserFlowState = 'initial' | 'completedSocial' | 'spinning' | 'won' | 'claimed';
export type CurrentStep = 'initial' | 'social' | 'spinWheel' | 'showPrize' | 'claimForm';

export interface AppState {
  mustSpin: boolean;
  prizeIndex: number;
  spinResult: PlayResponse | null;
  showConfetti: boolean;
  showResultModal: boolean;
  showSocialRedirect: boolean;
  hasCompletedSocialAction: boolean;
  isLoading: boolean;
  showClaimForm: boolean;
  currentStep: CurrentStep;
  claimFormData: any;
  showThankyouMessage: boolean;
  userFlowState: UserFlowState;
  showRulesModal: boolean;
}

export type AppAction =
  | { type: 'SET_MUST_SPIN'; payload: boolean }
  | { type: 'SET_PRIZE_INDEX'; payload: number }
  | { type: 'SET_SPIN_RESULT'; payload: PlayResponse | null }
  | { type: 'SET_SHOW_CONFETTI'; payload: boolean }
  | { type: 'SET_SHOW_RESULT_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_SOCIAL_REDIRECT'; payload: boolean }
  | { type: 'SET_HAS_COMPLETED_SOCIAL_ACTION'; payload: boolean }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_SHOW_CLAIM_FORM'; payload: boolean }
  | { type: 'SET_CURRENT_STEP'; payload: CurrentStep }
  | { type: 'SET_CLAIM_FORM_DATA'; payload: any }
  | { type: 'SET_SHOW_THANKYOU_MESSAGE'; payload: boolean }
  | { type: 'SET_USER_FLOW_STATE'; payload: UserFlowState }
  | { type: 'SET_SHOW_RULES_MODAL'; payload: boolean }
  | { type: 'RESET_WHEEL_STATE' };