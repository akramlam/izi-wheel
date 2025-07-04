import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Heart, MessageCircle, Mail, Phone } from 'lucide-react';

const Layout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Single component */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-64 lg:static lg:translate-x-0 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main content container */}
      <div className="flex flex-col flex-1 w-full lg:pl-0">
        {/* Top navigation */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Content area */}
        <div className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto">
          {/* Main content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>

          {/* Footer - Simplified design */}
          <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
            <div className="max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4">
                {/* About column */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white uppercase tracking-wider mb-4">À PROPOS</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    izi KADO est une plateforme innovante qui permet aux entreprises de créer et gérer des roues de jeux promotionnels.
                  </p>
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm text-purple-600 dark:text-purple-400">Fait avec passion</span>
                  </div>
                </div>
                
                {/* Links column */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white uppercase tracking-wider mb-4">LIENS UTILES</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/dashboard" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition duration-150">
                        Tableau de bord
                      </Link>
                    </li>
                    <li>
                      <Link to="/profile" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition duration-150">
                        Mon profil
                      </Link>
                    </li>
                    <li>
                      <a href="/politique-confidentialite" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition duration-150">
                        Politique de confidentialité
                      </a>
                    </li>
                    <li>
                      <a href="/conditions-utilisation" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition duration-150">
                        Conditions d'utilisation
                      </a>
                    </li>
                  </ul>
                </div>
                
                {/* Contact column */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white uppercase tracking-wider mb-4">CONTACT</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">support@izikado.fr</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">+33 6 51 52 70 16</span>
                    </div>
                    <div className="mt-2">
                      <button className="inline-flex items-center px-4 py-2 rounded-md bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-800/40 transition duration-150">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Nous contacter</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer bottom with copyright and social icons */}
              <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  © {new Date().getFullYear()} Izi kado. Tous droits réservés.
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Layout; 