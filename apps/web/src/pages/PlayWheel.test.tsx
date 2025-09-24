import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PlayWheel from './PlayWheel';
import * as api from '../lib/api';
import { toast } from '../hooks/use-toast';

// Mock dependencies
vi.mock('../lib/api');
vi.mock('../hooks/use-toast');
vi.mock('../components/wheel/Wheel', () => ({
  default: ({ config, mustSpin, prizeIndex, onSpinComplete }: any) => (
    <div data-testid="wheel-component">
      <div data-testid="segments-count">{config?.segments?.length || 0}</div>
      <div data-testid="must-spin">{mustSpin.toString()}</div>
      <div data-testid="prize-index">{prizeIndex}</div>
      {mustSpin && (
        <button
          data-testid="simulate-spin-complete"
          onClick={() => onSpinComplete({ winningIndex: prizeIndex })}
        >
          Complete Spin
        </button>
      )}
    </div>
  )
}));

vi.mock('../components/magicui/timedConfetti', () => ({
  TimedConfetti: ({ onComplete }: any) => (
    <div data-testid="confetti" onClick={onComplete}>
      🎉
    </div>
  )
}));

vi.mock('../components/play-wheel/SocialRedirectDialog', () => ({
  SocialRedirectDialog: ({ open, onClose, network }: any) =>
    open ? (
      <div data-testid="social-dialog">
        <div>Network: {network}</div>
        <button data-testid="close-social" onClick={onClose}>Close</button>
      </div>
    ) : null
}));

// Mock timers for animations
vi.useFakeTimers();

const mockApi = vi.mocked(api);
const mockToast = vi.mocked(toast);

