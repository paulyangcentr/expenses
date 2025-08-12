import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { categorizeTransaction } from '@/lib/categorization'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactions } = await request.json()

    if (!Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Transactions array is required' }, { status: 400 })
    }

    let imported = 0
    const errors: string[] = []

    // Get user's accounts and categories
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id }
    })
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id }
    })

    for (const transaction of transactions) {
      try {
        // Skip duplicates
        if (transaction.isDuplicate) {
          continue
        }

        // Find account
        const account = accounts.find(a => a.id === transaction.accountId)
        if (!account) {
          errors.push(`Account not found for transaction: ${transaction.description}`)
          continue
        }

        // Find category if suggested
        let categoryId = null
        if (transaction.suggestedCategory) {
          const category = categories.find(c => c.name === transaction.suggestedCategory)
          categoryId = category?.id || null
        }

        // If no category suggested, try to categorize
        if (!categoryId) {
          const categorization = await categorizeTransaction(
            session.user.id,
            transaction.description,
            transaction.merchant || null,
            transaction.amount,
            account.id
          )
          categoryId = categorization?.categoryId || null
        }

        // Create transaction
        await prisma.transaction.create({
          data: {
            userId: session.user.id,
            accountId: account.id,
            date: new Date(transaction.date),
            description: transaction.description,
            merchant: transaction.merchant,
            amount: transaction.amount,
            currency: transaction.currency || 'USD',
            categoryId,
            tags: transaction.tags || [],
            externalId: transaction.externalId,
            isTransfer: false,
          }
        })

        imported++
      } catch (error) {
        console.error('Error importing transaction:', error)
        errors.push(`Failed to import: ${transaction.description}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('Error importing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    )
  }
}
