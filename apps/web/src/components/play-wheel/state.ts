import type { AppState, AppAction, UserFlowState, CurrentStep } from './types';

export const initialState: AppState = {
  mustSpin: false,
  prizeIndex: 0,
  spinResult: null,
  showConfetti: false,
  showResultModal: false,
  showSocialRedirect: false,
  hasCompletedSocialAction: false,
  isLoading: false,
  showClaimForm: false,
  currentStep: 'initial',
  claimFormData: null,
  showThankyouMessage: false,
  userFlowState: 'initial',
  showRulesModal: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MUST_SPIN':
      return { ...state, mustSpin: action.payload };
    case 'SET_PRIZE_INDEX':
      return { ...state, prizeIndex: action.payload };
    case 'SET_SPIN_RESULT':
      return { ...state, spinResult: action.payload };
    case 'SET_SHOW_CONFETTI':
      return { ...state, showConfetti: action.payload };
    case 'SET_SHOW_RESULT_MODAL':
      return { ...state, showResultModal: action.payload };
    case 'SET_SHOW_SOCIAL_REDIRECT':
      return { ...state, showSocialRedirect: action.payload };
    case 'SET_HAS_COMPLETED_SOCIAL_ACTION':
      return { ...state, hasCompletedSocialAction: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SHOW_CLAIM_FORM':
      return { ...state, showClaimForm: action.payload };
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_CLAIM_FORM_DATA':
      return { ...state, claimFormData: action.payload };
    case 'SET_SHOW_THANKYOU_MESSAGE':
      return { ...state, showThankyouMessage: action.payload };
    case 'SET_USER_FLOW_STATE':
      return { ...state, userFlowState: action.payload };
    case 'SET_SHOW_RULES_MODAL':
      return { ...state, showRulesModal: action.payload };
    case 'RESET_WHEEL_STATE':
      return {
        ...state,
        mustSpin: false,
        spinResult: null,
        showConfetti: false,
        showResultModal: false,
        showClaimForm: false,
        showThankyouMessage: false,
        currentStep: 'spinWheel',
        userFlowState: 'completedSocial',
      };
    default:
      return state;
  }
}