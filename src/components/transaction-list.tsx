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
      
      // Transform Firebase transactions to display format
      const displayTransactions: DisplayTransaction[] = firebaseTransactions.map(t => ({
        id: t.id || '',
        date: t.date,
        description: t.description,
        merchant: t.merchant,
        amount: t.amount,
        category: t.categoryId ? {
          name: categoryMap.get(t.categoryId)?.name || 'Unknown',
          type: categoryMap.get(t.categoryId)?.type || 'SPEND'
        } : undefined,
        account: {
          name: accountMap.get(t.accountId)?.name || 'Unknown Account'
        },
        isTransfer: t.isTransfer,
        tags: t.tags ? t.tags.split(',').map(tag => tag.trim()) : []
      }))
      
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
