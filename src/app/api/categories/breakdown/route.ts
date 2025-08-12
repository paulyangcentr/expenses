import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Demo mode - return mock category breakdown data
    const mockData = {
      categories: [
        { name: 'Groceries', amount: 125.50, percentage: 39 },
        { name: 'Transportation', amount: 45.00, percentage: 14 },
        { name: 'Entertainment', amount: 89.99, percentage: 28 },
        { name: 'Utilities', amount: 67.50, percentage: 21 },
      ],
      totalSpending: 327.99,
    }

    return NextResponse.json(mockData)

  } catch (error) {
    console.error('Error fetching category breakdown:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category breakdown' },
      { status: 500 }
    )
  }
}
