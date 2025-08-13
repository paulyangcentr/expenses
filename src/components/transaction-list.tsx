'use client'

import { useEffect, useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { transactionService, categoryService, accountService, Transaction as FirebaseTransaction } from '@/lib/firebase-data'
import { useAuth } from '@/components/providers/firebase-auth-provider'
import { eventEmitter, EVENTS } from '@/lib/events'

interface DisplayTransaction {
  id: string
  date: Date
  description: string
  merchant?: string
  amount: number
  category?: {
    name: string
    type: 'SPEND' | 'SAVE'
  }
  account: {
    name: string
  }
  isTransfer: boolean
  tags: string[]
}

interface TransactionListProps {
  limit?: number
}

export function TransactionList({ limit }: TransactionListProps) {
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    
    try {
      const firebaseTransactions = await transactionService.getTransactions(user.uid, limit)
      
      // Get categories and accounts for display
      const categories = await categoryService.getCategories(user.uid)
      const accounts = await accountService.getAccounts(user.uid)
      
      const categoryMap = new Map(categories.map(c => [c.id, c]))
      const accountMap = new Map(accounts.map(a => [a.id, a]))
      
      // Intelligent category detection function
      const detectCategoryFromDescription = (description: string): string => {
        const desc = description.toLowerCase()
        
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
          return 'Food & Dining'
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
        
        // Income patterns
        if (desc.includes('deposit') || desc.includes('salary') || desc.includes('payroll') ||
            desc.includes('income') || desc.includes('payment') || desc.includes('refund') ||
            desc.includes('credit') || desc.includes('transfer in') || desc.includes('ach credit')) {
          return 'Income'
        }
        
        return 'Other'
      }
      
      // Transform Firebase transactions to display format with intelligent categorization
      const displayTransactions: DisplayTransaction[] = firebaseTransactions.map(t => {
        let categoryName = 'Unknown'
        let categoryType: 'SPEND' | 'SAVE' = 'SPEND'
        
        // First try to use the assigned category
        if (t.categoryId && categoryMap.has(t.categoryId)) {
          const assignedCategory = categoryMap.get(t.categoryId)!
          
          // If the assigned category is "Uncategorized", try intelligent detection
          if (assignedCategory.name === 'Uncategorized') {
            const detectedCategory = detectCategoryFromDescription(t.description)
            if (detectedCategory !== 'Other') {
              categoryName = detectedCategory
              categoryType = detectedCategory === 'Income' ? 'SAVE' : 'SPEND'
            } else {
              categoryName = assignedCategory.name
              categoryType = assignedCategory.type
            }
          } else {
            categoryName = assignedCategory.name
            categoryType = assignedCategory.type
          }
        } else {
          // Fall back to intelligent detection
          const detectedCategory = detectCategoryFromDescription(t.description)
          categoryName = detectedCategory
          categoryType = detectedCategory === 'Income' ? 'SAVE' : 'SPEND'
        }
        
        return {
          id: t.id || '',
          date: t.date,
          description: t.description,
          merchant: t.merchant,
          amount: t.amount,
          category: {
            name: categoryName,
            type: categoryType
          },
          account: {
            name: accountMap.get(t.accountId)?.name || 'Unknown Account'
          },
          isTransfer: t.isTransfer,
          tags: t.tags ? t.tags.split(',').map(tag => tag.trim()) : []
        }
      })
      
      setTransactions(displayTransactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      // Set demo data
      setTransactions([
        {
          id: '1',
          date: new Date(),
          description: 'Grocery shopping',
          merchant: 'Whole Foods',
          amount: -85.50,
          category: { name: 'Food & Dining', type: 'SPEND' },
          account: { name: 'Checking' },
          isTransfer: false,
          tags: []
        },
        {
          id: '2',
          date: new Date(Date.now() - 86400000),
          description: 'Salary deposit',
          merchant: 'Company Inc',
          amount: 5000.00,
          category: { name: 'Income', type: 'SAVE' },
          account: { name: 'Checking' },
          isTransfer: false,
          tags: []
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [user, limit])

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [fetchTransactions, user])

  // Listen for transaction updates
  useEffect(() => {
    const handleTransactionUpdate = () => {
      console.log('Transaction list: Transaction update detected, refreshing data...')
      fetchTransactions()
    }

    eventEmitter.on(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)

    return () => {
      eventEmitter.off(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)
    }
  }, [fetchTransactions])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No transactions found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {format(new Date(transaction.date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {transaction.description}
              </TableCell>
              <TableCell>{transaction.merchant || '-'}</TableCell>
              <TableCell className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                ${Math.abs(transaction.amount).toFixed(2)}
              </TableCell>
              <TableCell>
                {transaction.category ? (
                  <Badge variant={transaction.category.type === 'SPEND' ? 'destructive' : 'default'}>
                    {transaction.category.name}
                  </Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{transaction.account.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
