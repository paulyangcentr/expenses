import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get transactions for current month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isTransfer: false,
      },
      include: {
        category: true,
      },
    })

    // Calculate totals
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
    const historicalTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: sixMonthsAgo,
        },
        isTransfer: false,
      },
    })

    const monthlyTotals = new Map<string, number>()
    
    historicalTransactions.forEach(transaction => {
      const monthKey = transaction.date.toISOString().slice(0, 7) // YYYY-MM
      const current = monthlyTotals.get(monthKey) || 0
      monthlyTotals.set(monthKey, current + transaction.amount)
    })

    const monthlyAverage = monthlyTotals.size > 0 
      ? Array.from(monthlyTotals.values()).reduce((sum, val) => sum + val, 0) / monthlyTotals.size
      : 0

    return NextResponse.json({
      totalIncome,
      totalSpend,
      savingsRate,
      cashFlow,
      monthlyAverage,
    })

  } catch (error) {
    console.error('Error fetching overview data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    )
  }
}
