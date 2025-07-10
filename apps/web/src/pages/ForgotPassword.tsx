import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre adresse email",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the forgot password API
      await api.forgotPassword(email);
      
      setIsEmailSent(true);
      toast({
        title: "Email envoyé!",
        description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe",
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      // Handle different error cases
      if (error.response?.status === 404) {
        toast({
          title: "Compte introuvable",
          description: "Aucun compte n'est associé à cette adresse email",
          variant: "destructive"
        });
      } else if (error.response?.status === 429) {
        toast({
          title: "Trop de tentatives",
          description: "Veuillez attendre avant de faire une nouvelle demande",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Une erreur est survenue lors de l'envoi de l'email",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Email envoyé!</CardTitle>
              <CardDescription>
                Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Prochaines étapes :</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Vérifiez votre boîte de réception</li>
                    <li>• Cliquez sur le lien dans l'email</li>
                    <li>• Créez un nouveau mot de passe</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Pas d'email reçu ?</strong> Vérifiez vos spams ou 
                    <button 
                      onClick={() => setIsEmailSent(false)}
                      className="ml-1 underline hover:no-underline"
                    >
                      réessayez
                    </button>
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
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
            Mot de passe oublié
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Réinitialiser le mot de passe
              </CardTitle>
              <CardDescription>
                Nous vous enverrons un lien sécurisé pour créer un nouveau mot de passe
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer le lien de réinitialisation
                  </>
                )}
              </Button>
              
              <div className="flex items-center justify-center space-x-2 text-sm">
                <span className="text-gray-600">Vous vous souvenez de votre mot de passe ?</span>
                <Link 
                  to="/superadmin-login" 
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Se connecter
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Help section */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Besoin d'aide ?</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Le lien de réinitialisation est valide pendant 1 heure</p>
              <p>• Vérifiez vos spams si vous ne recevez pas l'email</p>
              <p>• Contactez le support si le problème persiste</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword; 