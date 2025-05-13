import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      console.error('Error changing password:', error);
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
          Changer votre mot de passe
        </h1>
        
        <p className="mb-6 text-center text-gray-600">
          Pour des raisons de sécurité, vous devez modifier votre mot de passe temporaire avant de continuer.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Mot de passe actuel
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              minLength={8}
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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