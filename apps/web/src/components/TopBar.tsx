"use client"

import React, { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useTheme } from "../contexts/ThemeContext"
import { Search, Sun, Moon, ChevronLeft, Menu, Bell, Settings as SettingsIcon, User as UserIcon, LogOut, CheckCircle2, AlertCircle, Gift } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Define a type for notifications for better structure
interface Notification {
  id: string;
  icon?: React.ElementType; // Lucide icon component
  iconColor?: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  link?: string;
}

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
  // State for notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)
  
  // Get current page title based on the URL
  // const getPageTitle = () => {
  //   const pathSegments = location.pathname.split('/').filter(Boolean)
  //   const firstSegment = pathSegments[0]?.toLowerCase() || 'dashboard'
    
  //   const titles: Record<string, string> = {
  //     'dashboard': 'Tableau de bord',
  //     'roues': 'Gestion des Roues',
  //     'statistiques': 'Statistiques',
  //     'entreprises': 'Entreprises',
  //     'sous-administrateurs': 'Sous-administrateurs',
  //     'profile': 'Mon Profil',
  //     'account-settings': 'Paramètres du compte'
  //   }
    
  //   // Fallback for dynamic routes like roues/edit/:id or roues/create
  //   if (firstSegment === 'roues') {
  //     if (pathSegments[1] === 'create') return "Créer une nouvelle roue";
  //     if (pathSegments[1] === 'edit' && pathSegments[2]) return "Modifier la roue"; // Covers roues/edit/:id
  //     // If just /roues, it's already covered by titles.roues
  //   }

  //   return titles[firstSegment] || pathSegments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || 'Tableau de bord'
  // }
  
  const goBack = () => {
    navigate(-1)
  }
  
  const showBackButton = location.pathname !== '/dashboard'
  
  // Simulate fetching notifications
  useEffect(() => {
    setIsLoadingNotifications(true)
    // Simulate API call
    setTimeout(() => {
      const mockNotifications: Notification[] = [
        {
          id: "1",
          icon: Gift,
          iconColor: "text-green-500",
          title: "Nouveau gain!",
          description: "Félicitations, vous avez gagné un café gratuit!",
          time: "2 min ago",
          isRead: false,
          link: "/rewards/123"
        },
        {
          id: "2",
          icon: CheckCircle2,
          iconColor: "text-blue-500",
          title: "Roue \"Promo Été\" activée",
          description: "Votre campagne de roue est maintenant en ligne.",
          time: "1 hour ago",
          isRead: false,
        },
        {
          id: "3",
          icon: AlertCircle,
          iconColor: "text-red-500",
          title: "Maintenance programmée",
          description: "Une maintenance est prévue ce soir à 23h.",
          time: "3 hours ago",
          isRead: true,
        },
      ]
      setNotifications(mockNotifications)
      setUnreadCount(mockNotifications.filter(n => !n.isRead).length)
      setIsLoadingNotifications(false)
    }, 1500)
  }, [])

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    // Here you would also call an API to mark as read on the backend
    // api.markNotificationAsRead(notificationId)
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    // api.markAllNotificationsAsRead()
  }

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
          
          {/* <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{getPageTitle()}</h1> */}
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 w-64 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Theme toggle */}
          {/* <button
            onClick={toggleTheme}
            className="relative p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors duration-200"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-500" />
            )}
          </button> */}
          
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800" aria-label="Notifications">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 md:w-96 mr-2 mt-1 p-0" align="end">
              <DropdownMenuLabel className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleMarkAllAsRead}>
                    Tout marquer comme lu
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuGroup className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700">
                {isLoadingNotifications ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Chargement...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Aucune notification pour le moment.</div>
                ) : (
                  notifications.map((notif) => {
                    const IconComponent = notif.icon || Bell;
                    const itemContent = (
                        <div className={`flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!notif.isRead ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${!notif.isRead ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <IconComponent className={`h-4 w-4 ${notif.iconColor || 'text-gray-500 dark:text-gray-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${!notif.isRead ? 'font-bold': ''}`}>{notif.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{notif.description}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{notif.time}</p>
                          </div>
                          {!notif.isRead && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                              title="Marquer comme lu"
                              className="ml-auto p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
          </button>
                          )}
                        </div>
                    );
                    return (
                      <DropdownMenuItem key={notif.id} className="p-0 cursor-pointer focus:bg-transparent" 
                        onClick={() => {
                          if (!notif.isRead) handleMarkAsRead(notif.id);
                          if (notif.link) navigate(notif.link);
                        }}
                      >
                        {itemContent}
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuGroup>
              {notifications.length > 0 && (
                <DropdownMenuSeparator />
              )}
              <div className="p-2 text-center border-t border-gray-200 dark:border-gray-700">
                <Button variant="link" size="sm" className="w-full text-sm" onClick={() => navigate('/notifications') /* Assuming a dedicated notifications page */}>
                  Voir toutes les notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
