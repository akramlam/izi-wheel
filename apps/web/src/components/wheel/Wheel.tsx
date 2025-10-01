diff --git a/apps/web/src/components/wheel/Wheel.tsx b/apps/web/src/components/wheel/Wheel.tsx
index 120eb4219728fef103206842dec456654b980df0..959ee95ae4bf9526b53dc0aaef97c2365615138e 100644
--- a/apps/web/src/components/wheel/Wheel.tsx
+++ b/apps/web/src/components/wheel/Wheel.tsx
@@ -29,50 +29,56 @@ const getWheelSize = () => {
 
 const WHEEL_SIZE = 500; // Base size for viewBox calculations
 const CENTER = WHEEL_SIZE / 2;
 const RADIUS = CENTER - 30;
 const TEXT_DISTANCE = RADIUS * 0.75;
 
 // Responsive font size
 const getResponsiveFontSize = () => {
   if (typeof window !== 'undefined') {
     const screenWidth = window.innerWidth;
     if (screenWidth < 480) return 16; // Mobile phones
     if (screenWidth < 768) return 18; // Small tablets
     if (screenWidth < 1024) return 20; // Tablets
     if (screenWidth < 1440) return 24; // Small desktop (increased from 22)
     if (screenWidth < 1920) return 26; // Large desktop (new)
     return 28; // Extra large screens (new)
   }
   return 24; // Default for SSR (increased from 22)
 };
 
 const NEW_FONT_SIZE = 22;
 const TEXT_RECT_MIN_WIDTH = 40;
 const TEXT_RECT_MAX_WIDTH = 120;
 const TEXT_RECT_HEIGHT = 34;
 
+const FALLBACK_SEGMENTS: WheelConfig['segments'] = [
+  { label: 'Prix 1', color: '#FF6384', isWinning: true },
+  { label: 'Prix 2', color: '#36A2EB', isWinning: false },
+  { label: 'Prix 3', color: '#FFCE56', isWinning: false }
+];
+
 // Default brand colors
 const DEFAULT_COLORS = {
   primaryGradient: '#a25afd',   // Violet
   secondaryGradient: '#6366f1', // Indigo
   border: '#ffffff',
   background: 'rgba(255, 255, 255, 0.1)',
   pointer: '#ffffff',
   pointerBorder: '#a25afd',
   textColor: '#ffffff'  // Default text color
 };
 
 // Helper functions for SVG path calculations with rounded segments
 function getArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
   const start = polarToCartesian(cx, cy, r, endAngle);
   const end = polarToCartesian(cx, cy, r, startAngle);
   const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
   
   // Add slight curve to make segments more rounded
   const innerRadius = r * 0.15; // Inner radius for rounded effect
   const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
   const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
   
   return [
     'M', startInner.x, startInner.y,
     'L', start.x, start.y,
diff --git a/apps/web/src/components/wheel/Wheel.tsx b/apps/web/src/components/wheel/Wheel.tsx
index 120eb4219728fef103206842dec456654b980df0..959ee95ae4bf9526b53dc0aaef97c2365615138e 100644
--- a/apps/web/src/components/wheel/Wheel.tsx
+++ b/apps/web/src/components/wheel/Wheel.tsx
@@ -183,144 +189,169 @@ function formatTextForWheel(text: string, maxCharsPerLine: number = 12, maxLines
   }
   
   return lines.filter(line => line.length > 0);
 }
 
 // Main Wheel component
 const Wheel: React.FC<WheelProps> = ({
   config,
   isSpinning,
   prizeIndex,
   onSpin,
   showSpinButton = false,
   onSpinStart,
   onSpinComplete,
 }) => {
   // State for animation and interaction
   const [rotation, setRotation] = useState(0);
   const [pointerDropped, setPointerDropped] = useState(false);
   const [spinning, setSpinning] = useState(false);
   const [spinSeconds, setSpinSeconds] = useState<number>(5);
   
   // References
   const wheelRef = useRef<SVGSVGElement>(null);
   const pointerRef = useRef<HTMLDivElement>(null);
   const segmentRefs = useRef<(SVGPathElement | null)[]>([]);
-  
+
   // Add default segments if segments are empty or invalid
-  const segments = (!config.segments || config.segments.length === 0) 
-    ? [
-        { label: 'Prix 1', color: '#FF6384', isWinning: true },
-        { label: 'Prix 2', color: '#36A2EB', isWinning: false },
-        { label: 'Prix 3', color: '#FFCE56', isWinning: false }
-      ] 
-    : config.segments;
+  const segments = config.segments && config.segments.length > 0
+    ? config.segments
+    : FALLBACK_SEGMENTS;
+
+  const clampedPrizeIndex = segments.length
+    ? Math.min(Math.max(prizeIndex, 0), segments.length - 1)
+    : 0;
     
   // Calculate segment angle and prepare refs array
   const segAngle = 360 / segments.length;
-  
+
   // Initialize sound system
   useEffect(() => {
     soundUtils.init();
   }, []);
+
+  // Debug logging to verify frontend slot ordering and pointer target mapping
+  useEffect(() => {
+    if (process.env.NODE_ENV === 'production') {
+      return;
+    }
+
+    const segmentDebug = segments.map((segment, index) => {
+      const position = (segment as any)?.position ?? 'n/a';
+      const id = (segment as any)?.id ?? 'no-id';
+      return `[${index}] pos=${position} label="${segment.label ?? 'UNKNOWN'}" id=${id}`;
+    });
+
+    console.log('🎯 Wheel segments order (normalized):', segmentDebug);
+  }, [segments]);
+
+  useEffect(() => {
+    if (process.env.NODE_ENV === 'production') {
+      return;
+    }
+
+    const targetSegment = segments[clampedPrizeIndex];
+    console.log('🎯 Wheel prize index received:', {
+      prizeIndex,
+      clampedPrizeIndex,
+      segmentCount: segments.length,
+      targetLabel: targetSegment?.label ?? 'UNKNOWN',
+      targetId: (targetSegment as any)?.id ?? 'no-id'
+    });
+  }, [clampedPrizeIndex, prizeIndex, segments]);
   
   // Add responsive wheel size state
   const [wheelDisplaySize, setWheelDisplaySize] = useState(getWheelSize());
   const [responsiveFontSize, setResponsiveFontSize] = useState(getResponsiveFontSize());
 
   // Update wheel size on window resize
   useEffect(() => {
     const handleResize = () => {
       setWheelDisplaySize(getWheelSize());
       setResponsiveFontSize(getResponsiveFontSize());
     };
 
     window.addEventListener('resize', handleResize);
     // Set initial size
     handleResize();
 
     return () => window.removeEventListener('resize', handleResize);
   }, []);
   
   // Handle spin animation with physics-based easing
   useEffect(() => {
     if (isSpinning && !spinning) {
       console.log('🎬 Starting wheel animation, isSpinning:', isSpinning, 'spinning:', spinning);
       console.log('🎯 Target prizeIndex:', prizeIndex, 'Total segments:', segments.length);
       
       // Stop any previous sounds and timers first
       soundUtils.stop();
       
       // Set spinning state to prevent multiple animations
       setSpinning(true);
       setPointerDropped(false);
       
       // Random spin duration within configured range
       const duration = Math.random() * 
         (config.spinDurationMax - config.spinDurationMin) + 
         config.spinDurationMin;
       setSpinSeconds(duration);
       if (typeof onSpinStart === 'function') {
         try { onSpinStart(duration); } catch {}
       }
       
       // Calculate target rotation: Multiple full rotations + offset to prize
       const rotations = 5 + Math.random() * 3; // 5-8 full rotations
       
       // Use the deterministic alignment function
       const pointerAngle = typeof config.pointerAngleDeg === 'number' ? config.pointerAngleDeg : 0;
       const biasDeg = segAngle * 0.1; // Small bias to avoid border landings
 
-      // POTENTIAL FIX: Try an offset correction to account for visual/calculation mismatch
-      // If segments are visually offset from calculation, adjust here
-      // Based on observation: wheel lands 1 segment clockwise from expected
-      const offsetCorrection = segAngle; // Try +1 segment offset (120 degrees for 3 segments)
-
       const alignmentRotation = computeAlignmentRotation({
         segmentCount: segments.length,
-        prizeIndex,
-        pointerAngleDeg: pointerAngle + offsetCorrection,
+        prizeIndex: clampedPrizeIndex,
+        pointerAngleDeg: pointerAngle,
         biasDeg
       });
 
       // Add multiple full rotations for visual effect
       const target = 360 * rotations + alignmentRotation;
 
       let correctionDelta = 0;
       
       console.log('🎯 Deterministic rotation calculation:', {
         prizeIndex,
         segAngle,
         segmentCount: segments.length,
-        pointerAngle: 0,
+        pointerAngle,
         biasDeg,
         alignmentRotation,
         totalRotations: rotations,
         finalRotation: target,
         segmentLabels: segments.map((s, i) => `${i}: ${s.label}`),
-        targetSegmentLabel: segments[prizeIndex]?.label || 'UNKNOWN',
-        targetSegmentId: segments[prizeIndex]?.id || 'NO_ID',
+        targetSegmentLabel: segments[clampedPrizeIndex]?.label || 'UNKNOWN',
+        targetSegmentId: segments[clampedPrizeIndex]?.id || 'NO_ID',
         // Debug segment positions
         segmentPositions: segments.map((s, i) => ({
           index: i,
           label: s.label,
           startAngle: i * segAngle,
           centerAngle: i * segAngle + segAngle / 2,
           endAngle: (i + 1) * segAngle
         }))
       });
       
       // Set rotation and trigger animation
       setRotation(target);
       
       // Setup ticking sound at regular intervals
       let tickInterval: number | undefined;
       
       if (config.sounds?.tick) {
         // Initial click
         soundUtils.play('click', 0.7);
         
         // Play tick sound at intervals that slow down as the wheel slows
         let tickDelay = 100;
         const maxTickDelay = 500;
         const tickIncrease = 15;
         
diff --git a/apps/web/src/components/wheel/Wheel.tsx b/apps/web/src/components/wheel/Wheel.tsx
index 120eb4219728fef103206842dec456654b980df0..959ee95ae4bf9526b53dc0aaef97c2365615138e 100644
--- a/apps/web/src/components/wheel/Wheel.tsx
+++ b/apps/web/src/components/wheel/Wheel.tsx
@@ -347,125 +378,125 @@ const Wheel: React.FC<WheelProps> = ({
         // Register the timer for cleanup
         if (tickInterval) {
           soundUtils.registerTimer(tickInterval);
         }
       }
       
       // Trigger haptic feedback if enabled and supported
       if (config.hapticFeedback) {
         soundUtils.vibrate(50);
       }
       
       // Drop pointer at the end of spin animation
       const timeoutId = setTimeout(() => {
         console.log('🎬 Main animation timeout reached, duration was:', duration * 1000);
         console.log('🎬 About to drop pointer and complete animation');
         
         // Clear tick interval
         if (tickInterval) clearInterval(tickInterval);
         
         // Drop pointer
         setPointerDropped(true);
         
         // Safety correction: verify final alignment and micro-correct if needed
           const finalRotation = target % 360;
           const segmentUnderPointer = Math.floor(((360 - (finalRotation - pointerAngle) + 360) % 360) / segAngle);
-          const expectedSegment = prizeIndex;
+          const expectedSegment = clampedPrizeIndex;
           const biasDegDev = segAngle * 0.1;
           const wanted = computeAlignmentRotation({
             segmentCount: segments.length,
             prizeIndex: expectedSegment,
             pointerAngleDeg: pointerAngle,
             biasDeg: biasDegDev
           });
           const finalNorm = ((finalRotation % 360) + 360) % 360;
           const wantedNorm = ((wanted % 360) + 360) % 360;
           // Compute minimal signed delta in [-180, 180]
           let delta = ((wantedNorm - finalNorm + 540) % 360) - 180;
 
           console.log('🛠️ Post-spin verification:', {
             finalRotation: finalNorm,
             wantedRotation: wantedNorm,
             delta,
             segAngle,
             segmentUnderPointer,
             expectedSegment
           });
 
           if (segmentUnderPointer !== expectedSegment && Math.abs(delta) > 0.1) {
             // Apply a tiny corrective rotation to snap precisely to the expected segment
             // Shorten the transition for the micro-correction
             setSpinSeconds(0.35);
             setRotation((prev) => prev + delta);
             console.warn('⚠️ Applied micro-correction to align pointer to expected segment');
             correctionDelta = delta;
           }
 
 
         // Play win/lose sound - Handle case where segments might be empty
-        const winningSegment = segments.length > prizeIndex ? segments[prizeIndex] : null;
+        const winningSegment = segments.length > clampedPrizeIndex ? segments[clampedPrizeIndex] : null;
         if (winningSegment?.isWinning) {
           soundUtils.play('win', 0.8);
         } else {
           soundUtils.play('lose', 0.5);
         }
         
         // Final haptic feedback
         if (config.hapticFeedback) {
           soundUtils.vibrate([50, 30, 50]);
         }
         
         // Reset spinning state
         const resetTimeout = setTimeout(() => {
           console.log('🎬 Wheel animation completed, calling onSpin callback');
           console.log('🎬 About to call onSpin - isSpinning:', isSpinning, 'spinning:', spinning);
           const finalRotationRaw = target + correctionDelta;
           const finalRotation = ((finalRotationRaw % 360) + 360) % 360;
           console.log('🎬 Final rotation state:', { rotation, target, correctionDelta, finalRotation });
 
           const pointerAngleDeg = typeof config.pointerAngleDeg === 'number' ? config.pointerAngleDeg : 0;
           const rawPointerIndex = segments.length > 0
             ? Math.floor(((360 - (finalRotation - pointerAngleDeg) + 360) % 360) / segAngle)
             : 0;
-          const clampedPointerIndex = Math.min(Math.max(rawPointerIndex, 0), Math.max(segments.length - 1, 0));
-          const clampedExpectedIndex = Math.min(Math.max(prizeIndex, 0), Math.max(segments.length - 1, 0));
-
+          const clampedPointerIndex = segments.length > 0
+            ? Math.min(Math.max(rawPointerIndex, 0), segments.length - 1)
+            : 0;
           const summary: WheelSpinResult = {
             pointerIndex: clampedPointerIndex,
-            expectedIndex: clampedExpectedIndex,
-            isAligned: clampedPointerIndex === clampedExpectedIndex,
+            expectedIndex: clampedPrizeIndex,
+            isAligned: clampedPointerIndex === clampedPrizeIndex,
           };
 
           // 🔥 RUNTIME VERIFICATION: Check final alignment
           if (process.env.NODE_ENV !== 'production') {
             const segmentUnderPointer = Math.floor((360 - finalRotation + 360) % 360 / segAngle);
-            const expectedSegment = prizeIndex;
+            const expectedSegment = clampedPrizeIndex;
 
             console.log('🎯 ALIGNMENT VERIFICATION:', {
               finalRotation,
               segmentUnderPointer,
-              expectedSegment: prizeIndex,
+              expectedSegment: clampedPrizeIndex,
               isAligned: segmentUnderPointer === expectedSegment,
               segmentAngle: segAngle,
               totalSegments: segments.length
             });
 
             if (segmentUnderPointer !== expectedSegment) {
               console.error('❌ ALIGNMENT MISMATCH DETECTED!', {
                 pointerAt: segmentUnderPointer,
                 expected: expectedSegment,
                 difference: Math.abs(segmentUnderPointer - expectedSegment)
               });
             } else {
               console.log('✅ Wheel alignment verified correct');
             }
           }
 
           setSpinning(false);
 
           // ✅ Call onSpin callback to notify parent that wheel has finished
           console.log('🎬 Calling onSpin callback now...');
           onSpin();
           if (typeof onSpinComplete === 'function') {
             try {
               console.log('🎬 About to call onSpinComplete with:', summary);
               onSpinComplete(summary);
diff --git a/apps/web/src/components/wheel/Wheel.tsx b/apps/web/src/components/wheel/Wheel.tsx
index 120eb4219728fef103206842dec456654b980df0..959ee95ae4bf9526b53dc0aaef97c2365615138e 100644
--- a/apps/web/src/components/wheel/Wheel.tsx
+++ b/apps/web/src/components/wheel/Wheel.tsx
@@ -475,52 +506,52 @@ const Wheel: React.FC<WheelProps> = ({
             }
           } else {
             console.warn('🎬 onSpinComplete callback not provided or not a function');
           }
           console.log('🎬 onSpin callback called successfully');
         }, 500); // Increased buffer to ensure wheel fully settles before callback
         
         // Register the timeout for cleanup
         soundUtils.registerTimer(resetTimeout as any);
       }, duration * 1000);
       
       // Register the timeout for cleanup
       soundUtils.registerTimer(timeoutId as any);
     }
     
     // Reset pointer if not spinning
     if (!isSpinning) {
       setPointerDropped(false);
     }
     
     // Cleanup function
     return () => {
       // Stop all sounds when component unmounts or when isSpinning changes
       soundUtils.stop();
     };
-  }, [isSpinning, prizeIndex, config.spinDurationMin, config.spinDurationMax, segAngle, spinning, 
-      config.hapticFeedback, segments, config.sounds]);
+  }, [isSpinning, prizeIndex, clampedPrizeIndex, config.spinDurationMin, config.spinDurationMax, segAngle, spinning,
+      config.hapticFeedback, config.pointerAngleDeg, segments, config.sounds]);
   
   // Additional cleanup effect to ensure all resources are freed when component unmounts
   useEffect(() => {
     // Initialize sound system on component mount
     soundUtils.init();
     
     // Complete cleanup on unmount
     return () => {
       soundUtils.stop(); // Stop all sounds
       soundUtils.clearAllTimers(); // Clear all registered timers
       setSpinning(false); // Reset spinning state
       setPointerDropped(false); // Reset pointer state
     };
   }, []);
   
   // Handle spin button click
   const handleSpinClick = () => {
     if (!spinning) {
       soundUtils.play('click');
       onSpin();
     }
   };
   
   // Merge user color config with defaults
   const colors = { ...DEFAULT_COLORS, ...config.colors };
