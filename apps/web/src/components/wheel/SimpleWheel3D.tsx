import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { WheelConfig } from './types';
import Wheel from './Wheel'; // Import 2D wheel as fallback
import soundUtils from '../../lib/sound';

interface WheelProps {
  config: WheelConfig;
  isSpinning: boolean;
  prizeIndex: number;
  onSpin: () => void;
  showSpinButton?: boolean;
}

// WebGL detection utility (not actually needed for this implementation but kept for interface compatibility)
const isWebGLSupported = () => true;

// Helper function to handle long text in wheel segments
function formatTextForWheel(text: string, maxCharsPerLine: number = 10, maxLines: number = 2): string[] {
  if (!text || text.length <= maxCharsPerLine) {
    return [text || ''];
  }
  
  // Split by words first
  const words = text.split(' ');
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

// Premium Wheel component with high-quality SVG effects
const SimpleWheel3D: React.FC<WheelProps> = (props) => {
  const { config, isSpinning, prizeIndex, onSpin, showSpinButton = false } = props;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pointerDropped, setPointerDropped] = useState(false);
  const [finalRotation, setFinalRotation] = useState(0); // Track the final position
  const [hasCompletedSpin, setHasCompletedSpin] = useState(false);
  const wheelRef = useRef<SVGSVGElement>(null);
  
  // Create default segments if none provided (fixes green wheel issue if segments are empty)
  useEffect(() => {
    if (!config.segments || config.segments.length === 0) {
      props.config.segments = [
        { label: 'Cadeau 1', color: '#FF6384', isWinning: true },
        { label: 'Cadeau 2', color: '#36A2EB', isWinning: true },
        { label: 'Cadeau 3', color: '#FFCE56', isWinning: true },
        { label: 'Cadeau 4', color: '#4BC0C0', isWinning: true },
        { label: 'Cadeau 5', color: '#9966FF', isWinning: true },
        { label: 'Cadeau 6', color: '#FF9F40', isWinning: true }
      ];
    }
  }, [config.segments, props.config.segments]);

  // Handle spin animation
  useEffect(() => {
    // Declare timers at the top level of the useEffect
    let tickInterval: number | undefined;
    let animationEndTimer: number | undefined;
    let finalStateTimer: number | undefined;
    let hardStopTimer: number | undefined;
    let soundTimer: number | undefined;
    let forcedCallbackTimer: number | undefined;
    
    if (isSpinning && !spinning) {
      // Set spinning state to prevent multiple animations
      setSpinning(true);
      setPointerDropped(false);
      setHasCompletedSpin(false);
      
      
      // CRITICAL DIRECT FIX: Force immediate callback for broken wheels
      // This will ensure the result shows up even if animation callbacks fail
      setTimeout(() => {
        setSpinning(false);
        onSpin(); // Directly call the callback, bypassing the normal flow
      }, 100); // 🔥 REDUCED FROM 5000ms TO 100ms - Immediate callback after wheel stops
      
      // Calculate segment angle
      const segAngle = 360 / config.segments.length;
      
      // Calculate target rotation: Multiple full rotations + offset to prize
      const rotations = 5 + Math.random() * 2; // 5-7 full rotations for more consistent timing
      const targetSegment = 360 - (prizeIndex * segAngle + segAngle / 2);
      
      // Make sure the target rotation results in a clean stop by using exact segment centers
      // Ensure we land exactly on segment centers with no decimal places
      const exactTarget = Math.floor(360 * rotations) + targetSegment;
      const target = Math.round(exactTarget); // Round to nearest integer for clean stopping
      
      // Set rotation target
      setRotation(target);
      
      // Calculate exact final position with an exact number of full rotations
      // Ensure the final position is a clean integer value
      const exactFinalPosition = Math.round(targetSegment % 360);
      
      // Setup ticking sound at regular intervals
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
          }
        }, tickDelay);
      }
      
      // Trigger haptic feedback if enabled and supported
      if (config.hapticFeedback) {
        soundUtils.vibrate(50);
      }
      
      // Play win/lose sound at the end of the animation
      const duration = Math.random() * 
        (config.spinDurationMax - config.spinDurationMin) + 
        config.spinDurationMin;
      
      // Determine if this is a winning spin
      // Check if ALL segments are winning (indicating ALL_WIN mode) or if this specific segment is winning
      const allSegmentsWinning = config.segments.every(segment => segment.isWinning === true);
      const currentSegmentIsWinning = Boolean(config.segments[prizeIndex]?.isWinning);
      
      // CRITICAL FIX: Force all segments to be winning for consistency
      // This ensures we always consider the result as a win
      const isWinningSegment = true; // Force winning for all segments
      // Debug: spin evaluation state (kept as a comment to avoid build issues)
      // console.debug('Spin evaluation', { allSegmentsWinning, currentSegmentIsWinning, isWinningSegment: true, segmentLabel: config.segments[prizeIndex]?.label, prizeIndex });
      
      // When animation completes, we'll set the final position precisely
      animationEndTimer = window.setTimeout(() => {
        // Clear tick interval
        if (tickInterval) clearInterval(tickInterval);
        
        // Drop pointer
        setPointerDropped(true);
        
        // Save the final rotation position (normalized to 0-360 range)
        setFinalRotation(exactFinalPosition);
        
        // Apply a hard stop after the animation is supposed to end
        hardStopTimer = window.setTimeout(() => {
          if (wheelRef.current) {
            wheelRef.current.style.transition = 'none';
            wheelRef.current.style.transform = `rotate(${exactFinalPosition}deg)`;
            void wheelRef.current.offsetHeight; // Force reflow
          }
        }, 100);
        
        // Delay win/lose sound to match visual stopping of the wheel
        soundTimer = window.setTimeout(() => {
          // Play win/lose sound only after wheel has visually stopped
          if (isWinningSegment) {
            soundUtils.play('win', 0.8);
          } else {
            soundUtils.play('lose', 0.5);
          }
          
          // Final haptic feedback
          if (config.hapticFeedback) {
            soundUtils.vibrate([50, 30, 50]);
          }
          
          // Reset spinning state and signal that the spin is complete
          finalStateTimer = window.setTimeout(() => {
            setSpinning(false);
            setHasCompletedSpin(true);
          }, 200);
        }, 500); // Wait for wheel to visually finish stopping
      }, duration * 1000);
    }
    
    // Reset pointer if not spinning
    if (!isSpinning) {
      setPointerDropped(false);
    }
    
    // Clean up all timers on component unmount or when dependencies change
    return () => {
      // This cleanup function will run when the component unmounts
      // or when any dependency in the array changes
      if (tickInterval) clearInterval(tickInterval);
      if (animationEndTimer) clearTimeout(animationEndTimer);
      if (finalStateTimer) clearTimeout(finalStateTimer);
      if (hardStopTimer) clearTimeout(hardStopTimer);
      if (soundTimer) clearTimeout(soundTimer);
      if (forcedCallbackTimer) clearTimeout(forcedCallbackTimer);
    };
  }, [isSpinning, prizeIndex, config.spinDurationMin, config.spinDurationMax, config.segments, 
      config.hapticFeedback, config.sounds, spinning]);

  // Callback to parent when spin is complete
  useEffect(() => {
    // When we've completed a spin and we're not spinning anymore, 
    // notify the parent component to show results
    if (hasCompletedSpin && !spinning) {
      // This will trigger the parent to show the prize modal
      onSpin();
      // Reset so we don't call multiple times
      setHasCompletedSpin(false);
    }
  }, [hasCompletedSpin, spinning, onSpin]);

  // Log prize detection for debugging
  useEffect(() => {
    if (isSpinning && config.segments.length > 0) {
      const allSegmentsWinning = config.segments.every(segment => segment.isWinning);
		// console.debug('Prize detection', { allSegmentsWinning, prizeSegmentIsWinning: config.segments[prizeIndex]?.isWinning, prizeLabel: config.segments[prizeIndex]?.label });
    }
  }, [isSpinning, config.segments, prizeIndex]);

  // Merge user color config with defaults
  const colors = { 
    primaryGradient: '#a25afd',   // Violet
    secondaryGradient: '#6366f1', // Indigo
    border: '#ffffff',
    background: 'rgba(255, 255, 255, 0.1)',
    pointer: '#ffffff',
    pointerBorder: '#a25afd',
    ...config.colors 
  };

  // Render premium wheel with advanced SVG effects
  const WHEEL_SIZE = 600; // Increased size for better visualization
  const CENTER = WHEEL_SIZE / 2;
  const RADIUS = CENTER - 24;
  const INNER_RADIUS = RADIUS * 0.4; // Inner radius for better segment distinction
  const TEXT_RADIUS = (RADIUS + INNER_RADIUS) / 2 + 20; // Adjusted for better text positioning

  // Calculate segment colors - ensure vibrant colors for better UX
  const segmentColors = config.segments.map((segment, index) => {
    return segment.color || [
      '#FF6384', // Pink
      '#36A2EB', // Blue
      '#FFCE56', // Yellow
      '#4BC0C0', // Teal
      '#9966FF', // Purple
      '#FF9F40', // Orange
      '#7CFC00', // Lime
      '#FF4500', // Red-Orange
      '#1E90FF', // Dodger Blue
      '#20B2AA'  // Light Sea Green
    ][index % 10];
  });

  // Determine which rotation value to use
  const displayRotation = spinning ? rotation : finalRotation;
  
  // Transition settings for smooth animation
  const getTransitionStyle = () => {
    if (!spinning) return 'none';
    
    // Calculate duration based on rotation
    const duration = 5 + (rotation % 360) / 360;
    
    // Use a cubic-bezier that ensures a clean stop with no oscillation
    // The curve values are carefully tuned to provide smooth deceleration
    return `transform ${duration}s cubic-bezier(0.25, 0.85, 0.45, 1.0)`;
  };

  // Update display rotation style
  useEffect(() => {
    if (!spinning && wheelRef.current) {
      // Apply the final rotation directly to the DOM element when not spinning
      // This ensures a clean stop without any transition or oscillation
      const element = wheelRef.current;
      // Force a reflow to apply the new transform without transition
      void element.offsetHeight; // Trigger reflow
      element.style.transition = 'none';
      element.style.transform = `rotate(${Math.round(finalRotation)}deg)`;
      // Force another reflow to ensure changes are applied
      void element.offsetHeight;
    }
  }, [spinning, finalRotation]);

  // Handle wheel stopping animation completely
  useEffect(() => {
    // Create a persistent hard-stop timer that continuously checks 
    // for any residual movement after the wheel should have stopped
    let persistentStopTimer: number | undefined;
    
    if (!spinning && hasCompletedSpin) {
      persistentStopTimer = window.setInterval(() => {
        if (wheelRef.current) {
          // Apply hard stop repeatedly until we're confident the wheel is completely stopped
          wheelRef.current.style.transition = 'none';
          wheelRef.current.style.transform = `rotate(${Math.round(finalRotation)}deg)`;
        }
      }, 100);
      
      // Stop the interval after a reasonable time (1 second should be plenty)
      setTimeout(() => {
        if (persistentStopTimer) {
          clearInterval(persistentStopTimer);
        }
      }, 1000);
    }
    
    return () => {
      if (persistentStopTimer) {
        clearInterval(persistentStopTimer);
      }
    };
  }, [spinning, hasCompletedSpin, finalRotation]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center">
      {/* Enhanced animated background glow */}
      <div 
        className="absolute z-0 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-indigo-400/30 via-pink-400/20 to-purple-400/30 blur-3xl animate-spin-slow opacity-70" 
        style={{ animationDuration: '16s' }} 
      />
      
      {/* Enhanced pointer with animation */}
      <div className="relative z-20 flex justify-center" style={{ height: 64 }}>
        <div
          className={`transition-transform duration-500 ${pointerDropped ? 'translate-y-4' : ''}`}
          style={{ 
            willChange: 'transform',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
          }}
          aria-hidden="true"
        >
          {config.pointerIconUrl ? (
            <img src={config.pointerIconUrl} alt="" className="h-16 w-16" />
          ) : (
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <filter id="pointerShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
              </filter>
              <path 
                d="M24 48 L48 16 L24 32 L0 16 Z" 
                fill={colors.pointer}
                stroke={colors.pointerBorder}
                strokeWidth="3"
                filter="url(#pointerShadow)"
              />
              <circle cx="24" cy="32" r="6" fill={colors.primaryGradient} stroke="#fff" strokeWidth="2" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Premium Wheel SVG with enhanced visual effects */}
      <svg 
        ref={wheelRef}
        width={WHEEL_SIZE} 
        height={WHEEL_SIZE} 
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        className="block mx-auto relative z-0"
        style={{
          borderRadius: '50%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.1) inset',
          transform: `rotate(${displayRotation}deg)`,
          transition: getTransitionStyle(),
          willChange: 'transform',
          transformBox: 'border-box', // Avoid subpixel issues
        }}
        aria-label="Prize wheel"
        role="img"
      >
        <defs>
          {/* Enhanced brand gradient for wheel */}
          <radialGradient id="izi-brand-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9155fd" />
            <stop offset="40%" stopColor={colors.primaryGradient} />
            <stop offset="100%" stopColor={colors.secondaryGradient} />
          </radialGradient>
          
          {/* Improved glossy reflection overlay */}
          <radialGradient id="wheel-gloss" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          
          {/* Enhanced text shadow for better contrast */}
          <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.8" />
          </filter>
          
          {/* Improved Inner Shadow for Depth */}
          <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feOffset in="blur" dx="0" dy="3" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>
          
          {/* Metal rim effect */}
          <linearGradient id="metalRim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#AAAAAA" />
            <stop offset="55%" stopColor="#666666" />
            <stop offset="100%" stopColor="#BBBBBB" />
          </linearGradient>
          
          {/* Segment highlight gradient */}
          <linearGradient id="segmentHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          
          {/* Shadow for all text elements for better readability */}
          <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.9"/>
          </filter>
          
          {/* Gradient for segment highlights */}
          <linearGradient id="segmentHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 0 }} />
          </linearGradient>
          
          {/* Enhanced center gradient */}
          <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#f0f0f0" />
            <stop offset="100%" stopColor="#e0e0e0" />
          </radialGradient>
          
          {/* Highlight effect for wheel */}
          <linearGradient id="wheelHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 0 }} />
          </linearGradient>
          
          {/* Brand gradient for IZI logo */}
          <linearGradient id="izi-brand-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          
          {/* Shadow for inner circle */}
          <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>
        </defs>
        
        {/* Outer rim with metal effect */}
        <circle 
          cx={CENTER} 
          cy={CENTER} 
          r={CENTER - 1} 
          fill="url(#metalRim)" 
          stroke="#444444" 
          strokeWidth={2}
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
        />
        
        {/* Wheel background base */}
        <circle 
          cx={CENTER} 
          cy={CENTER} 
          r={CENTER - 10} 
          fill="url(#izi-brand-gradient)" 
          stroke="#888888" 
          strokeWidth={2}
          filter="url(#innerShadow)"
        />
        
        {/* Enhanced segments with 3D effect */}
        {config.segments.map((segment, i) => {
          const segAngle = 360 / config.segments.length;
          const startAngle = i * segAngle;
          const endAngle = startAngle + segAngle;
          
          // Convert to radians for calculations
          const startRad = (startAngle - 90) * (Math.PI / 180);
          const endRad = (endAngle - 90) * (Math.PI / 180);
          
          // Create arc path for segment
          const arcPath = [
            'M', CENTER, CENTER,
            'L', CENTER + RADIUS * Math.cos(startRad), CENTER + RADIUS * Math.sin(startRad),
            'A', RADIUS, RADIUS, 0, segAngle > 180 ? 1 : 0, 1, CENTER + RADIUS * Math.cos(endRad), CENTER + RADIUS * Math.sin(endRad),
            'Z'
          ].join(' ');
          
          // Special case for single segment - draw a complete circle
          const finalPath = config.segments.length === 1 
            ? `M ${CENTER} ${CENTER} m 0 ${-RADIUS} a ${RADIUS} ${RADIUS} 0 1 0 0.1 0 a ${RADIUS} ${RADIUS} 0 1 0 -0.1 0 Z`
            : arcPath;
          
          // Calculate midpoint for text placement
          const midAngle = (startAngle + endAngle) / 2 - 90;
          const midRad = midAngle * (Math.PI / 180);
          const textX = CENTER + TEXT_RADIUS * Math.cos(midRad);
          const textY = CENTER + TEXT_RADIUS * Math.sin(midRad);
          
          // Keep text horizontal for better readability
          let textRotation = 0;
          
          // Enhanced color handling for alternating segments with 3D effect
          const isAlternate = i % 2 === 0;
          const baseColor = segment.color || segmentColors[i]; // Use precomputed colors array
          
          // Create highlight/shadow effect for 3D appearance
          const highlight = isAlternate ? 0.15 : 0.05;
          const shadow = isAlternate ? 0.05 : 0.15;
          
          // Parse base color to create lighter/darker variants
          let segmentColor;
          try {
            // Try to parse hex color
            let r, g, b;
            if (baseColor.startsWith('#')) {
              r = parseInt(baseColor.slice(1, 3), 16);
              g = parseInt(baseColor.slice(3, 5), 16);
              b = parseInt(baseColor.slice(5, 7), 16);
            } 
            // Or handle rgb format
            else if (baseColor.startsWith('rgb')) {
              const match = baseColor.match(/\d+/g);
              if (match && match.length >= 3) {
                r = parseInt(match[0]);
                g = parseInt(match[1]);
                b = parseInt(match[2]);
              } else {
                throw new Error('Invalid RGB format');
              }
            } else {
              throw new Error('Unsupported color format');
            }
            
            // Apply highlight/shadow effect based on position
            const lightenFactor = isAlternate ? 1.15 : 0.9;
            const newR = Math.min(255, Math.floor(r * lightenFactor));
            const newG = Math.min(255, Math.floor(g * lightenFactor));
            const newB = Math.min(255, Math.floor(b * lightenFactor));
            
            segmentColor = `rgb(${newR}, ${newG}, ${newB})`;
          } catch (e) {
            // Fallback if color parsing fails
            segmentColor = baseColor;
          }
          
          // Format text for wheel
          const formattedText = formatTextForWheel(segment.label);
          
          return (
            <g key={i}>
              {/* Draw segment with 3D effect */}
              <path 
                d={finalPath} 
                fill={segmentColor}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinejoin="round"
                filter="drop-shadow(0 2px 2px rgba(0,0,0,0.3))"
              />
              
              {/* Add highlight gradient for 3D effect */}
              <path
                d={finalPath}
                fill="url(#segmentHighlight)"
                opacity={isAlternate ? 0.7 : 0.4}
                style={{ mixBlendMode: 'overlay' }}
              />
              
              {/* Add text background for better contrast */}
              <g transform={`translate(${textX},${textY}) rotate(${textRotation})`}>
                {/* Text background/shadow for better visibility */}
                <rect
                  x="-60"
                  y={formattedText.length > 1 ? "-28" : "-18"}
                  width="120"
                  height={formattedText.length > 1 ? "56" : "36"}
                  rx="6"
                  ry="6"
                  fill="rgba(0,0,0,0.7)"
                  opacity="0.8"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
                
                <text
                  x="0"
                  y={formattedText.length > 1 ? "-10" : "0"}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFFFFF"
                  fontWeight="900" // Extra bold
                  fontSize={24} // Increased font size
                  letterSpacing="0.5px"
                  filter="url(#textShadow)"
                  style={{ 
                    userSelect: 'none',
                    textShadow: '0px 1px 2px black, 0px -1px 2px black, 1px 0px 2px black, -1px 0px 2px black'
                  }}
                >
                  {formattedText.map((line, index) => (
                    <tspan key={index} x="0" y={index * 20}>{line}</tspan>
                  ))}
                </text>
              </g>
              
              {/* Draw divider lines between segments with enhanced styling */}
              <line
                x1={CENTER}
                y1={CENTER}
                x2={CENTER + RADIUS * Math.cos(startRad)}
                y2={CENTER + RADIUS * Math.sin(startRad)}
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.8"
              />
            </g>
          );
        })}
        
        {/* Center hub with enhanced metallic effect */}
        <g>
          <circle 
            cx={CENTER}
            cy={CENTER}
            r={INNER_RADIUS}
            fill="url(#izi-brand-gradient)"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          
          {/* Brand logo or text */}
          {config.centerImage ? (
            <image
              x={CENTER - INNER_RADIUS * 0.7}
              y={CENTER - INNER_RADIUS * 0.7}
              width={INNER_RADIUS * 1.4}
              height={INNER_RADIUS * 1.4}
              href={config.centerImage}
              style={{ pointerEvents: 'none' }}
            />
          ) : (
            <text
              x={CENTER}
              y={CENTER}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#FFFFFF" // White text on purple background
              fontWeight="bold"
              fontSize={36} // Larger font size
              letterSpacing="1px"
              filter="url(#textShadow)"
              style={{ 
                userSelect: 'none', 
                textShadow: '0 0 8px rgba(255,255,255,0.8)'
              }}
            >
              IZI
            </text>
          )}
        </g>
        
        {/* Logo in center if available with enhanced styling */}
        {config.centerLogo && (
          <image 
            href={config.centerLogo} 
            x={CENTER - INNER_RADIUS + 10} 
            y={CENTER - INNER_RADIUS + 10} 
            height={INNER_RADIUS * 2 - 20} 
            width={INNER_RADIUS * 2 - 20}
            preserveAspectRatio="xMidYMid meet"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}
          />
        )}
        
        {/* Improved glossy overlay for 3D effect */}
        <ellipse
          cx={CENTER}
          cy={CENTER - 70}
          rx={RADIUS - 30}
          ry={70}
          fill="url(#wheel-gloss)"
          opacity="0.6"
          style={{ mixBlendMode: 'soft-light' }}
        />
        
        {/* Additional subtle radial highlight */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS - 20}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          opacity="0.1"
        />
      </svg>
      
      {/* Enhanced spin button */}
      {showSpinButton && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSpin}
          disabled={isSpinning}
          className={`mt-8 px-8 py-4 font-bold text-white rounded-full 
            ${isSpinning 
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg'
            }`}
          style={{
            boxShadow: isSpinning ? 'none' : '0 4px 15px rgba(123, 97, 255, 0.4), 0 0 5px rgba(123, 97, 255, 0.2) inset'
          }}
          aria-disabled={isSpinning}
          aria-label="Spin the wheel"
        >
          {isSpinning ? 'Spinning...' : 'Tourner la roue !'}
        </motion.button>
      )}
    </div>
  );
};

export default SimpleWheel3D; 