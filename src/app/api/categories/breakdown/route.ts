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

    // Get spending transactions for current month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        amount: {
          lt: 0, // Only spending (negative amounts)
        },
        isTransfer: false,
      },
      include: {
        category: true,
      },
    })

    // Group by category
    const categoryTotals = new Map<string, number>()
    
    transactions.forEach(transaction => {
      const categoryName = transaction.category?.name || 'Uncategorized'
      const current = categoryTotals.get(categoryName) || 0
      categoryTotals.set(categoryName, current + Math.abs(transaction.amount))
    })

    // Calculate total spending
    const totalSpending = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0)

    // Convert to array and calculate percentages
    const categories = Array.from(categoryTotals.entries()).map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
    }))

    // Sort by amount descending
    categories.sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      categories,
      totalSpending,
    })

  } catch (error) {
    console.error('Error fetching category breakdown:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category breakdown' },
      { status: 500 }
    )
  }
}
