# Wheel Slot Alignment Fix

## Problem Description

**Issue**: "Lot gagné ne correspond pas à la flèche" - The prize won doesn't match where the wheel arrow points.

**Root Cause**: There was a mismatch between the slot order returned by the API and the slot order used during the spin logic. The frontend and backend spin logic both used stable sorting, but the API endpoints were returning slots in database order without applying the same stable sorting.

## Root Cause Analysis

### Backend Logic
1. **API Endpoints** (`getPublicWheel`, `getCompanyWheel`): Returned slots with `orderBy: { position: 'asc' }` from database
2. **Spin Logic** (`spinWheel`): Used `applyStableSorting()` function for slot selection
3. **Mismatch**: Database order ≠ Stable sorted order when slots had same positions or undefined positions

### Frontend Logic
1. **Wheel Display**: Applied stable sorting to received slots for visual wheel
2. **Spin Animation**: Used sorted array indexes for wheel animation
3. **Result**: When backend selected slot using stable sorting but frontend received unsorted data, the visual position didn't match the actual winning slot

## Permanent Solution

### Fixed Files
- `apps/api/src/controllers/public.controller.ts`

### Changes Made

**Before**: API endpoints returned slots in database order
```typescript
slots: wheel.slots.map(slot => ({
  id: slot.id,
  label: slot.label,
  // ... other fields
}))
```

**After**: API endpoints now apply stable sorting consistently
```typescript
slots: applyStableSorting(wheel.slots).map(slot => ({
  id: slot.id,
  label: slot.label,
  // ... other fields
}))
```

### Stable Sorting Logic
The `applyStableSorting` function ensures consistent ordering:

```typescript
function applyStableSorting(slots: any[]) {
  return [...slots].sort((a, b) => {
    const posA = a.position !== undefined ? a.position : 999;
    const posB = b.position !== undefined ? b.position : 999;
    
    // If positions are equal, use slot ID as stable tiebreaker
    if (posA === posB) {
      return a.id.localeCompare(b.id);
    }
    
    return posA - posB;
  });
}
```

## Verification

### All API Endpoints Now Use Stable Sorting
1. ✅ `getPublicWheel` - All return paths
2. ✅ `getCompanyWheel` - Company route
3. ✅ `spinWheel` - Selection logic (already fixed)

### Frontend Handling
- ✅ Frontend applies same stable sorting to received data
- ✅ Proper fallback handling for mismatches
- ✅ Clear error messages if issues persist

## Benefits

1. **Consistent Ordering**: Frontend and backend now use identical slot ordering
2. **Visual Accuracy**: Wheel arrow points to the correct winning slot
3. **No More Mismatches**: Eliminates the "lot gagné ne correspond pas à la flèche" issue
4. **Stable Behavior**: Consistent results across all wheel interactions
5. **Future-Proof**: Any new API endpoints will use the same stable sorting pattern

## Testing

The fix ensures that:
- When backend selects slot at index X using stable sorting
- Frontend receives slots in the same stable sorted order
- Frontend wheel animation points to correct slot at index X
- User sees the correct visual match between arrow and won prize

## Backward Compatibility

This fix is fully backward compatible:
- Existing wheels continue to work
- No database migrations required
- No frontend changes required
- Maintains all existing functionality

## Related Issues Fixed

- Prize won doesn't match wheel arrow position
- Visual desynchronization between wheel display and results
- Inconsistent slot ordering between API and spin logic
- Confusing user experience with mismatched results 