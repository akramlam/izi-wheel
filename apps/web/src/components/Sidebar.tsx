"use client"

import type React from "react"
import { NavLink } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { LayoutDashboard, Target, BarChart3, Building2, Users, LogOut, Activity, Gift } from "lucide-react"

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth()

  const navigation = [
    {
      name: "Tableau de bord",
      href: "/dashboard",
      icon: LayoutDashboard,
      allowed: ["SUPER", "ADMIN", "SUB"],
    },
    {
      name: "Roues",
      href: "/Roues",
      icon: Target,
      allowed: ["SUPER", "ADMIN", "SUB"],
    },
    {
      name: "Statistiques",
      href: "/statistiques",
      icon: BarChart3,
      allowed: ["SUPER", "ADMIN", "SUB"],
    },
    {
      name: "Traçabilité",
      href: "/activity",
      icon: Activity,
      allowed: ["SUPER", "ADMIN"],
    },
    {
      name: "Validation Cadeaux",
      href: "/prizes",
      icon: Gift,
      allowed: ["SUPER", "ADMIN"],
    },
    {
      name: "Entreprises",
      href: "/entreprises",
      icon: Building2,
      allowed: ["SUPER"],
    },
    {
      name: "Sous-administrateurs",
      href: "/sous-administrateurs",
      icon: Users,
      allowed: ["SUPER", "ADMIN"],
    }
  ]

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => 
    item.allowed.includes(user?.role || '')
  )

  return (
    <div className="h-full bg-purple-100 text-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center justify-center">
        <div className="flex items-center">
          <span className="text-purple-800 font-bold text-xl">izi <span className="font-black">KADO</span></span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-purple-500 text-white" 
                      : "text-gray-700 hover:bg-purple-200"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout button */}
      <div className="p-4 mt-auto">
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-purple-200 transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