describe('PlayWheel Component', () => {
  let queryClient: QueryClient;

  const mockWheelData = {
    wheel: {
      id: 'wheel-1',
      name: 'Test Prize Wheel',
      mainTitle: 'Win Amazing Prizes!',
      gameRules: 'Spin once to win prizes',
      footerText: 'Good luck everyone!',
      formSchema: {
        fields: [
          { name: 'email', type: 'email', label: 'Email Address', required: true }
        ]
      },
      socialNetwork: null,
      redirectUrl: null,
      redirectText: null,
      playLimit: 'UNLIMITED',
      bannerImage: null,
      backgroundImage: null,
      slots: [
        {
          id: 'slot-1',
          label: 'Free Coffee',
          color: '#8B4513',
          weight: 25,
          isWinning: true,
          position: 0
        },
        {
          id: 'slot-2',
          label: '10% Discount',
          color: '#32CD32',
          weight: 25,
          isWinning: true,
          position: 1
        },
        {
          id: 'slot-3',
          label: 'Try Again',
          color: '#FF6347',
          weight: 25,
          isWinning: false,
          position: 2
        },
        {
          id: 'slot-4',
          label: 'Free Shipping',
          color: '#4169E1',
          weight: 25,
          isWinning: true,
          position: 3
        }
      ]
    }
  };

  const mockPlayResponse = {
    play: {
      id: 'play-1',
      result: 'WIN' as const,
      prize: {
        pin: 'COFFEE123',
        qrLink: 'https://example.com/qr/COFFEE123'
      }
    },
    slot: {
      id: 'slot-1',
      label: 'Free Coffee',
      position: 0
    },
    prizeIndex: 0,
    resolvedPrizeIndex: 0,
    resolvedSegment: {
      id: 'slot-1',
      label: 'Free Coffee',
      isWinning: true,
      position: 0
    }
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    vi.clearAllMocks();
    mockApi.get.mockResolvedValue(mockWheelData);
    mockApi.post.mockResolvedValue(mockPlayResponse);
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllTimers();
  });

  const renderPlayWheel = (companyId = 'company-1', wheelId = 'wheel-1') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/play/${companyId}/${wheelId}`]}>
          <Routes>
            <Route path="/play/:companyId/:wheelId" element={<PlayWheel />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderPlayWheel();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render wheel data after loading', async () => {
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByText('Win Amazing Prizes!')).toBeInTheDocument();
      });

      expect(screen.getByText('Spin once to win prizes')).toBeInTheDocument();
      expect(screen.getByText('Good luck everyone!')).toBeInTheDocument();
      expect(screen.getByTestId('wheel-component')).toBeInTheDocument();
      expect(screen.getByTestId('segments-count')).toHaveTextContent('4');
    });

    it('should display spin button when ready', async () => {
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });
    });

    it('should handle wheel not found gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('Wheel not found'));

      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should handle missing wheel data', async () => {
      mockApi.get.mockResolvedValue({ wheel: null });

      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByText(/roue non trouvée/i)).toBeInTheDocument();
      });
    });
  });

  describe('Social Network Integration', () => {
    it('should show social redirect dialog when social network is configured', async () => {
      const socialWheelData = {
        wheel: {
          ...mockWheelData.wheel,
          socialNetwork: 'instagram',
          redirectUrl: 'https://instagram.com/test',
          redirectText: 'Follow us for more prizes!'
        }
      };

      mockApi.get.mockResolvedValue(socialWheelData);
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByTestId('social-dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('Network: instagram')).toBeInTheDocument();
    });

    it('should allow proceeding after social action completion', async () => {
      const socialWheelData = {
        wheel: {
          ...mockWheelData.wheel,
          socialNetwork: 'facebook',
          redirectUrl: 'https://facebook.com/test'
        }
      };

      mockApi.get.mockResolvedValue(socialWheelData);
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByTestId('social-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-social'));

      await waitFor(() => {
        expect(screen.queryByTestId('social-dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });
    });
  });

  describe('Wheel Spinning Logic', () => {
    it('should initiate spin when button is clicked', async () => {
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          '/public/company-1/wheels/wheel-1/play',
          { leadInfo: undefined }
        );
      });

      expect(screen.getByTestId('must-spin')).toHaveTextContent('true');
    });

    it('should handle winning spin correctly', async () => {
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('simulate-spin-complete')).toBeInTheDocument();
      });

      // Simulate wheel animation completion
      fireEvent.click(screen.getByTestId('simulate-spin-complete'));

      await waitFor(() => {
        expect(screen.getByText(/félicitations/i)).toBeInTheDocument();
        expect(screen.getByText(/free coffee/i)).toBeInTheDocument();
        expect(screen.getByText('COFFEE123')).toBeInTheDocument();
      });
    });

    it('should handle losing spin correctly', async () => {
      const losingResponse = {
        play: { id: 'play-2', result: 'LOSE' as const },
        slot: { id: 'slot-3', label: 'Try Again', position: 2 },
        prizeIndex: 2,
        resolvedPrizeIndex: 2
      };

      mockApi.post.mockResolvedValue(losingResponse);
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('prize-index')).toHaveTextContent('2');
        expect(screen.getByTestId('simulate-spin-complete')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('simulate-spin-complete'));

      await waitFor(() => {
        expect(screen.getByText(/pas de chance/i)).toBeInTheDocument();
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });
    });

    it('should show confetti after winning', async () => {
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('simulate-spin-complete'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('confetti')).toBeInTheDocument();
      });
    });

    it('should handle API errors during spin', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erreur',
          description: 'Impossible de jouer à la roue. Veuillez réessayer.',
          variant: 'destructive'
        });
      });
    });

    it('should handle play limit exceeded', async () => {
      mockApi.post.mockRejectedValue(new Error('Play limit exceeded'));
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Limite atteinte',
          description: 'Vous avez atteint la limite de jeu pour cette roue.',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Prize Claiming Flow', () => {
    it('should show claim form for winning plays', async () => {
      renderPlayWheel();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('simulate-spin-complete'));
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /réclamer mon prix/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /réclamer mon prix/i }));

      await waitFor(() => {
        expect(screen.getByText(/réclamez votre prix/i)).toBeInTheDocument();
      });
    });

    it('should allow playing again after completion', async () => {
      renderPlayWheel();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('simulate-spin-complete'));
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /rejouer/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /rejouer/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tourner la roue/i })).toBeInTheDocument();
        expect(screen.getByTestId('must-spin')).toHaveTextContent('false');
      });
    });
  });

  describe('Prize Resolution Integration', () => {
    it('should correctly resolve prize position from backend response', async () => {
      // Test with a response that has different slot ordering
      const complexResponse = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'slot-4', label: 'Free Shipping', position: 3 },
        prizeIndex: 999, // Should be ignored in favor of ID match
        resolvedPrizeIndex: 3, // Should be calculated based on stable sorting
        resolvedSegment: {
          id: 'slot-4',
          label: 'Free Shipping',
          isWinning: true,
          position: 3
        }
      };

      mockApi.post.mockResolvedValue(complexResponse);
      renderPlayWheel();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));
      });

      await waitFor(() => {
        // Prize index should be 3 for slot-4 based on stable sorting
        expect(screen.getByTestId('prize-index')).toHaveTextContent('3');
        fireEvent.click(screen.getByTestId('simulate-spin-complete'));
      });

      await waitFor(() => {
        expect(screen.getByText(/free shipping/i)).toBeInTheDocument();
      });
    });

    it('should handle mismatched backend response gracefully', async () => {
      // Backend returns slot that doesn't exist in wheel
      const mismatchedResponse = {
        play: { id: 'play-1', result: 'WIN' as const },
        slot: { id: 'nonexistent-slot', label: 'Unknown Prize' },
        prizeIndex: 0 // Should fall back to this
      };

      mockApi.post.mockResolvedValue(mismatchedResponse);
      renderPlayWheel();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));
      });

      await waitFor(() => {
        // Should fall back to index 0
        expect(screen.getByTestId('prize-index')).toHaveTextContent('0');
      });
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('should have proper heading structure', async () => {
      renderPlayWheel();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Win Amazing Prizes!');
      });
    });

    it('should have accessible button labels', async () => {
      renderPlayWheel();

      await waitFor(() => {
        const spinButton = screen.getByRole('button', { name: /tourner la roue/i });
        expect(spinButton).toBeInTheDocument();
        expect(spinButton).not.toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should disable spin button during loading', async () => {
      let resolvePost: (value: any) => void;
      mockApi.post.mockImplementation(() => new Promise(resolve => {
        resolvePost = resolve;
      }));

      renderPlayWheel();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /tourner la roue/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/chargement/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /chargement/i })).toBeDisabled();
      });

      resolvePost!(mockPlayResponse);
    });
  });

  describe('URL Parameter Handling', () => {
    it('should handle special company ID cases', async () => {
      renderPlayWheel('company', 'wheel-1');

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/public/company/wheels/wheel-1');
      });
    });

    it('should handle undefined company ID', async () => {
      renderPlayWheel('undefined', 'wheel-1');

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/public/company/wheels/wheel-1');
      });
    });
  });
});