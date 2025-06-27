# Prize Claim Flow Fix

## Problem Description

The issue was that prizes remained "en attente" (PENDING) status until the client filled out the form, but the system wasn't properly implementing the two-step prize claim process.

## Root Cause

The frontend `RedeemPrize` component was skipping the claim step and going directly from `PENDING` to `REDEEMED` status, bypassing the `CLAIMED` status that should occur when the user fills out their contact information.

## Solution

### Database Schema
The system already had the correct 3-status flow in the database:

```prisma
enum RedemptionStatus {
  PENDING   // Prize won, waiting for user to claim
  CLAIMED   // User filled form, waiting for PIN redemption  
  REDEEMED  // Prize physically redeemed with PIN
}
```

### Backend API
The backend already had the correct endpoints:

1. **GET `/public/plays/:playId`** - Get prize details
2. **POST `/public/plays/:playId/claim`** - Claim prize with contact info (PENDING → CLAIMED)
3. **POST `/public/plays/:playId/redeem`** - Redeem prize with PIN (CLAIMED → REDEEMED)

### Frontend Fix
Updated `apps/web/src/pages/RedeemPrize.tsx` to properly handle all three statuses:

#### Status: PENDING
- Shows contact form (name, email, phone)
- Calls `/claim` endpoint
- Updates status to CLAIMED
- Sends email with PIN

#### Status: CLAIMED  
- Shows PIN input form
- Displays confirmation that prize was claimed
- Calls `/redeem` endpoint
- Updates status to REDEEMED

#### Status: REDEEMED
- Shows "already redeemed" message
- Prevents further actions

## Complete Flow

```
1. User wins prize → Status: PENDING
2. User visits prize link → Shows contact form
3. User fills contact form → API: /claim → Status: CLAIMED + Email sent
4. User receives email with PIN → Returns to prize link
5. User enters PIN → API: /redeem → Status: REDEEMED
6. Prize is physically redeemed
```

## Key Changes Made

### 1. Updated RedeemPrize Component
- Added `CLAIMED` to status type definition
- Added claim form with name, email, phone fields
- Added `claimPrize` mutation using React Query
- Implemented proper status-based rendering:
  - `PENDING`: Contact form
  - `CLAIMED`: PIN form with success message
  - `REDEEMED`: Already redeemed message

### 2. Enhanced User Experience
- Clear visual progression between steps
- Different colors for different statuses (blue → green → completed)
- Informative messages at each step
- Email confirmation after claiming

### 3. Form Validation
- Required name and email fields
- Email format validation
- PIN format validation (6 digits)
- Proper error handling and user feedback

## Testing

Created `test-prize-claim-flow.js` to verify the complete flow:

```bash
# Test the complete claim flow
node test-prize-claim-flow.js

# Create a test winning play first
node test-prize-claim-flow.js --create-test-play
```

## Benefits

1. **Proper Status Tracking**: Clear distinction between claimed and redeemed
2. **Email Notifications**: Users receive PIN via email after claiming
3. **Better UX**: Step-by-step process with clear instructions
4. **Data Collection**: Contact information collected before redemption
5. **Audit Trail**: Complete tracking of the redemption process

## Backward Compatibility

The fix maintains backward compatibility - if a prize is somehow still in the old flow, it will still work with the PIN input form.

## Related Files Modified

- `apps/web/src/pages/RedeemPrize.tsx` - Main component fix
- `test-prize-claim-flow.js` - New test script
- `PRIZE_CLAIM_FLOW_FIX.md` - This documentation

## Email Integration

The claim process automatically triggers an email with:
- Prize details
- PIN code for redemption
- QR code link for easy access
- Instructions for final redemption

This ensures users have all the information they need to complete the redemption process. 