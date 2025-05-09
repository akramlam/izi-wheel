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

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        No data available.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Welcome section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your wheel campaigns today.
          </p>
        </div>
        <button
          onClick={() => navigate('/wheels')}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Wheel
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white p-5 shadow">
          <div className="flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Wheels</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalWheels}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-indigo-600">
            <span className="font-medium">{stats.activeWheels} active</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white p-5 shadow">
          <div className="flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Plays</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPlays}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-violet-600">
            <span className="font-medium">Last 7 days</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white p-5 shadow">
          <div className="flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Prizes Redeemed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPrizes}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-indigo-600">
            <span className="font-medium">{stats.totalPlays ? ((stats.totalPrizes / stats.totalPlays) * 100).toFixed(1) : 0}% conversion rate</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="font-medium">Your Plan</p>
              <p className="mt-1 text-2xl font-bold">{user?.role === 'SUPER' ? 'SUPER Admin' : 'Business'}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/wheels')}
                className="flex items-center text-sm font-medium text-white"
              >
                <span>Manage wheels</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart and recent activity section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Chart */}
        <div className="rounded-lg bg-white p-6 shadow lg:col-span-3">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Performance Overview</h2>
          <div className="h-80">
            <Bar options={chartOptions} data={chartData} />
          </div>
        </div>
        {/* Recent activity */}
        <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            <button
              onClick={() => navigate('/statistics')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {stats.recentPlays && stats.recentPlays.length > 0 ? (
              stats.recentPlays.map((play: any) => (
                <div key={play.id} className="rounded-md bg-gray-50 p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{play.wheel?.name || 'Wheel'}</div>
                      <div className="text-xs text-gray-500">{new Date(play.createdAt).toLocaleString()}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${play.result === 'WIN' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                      {play.result}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 