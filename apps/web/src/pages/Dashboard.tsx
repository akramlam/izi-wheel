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
import { SearchIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

const Dashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const companyId = user?.companyId;
        if (!companyId) return;
        const { data } = await api.getCompanyStatistics(companyId, { range: `${dateRange}d` });
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [user, dateRange]);

  // Monthly scan data for the bar chart
  const scanChartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
        datasets: [
          {
        data: [5000, 25000, 12000, 30000, 2000, 20000, 7000, 25000, 12000, 30000, 3000, 15000],
        backgroundColor: '#9333EA',
        borderRadius: 4,
      }
    ],
  };

  const scanChartOptions = {
    responsive: true,
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

  // Donut chart data for the routes
  const routesChartData = {
    labels: ['Voyages', '100% gagnant', 'iPhone'],
    datasets: [
      {
        data: [67.6, 26.4, 6],
        backgroundColor: ['#4ade80', '#60a5fa', '#111827'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  const routesChartOptions = {
    responsive: true,
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
        {/* Scans Card */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Scans</span>
            <span className="text-2xl sm:text-3xl font-bold">2 987</span>
            <span className="mt-1 flex items-center text-xs font-medium text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />+11.02%
            </span>
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Card>

        {/* Prospects Card */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Prospects</span>
            <span className="text-2xl sm:text-3xl font-bold">1 943</span>
            <span className="mt-1 flex items-center text-xs font-medium text-red-600">
              <ArrowDownRight className="mr-1 h-3 w-3" />-0.03%
            </span>
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none">
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 21V19C3 17.9391 3.42143 16.9217 4.17157 16.1716C4.92172 15.4214 5.93913 15 7 15H11C12.0609 15 13.0783 15.4214 13.8284 16.1716C14.5786 16.9217 15 17.9391 15 19V21" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 21V19C20.9949 18.1172 20.6979 17.2608 20.1553 16.5644C19.6126 15.868 18.8548 15.3707 18 15.15" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Card>

        {/* Clients Card */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Clients</span>
            <span className="text-2xl sm:text-3xl font-bold">1 265</span>
            <span className="mt-1 flex items-center text-xs font-medium text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />+15.03%
            </span>
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>
        </Card>

        {/* Productivity Card */}
        <Card className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-gray-500">Productivité</span>
            <span className="text-2xl sm:text-3xl font-bold">65.1%</span>
            <span className="mt-1 flex items-center text-xs font-medium text-green-600">
              <ArrowUpRight className="mr-1 h-3 w-3" />+4.08%
            </span>
        </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none">
              <path d="M12 4V20" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 14L12 20L6 14" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>
        </Card>
      </div>

      {/* Two column layout - Mobile responsive */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Roues section */}
        <Card className="bg-[#e9ddfc] p-4 sm:p-5 rounded-xl">
          <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium">Roues</h2>
          <div className="flex items-center justify-center pb-3 sm:pb-4">
            <div className="relative h-40 w-40 sm:h-48 sm:w-48 lg:h-52 lg:w-52">
              <Doughnut data={routesChartData} options={routesChartOptions} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#4ade80]"></div>
                <span className="ml-2 text-xs sm:text-sm">Voyages</span>
              </div>
              <span className="font-medium text-xs sm:text-sm">67.6%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#60a5fa]"></div>
                <span className="ml-2 text-xs sm:text-sm">100% gagnant</span>
              </div>
              <span className="font-medium text-xs sm:text-sm">26.4%</span>
        </div>
                  <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#111827]"></div>
                <span className="ml-2 text-xs sm:text-sm">iPhone</span>
              </div>
              <span className="font-medium text-xs sm:text-sm">6%</span>
            </div>
                    </div>
        </Card>

        {/* Entreprises section */}
        <Card className="bg-[#e9ddfc] p-4 sm:p-5 rounded-xl">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-medium">Entreprises</h2>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Rechercher"
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
                  <th className="whitespace-nowrap pb-2 sm:pb-3 font-normal hidden sm:table-cell">Scans</th>
                  <th className="whitespace-nowrap pb-2 sm:pb-3 font-normal hidden md:table-cell">Cadeaux</th>
                  <th className="whitespace-nowrap pb-2 sm:pb-3 font-normal">Productivité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                <tr>
                  <td className="py-1.5 sm:py-2 font-medium">GOOGLE</td>
                  <td className="py-1.5 sm:py-2 hidden sm:table-cell">3 200</td>
                  <td className="py-1.5 sm:py-2 hidden md:table-cell">2 678</td>
                  <td className="py-1.5 sm:py-2 text-green-600 font-medium">83.7%</td>
                </tr>
                <tr>
                  <td className="py-1.5 sm:py-2 font-medium">MICROSOFT</td>
                  <td className="py-1.5 sm:py-2 hidden sm:table-cell">10 567</td>
                  <td className="py-1.5 sm:py-2 hidden md:table-cell">9 600</td>
                  <td className="py-1.5 sm:py-2 text-green-600 font-medium">96%</td>
                </tr>
                <tr>
                  <td className="py-1.5 sm:py-2 font-medium">TIKTOK</td>
                  <td className="py-1.5 sm:py-2 hidden sm:table-cell">6 743</td>
                  <td className="py-1.5 sm:py-2 hidden md:table-cell">1 287</td>
                  <td className="py-1.5 sm:py-2 text-red-500 font-medium">19.1%</td>
                </tr>
                <tr>
                  <td className="py-1.5 sm:py-2 font-medium">INSTAGRAM</td>
                  <td className="py-1.5 sm:py-2 hidden sm:table-cell">5 000</td>
                  <td className="py-1.5 sm:py-2 hidden md:table-cell">2 490</td>
                  <td className="py-1.5 sm:py-2 text-orange-500 font-medium">49.8%</td>
                </tr>
                <tr>
                  <td className="py-1.5 sm:py-2 font-medium">META</td>
                  <td className="py-1.5 sm:py-2 hidden sm:table-cell">103</td>
                  <td className="py-1.5 sm:py-2 hidden md:table-cell">24</td>
                  <td className="py-1.5 sm:py-2 text-red-500 font-medium">23.3%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
                </div>

      {/* Monthly scan chart section - Mobile responsive */}
      <div className="mt-4 sm:mt-6">
        <Card className="bg-[#e9ddfc] p-4 sm:p-5 rounded-xl">
          <h2 className="mb-2 text-base sm:text-lg font-medium">Nombre de scan</h2>
          <div className="h-60 sm:h-72">
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