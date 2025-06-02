import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, PerspectiveCamera, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
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

// WebGL detection utility
const isWebGLSupported = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
};

// 3D Wheel component with physics-based animation
const Wheel3D: React.FC<WheelProps> = (props) => {
  const { config, isSpinning, prizeIndex, onSpin, showSpinButton = false } = props;
  const [webGLSupported, setWebGLSupported] = useState(true);
  
  // Check WebGL support
  useEffect(() => {
    setWebGLSupported(isWebGLSupported());
  }, []);

  // Fallback to 2D wheel if WebGL is not supported
  if (!webGLSupported) {
    return <Wheel {...props} />;
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center">
      {/* 3D Canvas */}
      <div className="relative" style={{ width: 384, height: 384 }}>
        <Canvas shadows dpr={[1, 2]} className="rounded-full">
          <Suspense fallback={<Html center>Loading 3D wheel...</Html>}>
            <WheelScene
              config={config}
              isSpinning={isSpinning}
              prizeIndex={prizeIndex}
              segmentCount={config.segments.length}
              onSpin={onSpin}
            />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
        
        {/* Pointer overlay */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          {config.pointerIconUrl ? (
            <img src={config.pointerIconUrl} alt="" className="h-16 w-16" />
          ) : (
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
              </filter>
              <path 
                d="M24 48 L48 16 L24 32 L0 16 Z" 
                fill={config.colors?.pointer || '#ffffff'}
                stroke={config.colors?.pointerBorder || '#a25afd'}
                strokeWidth="3"
                filter="url(#shadow3d)"
              />
              <circle cx="24" cy="32" r="6" fill={config.colors?.primaryGradient || '#a25afd'} stroke="#fff" strokeWidth="2" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Spin button */}
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
          aria-disabled={isSpinning}
          aria-label="Spin the wheel"
        >
          {isSpinning ? 'Spinning...' : 'Tourner la roue'}
        </motion.button>
      )}
    </div>
  );
};

