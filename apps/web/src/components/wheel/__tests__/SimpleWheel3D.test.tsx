import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleWheel3D from '../SimpleWheel3D';
import Wheel from '../Wheel';
import { WheelConfig } from '../types';

// Mock SVG methods
SVGElement.prototype.getBBox = () => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  cx: 50,
  cy: 50
});

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

describe('SimpleWheel3D Component', () => {
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

  it('should render the SVG wheel when WebGL is supported', () => {
    // Simulate WebGL support
    mockCanvas.getContext.mockImplementation((contextType) => {
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return {};
      }
      return null;
    });

    render(
      <SimpleWheel3D
        config={mockConfig}
        isSpinning={false}
        prizeIndex={0}
        onSpin={mockOnSpin}
      />
    );

    // Check for SVG element
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    
    // Check for segment texts
    mockConfig.segments.forEach(segment => {
      const textElements = screen.getAllByText(segment.label);
      expect(textElements.length).toBeGreaterThan(0);
    });
    
    // Check that the 2D fallback wasn't used
    expect(Wheel).not.toHaveBeenCalled();
  });

  it('should fall back to 2D wheel when WebGL is not supported', () => {
    // Simulate no WebGL support
    mockCanvas.getContext.mockImplementation(() => null);

    render(
      <SimpleWheel3D
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
      <SimpleWheel3D
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