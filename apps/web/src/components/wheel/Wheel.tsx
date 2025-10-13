import React, { useRef, useState, useEffect } from 'react';
import type { WheelConfig, WheelSpinResult } from './types';
import soundUtils from '../../lib/sound';

interface WheelProps {
  config: WheelConfig;
  isSpinning: boolean;
  prizeIndex: number;
  onSpin: () => void;
  showSpinButton?: boolean;
  onSpinStart?: (durationSeconds: number) => void;
  onSpinComplete?: (result: WheelSpinResult) => void;
}

// Constants for wheel dimensions - Made responsive and reduced size
const getWheelSize = () => {
  if (typeof window !== 'undefined') {
    const screenWidth = window.innerWidth;
    // Scale wheel size based on screen width - increased sizes for better screen utilization
    if (screenWidth < 480) return 320; // Mobile phones
    if (screenWidth < 768) return 420; // Small tablets (increased from 380)
    if (screenWidth < 1024) return 500; // Tablets (increased from 420)
    if (screenWidth < 1440) return 580; // Small desktop (increased from 480)
    if (screenWidth < 1920) return 650; // Large desktop (new)
    return 750; // Extra large screens (new)
  }
  return 580; // Default for SSR (increased from 480)
};

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
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Calculate position for segment text
function getTextPosition(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180.0;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/**
 * INDUSTRY-STANDARD WHEEL OF FORTUNE ALIGNMENT
 * Based on research from real wheel implementations (2024-2025)
 *
 * COORDINATE SYSTEM:
 * - Pointer is at TOP (0°/360°)
 * - Segments draw from 0° clockwise
 * - Segment N: starts at (N * segAngle)°, center at (N * segAngle + segAngle/2)°
 * - CSS rotation is CLOCKWISE positive
 *
 * FORMULA (from research):
 * To land on segment I out of N segments:
 * 1. Center angle = I * (360/N) + (360/N)/2
 * 2. Rotation needed = (360 - centerAngle) mod 360
 * 3. Add random bias within ±25% of segment width for natural landing
 */
function computeAlignmentRotation({
  segmentCount,
  prizeIndex
}: {
  segmentCount: number;
  prizeIndex: number;
}): number {
  if (segmentCount <= 0 || prizeIndex < 0 || prizeIndex >= segmentCount) {
    console.error('❌ Invalid alignment parameters:', { segmentCount, prizeIndex });
    return 0;
  }

  const segAngle = 360 / segmentCount;

  // Calculate center angle of target segment
  const segmentCenterAngle = prizeIndex * segAngle + segAngle / 2;

  // Calculate base rotation to align center with pointer at 0°
  let rotation = (360 - segmentCenterAngle) % 360;

  // Add small random offset within ±25% of segment width for natural landing
  // This prevents always landing dead-center (looks fake)
  const maxOffset = segAngle * 0.25;
  const randomOffset = (Math.random() - 0.5) * maxOffset;
  rotation = (rotation + randomOffset + 360) % 360;

  return rotation;
}

/**
 * Calculate which segment is currently under the pointer
 * Based on final wheel rotation angle
 */
function getSegmentAtPointer(finalRotation: number, segmentCount: number): number {
  const segAngle = 360 / segmentCount;

  // Normalize final rotation to 0-360 range
  const normalized = ((finalRotation % 360) + 360) % 360;

  // The pointer sees the wheel rotated backwards
  // Calculate effective angle from pointer's perspective
  const pointerView = (360 - normalized) % 360;

  // Find which segment this angle falls into
  // Each segment N spans from (N * segAngle) to ((N+1) * segAngle)
  const segmentIndex = Math.floor(pointerView / segAngle) % segmentCount;

  return segmentIndex;
}

// Helper function to handle long text in wheel segments
function formatTextForWheel(text: string, maxCharsPerLine: number = 12, maxLines: number = 2): string[] {
  const safeText = text || '';
  if (safeText.length <= maxCharsPerLine) {
    return [safeText];
  }
  
  // Split by words first
  const words = safeText.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    // If adding this word would exceed the line limit
    if ((currentLine + ' ' + word).length > maxCharsPerLine && currentLine !== '') {
      lines.push(currentLine.trim());
      currentLine = word;
      
      // If we've reached max lines, truncate
      if (lines.length >= maxLines) {
        break;
      }
    } else {
      currentLine = currentLine === '' ? word : currentLine + ' ' + word;
    }
  }
  
  // Add the last line if it exists and we haven't exceeded max lines
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine.trim());
  }
  
  // If the last line is too long, truncate it
  if (lines.length > 0 && lines[lines.length - 1].length > maxCharsPerLine) {
    const lastLine = lines[lines.length - 1];
    if (lines.length === maxLines) {
      // Add ellipsis if we're at max lines
      lines[lines.length - 1] = lastLine.substring(0, maxCharsPerLine - 3) + '...';
    } else {
      lines[lines.length - 1] = lastLine.substring(0, maxCharsPerLine);
    }
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
  // Error boundary for wheel rendering
  if (!config || !config.segments || config.segments.length === 0) {
    console.error('Wheel component received invalid config:', config);
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error: Invalid wheel configuration</p>
        </div>
      </div>
    );
  }
  // State for animation and interaction
  const [rotation, setRotation] = useState(0);
  const [pointerDropped, setPointerDropped] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinSeconds, setSpinSeconds] = useState<number>(5);
  
  // References
  const wheelRef = useRef<SVGSVGElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(SVGPathElement | null)[]>([]);
  
  // Validate and sanitize segments
  const segments = React.useMemo(() => {
    if (!config.segments || config.segments.length === 0) {
      return [
        { label: 'Prix 1', color: '#FF6384', isWinning: true },
        { label: 'Prix 2', color: '#36A2EB', isWinning: false },
        { label: 'Prix 3', color: '#FFCE56', isWinning: false }
      ];
    }

    return config.segments.map(segment => ({
      id: segment.id || `segment-${Math.random()}`,
      label: segment.label || 'Prize',
      color: segment.color || '#FF6384',
      isWinning: segment.isWinning || false,
      position: segment.position
    }));
  }, [config.segments]);
    
  // Calculate segment angle and prepare refs array
  const segAngle = 360 / segments.length;
  
  // Initialize sound system
  useEffect(() => {
    soundUtils.init();
  }, []);
  
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
      
      // Calculate target rotation using industry-standard formula
      // Multiple full rotations (5-8) for visual effect + final alignment
      const rotations = 5 + Math.random() * 3;

      const alignmentRotation = computeAlignmentRotation({
        segmentCount: segments.length,
        prizeIndex
      });

      // Final target rotation
      const target = 360 * rotations + alignmentRotation;

      console.log('🎯 WHEEL ALIGNMENT CALCULATION:', {
        prizeIndex,
        targetLabel: segments[prizeIndex]?.label || 'UNKNOWN',
        segmentCount: segments.length,
        segAngle,
        alignmentRotation,
        fullRotations: rotations,
        totalRotation: target,
        allSegments: segments.map((s, i) => ({
          index: i,
          label: s.label,
          startAngle: i * segAngle,
          centerAngle: i * segAngle + segAngle / 2
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
        
        tickInterval = window.setInterval(() => {
          soundUtils.play('tick', 0.3);
          
          // Increase delay between ticks (wheel slowing down)
          tickDelay += tickIncrease;
          if (tickDelay >= maxTickDelay) {
            clearInterval(tickInterval);
          } else {
            clearInterval(tickInterval);
            tickInterval = window.setInterval(() => {
              soundUtils.play('tick', 0.3);
            }, tickDelay);
            
            // Register the timer for cleanup
            if (tickInterval) {
              soundUtils.registerTimer(tickInterval);
            }
          }
        }, tickDelay);
        
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

        // Verify final alignment using industry-standard calculation
        const finalRotation = target % 360;
        const segmentAtPointer = getSegmentAtPointer(finalRotation, segments.length);

        console.log('🎯 FINAL ALIGNMENT VERIFICATION:', {
          targetRotation: target,
          finalRotation: (finalRotation + 360) % 360,
          expectedSegment: prizeIndex,
          expectedLabel: segments[prizeIndex]?.label,
          actualSegment: segmentAtPointer,
          actualLabel: segments[segmentAtPointer]?.label,
          isCorrect: segmentAtPointer === prizeIndex
        });

        if (segmentAtPointer !== prizeIndex) {
          console.error('❌ ALIGNMENT MISMATCH! Wheel landed on wrong segment.');
        } else {
          console.log('✅ Wheel alignment PERFECT - landed on correct segment');
        }

        // Play win/lose sound
        const winningSegment = segments.length > prizeIndex ? segments[prizeIndex] : null;
        if (winningSegment?.isWinning) {
          soundUtils.play('win', 0.8);
        } else {
          soundUtils.play('lose', 0.5);
        }
        
        // Final haptic feedback
        if (config.hapticFeedback) {
          soundUtils.vibrate([50, 30, 50]);
        }
        
        // Reset spinning state and call callbacks
        const resetTimeout = setTimeout(() => {
          // Calculate final segment using industry-standard method
          const finalRotation = (target % 360 + 360) % 360;
          const actualSegment = getSegmentAtPointer(finalRotation, segments.length);

          console.log('🎬 SPIN COMPLETE - Calling callbacks');

          const summary: WheelSpinResult = {
            pointerIndex: actualSegment,
            expectedIndex: prizeIndex,
            isAligned: actualSegment === prizeIndex,
          };

          console.log('📋 Spin Summary:', {
            expectedSegment: prizeIndex,
            expectedLabel: segments[prizeIndex]?.label,
            actualSegment,
            actualLabel: segments[actualSegment]?.label,
            aligned: summary.isAligned,
            finalRotation
          });

          setSpinning(false);

          // Call parent callbacks
          onSpin();
          if (typeof onSpinComplete === 'function') {
            try {
              onSpinComplete(summary);
            } catch (error) {
              console.error('❌ Error in onSpinComplete handler:', error);
            }
          }
        }, 500);
        
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
  }, [isSpinning, prizeIndex, config.spinDurationMin, config.spinDurationMax, segAngle, spinning,
      config.hapticFeedback, segments, config.sounds, onSpin, onSpinStart, onSpinComplete]);
  
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
  
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center touch-none select-none relative">
      {/* Animated background glow - Made responsive */}
      <div 
        className="absolute z-0 rounded-full bg-gradient-to-br from-indigo-400/30 via-pink-400/20 to-purple-400/30 blur-3xl animate-spin-slow opacity-70" 
        style={{ 
          animationDuration: '16s',
          width: `${wheelDisplaySize + 50}px`,
          height: `${wheelDisplaySize + 50}px`,
          pointerEvents: 'none'
        }} 
      />
      
      {/* Pointer - Made responsive */}
      <div className="relative z-10 flex justify-center" style={{ height: Math.max(48, wheelDisplaySize * 0.12) }}>
        <div
          ref={pointerRef}
          className={`transition-transform duration-500 ${pointerDropped ? 'translate-y-4' : ''}`}
          style={{ 
            willChange: 'transform',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
          }}
          aria-hidden="true"
        >
          {config.pointerIconUrl ? (
            <img 
              src={config.pointerIconUrl} 
              alt="" 
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16" 
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            />
          ) : (
            <svg 
              width={Math.max(32, wheelDisplaySize * 0.1)} 
              height={Math.max(32, wheelDisplaySize * 0.1)} 
              viewBox="0 0 48 48" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <path 
                d="M24 48 L48 16 L24 32 L0 16 Z" 
                fill={colors.pointer}
                stroke={colors.pointerBorder}
                strokeWidth="3"
                filter="url(#shadow)"
              />
              <circle cx="24" cy="32" r="6" fill={colors.primaryGradient} stroke="#fff" strokeWidth="2" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Wheel SVG - Made fully responsive */}
      <svg
        ref={wheelRef}
        width={wheelDisplaySize}
        height={wheelDisplaySize}
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        className="block mx-auto relative z-0 touch-none"
        style={{ 
          borderRadius: '50%',
          transform: `rotate(${rotation}deg)`,
          transition: spinning 
            ? `transform ${spinSeconds}s cubic-bezier(0.18, 0.76, 0.22, 0.96)`
            : undefined,
          willChange: 'transform',
          maxWidth: '100%',
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
        aria-label="Prize wheel"
        role="img"
      >
        <defs>
          {/* Brand gradient for wheel */}
          <radialGradient id="izi-brand-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primaryGradient} />
            <stop offset="100%" stopColor={colors.secondaryGradient} />
          </radialGradient>
          
          {/* Glossy reflection overlay */}
          <radialGradient id="wheel-gloss" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          
          {/* Text shadow for better contrast */}
          <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.75" />
          </filter>
        </defs>
        
        {/* Render all segments with responsive text */}
        {segments.map((segment, index) => {
          const angle = segAngle;
          
          // 🔥 CRITICAL FIX: Calculate startAngle for each segment without mutation
          // This ensures consistent segment positioning on every render
          const segmentStartAngle = index * segAngle; // Each segment starts at index * segAngle
          const endAngle = segmentStartAngle + angle;
          
          const arcPath = getArcPath(CENTER, CENTER, RADIUS, segmentStartAngle, endAngle);
          
          const midAngle = segmentStartAngle + angle / 2;
          const textPos = getTextPosition(CENTER, CENTER, TEXT_DISTANCE, midAngle);
          
          const segmentColor = segment.color || 
            (segment.isWinning ? '#28a745' : ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'][index % 4]);
          
          // Restore vertical text rotation for proper wheel appearance
          let textRotation = midAngle;
          // Adjust rotation for readability - flip text if it would be upside down
          if (textRotation > 90 && textRotation < 270) {
            textRotation += 180;
          }

          const labelText = segment.label || `Prix ${index + 1}`;
          // Format text for better display with shorter lines for vertical text
          const textLines = formatTextForWheel(labelText, 8, 2);
          const lineCount = textLines.length;
          
          // Better text box sizing calculation for vertical text
          const longestLine = textLines.reduce((longest, line) => line.length > longest.length ? line : longest, '');
          const estimatedTextWidth = longestLine.length * responsiveFontSize * 0.6;
          const estimatedTextHeight = lineCount * responsiveFontSize * 1.4;
          
          // Calculate proper box dimensions with adequate padding
          const textPadding = 16;
          const currentTextRectWidth = Math.min(
            TEXT_RECT_MAX_WIDTH,
            Math.max(TEXT_RECT_MIN_WIDTH, estimatedTextWidth + textPadding * 2)
          );
          
          const currentTextRectHeight = Math.max(
            TEXT_RECT_HEIGHT,
            estimatedTextHeight + textPadding
          );
          
          return (
            <g key={index}>
              <path
                ref={el => segmentRefs.current[index] = el}
                d={arcPath}
                fill={segmentColor}
                stroke={colors.border}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              
              <g transform={`translate(${textPos.x}, ${textPos.y}) rotate(${textRotation})`}>
                {/* Always render background rectangle for ALL segments */}
                <rect 
                  x={-currentTextRectWidth / 2}
                  y={-currentTextRectHeight / 2}
                  width={currentTextRectWidth}
                  height={currentTextRectHeight}
                  fill="rgba(0,0,0,0.8)" 
                  rx="8"
                  ry="8"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="1.5"
                />
                {/* Always render text with background for ALL segments */}
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize={responsiveFontSize}
                  fontWeight="900"
                  filter="url(#textShadow)"
                  className="select-none"
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 -1px 2px rgba(0,0,0,0.8), 1px 0 2px rgba(0,0,0,0.8), -1px 0 2px rgba(0,0,0,0.8)'
                  }}
                >
                  {textLines.map((line, lineIndex) => (
                    <tspan key={`${index}-${lineIndex}`} x="0" y={lineIndex * 18} dy={lineIndex > 0 ? "0.7em" : "0"}>
                      {line || ''}
                    </tspan>
                  ))}
                </text>
              </g>
            </g>
          );
        })}
        
        {/* Center logo or brand - Made responsive */}
        <circle 
          cx={CENTER} 
          cy={CENTER} 
          r={42} 
          fill="white" 
          stroke={colors.secondaryGradient} 
          strokeWidth={5}
          filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))"
        />
        
        {config.centerLogo ? (
          <image 
            href={config.centerLogo} 
            x={CENTER - 28} 
            y={CENTER - 28} 
            width={56} 
            height={56} 
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <text 
            x={CENTER} 
            y={CENTER} 
            fontSize={Math.max(20, responsiveFontSize + 8)}
            fontWeight="bold" 
            fill={colors.primaryGradient} 
            textAnchor="middle" 
            dominantBaseline="middle"
            filter="drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))"
          >
            IZI
          </text>
        )}
      </svg>
      
      {/* Spin button - only shown if showSpinButton is true */}
      {showSpinButton && (
        <button
          className="mt-8 px-10 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 
                     text-white font-bold text-lg shadow-xl hover:shadow-indigo-500/30 
                     transition-all duration-300 focus:outline-none focus:ring-2 
                     focus:ring-indigo-300 active:scale-95 disabled:opacity-50 
                     disabled:cursor-not-allowed"
          onClick={handleSpinClick}
          disabled={isSpinning}
          role="button"
          aria-label="Spin the wheel"
          aria-disabled={isSpinning}
        >
          <span className="relative z-10 flex items-center justify-center">
            {isSpinning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Spinning...
              </>
            ) : (
              'Tourner la roue !'
            )}
          </span>
        </button>
      )}
    </div>
  );
};

export default Wheel; 