"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Card, CardContent } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table"
import { Button } from "../components/ui/button"
import { entreprisesService } from "../services/api"
import { Download, Search, Filter, ArrowUpDown, Plus, TrendingDown } from "lucide-react"

interface Lead {
  date: string
  heure: string
  prenom: string
  telephone: string
  mail: string
}

interface CompanyDetail {
  name: string
  metric: number
  trend: number
  color: string
  leads: Lead[]
}

const EntrepriseDetail: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>()
  const { user } = useAuth()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompanyDetail = async () => {
      if (!companyId) return

      try {
        const data = await entreprisesService.getCompanyDetail(companyId)
        setCompany(data)
      } catch (error) {
        console.error("Error fetching company detail:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyDetail()
  }, [companyId])

  const filteredLeads =
    company?.leads.filter(
      (lead) =>
        lead.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.mail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telephone.includes(searchTerm),
    ) || []

  const exportCSV = () => {
    if (!company) return

    const csvContent = [
      ["Date", "Heure", "Prénom", "Téléphone", "Mail"],
      ...company.leads.map((lead) => [lead.date, lead.heure, lead.prenom, lead.telephone, lead.mail]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${company.name}_leads.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Entreprise non trouvée</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entreprises</h1>
          <p className="text-gray-600 dark:text-gray-400">Créez et gérez vos campagnes de roue.</p>
        </div>
        {/* Export CSV button only for SUPER admins */}
        {user?.role === 'SUPER' && (
          <Button onClick={exportCSV} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        )}
      </div>

      {/* Company Card */}
      <Card className="w-fit">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${company.color}`}>
              <span className="text-white font-bold text-2xl">{company.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{company.name}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {company.metric.toLocaleString()}
                </span>
                <div className="flex items-center text-red-600">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">{company.trend.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filtrer</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4" />
              <span>Trier</span>
            </Button>
            <div className="flex-1"></div>
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
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Mail</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead, index) => (
                <TableRow key={index}>
                  <TableCell>{lead.date}</TableCell>
                  <TableCell>{lead.heure}</TableCell>
                  <TableCell className="font-medium">{lead.prenom}</TableCell>
                  <TableCell>{lead.telephone}</TableCell>
                  <TableCell>{lead.mail}</TableCell>
                  <TableCell>
                    <button className="text-gray-400 hover:text-gray-600">•••</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
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
    </div>
  )
}

export default EntrepriseDetail
