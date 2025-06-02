import React, { useState, useEffect } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Zap, AlertCircle, CheckCircle2 } from "lucide-react"

const Login: React.FC = () => {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Show success message if redirected from registration
  useEffect(() => {
    if (location.state && location.state.registered) {
      setShowSuccess(true)
      // Clear the state so it doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  // Redirect if already logged in
  if (user) {
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
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-start w-full mb-8 px-6 pt-6">
        <div className="flex items-center">
          <Zap className="h-7 w-7 text-purple-600 mr-2" />
          <span className="text-xl font-bold text-black">izi KADO</span>
        </div>
        <div className="flex gap-3">
          <Link
            to="/register"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100 hover:border-gray-400 transition-colors duration-150"
          >
            S'inscrire
          </Link>
          <span
            className="rounded-lg bg-black text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-900 transition-colors duration-150 border border-black"
          >
            Se connecter
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-gradient-to-b from-[#e9c6ff] to-white rounded-[32px] shadow-xl p-12 w-full max-w-md flex flex-col items-center">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-black">Connexion</h2>
            <p className="text-sm text-gray-500 mt-1">Super-administrateur</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {showSuccess && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-sm animate-fade-in-slide-in">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="font-medium text-sm">Inscription réussie, veuillez vous connecter.</span>
              </div>
            )}
            {errors.general && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm animate-fade-in-slide-in">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="font-medium text-sm">{errors.general}</span>
              </div>
            )}

            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="rounded-lg bg-white border border-gray-200 px-4 py-2 placeholder-gray-500"
              required
            />

            <Input
              type="password"
              name="password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              className="rounded-lg bg-white border border-gray-200 px-4 py-2 placeholder-gray-500"
              required
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-purple-500 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-semibold text-base"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <div className="text-center">
              <span className="text-xs text-gray-500">
                Pas encore membre ? {" "}
                <Link to="/register" className="text-purple-500 hover:underline">
                  S'inscrire
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 mb-4">
        <p className="text-gray-400 text-xs">© 2025 izi KADO</p>
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

export default Login 