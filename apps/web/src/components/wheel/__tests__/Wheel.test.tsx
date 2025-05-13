import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Wheel from '../Wheel';
import { WheelConfig } from '../types';

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

describe('Wheel Component', () => {
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
  });

  it('renders correctly with all segments', () => {
    render(
      <Wheel
        config={mockConfig}
        isSpinning={false}
        prizeIndex={0}
        onSpin={mockOnSpin}
      />
    );

    // Check if the wheel is rendered
    const wheelElement = screen.getByRole('img', { name: /prize wheel/i });
    expect(wheelElement).toBeInTheDocument();

    // Check if all segments are rendered
    mockConfig.segments.forEach(segment => {
      expect(screen.getByText(segment.label)).toBeInTheDocument();
    });

    // Check spin button is enabled when not spinning
    const spinButton = screen.getByRole('button', { name: /tourner la roue/i });
    expect(spinButton).toBeEnabled();
    expect(spinButton).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('disables spin button when spinning', () => {
    render(
      <Wheel
        config={mockConfig}
        isSpinning={true}
        prizeIndex={0}
        onSpin={mockOnSpin}
      />
    );

    const spinButton = screen.getByRole('button');
    expect(spinButton).toBeDisabled();
    expect(spinButton).toHaveAttribute('aria-disabled', 'true');
    expect(spinButton).toHaveTextContent(/spinning/i);
  });

  it('calls onSpin when spin button is clicked', () => {
    render(
      <Wheel
        config={mockConfig}
        isSpinning={false}
        prizeIndex={0}
        onSpin={mockOnSpin}
      />
    );

    const spinButton = screen.getByRole('button', { name: /tourner la roue/i });
    fireEvent.click(spinButton);
    
    expect(mockOnSpin).toHaveBeenCalledTimes(1);
  });

  it('applies accessibility attributes correctly', () => {
    render(
      <Wheel
        config={mockConfig}
        isSpinning={false}
        prizeIndex={0}
        onSpin={mockOnSpin}
      />
    );

    // Check for proper ARIA attributes
    const wheel = screen.getByRole('img', { name: /prize wheel/i });
    expect(wheel).toHaveAttribute('aria-label', 'Prize wheel');

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Spin the wheel');
  });
}); 