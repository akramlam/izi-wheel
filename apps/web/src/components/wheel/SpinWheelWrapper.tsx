import React, { useEffect, useRef } from 'react';
// Use package root so Vite resolves via exports field (fixes CI deep import error)
import { Wheel as SpinWheel } from 'spin-wheel';

export type SpinWheelItem = {
  label: string;
  backgroundColor?: string;
  weight?: number;
};

export type SpinWheelProps = {
  items: SpinWheelItem[];
  pointerAngle?: number; // default 0
  radius?: number; // 0..1
  onRest?: (index: number) => void;
  className?: string;
};

const SpinWheelWrapper: React.FC<SpinWheelProps> = ({ items, pointerAngle = 0, radius = 0.95, onRest, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const props = {
      items: items.map(it => ({
        label: it.label,
        backgroundColor: it.backgroundColor,
        weight: it.weight ?? 1,
      })),
      pointerAngle,
      radius,
      onRest: (e: any) => {
        if (typeof onRest === 'function' && typeof e?.currentIndex === 'number') {
          onRest(e.currentIndex);
        }
      },
    } as any;

    const wheel = new SpinWheel(containerRef.current, props);
    wheelRef.current = wheel;

    return () => {
      try {
        wheel?.destroy?.();
      } catch {}
    };
  }, [items, pointerAngle, radius, onRest]);

  return (
    <div className={className} ref={containerRef} style={{ width: '100%', aspectRatio: '1 / 1' }} />
  );
};

export default SpinWheelWrapper;
