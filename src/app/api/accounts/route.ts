import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Demo mode - return mock accounts data
    const mockAccounts = [
      { id: 'demo-account-1', userId: 'demo-user-id', name: 'Checking Account', type: 'CHECKING', isActive: true },
      { id: 'demo-account-2', userId: 'demo-user-id', name: 'Savings Account', type: 'SAVINGS', isActive: true },
      { id: 'demo-account-3', userId: 'demo-user-id', name: 'Credit Card', type: 'CREDIT_CARD', isActive: true },
    ]

    return NextResponse.json({
      accounts: mockAccounts,
    })

  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
