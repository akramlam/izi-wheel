/**
 * Unit tests for wheel alignment math
 * Tests the deterministic alignment rotation function to ensure
 * it correctly calculates rotations for all segment counts and positions
 */

/**
 * Compute deterministic alignment rotation for wheel
 * This is a copy of the function from Wheel.tsx for testing
 */
function computeAlignmentRotation({
  segmentCount,
  prizeIndex,
  pointerAngleDeg = 0,
  biasDeg = 0
}: {
  segmentCount: number;
  prizeIndex: number;
  pointerAngleDeg?: number;
  biasDeg?: number;
}): number {
  if (segmentCount <= 0 || prizeIndex < 0 || prizeIndex >= segmentCount) {
    console.error('Invalid parameters for alignment rotation:', { segmentCount, prizeIndex });
    return 0;
  }

  const segAngle = 360 / segmentCount;
  
  // Segment N's start angle is N * segAngle
  // Segment N's center is at N * segAngle + segAngle/2
  const segmentStartAngle = prizeIndex * segAngle;
  const segmentCenterAngle = segmentStartAngle + segAngle / 2;
  
  // We need to rotate the wheel COUNTER-CLOCKWISE to bring this segment to the pointer
  // Since CSS rotation is clockwise positive, we need 360 - angle
  let alignmentRotation = 360 - segmentCenterAngle + pointerAngleDeg;
  
  // Add bias to avoid landing exactly on borders
  alignmentRotation += biasDeg;
  
  // Normalize to 0-360 range
  alignmentRotation = ((alignmentRotation % 360) + 360) % 360;
  
  return alignmentRotation;
}

/**
 * Calculate which segment is under the pointer given a wheel rotation
 */
function getSegmentUnderPointer(rotation: number, segmentCount: number): number {
  const segAngle = 360 / segmentCount;
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  return Math.floor((360 - normalizedRotation) / segAngle) % segmentCount;
}

/**
 * Test the alignment math for perfect accuracy
 */
function testAlignmentMath(): { passed: number; failed: number; errors: string[] } {
  const results = { passed: 0, failed: 0, errors: [] as string[] };
  
  // Test for segment counts from 3 to 12
  for (let segmentCount = 3; segmentCount <= 12; segmentCount++) {
    // Test each possible prize index
    for (let prizeIndex = 0; prizeIndex < segmentCount; prizeIndex++) {
      // Test without bias first
      const rotation = computeAlignmentRotation({
        segmentCount,
        prizeIndex,
        pointerAngleDeg: 0,
        biasDeg: 0
      });
      
      const segmentUnderPointer = getSegmentUnderPointer(rotation, segmentCount);
      
      if (segmentUnderPointer === prizeIndex) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(
          `FAIL: segments=${segmentCount}, target=${prizeIndex}, got=${segmentUnderPointer}, rotation=${rotation.toFixed(2)}°`
        );
      }
      
      // Test with small bias (should still work)
      const segAngle = 360 / segmentCount;
      const biasedRotation = computeAlignmentRotation({
        segmentCount,
        prizeIndex,
        pointerAngleDeg: 0,
        biasDeg: segAngle * 0.1 // 10% of segment angle
      });
      
      const biasedSegment = getSegmentUnderPointer(biasedRotation, segmentCount);
      
      if (biasedSegment === prizeIndex) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push(
          `FAIL (biased): segments=${segmentCount}, target=${prizeIndex}, got=${biasedSegment}, rotation=${biasedRotation.toFixed(2)}°`
        );
      }
    }
  }
  
  return results;
}

/**
 * Run the tests and log results
 */
export function runWheelAlignmentTests(): void {
  console.log('🧪 Running wheel alignment math tests...');
  
  const results = testAlignmentMath();
  
  console.log(`🧪 Test Results: ${results.passed} passed, ${results.failed} failed`);
  
  if (results.failed > 0) {
    console.error('❌ Failed tests:');
    results.errors.forEach(error => console.error(error));
  } else {
    console.log('✅ All alignment tests passed!');
  }
}

// Export for potential manual testing
export { computeAlignmentRotation, getSegmentUnderPointer, testAlignmentMath };