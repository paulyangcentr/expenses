import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseCSV, detectDuplicates } from '@/lib/csv-parser'
import { categorizeTransaction } from '@/lib/categorization'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { csvContent } = await request.json()

    if (!csvContent) {
      return NextResponse.json({ error: 'CSV content is required' }, { status: 400 })
    }

    // Parse CSV
    const parsedTransactions = await parseCSV(csvContent)

    // Get existing transactions for duplicate detection
    const existingTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      select: { id: true, date: true, amount: true, merchant: true, externalId: true }
    })

    // Detect duplicates
    const duplicateResults = detectDuplicates(parsedTransactions, existingTransactions)

    // Get user's accounts and categories for mapping
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id }
    })
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id }
    })

    // Process each transaction with categorization
    const processedTransactions = await Promise.all(
      parsedTransactions.map(async (transaction, index) => {
        const duplicateInfo = duplicateResults[index]
        
        // Find account by name
        const account = accounts.find(a => 
          a.name.toLowerCase() === transaction.account.toLowerCase()
        )

        // Categorize transaction
        let suggestedCategory = null
        let confidence = 0

        if (!duplicateInfo.isDuplicate) {
          const categorization = await categorizeTransaction(
            session.user.id,
            transaction.description,
            transaction.merchant || null,
            transaction.amount,
            account?.id || ''
          )

          if (categorization) {
            const category = categories.find(c => c.id === categorization.categoryId)
            suggestedCategory = category?.name
            confidence = categorization.confidence
          }
        }

        return {
          ...transaction,
          accountId: account?.id,
          isDuplicate: duplicateInfo.isDuplicate,
          suggestedCategory,
          confidence,
        }
      })
    )

    return NextResponse.json({
      transactions: processedTransactions,
      summary: {
        total: processedTransactions.length,
        duplicates: processedTransactions.filter(t => t.isDuplicate).length,
        new: processedTransactions.filter(t => !t.isDuplicate).length,
        categorized: processedTransactions.filter(t => t.suggestedCategory).length,
      }
    })

  } catch (error) {
    console.error('Error parsing CSV:', error)
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    )
  }
}
