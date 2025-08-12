import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore'
import { db } from './firebase'

// Types
export interface Transaction {
  id?: string
  userId: string
  accountId: string
  date: Date
  description: string
  merchant?: string
  amount: number
  currency: string
  categoryId?: string
  tags?: string
  isTransfer: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id?: string
  userId: string
  name: string
  type: 'SPEND' | 'SAVE'
  parentId?: string
  isDefault: boolean
}

export interface Account {
  id?: string
  userId: string
  name: string
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT'
  isActive: boolean
}

// Transaction Services
export const transactionService = {
  async getTransactions(userId: string, limitCount?: number): Promise<Transaction[]> {
    try {
      let q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      )
      
      if (limitCount) {
        q = query(q, limit(limitCount))
      }
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Transaction[]
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  },

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...transaction,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      return docRef.id
    } catch (error) {
      console.error('Error adding transaction:', error)
      throw error
    }
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    try {
      const docRef = doc(db, 'transactions', id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error('Error updating transaction:', error)
      throw error
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'transactions', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting transaction:', error)
      throw error
    }
  }
}

// Category Services
export const categoryService = {
  async getCategories(userId: string): Promise<Category[]> {
    try {
      const q = query(
        collection(db, 'categories'),
        where('userId', '==', userId),
        orderBy('type', 'asc'),
        orderBy('name', 'asc')
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[]
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  },

  async addCategory(category: Omit<Category, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'categories'), category)
      return docRef.id
    } catch (error) {
      console.error('Error adding category:', error)
      throw error
    }
  }
}

// Account Services
export const accountService = {
  async getAccounts(userId: string): Promise<Account[]> {
    try {
      const q = query(
        collection(db, 'accounts'),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Account[]
    } catch (error) {
      console.error('Error fetching accounts:', error)
      return []
    }
  },

  async addAccount(account: Omit<Account, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'accounts'), account)
      return docRef.id
    } catch (error) {
      console.error('Error adding account:', error)
      throw error
    }
  }
}

// Analytics Services
export const analyticsService = {
  async getOverview(userId: string): Promise<{
    totalIncome: number
    totalSpend: number
    savingsRate: number
    cashFlow: number
    monthlyAverage: number
  }> {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        where('isTransfer', '==', false)
      )
      
      const querySnapshot = await getDocs(q)
      const transactions = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Transaction[]

      const totalIncome = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)

      const totalSpend = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const cashFlow = totalIncome - totalSpend
      const savingsRate = totalIncome > 0 ? (cashFlow / totalIncome) * 100 : 0

      // Calculate monthly average (last 6 months)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      const historicalQ = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(sixMonthsAgo)),
        where('isTransfer', '==', false)
      )
      
      const historicalSnapshot = await getDocs(historicalQ)
      const historicalTransactions = historicalSnapshot.docs.map(doc => ({
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Transaction[]

      const monthlyTotals = new Map<string, number>()
      
      historicalTransactions.forEach(transaction => {
        const monthKey = transaction.date.toISOString().slice(0, 7) // YYYY-MM
        const current = monthlyTotals.get(monthKey) || 0
        monthlyTotals.set(monthKey, current + transaction.amount)
      })

      const monthlyAverage = monthlyTotals.size > 0 
        ? Array.from(monthlyTotals.values()).reduce((sum, val) => sum + val, 0) / monthlyTotals.size
        : 0

      return {
        totalIncome,
        totalSpend,
        savingsRate,
        cashFlow,
        monthlyAverage,
      }
    } catch (error) {
      console.error('Error fetching overview:', error)
      return {
        totalIncome: 0,
        totalSpend: 0,
        savingsRate: 0,
        cashFlow: 0,
        monthlyAverage: 0,
      }
    }
  },

  async getCategoryBreakdown(userId: string): Promise<{
    categories: Array<{ name: string; amount: number; percentage: number }>
    totalSpending: number
  }> {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        where('amount', '<', 0),
        where('isTransfer', '==', false)
      )
      
      const querySnapshot = await getDocs(q)
      const transactions = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Transaction[]

      // Get categories for category names
      const categories = await categoryService.getCategories(userId)
      const categoryMap = new Map(categories.map(c => [c.id, c.name]))

      // Group by category
      const categoryTotals = new Map<string, number>()
      
      transactions.forEach(transaction => {
        const categoryName = transaction.categoryId ? categoryMap.get(transaction.categoryId) || 'Uncategorized' : 'Uncategorized'
        const current = categoryTotals.get(categoryName) || 0
        categoryTotals.set(categoryName, current + Math.abs(transaction.amount))
      })

      // Calculate total spending
      const totalSpending = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0)

      // Convert to array and calculate percentages
      const categoryBreakdown = Array.from(categoryTotals.entries()).map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
      }))

      // Sort by amount descending
      categoryBreakdown.sort((a, b) => b.amount - a.amount)

      return {
        categories: categoryBreakdown,
        totalSpending,
      }
    } catch (error) {
      console.error('Error fetching category breakdown:', error)
      return {
        categories: [],
        totalSpending: 0,
      }
    }
  }
}
