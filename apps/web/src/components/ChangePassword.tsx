import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from './ui/password-input';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { score: 0, text: 'Très faible', color: 'bg-red-500' };
    if (password.length < 8) return { score: 1, text: 'Faible', color: 'bg-orange-500' };
    
    let score = 1;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    switch (score) {
      case 2: return { score: 2, text: 'Moyen', color: 'bg-yellow-500' };
      case 3: return { score: 3, text: 'Bon', color: 'bg-blue-500' };
      case 4: 
      case 5: return { score: 4, text: 'Excellent', color: 'bg-green-500' };
      default: return { score: 1, text: 'Faible', color: 'bg-orange-500' };
    }
  };
  
  const passwordStrength = getPasswordStrength(newPassword);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Les nouveaux mots de passe ne correspondent pas',
      });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le nouveau mot de passe doit comporter au moins 8 caractères',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      
      // Success - refresh the user data to update forcePasswordChange flag
      await refreshUser();
      
      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été modifié avec succès',
      });
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la modification du mot de passe. Veuillez vérifier votre mot de passe actuel.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If user is not forcing password change, redirect to dashboard
  if (user && !user.forcePasswordChange) {
    // Supprimer la redirection automatique pour permettre à tous les utilisateurs de changer leur mot de passe
    // navigate('/dashboard');
    // return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          {user?.forcePasswordChange ? '🔒 Sécurisez votre compte' : 'Changer votre mot de passe'}
        </h1>
        
        {user?.forcePasswordChange ? (
          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-blue-800 font-medium mb-2">🎯 Bienvenue sur IZI Wheel !</p>
            <p className="text-blue-700 text-sm">
              Pour des raisons de sécurité, vous devez créer un nouveau mot de passe personnalisé avant d'accéder à la plateforme.
            </p>
          </div>
        ) : (
          <p className="mb-6 text-center text-gray-600">
            Modifiez votre mot de passe actuel pour un nouveau mot de passe sécurisé.
          </p>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Mot de passe actuel
            </label>
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Force du mot de passe:</span>
                  <span className={`font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`${passwordStrength.color} h-1.5 rounded-full transition-all duration-300`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  ></div>
                </div>
                {passwordStrength.score < 3 && (
                  <div className="mt-1 text-xs text-gray-500">
                    <p>💡 Utilisez au moins 8 caractères avec majuscules, chiffres et symboles</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le nouveau mot de passe
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-md bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isLoading ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {isLoading ? 'Modification en cours...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword; 