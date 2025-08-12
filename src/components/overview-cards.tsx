'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'

interface OverviewData {
  totalIncome: number
  totalSpend: number
  savingsRate: number
  cashFlow: number
  monthlyAverage: number
}

export function OverviewCards() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverviewData()
  }, [])

  const fetchOverviewData = async () => {
    try {
      const response = await fetch('/api/overview')
      if (response.ok) {
        const overviewData = await response.json()
        setData(overviewData)
      }
    } catch (error) {
      console.error('Failed to fetch overview data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Failed to load overview data</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Income */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${data.totalIncome.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            This month
          </p>
        </CardContent>
      </Card>

      {/* Total Spend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ${Math.abs(data.totalSpend).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            This month
          </p>
        </CardContent>
      </Card>

      {/* Savings Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
          <Target className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {data.savingsRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Of total income
          </p>
        </CardContent>
      </Card>

      {/* Cash Flow */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
          <DollarSign className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${data.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${data.cashFlow.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Net this month
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
