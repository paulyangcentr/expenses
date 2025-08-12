import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { transactionSchema } from '@/lib/validations'
import { categorizeTransaction } from '@/lib/categorization'

export async function GET(request: NextRequest) {
  try {
    // Demo mode - return mock transaction data
    const mockTransactions = [
      {
        id: '1',
        userId: 'demo-user-id',
        accountId: 'demo-account-1',
        date: new Date('2024-08-01'),
        description: 'Grocery shopping',
        merchant: 'Whole Foods',
        amount: -125.50,
        currency: 'USD',
        categoryId: 'groceries',
        tags: 'food,essential',
        isTransfer: false,
        notes: 'Weekly groceries',
        createdAt: new Date('2024-08-01'),
        updatedAt: new Date('2024-08-01'),
        category: { id: 'groceries', name: 'Groceries', type: 'SPEND' },
        account: { id: 'demo-account-1', name: 'Checking Account', type: 'CHECKING' }
      },
      {
        id: '2',
        userId: 'demo-user-id',
        accountId: 'demo-account-1',
        date: new Date('2024-08-02'),
        description: 'Salary deposit',
        merchant: 'Company Inc',
        amount: 5000.00,
        currency: 'USD',
        categoryId: 'income',
        tags: 'salary',
        isTransfer: false,
        notes: 'Monthly salary',
        createdAt: new Date('2024-08-02'),
        updatedAt: new Date('2024-08-02'),
        category: { id: 'income', name: 'Income', type: 'SAVE' },
        account: { id: 'demo-account-1', name: 'Checking Account', type: 'CHECKING' }
      },
      {
        id: '3',
        userId: 'demo-user-id',
        accountId: 'demo-account-1',
        date: new Date('2024-08-03'),
        description: 'Gas station',
        merchant: 'Shell',
        amount: -45.00,
        currency: 'USD',
        categoryId: 'transportation',
        tags: 'fuel',
        isTransfer: false,
        notes: 'Car fuel',
        createdAt: new Date('2024-08-03'),
        updatedAt: new Date('2024-08-03'),
        category: { id: 'transportation', name: 'Transportation', type: 'SPEND' },
        account: { id: 'demo-account-1', name: 'Checking Account', type: 'CHECKING' }
      }
    ]

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const limitNumber = limit ? parseInt(limit) : undefined

    const transactions = limitNumber ? mockTransactions.slice(0, limitNumber) : mockTransactions

    return NextResponse.json({
      transactions,
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    // If no category is provided, try to auto-categorize
    let categoryId = validatedData.categoryId
    if (!categoryId) {
      const categorization = await categorizeTransaction(
        session.user.id,
        validatedData.description,
        validatedData.merchant || null,
        validatedData.amount,
        validatedData.accountId
      )
      categoryId = categorization?.categoryId || undefined
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        accountId: validatedData.accountId,
        date: new Date(validatedData.date),
        description: validatedData.description,
        merchant: validatedData.merchant,
        amount: validatedData.amount,
        currency: validatedData.currency || 'USD',
        categoryId,
        tags: (validatedData.tags || []).join(','),
        isTransfer: validatedData.isTransfer || false,
        notes: validatedData.notes,
      },
      include: {
        category: true,
        account: true,
      },
    })

    return NextResponse.json({
      transaction,
    })

  } catch (error) {
    console.error('Error creating transaction:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid transaction data' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
