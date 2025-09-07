# Slot Utils - Wheel Slot Sorting and Formatting

This utility module provides shared functions for consistent slot ordering and wheel data formatting across the backend.

## Purpose

The main purpose is to ensure that wheel slots are sorted in exactly the same way on both backend and frontend to prevent prize mismatches when the wheel spins.

## Key Functions

### `applyStableSorting(slots)`

Applies stable sorting to an array of slots:
- Primary sort: by `position` field (ascending)
- Secondary sort: by `id` field (lexicographic) when positions are equal
- Positions that are `null` or `undefined` are treated as `999`

This ensures consistent ordering even when multiple slots have the same position value.

### `formatSlotForResponse(slot)`

Formats a single slot object for API response, including only the necessary fields:
- `id`
- `label`
- `color`
- `weight`
- `isWinning`
- `position`

### `formatWheelResponse(wheel)`

Formats a complete wheel object for API response:
- Includes all wheel metadata fields
- Applies stable sorting to slots
- Maps slots through `formatSlotForResponse`

## Usage Example

```typescript
import { formatWheelResponse } from '../utils/slot-utils';

// In a controller
const wheel = await prisma.wheel.findUnique({
  where: { id: wheelId },
  include: { slots: true }
});

return res.json(formatWheelResponse(wheel));
```

## Important Notes

1. **Consistency is Critical**: The sorting algorithm must match exactly between backend and frontend to ensure the wheel stops on the correct prize.

2. **Position Field**: The `position` field on slots determines their visual order on the wheel. Slots without a position are sorted to the end.

3. **Stable Sorting**: Using the slot ID as a tiebreaker ensures that the order is deterministic even when positions are equal.
