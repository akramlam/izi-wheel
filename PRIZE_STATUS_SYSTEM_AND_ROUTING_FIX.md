# Prize Status System and Routing Fix

## Issue Description

Users were experiencing 404 errors when clicking "Valider" or "Détails" buttons in the Prize Validation page. The URL `https://dashboard.izikado.fr/redeem/c8dc6826-d779-4fb4-bed3-7f83b3ecf593?admin=true` was returning a "Page not found" error.

## Root Cause Analysis

### 1. Missing Route Configuration
The redemption route `/redeem/:playId` was only configured for the public wheel domain (`roue.izikado.fr`) but missing from the dashboard domain (`dashboard.izikado.fr`) routing configuration.

### 2. Incorrect URL Structure
The Prize Validation page was trying to navigate to `/plays/{playId}/redeem?admin=true` instead of the correct `/redeem/{playId}?admin=true` format.

## Prize Status System Explanation

The system uses three distinct statuses for prize management:

### 1. **"En attente" (PENDING)**
- **Meaning**: Prize not yet claimed by the customer
- **State**: Customer won the prize but hasn't filled in their contact information
- **Actions Available**: None (customer must claim first)
- **Next Step**: Customer needs to visit the redemption link and provide their details

### 2. **"Réclamé" (CLAIMED)**
- **Meaning**: Prize claimed by customer but not yet validated by restaurant
- **State**: Customer has provided their contact information and received a PIN code
- **Actions Available**: 
  - ✅ **"Valider"** button (green) - Validate the prize for pickup
  - 👁️ **"Détails"** button - View prize details and customer information
- **Next Step**: Restaurant validates the prize when customer comes to pick it up

### 3. **"Échangé" (REDEEMED)**
- **Meaning**: Prize fully validated and given to the customer
- **State**: Final state - prize has been picked up by the customer
- **Actions Available**: 
  - 👁️ **"Détails"** button only - View historical information
- **Next Step**: None (process complete)

## Technical Fix Applied

### 1. Added Missing Route to Dashboard Domain

**File**: `apps/web/src/App.tsx`

```typescript
// Added this route to the dashboard domain routing
<Route path="/redeem/:playId" element={<RedeemPrize />} />
```

### 2. Fixed Navigation URLs

**File**: `apps/web/src/pages/PrizeValidation.tsx`

```typescript
// Before (incorrect):
onClick={() => navigate(`/plays/${play.id}/redeem?admin=true`)}

// After (correct):
onClick={() => navigate(`/redeem/${play.id}?admin=true`)}
```

## How the Prize Flow Works

### Customer Side:
1. **Spin Wheel** → Win a prize
2. **Click "Récupérer le lot"** → Navigate to redemption page
3. **Fill Contact Info** → Status changes to CLAIMED, receives PIN via email
4. **Visit Restaurant** → Show PIN or email to restaurant staff

### Restaurant Side:
1. **Check "Validation Cadeaux"** → See CLAIMED prizes
2. **Customer Arrives** → Click "Valider" to validate the prize
3. **Prize Validated** → Status changes to REDEEMED
4. **Give Prize to Customer** → Process complete

## API Endpoints Used

- **GET** `/public/plays/:playId` - Get prize details
- **POST** `/public/plays/:playId/claim` - Claim prize (customer fills info)
- **POST** `/public/plays/:playId/redeem` - Redeem prize (validate with PIN)

## Testing the Fix

1. Navigate to "Validation Cadeaux" page
2. Find a prize with status "Réclamé" (CLAIMED)
3. Click "Valider" or "Détails"
4. Should now successfully navigate to the redemption page
5. Admin validation interface should load correctly

## Expected Behavior After Fix

- ✅ No more 404 errors when clicking validation buttons
- ✅ Proper admin interface for prize validation
- ✅ Clear status indicators for each prize state
- ✅ Seamless workflow from customer claim to restaurant validation

## Files Modified

1. `apps/web/src/App.tsx` - Added redemption route to dashboard domain
2. `apps/web/src/pages/PrizeValidation.tsx` - Fixed navigation URLs

## Related Documentation

- `QR_CODE_PRIZE_VALIDATION_SYSTEM.md` - Original QR to PIN system conversion
- `PIN_VALIDATION_DATA_SOURCE_FIX.md` - Data source fix for PIN validation
- `ACTIVITY_TRACKING_UI_IMPROVEMENTS.md` - UI improvements for activity tracking 