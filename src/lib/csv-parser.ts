import { parse } from 'csv-parse'
import { csvTransactionSchema } from './validations'

export interface ParsedTransaction {
  date: Date
  description: string
  merchant?: string
  amount: number
  currency: string
  account: string
  category?: string
  tags?: string[]
  externalId?: string
}

export async function parseCSV(csvContent: string): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    const results: ParsedTransaction[] = []
    
    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }, (err, records) => {
      if (err) {
        reject(err)
        return
      }

      for (const record of records) {
        try {
          const parsed = parseTransactionRecord(record as Record<string, string>)
          results.push(parsed)
        } catch (error) {
          console.warn('Failed to parse record:', record, error)
          // Continue with other records
        }
      }

      resolve(results)
    })
  })
}

function parseTransactionRecord(record: Record<string, string>): ParsedTransaction {
  // Validate the record structure
  const validated = csvTransactionSchema.parse(record)

  // Parse date with flexible formats
  const date = parseDate(validated.date)
  
  // Parse amount with support for negative values and thousand separators
  const amount = parseAmount(validated.amount)
  
  // Parse tags if present
  const tags = validated.tags ? validated.tags.split(',').map(tag => tag.trim()) : []

  return {
    date,
    description: validated.description,
    merchant: validated.merchant,
    amount,
    currency: validated.currency,
    account: validated.account,
    category: validated.category,
    tags,
    externalId: validated.externalId,
  }
}

function parseDate(dateString: string): Date {
  // Try multiple date formats
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'MM-dd-yyyy',
    'dd-MM-yyyy',
    'yyyy/MM/dd',
    'MM/dd/yy',
    'dd/MM/yy',
  ]

  for (const format of formats) {
    try {
      const parsed = parseDateWithFormat(dateString, format)
      if (parsed) return parsed
    } catch {
      continue
    }
  }

  throw new Error(`Unable to parse date: ${dateString}`)
}

function parseDateWithFormat(dateString: string, format: string): Date | null {
  const parts = dateString.split(/[\/\-]/)
  const formatParts = format.split(/[\/\-]/)
  
  if (parts.length !== formatParts.length) return null

  let year = 0
  let month = 0
  let day = 0

  for (let i = 0; i < formatParts.length; i++) {
    const part = parts[i]
    const formatPart = formatParts[i]

    if (formatPart === 'yyyy') {
      year = parseInt(part)
    } else if (formatPart === 'yy') {
      year = parseInt(part) + 2000
    } else if (formatPart === 'MM') {
      month = parseInt(part) - 1 // Month is 0-indexed
    } else if (formatPart === 'dd') {
      day = parseInt(part)
    }
  }

  if (year && month >= 0 && day) {
    const date = new Date(year, month, day)
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date
    }
  }

  return null
}

function parseAmount(amountString: string): number {
  // Remove currency symbols and thousand separators
  let cleaned = amountString.replace(/[$,€£¥]/g, '')
  
  // Handle parentheses for negative amounts
  const isNegative = cleaned.includes('(') && cleaned.includes(')')
  cleaned = cleaned.replace(/[()]/g, '')
  
  // Parse the number
  const amount = parseFloat(cleaned)
  
  if (isNaN(amount)) {
    throw new Error(`Unable to parse amount: ${amountString}`)
  }
  
  return isNegative ? -Math.abs(amount) : amount
}

export function detectDuplicates(
  transactions: ParsedTransaction[],
  existingTransactions: Array<{ id: string; date: Date; amount: number; merchant: string | null; externalId?: string | null }>
): { isDuplicate: boolean; confidence: number; existingId?: string }[] {
  return transactions.map(transaction => {
    const duplicates = existingTransactions.filter(existing => {
      // Check by externalId first
      if (transaction.externalId && existing.externalId === transaction.externalId) {
        return true
      }
      
      // Check by date, amount, and merchant
      const sameDate = existing.date.toDateString() === transaction.date.toDateString()
      const sameAmount = Math.abs(existing.amount - transaction.amount) < 0.01
      const sameMerchant = existing.merchant === transaction.merchant
      
      return sameDate && sameAmount && sameMerchant
    })

    if (duplicates.length > 0) {
      const duplicate = duplicates[0]
      return {
        isDuplicate: true,
        confidence: 0.9,
        existingId: duplicate.id
      }
    }

    return {
      isDuplicate: false,
      confidence: 0
    }
  })
}
