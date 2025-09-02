"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Folder, DollarSign, Users, TrendingUp, TrendingDown, ChevronDown } from "lucide-react"
import { api } from '../lib/api'
import { useToast } from '../hooks/use-toast'
import { useAuth } from '../hooks/useAuth'
import { showErrorToast } from '../utils/errorHandler'
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

interface Company {
  id: string
  name: string
  isActive: boolean
}

interface Wheel {
  id: string
  name: string
  isActive: boolean
  companyId: string
}

const Statistiques: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [statsData, setStatsData] = useState<StatisticsData | null>(null)
  const [trends, setTrends] = useState<{ plays: number | null; prizes: number | null; conversion: number | null }>({
    plays: null,
    prizes: null,
    conversion: null,
  })
  
  // New state for company and wheel selection
  const [companies, setCompanies] = useState<Company[]>([])
  const [wheels, setWheels] = useState<Wheel[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [selectedWheelIds, setSelectedWheelIds] = useState<string[]>([])
  const [showWheelDropdown, setShowWheelDropdown] = useState(false)
  
  // Map date range to display text
  const dateRangeText = {
    '7d': '7 jours',
    '30d': '30 jours',
    '90d': '90 jours',
    'all': 'Toute la période'
  }

  useEffect(() => {
    if (user?.role === 'SUPER') {
      fetchCompanies()
    } else {
      // For regular admins, set their company directly
      setSelectedCompanyId(user?.companyId || '')
      fetchStatistics()
    }
  }, [user])

  useEffect(() => {
    if (selectedCompanyId) {
      fetchWheels()
      fetchStatistics()
    }
  }, [selectedCompanyId, dateRange])

  useEffect(() => {
    if (selectedWheelIds.length > 0 || (selectedCompanyId && selectedWheelIds.length === 0)) {
      fetchStatistics()
    }
  }, [selectedWheelIds])

  const fetchCompanies = async () => {
    try {
      const response = await api.getAllCompanies()
      if (response.data.companies) {
        setCompanies(response.data.companies.filter((c: Company) => c.isActive))
        // Auto-select first company if none selected
        if (!selectedCompanyId && response.data.companies.length > 0) {
          setSelectedCompanyId(response.data.companies[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
      showErrorToast(toast, error, 'Erreur', 'Impossible de charger les entreprises.')
    }
  }

  const fetchWheels = async () => {
    try {
      if (!selectedCompanyId) return
      
      const response = await api.getCompanyWheels(selectedCompanyId)
      if (response.data.wheels) {
        setWheels(response.data.wheels.filter((w: Wheel) => w.isActive))
        // Reset wheel selection when company changes
        setSelectedWheelIds([])
      }
    } catch (error) {
      console.error('Error fetching wheels:', error)
      showErrorToast(toast, error, 'Erreur', 'Impossible de charger les roues.')
    }
  }

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)
      let companyId = selectedCompanyId || user?.companyId || ''
      
      // For SUPER admin, we need to get a valid company ID if one isn't already set
      if ((!companyId || companyId === '') && user?.role === 'SUPER') {
        try {
          const validationResponse = await api.getValidCompanyId()
          if (validationResponse.data.companyId) {
            companyId = validationResponse.data.companyId
            setSelectedCompanyId(companyId)
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
          description: 'Aucun ID d\'entreprise trouvé. Veuillez sélectionner une entreprise.',
        })
        return
      }

      // Build query parameters
      const params: any = { range: dateRange }
      if (selectedWheelIds.length > 0) {
        params.wheelIds = selectedWheelIds.join(',')
      }

      const response = await api.getCompanyStatistics(companyId, params)
      setStatsData(response.data)

      // Compute trends versus the previous equivalent period (except for 'all')
      try {
        if (dateRange !== 'all' && response.data?.dateRange?.from && response.data?.dateRange?.to) {
          const from = new Date(response.data.dateRange.from)
          const to = new Date(response.data.dateRange.to)
          const periodMs = Math.max(1, to.getTime() - from.getTime())
          const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000)
          const prevFrom = new Date(prevTo.getTime() - periodMs)

          const prevParams: any = {
            from: prevFrom.toISOString(),
            to: prevTo.toISOString(),
          }
          if (selectedWheelIds.length > 0) {
            prevParams.wheelIds = selectedWheelIds.join(',')
          }

          const prevResp = await api.getCompanyStatistics(companyId, prevParams)
          const currentTotalPlays = Number(response.data?.totalPlays || 0)
          const currentTotalPrizes = Number(response.data?.totalPrizes || 0)
          const prevTotalPlays = Number(prevResp.data?.totalPlays || 0)
          const prevTotalPrizes = Number(prevResp.data?.totalPrizes || 0)

          const computeTrend = (curr: number, prev: number): number | null => {
            if (!isFinite(prev) || prev <= 0) return null
            return ((curr - prev) / prev) * 100
          }

          const currentConv = currentTotalPlays > 0 ? (currentTotalPrizes / currentTotalPlays) * 100 : 0
          const prevConv = prevTotalPlays > 0 ? (prevTotalPrizes / prevTotalPlays) * 100 : 0

          setTrends({
            plays: computeTrend(currentTotalPlays, prevTotalPlays),
            prizes: computeTrend(currentTotalPrizes, prevTotalPrizes),
            conversion: computeTrend(currentConv, prevConv),
          })
        } else {
          setTrends({ plays: null, prizes: null, conversion: null })
        }
      } catch (trendError) {
        console.error('Failed to compute trends:', trendError)
        setTrends({ plays: null, prizes: null, conversion: null })
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      showErrorToast(toast, error, 'Erreur', 'Échec de la récupération des statistiques. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWheelToggle = (wheelId: string) => {
    setSelectedWheelIds(prev => 
      prev.includes(wheelId) 
        ? prev.filter(id => id !== wheelId)
        : [...prev, wheelId]
    )
  }

  const getSelectedWheelsText = () => {
    if (selectedWheelIds.length === 0) {
      return 'Toutes les roues'
    } else if (selectedWheelIds.length === 1) {
      const wheel = wheels.find(w => w.id === selectedWheelIds[0])
      return wheel?.name || 'Roue sélectionnée'
    } else {
      return `${selectedWheelIds.length} roues sélectionnées`
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.wheel-dropdown-container')) {
        setShowWheelDropdown(false)
      }
    }

    if (showWheelDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showWheelDropdown])

  // Format data for charts
  const getPlaysChartData = () => {
    if (!statsData?.playsByDay) return null
    
    const labels = statsData.playsByDay.map(day => {
      const date = new Date(day.date)
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })
    })
    const data = statsData.playsByDay.map(day => day.count)

    return {
      labels,
      datasets: [
        {
          label: 'Nombre de parties',
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
    if (!statsData?.prizeDistribution) {
      return null
    }
    
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
    if (!statsData?.wheelPerformance) {
      return null
    }
    
    return {
      labels: statsData.wheelPerformance.map(wheel => wheel.wheelName),
      datasets: [
        {
          label: 'Nombre de parties',
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
  const formatTrend = (trend: number | null) => {
    if (trend === null) return null
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
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistiques</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {user?.role === 'SUPER' 
                ? 'Analysez les performances par entreprise et roue.' 
                : 'Suivez les statistiques de vos clients.'}
            </p>
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

        {/* Filters for Super Admin */}
        {user?.role === 'SUPER' && (
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Company Selector */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Sélectionner une entreprise</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Wheel Selector */}
            <div className="flex-1 relative wheel-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roues
              </label>
              <button
                onClick={() => setShowWheelDropdown(!showWheelDropdown)}
                disabled={!selectedCompanyId || wheels.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-white text-left flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <span className="truncate">
                  {!selectedCompanyId 
                    ? 'Sélectionnez d\'abord une entreprise' 
                    : wheels.length === 0 
                    ? 'Aucune roue disponible'
                    : getSelectedWheelsText()}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* Wheel Dropdown */}
              {showWheelDropdown && wheels.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWheelIds.length === 0}
                        onChange={() => setSelectedWheelIds([])}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium">Toutes les roues</span>
                    </label>
                    {wheels.map((wheel) => (
                      <label key={wheel.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedWheelIds.includes(wheel.id)}
                          onChange={() => handleWheelToggle(wheel.id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm">{wheel.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected filters display */}
        {user?.role === 'SUPER' && selectedCompanyId && (
          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
              📊 {companies.find(c => c.id === selectedCompanyId)?.name || 'Entreprise sélectionnée'}
            </span>
            {selectedWheelIds.length > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                🎯 {getSelectedWheelsText()}
              </span>
            )}
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
              📅 {dateRangeText[dateRange]}
            </span>
          </div>
        )}
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
                {formatTrend(trends.plays)}
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
                {formatTrend(trends.prizes)}
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
                  {statsData && statsData.totalPlays > 0 
                    ? `${((statsData.totalPrizes / statsData.totalPlays) * 100).toFixed(1)}%` 
                    : '0%'}
                </p>
                {formatTrend(trends.conversion)}
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
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
    </div>
  )
}

export default Statistiques
