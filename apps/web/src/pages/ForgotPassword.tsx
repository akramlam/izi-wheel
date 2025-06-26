import React, { useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "../hooks/use-toast"

const ForgotPassword: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    // Basic email validation
    if (!email) {
      setErrors({ email: "Email requis" })
      setLoading(false)
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: "Email invalide" })
      setLoading(false)
      return
    }

    try {
      // TODO: Implement forgot password API call
      // For now, we'll simulate the request
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setEmailSent(true)
      toast({
        title: "Email envoyé",
        description: "Si un compte existe avec cette adresse email, vous recevrez les instructions de réinitialisation.",
      })
    } catch (error: any) {
      setErrors({ general: error.message || "Erreur lors de l'envoi de l'email" })
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer l'email de réinitialisation. Veuillez réessayer.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    // Clear error when user starts typing
    if (errors.email) {
      setErrors({})
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-lg mb-3 sm:mb-4">
            <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">izi WHEEL</h1>
          <p className="text-purple-100 text-sm sm:text-base mt-1">Réinitialisation du mot de passe</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 animate-fade-in-slide-in">
          {!emailSent ? (
            <>
              {/* Back to Login */}
              <div className="mb-4">
                <Link 
                  to="/login" 
                  className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour à la connexion
                </Link>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Mot de passe oublié ?
                </h2>
                <p className="text-gray-600 text-sm sm:text-base mt-2">
                  Saisissez votre adresse email et nous vous enverrons les instructions pour réinitialiser votre mot de passe.
                </p>
              </div>

              {/* Error Message */}
              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{errors.general}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={handleChange}
                    className={`rounded-lg bg-white border px-3 sm:px-4 py-2.5 sm:py-2 placeholder-gray-500 text-sm sm:text-base ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                    }`}
                    required
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Envoi en cours...
                    </div>
                  ) : (
                    'Envoyer les instructions'
                  )}
                </Button>
              </form>

              <div className="text-center mt-6">
                <p className="text-xs text-gray-500">
                  Vous vous souvenez de votre mot de passe ?{" "}
                  <Link to="/login" className="text-purple-600 hover:underline">
                    Se connecter
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Email envoyé !
              </h2>
              
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez les instructions de réinitialisation dans quelques minutes.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setEmailSent(false)
                    setEmail("")
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Essayer une autre adresse
                </Button>
                
                <Link to="/login">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>

              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Conseil :</strong> Vérifiez votre dossier spam si vous ne recevez pas l'email dans les 5 minutes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 mb-3 sm:mb-4">
          <p className="text-purple-100 text-xs">© 2025 izi WHEEL - Plateforme de jeux interactifs</p>
        </div>

        {/* Animation styles */}
        <style>{`
          .animate-fade-in-slide-in {
            animation: fadeInSlideIn 0.4s cubic-bezier(0.4,0,0.2,1);
          }
          @keyframes fadeInSlideIn {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default ForgotPassword
