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
                <div className="flex space-x-4 mt-4 md:mt-0">
                  <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" aria-label="Facebook">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" aria-label="Instagram">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63z" />
                      <path d="M12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666z" />
                      <circle cx="17.338" cy="4.462" r="1.2" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" aria-label="Twitter">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
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