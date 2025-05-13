import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Target,
  BarChart3,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Home,
  User,
  Folder,
  CreditCard,
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const navigate = useNavigate();
  const avatarUrl = 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + (user?.email || 'user');

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Navigation items with role-based access control
  const navItems = [
    {
      name: 'Tableau de bord',
      path: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN', 'SUB'],
    },
    {
      name: 'Roues',
      path: '/wheels',
      icon: <Target className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN', 'SUB'],
    },
    {
      name: 'Statistiques',
      path: '/statistics',
      icon: <BarChart3 className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN', 'SUB'],
    },
    {
      name: 'Entreprises',
      path: '/companies',
      icon: <Building2 className="h-5 w-5" />,
      allowed: ['SUPER'],
    },
    {
      name: 'Sous-administrateurs',
      path: '/sub-admins',
      icon: <Users className="h-5 w-5" />,
      allowed: ['SUPER', 'ADMIN'],
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.allowed.includes(user?.role || '')
  );

  // Ajout d'un effet pour fermer le menu au clic extérieur
  useEffect(() => {
    if (!showAccountMenu) return;
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.relative')) {
        setShowAccountMenu(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showAccountMenu]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-indigo-900 text-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/lo.png"
              alt="Logo IziKADO"
              className="h-14 w-auto drop-shadow-lg"
            />
          </a>
          <button 
            className="p-1 hover:bg-indigo-800 lg:hidden rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 h-full overflow-y-auto pb-20">
          <ul className="space-y-2 px-2">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-800 text-white'
                        : 'hover:bg-indigo-800/70 text-indigo-100'
                    }`
                  }
                  onClick={closeSidebar}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={logout}
                className="flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium text-indigo-100 hover:bg-indigo-800/70"
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-3">Déconnexion</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-4 py-3 lg:px-6">
            <div className="flex items-center justify-between">
              <button
                className="p-1 rounded-md hover:bg-gray-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex-1 flex justify-end items-center">
                <div className="relative">
                  <button
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-bold text-lg shadow transition-all focus:outline-none border-2 border-white hover:scale-105"
                    title={user?.email || 'Compte'}
                    onClick={() => setShowAccountMenu((v) => !v)}
                  >
                    <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                  </button>
                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl py-6 z-50 border border-gray-100 animate-fade-in flex flex-col min-h-[480px]">
                      <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowAccountMenu(false)}><X className="w-5 h-5" /></button>
                      <div className="flex flex-col items-center px-6 pb-4">
                        <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full border-4 border-white shadow mb-2" />
                        <div className="text-lg font-bold text-gray-900">{user?.email?.split('@')[0] || 'Utilisateur'}</div>
                        <div className="text-sm text-gray-500 mb-2">{user?.email}</div>
                        <div className="flex gap-2 mb-2">
                          <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=team1" className="w-8 h-8 rounded-full border-2 border-white" />
                          <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=team2" className="w-8 h-8 rounded-full border-2 border-white" />
                          <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=team3" className="w-8 h-8 rounded-full border-2 border-white" />
                          <button className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">+</button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-1 px-4">
                        <a href="/dashboard" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 transition"><Home className="w-5 h-5" /> Accueil</a>
                        <a href="/profile" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 transition"><User className="w-5 h-5" /> Profil</a>
                        <a href="/projects" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 transition relative"><Folder className="w-5 h-5" /> Projets <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">3</span></a>
                        <a href="/subscription" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 transition"><CreditCard className="w-5 h-5" /> Abonnement</a>
                      </div>
                      <div className="mt-auto px-4 pt-4">
                        <button onClick={logout} className="w-full text-center py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition text-lg">Déconnexion</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 