import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 px-4 text-center">
      <div className="w-full max-w-sm sm:max-w-md rounded-xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-indigo-100">
          <span className="text-3xl sm:text-4xl font-bold text-indigo-600">404</span>
        </div>
        <h1 className="mt-4 sm:mt-6 text-xl sm:text-2xl font-bold text-gray-900">Oups ! La roue a mal tourné...</h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600">
          Cette page n'existe pas ou a disparu dans le tourbillon.
          <span className="block mt-1 text-indigo-600 font-medium">Pas de chance cette fois-ci !</span>
        </p>
        <div className="mt-4 sm:mt-6">
          <Link
            to="/admin-login"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 sm:py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Home className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
