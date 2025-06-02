import React, { useRef, useEffect, useState } from 'react';

interface Segment {
  label: string;
  color: string;
}

interface CustomWheelProps {
  segments: Segment[];
  mustSpin: boolean;
  prizeIndex: number;
  onStopSpinning: () => void;
  spinDuration?: number;
}

const WHEEL_SIZE = 384; // px
const CENTER = WHEEL_SIZE / 2;
const RADIUS = CENTER - 24;
const FONT_SIZE = 22;

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

function getTextPathId(i: number) {
  return `wheel-arc-text-${i}`;
}

const CustomWheel: React.FC<CustomWheelProps> = ({ segments, mustSpin, prizeIndex, onStopSpinning, spinDuration = 2 }) => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const prevMustSpin = useRef(false);

  useEffect(() => {
    if (mustSpin && !spinning) {
      setSpinning(true);
      // Calculate target rotation
      const segAngle = 360 / segments.length;
      const randomOffset = Math.random() * segAngle * 0.7; // for realism
      const target = 360 * 6 + (360 - (prizeIndex * segAngle + segAngle / 2) + randomOffset);
      setRotation(target);
      setTimeout(() => {
        setSpinning(false);
        onStopSpinning();
      }, spinDuration * 1000);
    }
    prevMustSpin.current = mustSpin;
  }, [mustSpin, prizeIndex, segments.length, spinDuration, spinning, onStopSpinning]);

  // SVG gradients and filters
  const rimGradient = (
    <radialGradient id="rim-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#b3b3ff" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
    </radialGradient>
  );
  const glassHighlight = (
    <linearGradient id="glass-highlight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  );

  // Wheel segments
  const segAngle = 360 / segments.length;
  let startAngle = 0;

  return (
    <div style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, position: 'relative' }}>
      {/* Pointer */}
      <svg width={64} height={64} style={{ position: 'absolute', left: CENTER - 32, top: -32, zIndex: 2 }}>
        <circle cx={32} cy={32} r={28} fill="url(#rim-gradient)" stroke="#fff" strokeWidth={4} />
        <polygon points="32,8 44,40 20,40" fill="#ff5e7e" stroke="#fff" strokeWidth={2} filter="drop-shadow(0 2px 6px #0003)" />
        <circle cx={32} cy={24} r={7} fill="#fffbe7" stroke="#ffb300" strokeWidth={2} />
      </svg>
      {/* Wheel SVG */}
      <svg
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        style={{
          borderRadius: '50%',
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
          background: 'radial-gradient(circle at 60% 40%, #fff 60%, #e0e7ff 100%)',
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${spinDuration}s cubic-bezier(.17,.67,.83,.67)` : undefined,
        }}
      >
        <defs>
          {rimGradient}
          {glassHighlight}
        </defs>
        {/* Rim */}
        <circle cx={CENTER} cy={CENTER} r={CENTER - 4} fill="url(#rim-gradient)" stroke="#fff" strokeWidth={6} />
        {/* Segments */}
        {segments.map((seg, i) => {
          const endAngle = startAngle + segAngle;
          const path = getArcPath(CENTER, CENTER, RADIUS, startAngle, endAngle);
          const textPathId = getTextPathId(i);
          // For text arc
          const midAngle = startAngle + segAngle / 2;
          const textRadius = RADIUS - 40;
          const textArcPath = getArcPath(CENTER, CENTER, textRadius, startAngle + 2, endAngle - 2);
          const textRotation = midAngle > 90 && midAngle < 270 ? 180 : 0;
          const textAnchor = 'middle';
          const label = seg.label;
          const segEl = (
            <g key={i}>
              <path d={path} fill={seg.color} stroke="#fff" strokeWidth={2} filter="drop-shadow(0 2px 8px #0001)" />
              <path id={textPathId} d={textArcPath} fill="none" />
              <text
                fontSize={FONT_SIZE}
                fontWeight="bold"
                fill="#fff"
                letterSpacing={1}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                style={{ filter: 'drop-shadow(0 1px 2px #0006)' }}
              >
                <textPath
                  href={`#${textPathId}`}
                  startOffset="50%"
                  method="align"
                  spacing="auto"
                  alignmentBaseline="middle"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  style={{
                    textShadow: '0 2px 8px #0008',
                    transform: `rotate(${textRotation}deg)`,
                  }}
                >
                  {label}
                </textPath>
              </text>
            </g>
          );
          startAngle = endAngle;
          return segEl;
        })}
        {/* Glass highlight overlay */}
        <ellipse
          cx={CENTER}
          cy={CENTER - 60}
          rx={CENTER - 60}
          ry={32}
          fill="url(#glass-highlight)"
          opacity={0.7}
        />
        {/* Center circle */}
        <circle cx={CENTER} cy={CENTER} r={32} fill="#fff" stroke="#e0e7ff" strokeWidth={4} />
      </svg>
    </div>
  );
};

export default CustomWheel; 