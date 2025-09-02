// no explicit React import needed for JSX in Vite/TSX
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export type UpgradePlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'wheel' | 'play';
  remainingPlays?: number;
  currentPlan?: 'FREE' | 'BASIC' | 'PREMIUM' | string;
};

const UpgradePlanModal = ({ isOpen, onClose, limitType, remainingPlays = 0, currentPlan = 'FREE' }: UpgradePlanModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    // Navigate to the profile page (billing tab not implemented yet)
    navigate('/profile');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {limitType === 'wheel' ? 'Limite de roues atteinte' : 'Limite de jeux atteinte'}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {currentPlan !== 'FREE' ? (
              limitType === 'wheel'
                ? "Vous avez atteint le nombre maximum de roues autorisées pour votre plan actuel."
                : "Vous avez atteint la limite de jeux incluse dans votre plan actuel."
            ) : (
              limitType === 'wheel'
                ? 'Vous avez atteint le nombre maximum de roues autorisées avec le plan gratuit.' 
                : `Vous avez utilisé les ${Math.max(0, 50 - remainingPlays)} jeux inclus dans votre plan gratuit.`
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {currentPlan === 'FREE' ? (
            <>
              <div className="rounded-lg bg-blue-50 p-4 mb-4">
                <h3 className="font-medium text-blue-800 mb-2">Passez à un plan payant pour :</h3>
                <ul className="list-disc pl-5 text-blue-700 space-y-1">
                  <li>Créer plus de roues</li>
                  <li>Obtenir davantage de jeux</li>
                  <li>Accéder aux fonctionnalités premium</li>
                  <li>Support client prioritaire</li>
                </ul>
              </div>
              <div className="text-sm text-gray-500">
                Votre essai gratuit inclut 1 roue et 50 jeux. Passez à un plan payant pour continuer sans interruption.
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600">
              Votre plan actuel est <span className="font-medium">{currentPlan}</span>. Contactez le support si vous souhaitez augmenter vos limites.
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:w-1/2">
            Plus tard
          </Button>
          <Button onClick={handleUpgrade} className="sm:w-1/2 bg-blue-600 hover:bg-blue-700">
            Gérer l'abonnement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanModal; 