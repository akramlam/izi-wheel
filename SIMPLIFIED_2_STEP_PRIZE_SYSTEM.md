# Simplified 2-Step Prize System Implementation

## Overview

The prize status system has been simplified from 3 steps to 2 steps as requested:

**Previous System (3 steps):**
- "En attente" (PENDING) - Prize not yet claimed by customer
- "Réclamé" (CLAIMED) - Prize claimed by customer but not yet validated by restaurant
- "Échangé" (REDEEMED) - Prize fully validated and given to customer

**New System (2 steps):**
- "En attente" (PENDING) - Both when client hasn't filled form AND when they have filled it
- "Récupéré" (REDEEMED) - When client has retrieved their prize from the restaurant

## Changes Made

### 1. Database Schema Updates

**File:** `apps/api/prisma/schema.prisma`
- Updated `RedemptionStatus` enum to remove `CLAIMED` status
- Now only contains `PENDING` and `REDEEMED`

**Migration:** `apps/api/prisma/migrations/20241218000000_simplify_prize_status_to_two_steps/migration.sql`
- Updates all existing `CLAIMED` statuses to `PENDING`
- Recreates the enum with only two values
- Updates database to use the new enum structure

### 2. Frontend Updates

#### Activity Tracking Page
**File:** `apps/web/src/pages/ActivityTracking.tsx`

- Updated `getStatusBadge()` function to remove `CLAIMED` status
- Changed "Échangé" label to "Récupéré"
- Updated filter dropdown to remove `CLAIMED` option
- Updated statistics cards:
  - Removed "Réclamés" card
  - Updated "Échangés" to "Récupérés"
  - Changed grid layout from 5 columns to 4 columns
- Updated interface types to remove `CLAIMED` from `redemptionStatus`
- Removed `claimedAt` timestamp display in status column
- Updated `redeemedAt` timestamp to show "Récupéré" instead of "Échangé"

#### Prize Validation Page
**File:** `apps/web/src/pages/PrizeValidation.tsx`

- Updated `PrizeRecord` interface to remove `CLAIMED` status
- Updated `getPrizeStatusBadge()` function to remove `CLAIMED` and change "Échangé" to "Récupéré"
- Updated filter dropdown to remove `CLAIMED` option
- Updated statistics cards:
  - Removed "Cadeaux Réclamés" card
  - Updated "Cadeaux Échangés" to "Cadeaux Récupérés"
  - Changed grid layout from 3 columns to 2 columns
- Updated validation button logic to show for `PENDING` status instead of `CLAIMED`

### 3. Backend Updates

#### Activity Tracking Controller
**File:** `apps/api/src/controllers/activity-tracking.controller.ts`

- Removed `claimedCount` calculation from statistics
- Updated `getPlayHistory()` to remove `claimed` field from statistics
- Updated `getTraceabilityDashboard()` to remove `totalClaimed` statistics
- Updated rate calculations to use `totalRedeemed / totalWins` instead of separate claim/redeem rates
- Fixed TypeScript linting error in CSV export function

## New Prize Flow

### Customer Side:
1. **Spin Wheel** → Win a prize (status: PENDING)
2. **Fill Contact Info** → Prize remains PENDING (no status change)
3. **Visit Restaurant** → Show PIN or email to restaurant staff

### Restaurant Side:
1. **Check "Validation Cadeaux"** → See PENDING prizes
2. **Customer Arrives** → Click "Valider" to validate the prize
3. **Prize Validated** → Status changes to REDEEMED (Récupéré)
4. **Give Prize to Customer** → Process complete

## Benefits of Simplified System

1. **Reduced Complexity**: Fewer states to manage and understand
2. **Clearer User Experience**: Only two clear states - waiting or retrieved
3. **Simplified Admin Interface**: Fewer filter options and status badges
4. **Streamlined Workflow**: Direct path from claiming to pickup without intermediate states

## Migration Strategy

The migration automatically converts all existing `CLAIMED` prizes to `PENDING` status, ensuring continuity of the prize validation process. Restaurants can continue to validate prizes that customers have already claimed.

## Files Modified

### Database
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20241218000000_simplify_prize_status_to_two_steps/migration.sql`

### Frontend
- `apps/web/src/pages/ActivityTracking.tsx`
- `apps/web/src/pages/PrizeValidation.tsx`

### Backend
- `apps/api/src/controllers/activity-tracking.controller.ts`

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Activity Tracking page shows correct 2-step statuses
- [ ] Prize Validation page shows correct 2-step statuses  
- [ ] Filter dropdowns work with new status values
- [ ] Statistics cards show correct counts
- [ ] Prize validation buttons work correctly
- [ ] PIN validation still works for both statuses
- [ ] Export functionality works with new status structure