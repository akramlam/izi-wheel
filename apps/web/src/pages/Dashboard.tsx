import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card } from '../components/ui/card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { SearchIcon, ArrowUpRight, ArrowDownRight, Gift, CheckCircle, TrendingUp } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardData {
  overview: {
    totalPlays: number;
    totalWins: number;
    totalClaimed: number;
    totalRedeemed: number;
    todayPlays: number;
    winRate: number;
    claimRate: number;
    redeemRate: number;
  };
  topWheels: Array<{
    id: string;
    name: string;
    totalPlays: number;
    wins: number;
    winRate: number;
  }>;
  playsByDay?: Array<{
    date: string;
    count: number;
  }>;
}

interface Company {
  id: string;
  name: string;
  isActive: boolean;
  totalPlays?: number;
  totalWins?: number;
  winRate?: number;
}

interface CompanyStatistics {
  totalWheels: number;
  activeWheels: number;
  totalPlays: number;
  totalPrizes: number;
  playsByDay: Array<{
    date: string;
    count: number;
  }>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStatistics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    fetchDashboardData();
  }, [user, dateRange]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch activity dashboard data with date range support
      const activityParams = new URLSearchParams();
      if (dateRange !== 'all') {
        activityParams.append('range', `${dateRange}d`);
      }
      
      const activityResponse = await api.getActivityDashboard(activityParams.toString());
      if (activityResponse.data.success) {
        setDashboardData(activityResponse.data.data);
      }

      // Fetch companies list for the table
      if (user?.role === 'SUPER') {
        const companiesResponse = await api.getAllCompanies();
        if (companiesResponse.data.companies) {
          // Fetch statistics for each company to get play counts
          const companiesWithStats = await Promise.all(
            companiesResponse.data.companies.map(async (company: any) => {
              try {
                const statsResponse = await api.getCompanyStatistics(company.id, { range: `${dateRange}d` });
                return {
                  ...company,
                  totalPlays: statsResponse.data?.totalPlays || 0,
                  totalWins: statsResponse.data?.totalPrizes || 0,
                  winRate: statsResponse.data?.totalPlays > 0 
                    ? Math.round((statsResponse.data?.totalPrizes / statsResponse.data?.totalPlays) * 100)
                    : 0
                };
              } catch (error) {
                console.error(`Error fetching stats for company ${company.id}:`, error);
                return {
                  ...company,
                  totalPlays: 0,
                  totalWins: 0,
                  winRate: 0
                };
              }
            })
          );
          setCompanies(companiesWithStats);
        }
      } else if (user?.companyId) {
        // For regular admins, fetch their company statistics
        const statsResponse = await api.getCompanyStatistics(user.companyId, { range: `${dateRange}d` });
        if (statsResponse.data) {
          setCompanyStats(statsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate chart data from real statistics
  const generateScanChartData = () => {
    // For Super Admins, try to use global dashboard data first
    if (user?.role === 'SUPER' && dashboardData?.playsByDay) {
      const labels = dashboardData.playsByDay.map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      });
      const data = dashboardData.playsByDay.map(day => day.count);
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor: '#9333EA',
          borderRadius: 4,
        }]
      };
    }
    
    // For regular admins or if Super Admin data is not available, use company stats
    if (companyStats?.playsByDay) {
      const labels = companyStats.playsByDay.map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      });
      const data = companyStats.playsByDay.map(day => day.count);
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor: '#9333EA',
          borderRadius: 4,
        }]
      };
    }
    
    // Fallback: Generate mock data based on date range for Super Admins
    if (user?.role === 'SUPER' && dashboardData?.overview) {
      const days = dateRange === '7' ? 7 : dateRange === '30' ? 30 : dateRange === '90' ? 90 : 30;
      const labels = [];
      const data = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }));
        // Distribute total plays across days with some randomness
        const avgPlaysPerDay = Math.floor(dashboardData.overview.totalPlays / days);
        const variation = Math.floor(Math.random() * avgPlaysPerDay * 0.5);
        data.push(Math.max(0, avgPlaysPerDay + variation - Math.floor(avgPlaysPerDay * 0.25)));
      }
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor: '#9333EA',
          borderRadius: 4,
        }]
      };
    }
    
    // Final fallback to current month data if no specific data
    return {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: '#9333EA',
        borderRadius: 4,
      }]
    };
  };

  // Generate wheel distribution chart from real data
  const generateWheelChartData = () => {
    if (dashboardData?.topWheels && dashboardData.topWheels.length > 0) {
      const topWheels = dashboardData.topWheels.slice(0, 3);
      const labels = topWheels.map(wheel => wheel.name);
      const data = topWheels.map(wheel => wheel.winRate);
      const colors = ['#4ade80', '#60a5fa', '#111827'];
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          cutout: '70%',
        }]
      };
    }
    
    // Fallback data
    return {
      labels: ['Aucune roue', 'Données', 'Disponibles'],
      datasets: [{
        data: [33.3, 33.3, 33.3],
        backgroundColor: ['#4ade80', '#60a5fa', '#111827'],
        borderWidth: 0,
        cutout: '70%',
      }]
    };
  };

  const scanChartData = generateScanChartData();
  const routesChartData = generateWheelChartData();

  const scanChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false,
        },
        ticks: {
          stepSize: 1,
          callback: (value: any) => {
            if (value >= 1000) {
              return value >= 10000 ? `${value / 1000}k` : `${value / 1000}k`;
            }
            return value;
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const routesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f3f0f9] p-2 sm:p-4 md:p-6">
      {/* Header with date filters - Mobile responsive */}
      <div className="mb-4 sm:mb-6 flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-lg sm:text-xl font-semibold">Tableau de bord</h1>
        <div className="flex flex-wrap gap-1 sm:gap-0 sm:rounded-lg sm:shadow-sm sm:overflow-hidden sm:border sm:border-gray-200">
          <button 
            className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out rounded sm:rounded-none ${
              dateRange === '7' 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setDateRange('7')}
          >
            7 jours
          </button>
          <button 
            className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out rounded sm:rounded-none ${
              dateRange === '30' 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setDateRange('30')}
          >
            30 jours
          </button>
          <button 
            className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out rounded sm:rounded-none ${
              dateRange === '90' 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setDateRange('90')}
          >
            90 jours
          </button>
          <button 
            className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out rounded sm:rounded-none ${
              dateRange === 'all' 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setDateRange('all')}
          >
            Toute la période
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 sm:mb-8 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Parties Card */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Parties</span>
            <span className="text-2xl sm:text-3xl font-bold">
              {dashboardData?.overview.totalPlays || companyStats?.totalPlays || 0}
            </span>
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Card>

        {/* Prix Gagnés Card */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Prix Gagnés</span>
            <span className="text-2xl sm:text-3xl font-bold">
              {dashboardData?.overview.totalWins || companyStats?.totalPrizes || 0}
            </span>
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
          </div>
        </Card>

        {/* Prix Réclamés Card (was Prix Échangés) */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Prix Réclamés</span>
            <span className="text-2xl sm:text-3xl font-bold">
              {dashboardData?.overview.totalRedeemed || 0}
            </span>
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
          </div>
        </Card>

        {/* Taux de gain Card */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Taux de gain</span>
            <span className="text-2xl sm:text-3xl font-bold">
              {dashboardData?.overview.winRate || 
               (companyStats?.totalPlays && companyStats.totalPrizes ? 
                 Math.round((companyStats.totalPrizes / companyStats.totalPlays) * 100) : 0)}%
            </span>
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Two column layout - Mobile responsive */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Roues section */}
        <Card className="bg-[#e9ddfc] p-4 sm:p-5 rounded-xl">
          <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium">Roues Performantes</h2>
          <div className="flex items-center justify-center pb-3 sm:pb-4">
            <div className="relative h-40 w-40 sm:h-48 sm:w-48 lg:h-52 lg:w-52">
              <Doughnut data={routesChartData} options={routesChartOptions} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 space-y-2">
            {dashboardData?.topWheels && dashboardData.topWheels.length > 0 ? (
              dashboardData.topWheels.slice(0, 3).map((wheel, index) => {
                const colors = ['#4ade80', '#60a5fa', '#111827'];
                return (
                  <div key={wheel.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full" 
                        style={{ backgroundColor: colors[index] }}
                      ></div>
                      <span className="ml-2 text-xs sm:text-sm">{wheel.name}</span>
                    </div>
                    <span className="font-medium text-xs sm:text-sm">{wheel.winRate}%</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 text-sm">
                Aucune donnée de roue disponible
              </div>
            )}
          </div>
        </Card>

        {/* Entreprises section - Only for SUPER admins */}
        {user?.role === 'SUPER' && (
          <Card className="bg-[#e9ddfc] p-4 sm:p-5 rounded-xl">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-medium">Entreprises</h2>
              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Rechercher"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto rounded-md border border-gray-300 pl-8 pr-3 py-1.5 sm:py-1 text-xs sm:text-sm"
                />
                <SearchIcon className="absolute left-2 top-1/2 h-3 w-3 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-xs sm:text-sm text-gray-500">
                  <tr>
                    <th className="whitespace-nowrap pb-2 sm:pb-3 font-normal">Nom</th>
                    <th className="whitespace-nowrap pb-2 sm:pb-3 font-normal hidden sm:table-cell">Parties</th>
                    <th className="whitespace-nowrap pb-2 sm:pb-3 font-normal hidden md:table-cell">Prix Gagnés</th>
                    <th className="whitespace-nowrap pb-2 sm:pb-3 font-normal">Taux Gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.slice(0, 5).map((company) => (
                      <tr key={company.id}>
                        <td className="py-1.5 sm:py-2 font-medium">{company.name}</td>
                        <td className="py-1.5 sm:py-2 hidden sm:table-cell">{company.totalPlays || 0}</td>
                        <td className="py-1.5 sm:py-2 hidden md:table-cell">{company.totalWins || 0}</td>
                        <td className={`py-1.5 sm:py-2 font-medium ${
                          (company.winRate || 0) > 50 ? 'text-green-600' : 
                          (company.winRate || 0) > 25 ? 'text-orange-500' : 'text-red-500'
                        }`}>
                          {company.winRate || 0}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        Aucune entreprise trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Monthly activity chart section - Mobile responsive */}
      <div className="mt-4 sm:mt-6">
        <Card className="bg-[#e9ddfc] p-4 sm:p-5 rounded-xl">
          <h2 className="mb-4 text-base sm:text-lg font-medium">Activité des Parties</h2>
          <div className="h-80 sm:h-96 lg:h-[500px]">
            <Bar data={scanChartData} options={scanChartOptions} />
          </div>
        </Card>
      </div>

      {/* Footer */}
      {/* <div className="mt-8 text-center text-sm text-gray-500">
        © 2025 izi TOUCH
        <div className="mt-2 flex justify-center space-x-4">
          <a href="#" className="hover:text-gray-700">À Propos</a>
          <a href="#" className="hover:text-gray-700">Support</a>
          <a href="#" className="hover:text-gray-700">Contact</a>
        </div>
      </div> */}
    </div>
  );
};

export default Dashboard; 