import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Target, Users, Award, ArrowRight, Plus } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const companyId = user?.companyId;
        if (!companyId) return;
        const { data } = await api.getCompanyStatistics(companyId, { range: '7d' });
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const chartData = stats
    ? {
        labels: stats.playsByDay.map((d: any) => d.date),
        datasets: [
          {
            label: 'Plays',
            data: stats.playsByDay.map((d: any) => d.count),
            backgroundColor: 'rgba(79, 70, 229, 0.6)',
            borderColor: 'rgba(79, 70, 229, 1)',
            borderWidth: 1,
          },
          {
            label: 'Prizes Won',
            data: stats.prizesByDay.map((d: any) => d.count),
            backgroundColor: 'rgba(139, 92, 246, 0.6)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 1,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Weekly Activity' },
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  // Valeurs par défaut si aucune statistique n'est disponible
  const safeStats = stats || {
    totalPlays: 0,
    totalWheels: 0,
    totalPrizes: 0,
    playsByDay: [],
    prizesByDay: [],
    recentPlays: [],
  };

  const safeChartData = stats
    ? chartData
    : {
        labels: [],
        datasets: [
          {
            label: 'Plays',
            data: [],
            backgroundColor: 'rgba(79, 70, 229, 0.6)',
            borderColor: 'rgba(79, 70, 229, 1)',
            borderWidth: 1,
          },
          {
            label: 'Prizes Won',
            data: [],
            backgroundColor: 'rgba(139, 92, 246, 0.6)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 1,
          },
        ],
      };

  return (
    <div className="h-full overflow-y-auto bg-[#f7f8fa] p-4">
      {/* Section bienvenue */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="bg-white rounded-2xl p-6 flex-1 shadow flex flex-col justify-center min-h-[200px]">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue à toi 👋</h2>
          <h3 className="text-xl font-semibold text-indigo-700 mb-2">{user?.email?.split('@')[0] || 'Utilisateur'}</h3>
          <p className="text-gray-500 mb-4">Si vous souhaitez utiliser un passage du Lorem Ipsum, vous devez vous assurer qu'il n'y a rien.</p>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg w-fit">Commencer</button>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow flex flex-col items-start">
          <span className="text-gray-500 text-sm mb-2">Nombre total d'utilisateurs actifs</span>
          <span className="text-3xl font-bold text-gray-900 mb-1">{safeStats.totalPlays}</span>
          <span className="text-green-600 text-sm font-semibold flex items-center gap-1">+2,6% <span className="text-gray-400 font-normal">les 7 derniers jours</span></span>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow flex flex-col items-start">
          <span className="text-gray-500 text-sm mb-2">Total installé</span>
          <span className="text-3xl font-bold text-gray-900 mb-1">{safeStats.totalWheels}</span>
          <span className="text-green-600 text-sm font-semibold flex items-center gap-1">+0,2% <span className="text-gray-400 font-normal">les 7 derniers jours</span></span>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow flex flex-col items-start">
          <span className="text-gray-500 text-sm mb-2">Nombre total de téléchargements</span>
          <span className="text-3xl font-bold text-gray-900 mb-1">{safeStats.totalPrizes}</span>
          <span className="text-red-600 text-sm font-semibold flex items-center gap-1">-0,1% <span className="text-gray-400 font-normal">les 7 derniers jours</span></span>
        </div>
      </div>

      {/* Section graphique et activité */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique */}
        <div className="bg-white rounded-2xl p-6 shadow col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aperçu des performances</h2>
          <div className="h-72">
            <Bar options={chartOptions} data={safeChartData} />
          </div>
        </div>
        {/* Activité récente */}
        <div className="bg-white rounded-2xl p-6 shadow flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h2>
          <div className="flex-1 overflow-y-auto">
            {safeStats.recentPlays && safeStats.recentPlays.length > 0 ? (
              safeStats.recentPlays.map((play: any) => (
                <div key={play.id} className="rounded-md bg-gray-50 p-3 shadow-sm mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{play.wheel?.name || 'Roulette'}</div>
                      <div className="text-xs text-gray-500">{new Date(play.createdAt).toLocaleString('fr-FR')}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${play.result === 'WIN' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {play.result === 'WIN' ? 'Gagné' : 'Perdu'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500">Aucune activité récente</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 