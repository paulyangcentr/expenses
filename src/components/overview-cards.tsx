'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'
import { analyticsService, transactionService } from '@/lib/firebase-data'
import { useAuth } from '@/components/providers/firebase-auth-provider'
import { eventEmitter, EVENTS } from '@/lib/events'

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
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchOverviewData()
    }
  }, [user])

  // Listen for transaction updates
  useEffect(() => {
    const handleTransactionUpdate = () => {
      console.log('Overview cards: Transaction update detected, refreshing data...')
      fetchOverviewData()
    }

    eventEmitter.on(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)

    return () => {
      eventEmitter.off(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)
    }
  }, [user])

  const fetchOverviewData = async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching overview data for user:', user.uid)
      
      // Test: Try to fetch transactions directly first
      try {
        const transactions = await transactionService.getTransactions(user.uid, 10)
        console.log('Direct transaction fetch test:', transactions.length, 'transactions found')
        if (transactions.length > 0) {
          console.log('Sample transaction:', transactions[0])
        }
      } catch (error) {
        console.error('Direct transaction fetch failed:', error)
      }
      
      try {
        const overviewData = await analyticsService.getOverview(user.uid)
        console.log('Overview data received:', overviewData)
        
        // Check if analytics service returned meaningful data
        if (overviewData.totalIncome === 0 && overviewData.totalSpend === 0 && overviewData.cashFlow === 0) {
          console.log('Analytics service returned zero values, using fallback calculation')
          throw new Error('Analytics service returned zero values')
        }
        
        setData(overviewData)
      } catch (error) {
        console.error('Analytics service failed, calculating fallback data:', error)
        
        // Fallback: Calculate overview manually from transactions
        try {
          const allTransactions = await transactionService.getTransactions(user.uid, 1000)
          console.log('Calculating fallback overview from', allTransactions.length, 'transactions')
          
          // Show transaction date distribution
          const dateDistribution = allTransactions.reduce((acc, t) => {
            const monthYear = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
            acc[monthYear] = (acc[monthYear] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          console.log('Transaction date distribution:', dateDistribution)
          
          const now = new Date()
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
          console.log('Filtering transactions from', threeMonthsAgo.toDateString(), 'to now')
          
          const recentTransactions = allTransactions.filter(t => 
            t.date >= threeMonthsAgo && t.amount < 0 && !t.isTransfer
          )
          console.log('Recent transactions (expenses):', recentTransactions.length)
          console.log('Sample recent transactions:', recentTransactions.slice(0, 3).map(t => ({
            amount: t.amount,
            date: t.date.toDateString(),
            description: t.description
          })))
          
          const recentIncome = allTransactions.filter(t => 
            t.date >= threeMonthsAgo && t.amount > 0 && !t.isTransfer
          )
          console.log('Recent income transactions:', recentIncome.length)
          
          const totalSpend = Math.abs(recentTransactions.reduce((sum, t) => sum + t.amount, 0))
          const totalIncome = recentIncome.reduce((sum, t) => sum + t.amount, 0)
          const cashFlow = totalIncome - totalSpend
          const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpend) / totalIncome) * 100 : 0
          const monthlyAverage = totalSpend / 3 // Average over 3 months
          
          const fallbackData = {
            totalIncome: Math.round(totalIncome * 100) / 100,
            totalSpend: Math.round(totalSpend * 100) / 100,
            savingsRate: Math.round(savingsRate * 100) / 100,
            cashFlow: Math.round(cashFlow * 100) / 100,
            monthlyAverage: Math.round(monthlyAverage * 100) / 100,
          }
          
          console.log('Fallback overview data calculated:', fallbackData)
          setData(fallbackData)
        } catch (fallbackError) {
          console.error('Fallback calculation also failed:', fallbackError)
          setError('Failed to load overview data')
          // Set default data for demo
          setData({
            totalIncome: 5000,
            totalSpend: 3200,
            savingsRate: 36.0,
            cashFlow: 1800,
            monthlyAverage: 3200
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch overview data:', error)
      setError('Failed to load overview data')
      // Set default data for demo
      setData({
        totalIncome: 5000,
        totalSpend: 3200,
        savingsRate: 36.0,
        cashFlow: 1800,
        monthlyAverage: 3200
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchOverviewData()
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

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Overview</h2>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh Data
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Overview</h2>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh Data
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No data available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Overview</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log('Manual event trigger test...')
              eventEmitter.emit(EVENTS.TRANSACTIONS_UPDATED)
            }}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Test Event
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>
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
    </div>
  )
}
