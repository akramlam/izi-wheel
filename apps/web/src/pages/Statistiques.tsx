"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Search, Folder, DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react"
import { api } from '../lib/api'
import { useToast } from '../hooks/use-toast'
import { useAuth } from '../hooks/useAuth'
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
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

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
)

type DateRange = '7d' | '30d' | '90d' | 'all'

interface StatisticsData {
  totalPlays: number
  totalPrizes: number
  conversionRate: number
  playsByDay: Array<{
    date: string
    count: number
  }>
  prizeDistribution: Array<{
    prizeCode: string
    label: string
    count: number
  }>
  wheelPerformance: Array<{
    wheelId: string
    wheelName: string
    plays: number
    prizes: number
    conversion: number
  }>
}

const Statistiques: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [statsData, setStatsData] = useState<StatisticsData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Map date range to display text
  const dateRangeText = {
    '7d': '7 jours',
    '30d': '30 jours',
    '90d': '90 jours',
    'all': 'Toute la période'
  }

  useEffect(() => {
    fetchStatistics()
  }, [dateRange])

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)
      let companyId = user?.companyId || ''
      
      // For SUPER admin, we need to get a valid company ID if one isn't already set
      if ((!companyId || companyId === '') && user?.role === 'SUPER') {
        try {
          const validationResponse = await api.getValidCompanyId()
          if (validationResponse.data.companyId) {
            companyId = validationResponse.data.companyId
            // Store it for future use
            localStorage.setItem('companyId', companyId)
          }
        } catch (validationError) {
          console.error('Error validating company ID for SUPER admin:', validationError)
        }
      }

      if (!companyId) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Aucun ID d\'entreprise trouvé. Veuillez vous reconnecter.',
        })
        return
      }

      const response = await api.getCompanyStatistics(companyId, { range: dateRange })
      setStatsData(response.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la récupération des statistiques. Veuillez réessayer.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format data for charts
  const getPlaysChartData = () => {
    if (!statsData?.playsByDay) return null
    
    const labels = statsData.playsByDay.map(day => day.date)
    const data = statsData.playsByDay.map(day => day.count)

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
    }
  }

  const getPrizeDistributionData = () => {
    if (!statsData?.prizeDistribution) return null
    
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
    }
  }

  const getWheelPerformanceData = () => {
    if (!statsData?.wheelPerformance) return null
    
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
    }
  }

  // Helper function to format trends
  const formatTrend = (trend: number) => {
    const isPositive = trend >= 0
    return (
      <div className={`flex items-center ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
        <span className="text-sm font-medium">
          {isPositive ? "+" : ""}
          {trend.toFixed(2)}%
        </span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistiques</h1>
          <p className="text-gray-600 dark:text-gray-400">Suivez les statistiques de vos clients.</p>
        </div>
        <div className="flex space-x-2">
          {Object.entries(dateRangeText).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setDateRange(value as DateRange)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === value ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Parties</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData?.totalPlays?.toLocaleString() || 0}
                </p>
                {statsData?.playsByDay && statsData.playsByDay.length > 1 && (
                  formatTrend(10.5) // This would be calculated based on historical data
                )}
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Folder className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Lots gagnés</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData?.totalPrizes?.toLocaleString() || 0}
                  </p>
                {statsData?.prizeDistribution && statsData.prizeDistribution.length > 0 && (
                  formatTrend(5.2) // This would be calculated based on historical data
                )}
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux de conversion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsData ? `${(statsData.conversionRate * 100).toFixed(1)}%` : '0%'}
                </p>
                {statsData?.conversionRate !== undefined && (
                  formatTrend(2.8) // This would be calculated based on historical data
                )}
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Search for wheels/prizes */}
      <div className="flex justify-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
          />
        </div>
      </div>

      {/* Plays Over Time Chart */}
      <Card>
            <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Parties dans le temps</h3>
          <div className="h-72">
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
                      position: 'top',
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
        </CardContent>
      </Card>

      {/* Prize Distribution */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Répartition des lots</h3>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="h-64">
              {getPrizeDistributionData() ? (
                <Doughnut 
                  data={getPrizeDistributionData()!}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
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
              <h4 className="mb-3 font-medium text-gray-700">Détail des lots</h4>
              <div className="overflow-hidden rounded-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lot</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Quantité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {statsData?.prizeDistribution?.filter(prize => 
                      prize.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      prize.prizeCode.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((prize, index) => (
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
        </CardContent>
      </Card>

      {/* Wheel Performance */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Comparaison des performances des roues</h3>
          <div className="h-80">
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
                      position: 'top',
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
            </CardContent>
          </Card>

      {/* Pagination - Display if we have wheels data */}
      {statsData?.wheelPerformance && statsData.wheelPerformance.length > 0 && (
      <div className="flex items-center justify-center space-x-2">
        <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Précédent</button>
        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            className={`px-3 py-2 text-sm rounded ${
              page === 1 ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        ))}
        <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Suivant</button>
      </div>
      )}
    </div>
  )
}

export default Statistiques
