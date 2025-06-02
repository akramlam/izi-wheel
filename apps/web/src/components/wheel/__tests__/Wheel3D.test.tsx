import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Wheel3D from '../Wheel3DFixed';
import Wheel from '../Wheel';
import { WheelConfig } from '../types';

// Mock the Canvas component
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: jest.fn((callback) => callback()),
}));

// Mock THREE.js elements
jest.mock('three', () => ({
  Group: class Group {
    rotation = { z: 0 };
  },
  Color: function Color(color: string) {
    return { color };
  }
}));

// Mock drei components
jest.mock('@react-three/drei', () => ({
  PerspectiveCamera: () => null,
  Environment: () => null,
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the regular Wheel component for fallback tests
jest.mock('../Wheel', () => jest.fn(() => <div data-testid="2d-wheel-fallback" />));

// Mock sound utility
jest.mock('../../../lib/sound', () => ({
  init: jest.fn(),
  play: jest.fn(),
  vibrate: jest.fn(),
  default: {
    init: jest.fn(),
    play: jest.fn(),
    vibrate: jest.fn(),
  }
}));

// Mock HTML5 canvas for WebGL detection
const originalCreateElement = document.createElement;
const mockCanvas = {
  getContext: jest.fn()
};

describe('Wheel3D Component', () => {
  const mockConfig: WheelConfig = {
    segments: [
      { label: 'Prize 1', color: '#FF5722', isWinning: true },
      { label: 'Prize 2', color: '#E91E63' },
      { label: 'Prize 3', color: '#9C27B0', isWinning: true },
      { label: 'Prize 4', color: '#673AB7' },
    ],
    spinDurationMin: 2,
    spinDurationMax: 4,
    sounds: {
      tick: true,
      win: true
    },
    hapticFeedback: true
  };

  const mockOnSpin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock HTML5 canvas and WebGL context
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
  });

  it('should render the 3D wheel when WebGL is supported', () => {
    // Simulate WebGL support
    mockCanvas.getContext.mockImplementation((contextType) => {
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return {};
      }
      return null;
    });

    render(
      <Wheel3D
        config={mockConfig}
        isSpinning={false}
        prizeIndex={0}
        onSpin={mockOnSpin}
      />
    );

    // Check for 3D canvas
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    
    // Check that the 2D fallback wasn't used
    expect(Wheel).not.toHaveBeenCalled();
  });

  it('should fall back to 2D wheel when WebGL is not supported', () => {
    // Simulate no WebGL support
    mockCanvas.getContext.mockImplementation(() => null);

    render(
      <Wheel3D
        config={mockConfig}
        isSpinning={false}
        prizeIndex={0}
        onSpin={mockOnSpin}
      />
    );

    // Check that fallback was rendered
    expect(Wheel).toHaveBeenCalledWith(
      expect.objectContaining({
        config: mockConfig,
        isSpinning: false,
        prizeIndex: 0
      }),
      expect.anything()
    );
  });

  it('passes spinner state correctly when spinning', () => {
    // Simulate WebGL support
    mockCanvas.getContext.mockImplementation((contextType) => {
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return {};
      }
      return null;
    });

    render(
      <Wheel3D
        config={mockConfig}
        isSpinning={true}
        prizeIndex={2}
        onSpin={mockOnSpin}
        showSpinButton={true}
      />
    );

    // Check for spin button in disabled state when spinning
    const spinButton = screen.getByRole('button', { name: /spinning/i });
    expect(spinButton).toBeDisabled();
    expect(spinButton).toHaveAttribute('aria-disabled', 'true');
  });
}); 