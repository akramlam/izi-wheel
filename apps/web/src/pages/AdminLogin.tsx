import React, { useState, useEffect } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { PasswordInput } from "../components/ui/password-input"
import { Zap, AlertCircle, CheckCircle2, Shield, Users, UserPlus } from "lucide-react"

const AdminLogin: React.FC = () => {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // Show welcome message if redirected from invitation
  useEffect(() => {
    if (location.state && location.state.fromInvitation) {
      setShowWelcome(true)
      // Clear the state so it doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  // Redirect if already logged in
  if (user) {
    // If user has forcePasswordChange, redirect to change password
    if (user.forcePasswordChange) {
      return <Navigate to="/change-password" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      await login(formData.email, formData.password)
    } catch (error: any) {
      setErrors({ general: error.message || "Erreur de connexion" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-between">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start w-full mb-6 sm:mb-8 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-center sm:justify-start">
          <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600 mr-2" />
          <span className="text-lg sm:text-xl font-bold text-black">IZI Kado</span>
        </div>
        <div className="flex gap-2 sm:gap-3 justify-center sm:justify-end">
          <Link
            to="/login"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100 hover:border-gray-400 transition-colors duration-150"
          >
            Super Admin
          </Link>
          <span
            className="rounded-lg bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors duration-150 border border-blue-600"
          >
            Connexion Admin
          </span>
        </div>
      </div>

      {/* Main Content - Mobile responsive */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-0">
        <div className="bg-white rounded-2xl sm:rounded-[32px] shadow-2xl border border-gray-100 p-6 sm:p-8 lg:p-12 w-full max-w-sm sm:max-w-md flex flex-col items-center">
          {/* Admin Icon */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-100 rounded-full">
            <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
          </div>
          
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Connexion Administrateur</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              Espace réservé aux administrateurs
            </p>
          </div>

          {/* Welcome Message for New Users */}
          {showWelcome && (
            <div className="w-full mb-4 sm:mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <UserPlus className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm">🎉 Bienvenue sur IZI Kado !</h3>
                  <p className="text-blue-700 text-xs mt-1">
                    Connectez-vous avec les identifiants reçus par email. Vous devrez créer un nouveau mot de passe lors de votre première connexion.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4">
            {errors.general && (
              <div className="flex items-center gap-2 sm:gap-3 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm animate-fade-in-slide-in">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
                <span className="font-medium text-xs sm:text-sm">{errors.general}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="votre.email@entreprise.com"
                value={formData.email}
                onChange={handleChange}
                className="rounded-lg bg-white border border-gray-300 px-3 sm:px-4 py-2.5 sm:py-2 placeholder-gray-400 text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Mot de passe temporaire ou personnel"
                value={formData.password}
                onChange={handleChange}
                className="rounded-lg bg-white border border-gray-300 px-3 sm:px-4 py-2.5 sm:py-2 placeholder-gray-400 text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs sm:text-xs text-blue-500 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base mt-4 sm:mt-4 shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </Button>

            {/* Help Text */}
            <div className="text-center mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Première connexion ?</strong><br />
                Utilisez le mot de passe temporaire reçu par email. Vous serez invité à le changer pour sécuriser votre compte.
              </p>
            </div>

            <div className="text-center border-t pt-4">
              <span className="text-xs text-gray-500">
                Besoin d'aide ? Contactez votre administrateur principal
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Footer - Mobile responsive */}
      <div className="text-center mt-6 sm:mt-8 mb-3 sm:mb-4">
        <p className="text-gray-400 text-xs">© 2025 IZI Kado - Plateforme d'administration</p>
      </div>
      
      {/* Animation keyframes for fade/slide in */}
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
  )
}

export default AdminLogin 