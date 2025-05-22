import React, { useRef, useState, useEffect } from 'react';
import type { WheelConfig } from './types';
import soundUtils from '../../lib/sound';

interface WheelProps {
  config: WheelConfig;
  isSpinning: boolean;
  prizeIndex: number;
  onSpin: () => void;
  showSpinButton?: boolean;
}

// Constants for wheel dimensions
const WHEEL_SIZE = 384;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = CENTER - 24;

// Default brand colors
const DEFAULT_COLORS = {
  primaryGradient: '#a25afd',   // Violet
  secondaryGradient: '#6366f1', // Indigo
  border: '#ffffff',
  background: 'rgba(255, 255, 255, 0.1)',
  pointer: '#ffffff',
  pointerBorder: '#a25afd'
};

// Helper functions for SVG path calculations
function getArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'L', cx, cy,
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

// Main Wheel component
const Wheel: React.FC<WheelProps> = ({ config, isSpinning, prizeIndex, onSpin, showSpinButton = false }) => {
  // State for animation and interaction
  const [rotation, setRotation] = useState(0);
  const [pointerDropped, setPointerDropped] = useState(false);
  const [spinning, setSpinning] = useState(false);
  
  // References
  const wheelRef = useRef<SVGSVGElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(SVGPathElement | null)[]>([]);
  
  // Calculate segment angle and prepare refs array
  const segAngle = 360 / config.segments.length;
  let startAngle = 0;
  
  // Initialize sound system
  useEffect(() => {
    soundUtils.init();
  }, []);
  
  // Handle spin animation with physics-based easing
  useEffect(() => {
    if (isSpinning && !spinning) {
      // Set spinning state to prevent multiple animations
      setSpinning(true);
      setPointerDropped(false);
      
      // Random spin duration within configured range
      const duration = Math.random() * 
        (config.spinDurationMax - config.spinDurationMin) + 
        config.spinDurationMin;
      
      // Calculate target rotation: Multiple full rotations + offset to prize
      const rotations = 5 + Math.random() * 3; // 5-8 full rotations
      const targetSegment = 360 - (prizeIndex * segAngle + segAngle / 2);
      const target = 360 * rotations + targetSegment;
      
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
          }
        }, tickDelay);
      }
      
      // Trigger haptic feedback if enabled and supported
      if (config.hapticFeedback) {
        soundUtils.vibrate(50);
      }
      
      // Drop pointer at the end of spin animation
      setTimeout(() => {
        // Clear tick interval
        if (tickInterval) clearInterval(tickInterval);
        
        // Drop pointer
        setPointerDropped(true);
        
        // Play win/lose sound
        if (config.segments[prizeIndex]?.isWinning) {
          soundUtils.play('win', 0.8);
        } else {
          soundUtils.play('lose', 0.5);
        }
        
        // Final haptic feedback
        if (config.hapticFeedback) {
          soundUtils.vibrate([50, 30, 50]);
        }
        
        // Reset spinning state
        setTimeout(() => {
          setSpinning(false);
        }, 500);
      }, duration * 1000);
    }
    
    // Reset pointer if not spinning
    if (!isSpinning) {
      setPointerDropped(false);
    }
  }, [isSpinning, prizeIndex, config.spinDurationMin, config.spinDurationMax, segAngle, spinning, 
      config.hapticFeedback, config.segments, config.sounds]);
  
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
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center">
      {/* Animated background glow */}
      <div className="absolute z-0 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-indigo-400/30 via-pink-400/20 to-purple-400/30 blur-3xl animate-spin-slow opacity-70" 
        style={{ animationDuration: '16s' }} />
      
      {/* Pointer */}
      <div className="relative z-10 flex justify-center" style={{ height: 64 }}>
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
            <img src={config.pointerIconUrl} alt="" className="h-16 w-16" />
          ) : (
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
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
      
      {/* Wheel SVG */}
      <svg
        ref={wheelRef}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        className="block mx-auto relative z-0"
        style={{
          borderRadius: '50%',
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.25)',
          transform: `rotate(${rotation}deg)`,
          transition: spinning 
            ? `transform ${spinning ? 5 + (rotation % 360) / 360 : 0}s cubic-bezier(0.18, 0.76, 0.22, 0.96)`
            : undefined,
          willChange: 'transform',
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
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>
        
        {/* Wheel background rim */}
        <circle 
          cx={CENTER} 
          cy={CENTER} 
          r={CENTER - 4} 
          fill="url(#izi-brand-gradient)" 
          stroke={colors.border} 
          strokeWidth={8}
          filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))"
        />
        
        {/* Glossy overlay */}
        <circle 
          cx={CENTER} 
          cy={CENTER} 
          r={CENTER - 12} 
          fill="url(#wheel-gloss)" 
          stroke="none" 
          opacity="0.6" 
          pointerEvents="none"
        />
        
        {/* Segments */}
        {config.segments.map((seg, i) => {
          const endAngle = startAngle + segAngle;
          const path = getArcPath(CENTER, CENTER, RADIUS, startAngle, endAngle);
          
          // Calculate position for labels and icons
          const labelAngle = startAngle + segAngle / 2;
          const labelDistance = RADIUS - 60;
          const labelPos = polarToCartesian(CENTER, CENTER, labelDistance, labelAngle);
          
          // Create segment element
          const segEl = (
            <g key={i} className="segment-group">
              <path 
                ref={el => segmentRefs.current[i] = el}
                d={path} 
                fill={seg.color || `hsl(${(i * 137.5) % 360}, 75%, 65%)`} 
                stroke={colors.border} 
                strokeWidth={2}
                className="segment"
                data-segment-index={i}
                data-segment-label={seg.label}
                filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))"
              />
              
              {/* Icon */}
              {seg.iconUrl && (
                <image 
                  href={seg.iconUrl} 
                  x={labelPos.x - 18} 
                  y={labelPos.y - (seg.label ? 24 : 12)} 
                  width={36} 
                  height={36} 
                  filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))"
                />
              )}
              
              {/* Label */}
              <text
                x={labelPos.x}
                y={labelPos.y + (seg.iconUrl ? 28 : 0)}
                fontSize={18}
                fontWeight="bold"
                fill="#fff"
                textAnchor="middle"
                alignmentBaseline="middle"
                filter="url(#textShadow)"
                style={{ 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  userSelect: 'none'
                }}
              >
                {seg.label}
              </text>
            </g>
          );
          
          // Increment angle for next segment
          startAngle = endAngle;
          return segEl;
        })}
        
        {/* Center logo or brand */}
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
            fontSize={22} 
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