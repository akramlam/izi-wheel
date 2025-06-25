import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { showErrorToast } from '../utils/errorHandler';
import { 
  ChevronDown, ChevronUp, 
  Calendar, Users, Award, Bookmark,
  TrendingUp, Filter
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type StatisticsData = {
  totalPlays: number;
  totalPrizes: number;
  conversionRate: number;
  playsByDay: Array<{
    date: string;
    count: number;
  }>;
  prizeDistribution: Array<{
    prizeCode: string;
    label: string;
    count: number;
  }>;
  wheelPerformance: Array<{
    wheelId: string;
    wheelName: string;
    plays: number;
    prizes: number;
    conversion: number;
  }>;
};

type DateRange = '7d' | '30d' | '90d' | 'all';

const Statistics = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, [dateRange]);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      let companyId = user?.companyId || '';
      
      // For SUPER admin, we need to get a valid company ID if one isn't already set
      if ((!companyId || companyId === '') && user?.role === 'SUPER') {
        try {
          const validationResponse = await api.getValidCompanyId();
          if (validationResponse.data.companyId) {
            companyId = validationResponse.data.companyId;
            // Store it for future use
            localStorage.setItem('companyId', companyId);
          }
        } catch (validationError) {
          console.error('Error validating company ID for SUPER admin:', validationError);
        }
      }

      if (!companyId) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Aucun ID d\'entreprise trouvé. Veuillez vous reconnecter.',
        });
        return;
      }

      const response = await api.getCompanyStatistics(companyId, { range: dateRange });
      setStatsData(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      showErrorToast(toast, error, 'Erreur', 'Échec de la récupération des statistiques. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Format data for charts
  const getPlaysChartData = () => {
    if (!statsData?.playsByDay) return null;
    
    const labels = statsData.playsByDay.map(day => day.date);
    const data = statsData.playsByDay.map(day => day.count);

    return {
      labels,
      datasets: [
        {
          label: 'Jours de parties',
          data,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  };

  const getPrizeDistributionData = () => {
    if (!statsData?.prizeDistribution) return null;
    
    return {
      labels: statsData.prizeDistribution.map(prize => prize.label),
      datasets: [
        {
          data: statsData.prizeDistribution.map(prize => prize.count),
          backgroundColor: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(168, 85, 247, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(79, 70, 229, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(217, 70, 239, 0.7)',
            'rgba(45, 212, 191, 0.7)',
            'rgba(251, 146, 60, 0.7)',
          ],
          borderColor: [
            'rgba(99, 102, 241, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(236, 72, 153, 1)',
            'rgba(79, 70, 229, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(217, 70, 239, 1)',
            'rgba(45, 212, 191, 1)',
            'rgba(251, 146, 60, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getWheelPerformanceData = () => {
    if (!statsData?.wheelPerformance) return null;
    
    return {
      labels: statsData.wheelPerformance.map(wheel => wheel.wheelName),
      datasets: [
        {
          label: 'Jours de parties',
          data: statsData.wheelPerformance.map(wheel => wheel.plays),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
        },
        {
          label: 'Lots gagnés',
          data: statsData.wheelPerformance.map(wheel => wheel.prizes),
          backgroundColor: 'rgba(236, 72, 153, 0.7)',
          borderColor: 'rgba(236, 72, 153, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques & Analyses</h1>
          <p className="mt-1 text-gray-600">
            Suivez et analysez la performance de vos campagnes de roue.
          </p>
        </div>

        {/* Date range filter */}
        <div className="flex items-center rounded-md border border-gray-300 p-1">
          <button
            onClick={() => setDateRange('7d')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              dateRange === '7d'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            7 jours
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              dateRange === '30d'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            30 jours
          </button>
          <button
            onClick={() => setDateRange('90d')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              dateRange === '90d'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            90 jours
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              dateRange === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Toute la période
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="mr-4 rounded-full bg-indigo-100 p-3">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Nombre de parties</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {statsData?.totalPlays.toLocaleString() || 0}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="mr-4 rounded-full bg-pink-100 p-3">
              <Award className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Lots attribués</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {statsData?.totalPrizes.toLocaleString() || 0}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="mr-4 rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Taux de conversion</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {statsData ? `${(statsData.conversionRate * 100).toFixed(1)}%` : '0%'}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="mr-4 rounded-full bg-amber-100 p-3">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Leads générés</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {statsData?.totalPlays.toLocaleString() || 0}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Plays Over Time */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div 
            className="flex cursor-pointer items-center justify-between"
            onClick={() => toggleSection('playsOverTime')}
          >
            <h2 className="text-lg font-medium text-gray-900">
              Parties dans le temps
            </h2>
            <button className="text-gray-500 hover:text-gray-700">
              {expandedSection === 'playsOverTime' ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {(expandedSection === 'playsOverTime' || expandedSection === null) && (
            <div className="mt-4 h-80">
              {getPlaysChartData() ? (
                <Line 
                  data={getPlaysChartData()!} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      title: {
                        display: false,
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-gray-500">Aucune donnée de parties pour la période sélectionnée</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prize Distribution */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div 
            className="flex cursor-pointer items-center justify-between"
            onClick={() => toggleSection('prizeDistribution')}
          >
            <h2 className="text-lg font-medium text-gray-900">
              Répartition des lots
            </h2>
            <button className="text-gray-500 hover:text-gray-700">
              {expandedSection === 'prizeDistribution' ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {(expandedSection === 'prizeDistribution' || expandedSection === null) && (
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div className="h-64">
                {getPrizeDistributionData() ? (
                  <Doughnut 
                    data={getPrizeDistributionData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right' as const,
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-gray-500">Aucune donnée de lots disponible</p>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="mb-3 font-medium text-gray-700">Détail des lots</h3>
                <div className="overflow-hidden rounded-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Lot
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Code
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Quantité
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {statsData?.prizeDistribution?.map((prize, index) => (
                        <tr key={index}>
                          <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                            {prize.label}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                            {prize.prizeCode}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right text-sm font-medium text-gray-900">
                            {prize.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wheel Performance Comparison */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div 
            className="flex cursor-pointer items-center justify-between"
            onClick={() => toggleSection('wheelPerformance')}
          >
            <h2 className="text-lg font-medium text-gray-900">
              Comparaison des performances des roues
            </h2>
            <button className="text-gray-500 hover:text-gray-700">
              {expandedSection === 'wheelPerformance' ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {(expandedSection === 'wheelPerformance' || expandedSection === null) && (
            <div className="mt-4 h-80">
              {getWheelPerformanceData() ? (
                <Bar 
                  data={getWheelPerformanceData()!}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-gray-500">Aucune donnée de performance de roue disponible</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics; 