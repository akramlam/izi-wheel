"use client";

import { useEffect, useRef } from "react";
import { Confetti, ConfettiRef } from "./confetti";
import type { Options as ConfettiOptions } from "canvas-confetti";

interface TimedConfettiProps {
  isActive: boolean;
  duration?: number;
  options?: ConfettiOptions;
  className?: string;
}

export const TimedConfetti = ({ 
  isActive, 
  duration = 8000, 
  options, 
  className = "!fixed inset-0 z-[300] pointer-events-none size-full" 
}: TimedConfettiProps) => {
  const confettiRef = useRef<ConfettiRef>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanedUp = useRef<boolean>(false);

  // Setup cleanup function
  const cleanup = () => {
    isCleanedUp.current = true;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Call reset on the confetti instance if it exists
    if (confettiRef.current && typeof confettiRef.current === 'object') {
      try {
        // Manual reset attempt
        if (confettiRef.current.fire) {
          // This forces the confetti to stop
          confettiRef.current.fire({
            particleCount: 0,
            ticks: 1
          });
        }
      } catch (error) {
        console.error("Error cleaning up confetti:", error);
      }
    }
  };
  
  // Effect to handle timing and cleanup
  useEffect(() => {
    // Reset the cleanup flag when active state changes
    isCleanedUp.current = false;
    
    if (isActive) {
      // Set a timeout to clean up the confetti
      timeoutRef.current = setTimeout(() => {
        if (!isCleanedUp.current) {
          cleanup();
        }
      }, duration);
    } else {
      // If not active, clean up immediately
      cleanup();
    }
    
    // Cleanup on unmount or when isActive changes
    return cleanup;
  }, [isActive, duration]);

  // Only render the confetti when active
  if (!isActive) return null;

  return (
    <Confetti
      ref={confettiRef}
      options={{
        particleCount: 160,
        angle: 90,
        spread: 120,
        origin: { x: 0.5, y: 0.3 },
        gravity: 1,
        decay: 0.9,
        ticks: 200,
        ...options
      }}
      className={className}
    />
  );
}; 