// 3D Scene for the Wheel
const WheelScene = ({ 
  config, 
  isSpinning, 
  prizeIndex, 
  segmentCount,
  onSpin 
}: { 
  config: WheelConfig; 
  isSpinning: boolean; 
  prizeIndex: number; 
  segmentCount: number;
  onSpin: () => void;
}) => {
  const camera = useRef(new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
  const wheelGroup = useRef<THREE.Group>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  // Position camera for better view
  useEffect(() => {
    if (camera.current) {
      camera.current.position.set(0, 0, 5);
      camera.current.lookAt(0, 0, 0);
    }
  }, []);

  // Handle spin animation
  useEffect(() => {
    let tickInterval: number | undefined;
    let spinEndTimer: number | undefined;
    let soundTimer: number | undefined;
    let forcedCallbackTimer: number | undefined;
    
    if (isSpinning && !spinning) {
      // Set spinning state to prevent multiple animations
      setSpinning(true);
      
      console.log('Starting Wheel3D spin animation');
      
      // CRITICAL DIRECT FIX: Force immediate callback bypassing animation
      console.log('WHEEL3D - CRITICAL FIX: Scheduling direct callback');
      setTimeout(() => {
        console.log('WHEEL3D - CRITICAL FIX: Directly triggering onSpin');
        setSpinning(false);
        onSpin(); // Directly call callback
      }, 5000); // 5 seconds should be enough for visual effect
      
      // Calculate segment angle
      const segAngle = (Math.PI * 2) / segmentCount;
      
      // Calculate target rotation: Multiple full rotations + offset to prize
      const rotations = 5 + Math.random() * 3; // 5-8 full rotations
      const targetSegment = Math.PI * 2 - (prizeIndex * segAngle + segAngle / 2);
      const target = Math.PI * 2 * rotations + targetSegment;
      
      // CRITICAL FIX: Log the exact prize index and segment
      console.log('Wheel3D - Prize index:', prizeIndex);
      console.log('Wheel3D - Prize segment label:', config.segments[prizeIndex]?.label);
      
      // Set rotation target
      setRotation(target);
      
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
        
      spinEndTimer = window.setTimeout(() => {
        // Clear tick interval
        if (tickInterval) clearInterval(tickInterval);
        
        // Clear forced callback timer since animation completed normally
        if (forcedCallbackTimer) {
          clearTimeout(forcedCallbackTimer);
          forcedCallbackTimer = undefined;
        }
        
        // Play win/lose sound
        if (config.segments[prizeIndex]?.isWinning) {
          soundUtils.play('win', 0.8);
          console.log('Prize won in 3D wheel!');
        } else {
          soundUtils.play('lose', 0.5);
          console.log('No prize won in 3D wheel');
        }
        
        // Final haptic feedback
        if (config.hapticFeedback) {
          soundUtils.vibrate([50, 30, 50]);
        }
        
        // Reset spinning state and call onSpin
        soundTimer = window.setTimeout(() => {
          console.log('3D wheel animation complete, notifying parent');
          setSpinning(false);
          
          // Notify parent that the wheel has stopped
          onSpin();
        }, 500);
      }, duration * 1000);
    }
    
    // Clean up timers when component unmounts or dependencies change
    return () => {
      if (tickInterval) clearInterval(tickInterval);
      if (spinEndTimer) clearTimeout(spinEndTimer);
      if (soundTimer) clearTimeout(soundTimer);
      if (forcedCallbackTimer) clearTimeout(forcedCallbackTimer);
    };
  }, [isSpinning, prizeIndex, config.spinDurationMin, config.spinDurationMax, spinning, 
      config.hapticFeedback, config.segments, config.sounds, segmentCount, onSpin]);

  // Replace useFrame with requestAnimationFrame for simpler animation
  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      if (wheelGroup.current) {
        // Calculate target rotation in radians
        const targetRotation = spinning ? rotation : wheelGroup.current.rotation.z;
        
        // Apply rotation with physics-based easing
        wheelGroup.current.rotation.z += (targetRotation - wheelGroup.current.rotation.z) * 0.05;
      }
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [spinning, rotation]);

  // Create segments for the wheel
  const segmentAngle = (Math.PI * 2) / segmentCount;
  const segments = config.segments.map((segment, index) => {
    const startAngle = index * segmentAngle;
    const endAngle = (index + 1) * segmentAngle;
    const color = new THREE.Color(segment.color);
    
    return { segment, startAngle, endAngle, color };
  });

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

  return (
    <>
      {/* Main lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      
      {/* Camera controls for development (can be removed in production) */}
      {/* <OrbitControls enableZoom={false} enablePan={false} /> */}
      
      {/* Wheel group */}
      <group ref={wheelGroup} rotation={[Math.PI / 2, 0, 0]}>
        {/* Wheel base */}
        <cylinder 
          args={[1.8, 1.8, 0.1, 32]} 
          position={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial 
            color={colors.primaryGradient}
            metalness={0.3}
            roughness={0.4}
          />
        </cylinder>
        
        {/* Wheel rim */}
        <cylinder 
          args={[1.85, 1.85, 0.05, 32]} 
          position={[0, 0, 0.05]}
          receiveShadow
        >
          <meshStandardMaterial 
            color={colors.border}
            metalness={0.4}
            roughness={0.3}
          />
        </cylinder>
        
        {/* Segments */}
        {segments.map((seg, i) => (
          <group key={i}>
            {/* Segment wedge */}
            <mesh position={[0, 0, 0]} receiveShadow castShadow>
              <cylinderGeometry 
                args={[1.7, 1.7, 0.12, 32, 1, false, seg.startAngle, segmentAngle]} 
              />
              <meshStandardMaterial 
                color={seg.color} 
                metalness={0.2} 
                roughness={0.5}
              />
            </mesh>
            
            {/* Segment label */}
            <group 
              position={[
                Math.cos(seg.startAngle + segmentAngle / 2) * 1.2, 
                Math.sin(seg.startAngle + segmentAngle / 2) * 1.2, 
                0.07
              ]}
              rotation={[0, 0, seg.startAngle + segmentAngle / 2 + Math.PI / 2]}
            >
              <Text
                color="#ffffff"
                fontSize={0.1}
                maxWidth={0.8}
                lineHeight={1}
                letterSpacing={0.02}
                textAlign="center"
                font="Arial"
                fontWeight="bold"
                anchorX="center"
                anchorY="middle"
              >
                {seg.segment.label}
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </Text>
            </group>
          </group>
        ))}
        
        {/* Center hub */}
        <cylinder 
          args={[0.3, 0.3, 0.15, 32]} 
          position={[0, 0, 0.1]}
        >
          <meshStandardMaterial 
            color="#ffffff"
            metalness={0.5}
            roughness={0.2}
          />
        </cylinder>
        
        {/* Logo in center if available */}
        {config.centerLogo && (
          <Html 
            position={[0, 0, 0.2]} 
            transform 
            occlude 
            scale={0.4}
            style={{ pointerEvents: 'none' }}
          >
            <img 
              src={config.centerLogo} 
              alt="" 
              style={{ width: '100px', height: '100px', borderRadius: '50%' }} 
            />
          </Html>
        )}
      </group>
    </>
  );
};

export default Wheel3D; 