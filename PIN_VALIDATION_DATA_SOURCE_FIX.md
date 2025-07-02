# PIN Validation Data Source Fix

## Issue
The Prize Validation page was showing "Code PIN introuvable" (PIN not found) errors even when valid PINs existed in the system. The debug information showed:
- Total winning games: 0
- Available PINs: []

## Root Cause
The Prize Validation page was using the wrong API endpoint to fetch data:
- **Wrong**: `api.getActivityDashboard()` - Returns summary/overview data without detailed play records
- **Correct**: `api.getActivityPlays()` - Returns detailed play records including PINs

## Solution Applied

### 1. Updated API Endpoint
Changed the Prize Validation page to use the same data source as the Activity Tracking page:

```typescript
// Before (WRONG)
const response = await api.getActivityDashboard();

// After (CORRECT)
const params = new URLSearchParams({
  limit: '1000', // Get a large number of recent plays
  offset: '0'
});
if (searchTerm) params.append('search', searchTerm);
if (selectedStatus !== 'all') params.append('status', selectedStatus);
const response = await api.getActivityPlays(params.toString());
```

### 2. Updated Data Structure Access
Updated the code to match the response structure from `getActivityPlays`:

```typescript
// Before
const allWinningPlays = prizesData?.recentPlays?.filter((play: any) => play.result === 'WIN') || [];

// After
const allWinningPlays = (prizesData?.success && prizesData.data?.plays) 
  ? prizesData.data.plays.filter((play: any) => play.result === 'WIN') 
  : [];
```

### 3. Updated Filter Logic
Updated the filteredPrizes logic to use the correct data path:

```typescript
// Before
const filteredPrizes = prizesData?.recentPlays?.filter(...) || [];

// After
const filteredPrizes = prizesData?.success ? (prizesData.data?.plays?.filter(...) || []) : [];
```

### 4. Enhanced Debug Information
Updated debug section to show correct data:

```typescript
{prizesData.success && prizesData.data?.plays ? (
  <>
    <br />Total parties: {prizesData.data.plays.length}
    <br />Parties gagnantes: {prizesData.data.plays.filter((p: any) => p.result === 'WIN').length}
    <br />PINs disponibles: {prizesData.data.plays.filter((p: any) => p.result === 'WIN' && p.pin).map((p: any) => p.pin).join(', ') || 'Aucun'}
  </>
) : (
  <>
    <br />Aucune donnée de parties disponible
  </>
)}
```

## API Endpoints Comparison

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `/activity/dashboard` | Overview/summary data | Statistics, overview metrics |
| `/activity/plays` | Detailed play records | Individual play records with PINs, lead info, etc. |

## Expected Results
After this fix:
1. ✅ PIN validation should find existing PINs
2. ✅ Debug information should show actual play data
3. ✅ Prize list should display correctly
4. ✅ Statistics should reflect real data

## Files Modified
- `apps/web/src/pages/PrizeValidation.tsx`

## Testing
1. Navigate to Prize Validation page
2. Check debug information shows play data
3. Enter a valid PIN from the Activity Tracking page
4. Validation should work without "PIN not found" errors 