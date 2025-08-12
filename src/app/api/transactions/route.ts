import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { transactionSchema } from '@/lib/validations'
import { categorizeTransaction } from '@/lib/categorization'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const limitNumber = limit ? parseInt(limit) : undefined

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        category: true,
        account: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: limitNumber,
    })

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
      categoryId = categorization?.categoryId || null
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
        tags: validatedData.tags || [],
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
