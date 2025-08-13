'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { analyticsService, transactionService, categoryService } from '@/lib/firebase-data'
import { useAuth } from '@/components/providers/firebase-auth-provider'
import { eventEmitter, EVENTS } from '@/lib/events'

interface CategoryData {
  name: string
  amount: number
  percentage: number
}

export function CategoryBreakdown() {
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchCategoryData()
    }
  }, [user])

  // Listen for transaction updates
  useEffect(() => {
    const handleTransactionUpdate = () => {
      console.log('Category breakdown: Transaction update detected, refreshing data...')
      fetchCategoryData()
    }

    eventEmitter.on(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)

    return () => {
      eventEmitter.off(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)
    }
  }, [user])

  const fetchCategoryData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching category breakdown for user:', user.uid)
      
      try {
        const categoryData = await analyticsService.getCategoryBreakdown(user.uid)
        console.log('Category breakdown received:', categoryData)
        
        // Check if analytics service returned meaningful data
        if (categoryData.categories.length === 0 && categoryData.totalSpending === 0) {
          console.log('Analytics service returned empty categories, using fallback calculation')
          throw new Error('Analytics service returned empty categories')
        }
        
        setData(categoryData.categories)
      } catch (error) {
        console.error('Analytics service failed, calculating fallback category data:', error)
        
        // Fallback: Calculate category breakdown manually from transactions
        try {
          const allTransactions = await transactionService.getTransactions(user.uid, 1000)
          const categories = await categoryService.getCategories(user.uid)
          console.log('Calculating fallback category breakdown from', allTransactions.length, 'transactions')
          
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
            description: t.description,
            categoryId: t.categoryId
          })))
          
          const categoryMap = new Map(categories.map(c => [c.id, c.name]))
          console.log('Category map:', Object.fromEntries(categoryMap))
          
          // Intelligent category detection based on transaction descriptions
          const detectCategoryFromDescription = (description: string): string => {
            const desc = description.toLowerCase()
            
            // Basic debugging to test if includes() is working
            console.log('Testing includes() method:', {
              description: description,
              lowercase: desc,
              hasCafe: desc.includes('cafe'),
              hasSushi: desc.includes('sushi'),
              hasGarden: desc.includes('garden'),
              hasStaterbros: desc.includes('staterbros'),
              hasMarukai: desc.includes('marukai'),
              hasClasspass: desc.includes('classpass'),
              hasParking: desc.includes('parking'),
              hasArco: desc.includes('arco')
            })
            
            // Debug logging for specific transactions we know should match
            if (desc.includes('chipotle') || desc.includes('staterbros') || desc.includes('marukai') || 
                desc.includes('sushi') || desc.includes('cafe') || desc.includes('garden')) {
              console.log('Food transaction detected:', { original: description, lowercase: desc })
            }
            
            // Food & Dining patterns
            if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('coffee') || 
                desc.includes('starbucks') || desc.includes('mcdonalds') || desc.includes('burger') ||
                desc.includes('pizza') || desc.includes('subway') || desc.includes('chipotle') ||
                desc.includes('doordash') || desc.includes('uber eats') || desc.includes('grubhub') ||
                desc.includes('food') || desc.includes('dining') || desc.includes('meal') ||
                desc.includes('dunkin') || desc.includes('taco') || desc.includes('kfc') ||
                desc.includes('wendy') || desc.includes('domino') || desc.includes('papa john') ||
                desc.includes('sandwich') || desc.includes('kitchen') || desc.includes('doughnut') ||
                desc.includes('kabob') || desc.includes('kabab') || desc.includes('krispy') ||
                desc.includes('prince') || desc.includes('orange ca') || desc.includes('santa ana') ||
                desc.includes('austin tx') || desc.includes('leee') || desc.includes('lee') ||
                desc.includes('sushi') || desc.includes('ramen') || desc.includes('garden') ||
                desc.includes('staterbros') || desc.includes('marukai') || desc.includes('market') ||
                desc.includes('grocery') || desc.includes('supermarket') || desc.includes('food store') ||
                desc.includes('cafe') || desc.includes('beverage') || desc.includes('drink') ||
                desc.includes('lost in dreams') || desc.includes('bev') || desc.includes('7 leaves')) {
              console.log('Food pattern matched for:', description)
              return 'Food & Dining'
            }
            
            // Debug logging for transportation transactions
            if (desc.includes('classpass') || desc.includes('parking') || desc.includes('arco') || 
                desc.includes('ampm') || desc.includes('gas')) {
              console.log('Transportation transaction detected:', { original: description, lowercase: desc })
            }
            
            // Shopping patterns
            if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart') ||
                desc.includes('costco') || desc.includes('best buy') || desc.includes('apple') ||
                desc.includes('nike') || desc.includes('adidas') || desc.includes('macy') ||
                desc.includes('nordstrom') || desc.includes('h&m') || desc.includes('zara') ||
                desc.includes('shopping') || desc.includes('store') || desc.includes('retail') ||
                desc.includes('mkptl') || desc.includes('marketplace') || desc.includes('ebay') ||
                desc.includes('etsy') || desc.includes('shop') || desc.includes('mall') ||
                desc.includes('amzn.com') || desc.includes('amazon.com')) {
              return 'Shopping'
            }
            
            // Transportation patterns
            if (desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi') ||
                desc.includes('gas') || desc.includes('shell') || desc.includes('chevron') ||
                desc.includes('exxon') || desc.includes('bp') || desc.includes('mobil') ||
                desc.includes('parking') || desc.includes('toll') || desc.includes('transit') ||
                desc.includes('metro') || desc.includes('bus') || desc.includes('train') ||
                desc.includes('airline') || desc.includes('delta') || desc.includes('united') ||
                desc.includes('southwest') || desc.includes('car rental') || desc.includes('hertz') ||
                desc.includes('arco') || desc.includes('ampm') || desc.includes('classpass')) {
              return 'Transportation'
            }
            
            // Entertainment patterns
            if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hulu') ||
                desc.includes('disney') || desc.includes('hbo') || desc.includes('youtube') ||
                desc.includes('movie') || desc.includes('theater') || desc.includes('concert') ||
                desc.includes('game') || desc.includes('playstation') || desc.includes('xbox') ||
                desc.includes('entertainment') || desc.includes('streaming') || desc.includes('amazon prime') ||
                desc.includes('twitch') || desc.includes('ticket') || desc.includes('show')) {
              return 'Entertainment'
            }
            
            // Utilities patterns
            if (desc.includes('electric') || desc.includes('gas') || desc.includes('water') ||
                desc.includes('internet') || desc.includes('wifi') || desc.includes('phone') ||
                desc.includes('verizon') || desc.includes('at&t') || desc.includes('tmobile') ||
                desc.includes('utility') || desc.includes('bill') || desc.includes('comcast') ||
                desc.includes('spectrum') || desc.includes('xfinity') || desc.includes('cable')) {
              return 'Utilities'
            }
            
            // Healthcare patterns
            if (desc.includes('pharmacy') || desc.includes('cvs') || desc.includes('walgreens') ||
                desc.includes('doctor') || desc.includes('medical') || desc.includes('health') ||
                desc.includes('dental') || desc.includes('vision') || desc.includes('hospital') ||
                desc.includes('clinic') || desc.includes('physician') || desc.includes('rx')) {
              return 'Healthcare'
            }
            
            // Income patterns
            if (desc.includes('deposit') || desc.includes('salary') || desc.includes('payroll') ||
                desc.includes('income') || desc.includes('payment') || desc.includes('refund') ||
                desc.includes('credit') || desc.includes('transfer in') || desc.includes('ach credit')) {
              return 'Income'
            }
            
            // Groceries patterns
            if (desc.includes('grocery') || desc.includes('safeway') || desc.includes('kroger') ||
                desc.includes('whole foods') || desc.includes('trader joe') || desc.includes('sprouts') ||
                desc.includes('albertsons') || desc.includes('food store') || desc.includes('supermarket')) {
              return 'Food & Dining'
            }
            
            // Banking/Financial patterns
            if (desc.includes('atm') || desc.includes('withdrawal') || desc.includes('deposit') ||
                desc.includes('transfer') || desc.includes('bank') || desc.includes('credit union') ||
                desc.includes('check') || desc.includes('ach') || desc.includes('wire')) {
              return 'Uncategorized' // Keep banking as uncategorized for now
            }
            
            return 'Uncategorized'
          }
          
          // Group by category
          const categoryTotals = new Map<string, number>()
          const categorizationLog: Array<{description: string, category: string, amount: number}> = []
          
          recentTransactions.forEach(transaction => {
            let categoryName = 'Uncategorized'
            
            // Debug: Log the transaction description we're working with
            const description = transaction.description || transaction.merchant || ''
            console.log('Processing transaction:', {
              description: description,
              merchant: transaction.merchant,
              hasDescription: !!transaction.description,
              hasMerchant: !!transaction.merchant,
              categoryId: transaction.categoryId,
              hasCategoryId: !!transaction.categoryId
            })
            
            // First try to use the assigned category
            if (transaction.categoryId && categoryMap.has(transaction.categoryId)) {
              const assignedCategory = categoryMap.get(transaction.categoryId)!
              
              // If the assigned category is "Uncategorized", try intelligent detection
              if (assignedCategory === 'Uncategorized') {
                console.log('Assigned category is Uncategorized, trying intelligent detection for:', description)
                const detectedCategory = detectCategoryFromDescription(description)
                if (detectedCategory !== 'Uncategorized') {
                  console.log('Intelligent detection found better category:', detectedCategory, 'for:', description)
                  categoryName = detectedCategory
                } else {
                  categoryName = assignedCategory
                }
              } else {
                categoryName = assignedCategory
                console.log('Using assigned category:', categoryName, 'for transaction:', description)
              }
            } else {
              // Fall back to intelligent detection
              console.log('No assigned category, using intelligent detection for:', description)
              categoryName = detectCategoryFromDescription(description)
            }
            
            const current = categoryTotals.get(categoryName) || 0
            categoryTotals.set(categoryName, current + Math.abs(transaction.amount))
            
            // Log categorization for debugging
            categorizationLog.push({
              description: description,
              category: categoryName,
              amount: Math.abs(transaction.amount)
            })
          })
          
          console.log('Sample categorizations:')
          console.table(categorizationLog.slice(0, 10).map(item => ({
            description: item.description.substring(0, 50) + (item.description.length > 50 ? '...' : ''),
            category: item.category,
            amount: item.amount
          })))
          console.log('Category totals:', Object.fromEntries(categoryTotals))
          
          // Log some specific examples for debugging
          const uncategorizedExamples = categorizationLog.filter(item => item.category === 'Uncategorized').slice(0, 5)
          console.log('Uncategorized examples:')
          console.table(uncategorizedExamples.map(item => ({
            description: item.description.substring(0, 60) + (item.description.length > 60 ? '...' : ''),
            amount: item.amount
          })))
          
          // Calculate total spending
          const totalSpending = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0)
          
          // Convert to array and calculate percentages
          const categoryBreakdown = Array.from(categoryTotals.entries()).map(([name, amount]) => ({
            name,
            amount: Math.round(amount * 100) / 100,
            percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
          }))
          
          // Sort by amount descending
          categoryBreakdown.sort((a, b) => b.amount - a.amount)
          
          console.log('Fallback category breakdown calculated:', categoryBreakdown)
          setData(categoryBreakdown)
        } catch (fallbackError) {
          console.error('Fallback category calculation also failed:', fallbackError)
          setError('Failed to load category data')
          // Set demo data
          setData([
            { name: 'Food & Dining', amount: 850, percentage: 26.6 },
            { name: 'Transportation', amount: 450, percentage: 14.1 },
            { name: 'Shopping', amount: 320, percentage: 10.0 },
            { name: 'Entertainment', amount: 280, percentage: 8.8 },
            { name: 'Utilities', amount: 200, percentage: 6.3 }
          ])
        }
      }
    } catch (error) {
      console.error('Failed to fetch category data:', error)
      setError('Failed to load category data')
      // Set demo data
      setData([
        { name: 'Food & Dining', amount: 850, percentage: 26.6 },
        { name: 'Transportation', amount: 450, percentage: 14.1 },
        { name: 'Shopping', amount: 320, percentage: 10.0 },
        { name: 'Entertainment', amount: 280, percentage: 8.8 },
        { name: 'Utilities', amount: 200, percentage: 6.3 }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchCategoryData()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Category Breakdown</span>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Category Breakdown</span>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center">
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Spending by category this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No spending data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Category Breakdown</span>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </CardTitle>
        <CardDescription>Spending by category this month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `$${value}`}
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
              labelFormatter={(label) => `Category: ${label}`}
            />
            <Bar dataKey="amount" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
