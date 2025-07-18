# QR Code URL Fix

## Issue
When scanning QR codes generated by the wheel system, users were being redirected to `dashboard.izikado.fr` instead of the correct domain `roue.izikado.fr`.

## Root Cause
The issue was caused by incorrect URL configurations in multiple places:

1. **Environment Variable**: The `FRONTEND_URL` in `apps/api/.env` was set to `https://dashboard.izikado.fr`
2. **Fallback URLs**: Default fallback URLs in `apps/api/src/utils/mailer.ts` were pointing to `dashboard.izikado.fr`
3. **Dynamic URL Generation**: In `apps/api/src/controllers/public.controller.ts`, the QR code update logic was using `process.env.PUBLIC_URL` which could resolve to the wrong domain

## Solution Applied

### 1. Fixed Environment Variable
**File**: `apps/api/.env`
```diff
- FRONTEND_URL="https://dashboard.izikado.fr"
+ FRONTEND_URL="https://roue.izikado.fr"
```

### 2. Fixed Fallback URLs in Mailer
**File**: `apps/api/src/utils/mailer.ts`
```diff
- const frontendUrl = process.env.FRONTEND_URL || 'https://dashboard.izikado.fr';
+ const frontendUrl = process.env.FRONTEND_URL || 'https://roue.izikado.fr';
```

### 3. Fixed Dynamic QR Code Generation
**File**: `apps/api/src/controllers/public.controller.ts`
```diff
- const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
+ const baseUrl = 'https://roue.izikado.fr';
```

## Files Modified
- `apps/api/.env` - Updated FRONTEND_URL environment variable
- `apps/api/src/utils/mailer.ts` - Fixed fallback URLs for invite and password reset emails
- `apps/api/src/controllers/public.controller.ts` - Hardcoded correct URL for QR code generation

## Impact
- ✅ QR codes now correctly redirect to `roue.izikado.fr/redeem/{playId}`
- ✅ Password reset emails use the correct domain
- ✅ Invitation emails use the correct domain
- ✅ All wheel-related URLs are consistent

## Testing
After applying these changes:
1. Generate a new wheel QR code
2. Scan the QR code
3. Verify it redirects to `roue.izikado.fr/play/company/{wheelId}`
4. Win a prize and verify the redemption QR code points to `roue.izikado.fr/redeem/{playId}`

## Notes
- The wheel creation QR codes (for playing) were already using the correct URL
- The issue was specifically with prize redemption QR codes and email links
- All URL generation is now consistent across the application 