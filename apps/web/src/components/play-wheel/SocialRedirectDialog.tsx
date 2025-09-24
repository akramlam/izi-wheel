import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

interface SocialRedirectDialogProps {
  open: boolean;
  onClose: () => void;
  network?: string;
  redirectUrl?: string;
  redirectText?: string;
}

export const SocialRedirectDialog = ({
  open,
  onClose,
  network,
  redirectUrl,
  redirectText,
}: SocialRedirectDialogProps) => {
  const navigate = useNavigate();

  // Debug network info on render
  useEffect(() => {
    // Add detailed debugging in development mode
    if (import.meta.env.DEV) {
      const debugElement = document.getElementById('social-debug-info');
      if (debugElement) {
        debugElement.textContent = `Network: ${network || 'none'}, URL: ${redirectUrl || 'none'}, Open: ${open}`;
      }
    }
  }, [open, network, redirectUrl]);

  const getNetworkIcon = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M12 11h8.88c.08.53.12 1.06.12 1.6 0 4.41-3.16 7.55-7.55 7.55-4.41 0-8-3.59-8-8s3.59-8 8-8c2.07 0 3.92.8 5.37 2.11l-2.19 2.11C15.17 7.4 13.65 6.95 12 6.95c-2.76 0-5 2.24-5 5s2.24 5 5 5c2.64 0 4.41-1.54 4.8-3.95H12v-2z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M12 2c-2.716 0-3.056.011-4.123.06-1.064.048-1.791.218-2.427.465a4.9 4.9 0 0 0-1.77 1.153A4.9 4.9 0 0 0 2.525 5.45c-.247.636-.417 1.363-.465 2.427C2.011 8.944 2 9.284 2 12s.011 3.056.06 4.123c.048 1.064.218 1.791.465 2.427a4.9 4.9 0 0 0 1.153 1.77 4.9 4.9 0 0 0 1.77 1.153c.636.247 1.363.417 2.427.465 1.067.048 1.407.06 4.123.06s3.056-.011 4.123-.06c1.064-.048 1.791-.218 2.427-.465a4.9 4.9 0 0 0 1.77-1.153 4.9 4.9 0 0 0 1.153-1.77c.247-.636.417-1.363.465-2.427.048-1.067.06-1.407.06-4.123s-.011-3.056-.06-4.123c-.048-1.064-.218-1.791-.465-2.427a4.9 4.9 0 0 0-1.153-1.77 4.9 4.9 0 0 0-1.77-1.153c-.636-.247-1.363-.417-2.427-.465C15.056 2.011 14.716 2 12 2zm0 1.802c2.67 0 2.986.01 4.04.058.976.045 1.505.207 1.858.344.466.182.8.399 1.15.748.35.35.566.684.748 1.15.137.353.3.882.344 1.857.048 1.055.058 1.37.058 4.041 0 2.67-.01 2.986-.058 4.04-.045.976-.207 1.505-.344 1.858a3.1 3.1 0 0 1-.748 1.15c-.35.35-.684.566-1.15.748-.353.137-.882.3-1.857.344-1.054.048-1.37.058-4.041.058-2.67 0-2.987-.01-4.04-.058-.976-.045-1.505-.207-1.858-.344a3.1 3.1 0 0 1-1.15-.748 3.1 3.1 0 0 1-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.055-.058-1.37-.058-4.041 0-2.67.01-2.986.058-4.04.045-.976.207-1.505.344-1.858.182-.466.399-.8.748-1.15.35-.35.684-.566 1.15-.748.353-.137.882-.3 1.857-.344 1.055-.048 1.37-.058 4.041-.058zm0 3.063a5.135 5.135 0 1 0 0 10.27 5.135 5.135 0 0 0 0-10.27zm0 8.468a3.333 3.333 0 1 1 0-6.666 3.333 3.333 0 0 1 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.59-1.16-2.59-2.5a2.592 2.592 0 0 1 4.3-1.96V10.3a5.636 5.636 0 0 0-1.71-.26c-3.09 0-5.59 2.5-5.59 5.59s2.5 5.59 5.59 5.59 5.59-2.5 5.59-5.59V7.73c.99.79 2.22 1.25 3.59 1.25v-3.1c0-.02-2.44-.06-2.44-.06Z" />
          </svg>
        );
      case 'facebook':
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M20.007 3H3.993A.993.993 0 0 0 3 3.993v16.014c0 .549.444.993.993.993h8.621v-6.97h-2.347v-2.716h2.347V9.309c0-2.325 1.42-3.591 3.494-3.591.993 0 1.847.074 2.096.107v2.43h-1.438c-1.128 0-1.346.537-1.346 1.324v1.734h2.69l-.35 2.717h-2.34V21h4.587a.993.993 0 0 0 .993-.993V3.993A.993.993 0 0 0 20.007 3z" />
          </svg>
        );
      default:
        // If we don't have a specific icon, show a generic one
        return (
          <svg
            className="h-16 w-16 mb-4"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z" />
          </svg>
        );
    }
  };

  const handleRedirect = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank');
    }
  };

  const getTitle = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return 'LAISSEZ NOUS UN AVIS';
      case 'instagram':
      case 'tiktok':
      case 'facebook':
      case 'snapchat':
        return 'SUIVEZ-NOUS SUR NOS RÉSEAUX';
      default:
        return 'SUIVEZ-NOUS';
    }
  };

  const getButtonText = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return 'Noter sur Google';
      case 'instagram':
        return 'Suivre sur Instagram';
      case 'tiktok':
        return 'Suivre sur TikTok';
      case 'facebook':
        return 'Suivre sur Facebook';
      case 'snapchat':
        return 'Suivre sur Snapchat';
      default:
        return 'Continuer';
    }
  };

  const getInstructions = () => {
    switch (network?.toLowerCase()) {
      case 'google':
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                1
              </div>
              <span>Laissez un avis sur Google</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                2
              </div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                3
              </div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
      case 'instagram':
      case 'tiktok':
      case 'facebook':
      case 'snapchat':
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                1
              </div>
              <span>
                Suivez-nous sur{' '}
                {network.charAt(0) + network.slice(1).toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                2
              </div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                3
              </div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
      default:
        // Show generic instructions if network type is unknown
        return (
          <div className="flex flex-col space-y-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                1
              </div>
              <span>Suivez-nous sur nos réseaux sociaux</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                2
              </div>
              <span>Revenez sur cette page</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                3
              </div>
              <span>Tournez la roue !</span>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">{getTitle()}</DialogTitle>

          {/* Debug indicator in development mode */}
          {import.meta.env.DEV && (
            <div className="text-xs text-blue-600 mt-1 text-center">
              Network: {network || 'none'}
            </div>
          )}
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6">
          {getNetworkIcon()}
          <p className="text-center mb-6">
            {redirectText || 'Vous allez être redirigé vers notre page.'}
          </p>
          {getInstructions()}
          <Button
            className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-500"
            onClick={() => {
              handleRedirect();
              // Call onClose after the redirect to allow the user to proceed
              onClose();
            }}
          >
            {getButtonText()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};