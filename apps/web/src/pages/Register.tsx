"use client"

import React, { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { PasswordInput } from "../components/ui/password-input"
import { Zap, Eye, EyeOff, AlertCircle } from "lucide-react"

const Register: React.FC = () => {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.email) {
      newErrors.email = "Email requis"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email invalide"
    }

    if (!formData.password) {
      newErrors.password = "Mot de passe requis"
    } else if (formData.password.length < 8) {
      newErrors.password = "Le mot de passe doit contenir au moins 8 caractères"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas"
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "Vous devez accepter les conditions"
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    setErrors({})
    try {
      await register(formData.email, formData.password)
      navigate("/superadmin-login", { state: { registered: true } })
    } catch (error: any) {
      setErrors({ general: error.message || "Erreur lors de l'inscription" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start w-full mb-6 sm:mb-8 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-center sm:justify-start">
          <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600 mr-2" />
          <span className="text-lg sm:text-xl font-bold text-black">izi KADO</span>
        </div>
        <div className="flex gap-2 sm:gap-3 justify-center sm:justify-end">
          <span className="rounded-lg bg-black text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold shadow-sm border border-black">S'inscrire</span>
          <Link
            to="/superadmin-login"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100 hover:border-gray-400 transition-colors duration-150"
          >
            Se connecter
          </Link>
        </div>
      </div>

      {/* Main Content - Mobile responsive */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-0">
        <div className="bg-gradient-to-b from-[#e9c6ff] to-white rounded-2xl sm:rounded-[32px] shadow-xl p-6 sm:p-8 lg:p-12 w-full max-w-sm sm:max-w-md flex flex-col items-center">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-black">Inscription</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Super-administrateur</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4">
            {errors.general && (
              <div className="flex items-center gap-2 sm:gap-3 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm animate-fade-in-slide-in">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
                <span className="font-medium text-xs sm:text-sm">{errors.general}</span>
              </div>
            )}

            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="rounded-lg bg-white border border-gray-200 px-3 sm:px-4 py-2.5 sm:py-2 placeholder-gray-500 text-sm sm:text-base"
              required
            />
            {errors.email && <p className="text-xs text-red-500 px-1">{errors.email}</p>}

            <PasswordInput
              name="password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              className="rounded-lg bg-white border border-gray-200 px-3 sm:px-4 py-2.5 sm:py-2 placeholder-gray-500 text-sm sm:text-base"
              required
            />
            {errors.password && <p className="text-xs text-red-500 px-1">{errors.password}</p>}

            <div className="text-xs text-gray-500 px-1">
              Utilisez 8 caractères ou plus contenant des chiffres, lettres et symboles.
            </div>

            <PasswordInput
              name="confirmPassword"
              placeholder="Confirmez le mot de passe"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="rounded-lg bg-white border border-gray-200 px-3 sm:px-4 py-2.5 sm:py-2 placeholder-gray-500 text-sm sm:text-base"
              required
            />
            {errors.confirmPassword && <p className="text-xs text-red-500 px-1">{errors.confirmPassword}</p>}

            <div className="flex items-start space-x-2 sm:space-x-3">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-0.5 sm:mt-1 h-3 w-3 sm:h-4 sm:w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label className="text-xs sm:text-sm text-gray-500">
                J'accepte les{" "}
                <Link to="/terms" className="text-purple-500 hover:underline">
                  Conditions Générales
                </Link>{" "}
                et{" "}
                <Link to="/privacy" className="text-purple-500 hover:underline">
                  Mentions Légales
                </Link>
              </label>
            </div>
            {errors.acceptTerms && <p className="text-xs text-red-500 px-1">{errors.acceptTerms}</p>}

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base mt-4 sm:mt-4"
              disabled={loading}
            >
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>

            <div className="text-center">
              <span className="text-xs text-gray-500">
                Vous avez déjà un compte ?{" "}
                <Link to="/superadmin-login" className="text-purple-500 hover:underline">
                  Se connecter
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Footer - Mobile responsive */}
      <div className="text-center mt-6 sm:mt-8 mb-3 sm:mb-4">
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

export default Register
