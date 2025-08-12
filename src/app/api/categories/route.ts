import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Demo mode - return mock categories data
    const mockCategories = [
      { id: 'groceries', userId: 'demo-user-id', name: 'Groceries', type: 'SPEND', parentId: null, isDefault: true },
      { id: 'transportation', userId: 'demo-user-id', name: 'Transportation', type: 'SPEND', parentId: null, isDefault: true },
      { id: 'entertainment', userId: 'demo-user-id', name: 'Entertainment', type: 'SPEND', parentId: null, isDefault: true },
      { id: 'utilities', userId: 'demo-user-id', name: 'Utilities', type: 'SPEND', parentId: null, isDefault: true },
      { id: 'income', userId: 'demo-user-id', name: 'Income', type: 'SAVE', parentId: null, isDefault: true },
      { id: 'savings', userId: 'demo-user-id', name: 'Savings', type: 'SAVE', parentId: null, isDefault: true },
    ]

    return NextResponse.json({
      categories: mockCategories,
    })

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
