import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { ArrowLeft, CheckCircle, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast({
        title: "Token manquant",
        description: "Le lien de réinitialisation est invalide",
        variant: "destructive"
      });
      navigate('/forgot-password');
      return;
    }
    
    setTokenValid(true);
  }, [token, navigate, toast]);

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caractères";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Erreur",
        description: "Token de réinitialisation manquant",
        variant: "destructive"
      });
      return;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Mot de passe invalide",
        description: passwordError,
        variant: "destructive"
      });
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      toast({
        title: "Mots de passe différents",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword(token, password);
      
      setIsSuccess(true);
      toast({
        title: "✅ Mot de passe réinitialisé!",
        description: "Votre mot de passe a été mis à jour avec succès",
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      if (error.response?.status === 400) {
        toast({
          title: "Token invalide",
          description: "Le lien de réinitialisation a expiré ou est invalide",
          variant: "destructive"
        });
        // Redirect to forgot password page after a delay
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000);
      } else {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Une erreur est survenue lors de la réinitialisation",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Vérification du token...</span>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Mot de passe réinitialisé!</CardTitle>
              <CardDescription>
                Votre mot de passe a été mis à jour avec succès
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Aller à la connexion
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Nouveau mot de passe
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Créez un mot de passe sécurisé pour votre compte
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Réinitialiser le mot de passe
              </CardTitle>
              <CardDescription>
                Choisissez un mot de passe fort et unique
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <PasswordInput
                  id="password"
                  placeholder="Saisissez votre nouveau mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Au moins 6 caractères
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirmez votre nouveau mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              {/* Password strength indicator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Conseils pour un mot de passe sécurisé :</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li className={password.length >= 6 ? 'text-green-700' : ''}>
                    • Au moins 6 caractères {password.length >= 6 && '✓'}
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-700' : ''}>
                    • Une lettre majuscule {/[A-Z]/.test(password) && '✓'}
                  </li>
                  <li className={/[0-9]/.test(password) ? 'text-green-700' : ''}>
                    • Un chiffre {/[0-9]/.test(password) && '✓'}
                  </li>
                  <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-700' : ''}>
                    • Un caractère spécial {/[^A-Za-z0-9]/.test(password) && '✓'}
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || !password || !confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Réinitialiser le mot de passe
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/forgot-password')}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Security notice */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  Ce lien de réinitialisation expire dans 1 heure. 
                  Après la réinitialisation, vous devrez vous reconnecter avec votre nouveau mot de passe.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword; 