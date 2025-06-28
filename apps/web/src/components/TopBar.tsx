"use client"

import React, { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useTheme } from "../contexts/ThemeContext"
import { ChevronLeft, Menu, Settings as SettingsIcon, User as UserIcon, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
  const goBack = () => {
    navigate(-1)
  }
  
  const showBackButton = location.pathname !== '/dashboard'

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          {showBackButton && (
            <button 
              onClick={goBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* User profile Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 pl-3 ml-1 border-l border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-md p-1">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px]" title={user.name || user.email || "Utilisateur"}>
                      {user.name || user.email || `Utilisateur`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user.role === "SUPER" ? "Super Admin" : user.role === "ADMIN" ? "Admin" : "Utilisateur"}
                    </span>
                  </div>
                  <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-800">
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-medium">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mr-2 mt-1" align="end">
                <DropdownMenuLabel>
                  <div className="font-medium truncate" title={user.name || "Utilisateur"}>{user.name || "Utilisateur"}</div>
                  <div className="text-xs text-gray-500 truncate" title={user.email || "Aucun email"}>{user.email || "Aucun email fourni"}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center cursor-pointer w-full">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Mon Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account-settings" className="flex items-center cursor-pointer w-full">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Paramètres</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center text-red-600 dark:text-red-400 hover:!text-red-600 dark:hover:!text-red-400 cursor-pointer focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/50 w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
