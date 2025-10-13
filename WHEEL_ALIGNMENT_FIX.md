# COMPREHENSIVE WHEEL ALIGNMENT & MODAL FIX

## Root Causes Identified:

### 1. Coordinate System Issue
- `polarToCartesian` uses `(angle - 90)` which makes 0° point to TOP
- Segments start at index * segAngle (0° for segment 0)
- But there's confusion about what "top" means in the rotation

### 2. CSS Rotation Direction
- CSS `transform: rotate(Rdeg)` rotates CLOCKWISE
- We need to account for this when calculating alignment

### 3. Correct Formula
For a wheel with N segments where pointer is at TOP (0°):
- Segment I center is at: `centerAngle = I * (360/N) + (360/N)/2`
- To bring this to top, rotate wheel by: `R = -centerAngle = 360 - centerAngle`
- This rotates the wheel COUNTER-CLOCKWISE to bring segment to top

### 4. Verification Formula
After rotation R, to find what's at pointer:
- Original angle that's now at 0° is: `(0 - R) % 360 = (360 - R) % 360`
- Find which segment: `Math.floor(angleAtPointer / segAngle)`

## Solution
Implementing clean, tested formulas with extensive logging.
