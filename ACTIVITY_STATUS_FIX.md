# Activity Status Display Fix

## Issue
In the Activity Tracking page (`https://dashboard.izikado.fr/activity`), when users lost a game (didn't win a prize), the status column was incorrectly showing "En attente" (Pending) instead of showing that the game was lost.

## Root Cause
The issue was in the `ActivityTracking.tsx` component where the status column was displaying `redemptionStatus` for all plays, including losing plays. However, losing plays don't have a meaningful redemption status since there's no prize to redeem.

**Problem Code:**
```tsx
<td className="py-3 px-4">
  {getStatusBadge(play.redemptionStatus)}
  {/* ... other status info ... */}
</td>
```

This would show "En attente" (Pending) for all plays because losing plays would have a `PENDING` redemption status by default, which doesn't make sense.

## Solution Applied

### Modified Status Display Logic
**File**: `apps/web/src/pages/ActivityTracking.tsx`

Changed the status column to conditionally display different content based on whether the play was a win or loss:

```tsx
<td className="py-3 px-4">
  {play.result === 'WIN' ? (
    <>
      {getStatusBadge(play.redemptionStatus)}
      {play.claimedAt && (
        <div className="text-xs text-gray-500 mt-1">
          Réclamé: {formatDate(play.claimedAt)}
        </div>
      )}
      {play.redeemedAt && (
        <div className="text-xs text-gray-500 mt-1">
          Échangé: {formatDate(play.redeemedAt)}
        </div>
      )}
    </>
  ) : (
    <Badge className="bg-gray-100 text-gray-800 border-gray-200">
      <XCircle className="w-3 h-3 mr-1" />
      Perdu
    </Badge>
  )}
</td>
```

## Result
Now the activity tracking page correctly shows:

### For Winning Plays:
- **"En attente"** (Pending) - when prize hasn't been claimed yet
- **"Réclamé"** (Claimed) - when user has claimed the prize
- **"Échangé"** (Redeemed) - when prize has been validated/redeemed

### For Losing Plays:
- **"Perdu"** (Lost) - clearly indicates the user didn't win anything

## Benefits
1. **Clear Status Communication**: Users and admins can immediately understand the outcome
2. **Logical Status Flow**: Only winning plays show redemption statuses
3. **Better UX**: No more confusing "Pending" status for lost games
4. **Consistent Design**: Uses the same badge styling as other status indicators

## Testing
- ✅ Build successful
- ✅ TypeScript compilation passes
- ✅ Maintains existing functionality for winning plays
- ✅ Properly displays "Perdu" for losing plays

The fix ensures that the activity tracking page provides accurate and meaningful status information for all game outcomes. 