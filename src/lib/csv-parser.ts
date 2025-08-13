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

// Common field identifiers for different CSV formats
const FIELD_MAPPINGS = {
  date: ['date', 'transaction_date', 'post_date', 'posted_date', 'date_posted', 'transaction date'],
  description: ['description', 'memo', 'note', 'details', 'transaction_description', 'payee', 'merchant_name'],
  merchant: ['merchant', 'payee', 'vendor', 'store', 'business', 'merchant_name'],
  amount: ['amount', 'debit', 'credit', 'transaction_amount', 'sum', 'value'],
  currency: ['currency', 'curr', 'ccy'],
  account: ['account', 'account_name', 'account_number', 'account_name', 'from_account', 'to_account'],
  category: ['category', 'category_name', 'type', 'transaction_type', 'classification'],
  tags: ['tags', 'tag', 'labels', 'keywords'],
  externalId: ['external_id', 'id', 'transaction_id', 'reference', 'ref', 'transaction_id']
}

// Date format patterns
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
  /^\d{2}\/\d{2}\/\d{2}$/, // MM/DD/YY
  /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
  /^\d{2}-\d{2}-\d{2}$/, // MM-DD-YY
  /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
]

// Amount patterns
const AMOUNT_PATTERNS = [
  /^-?\d+\.\d{2}$/, // -123.45 or 123.45
  /^-?\d+,\d{3}\.\d{2}$/, // -1,234.56
  /^-?\$\d+\.\d{2}$/, // -$123.45
  /^-?\$\d+,\d{3}\.\d{2}$/, // -$1,234.56
  /^-?\d+\.\d{2}\$$/, // -123.45$
  /^-?\d+,\d{3}\.\d{2}\$$/, // -1,234.56$
]

function detectFieldMapping(headers: string[]): Record<string, string> {
  console.log('detectFieldMapping: Starting with headers:', headers)
  const mapping: Record<string, string> = {}
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim()
    console.log('detectFieldMapping: Processing header:', header, 'normalized to:', normalizedHeader)
    
    // Find matching field
    for (const [field, identifiers] of Object.entries(FIELD_MAPPINGS)) {
      if (identifiers.some(id => normalizedHeader.includes(id))) {
        mapping[field] = header
        console.log('detectFieldMapping: Mapped', field, 'to', header)
        break
      }
    }
  })
  
  console.log('detectFieldMapping: Final mapping:', mapping)
  return mapping
}

function normalizeAmount(amountStr: string, description?: string): number {
  // Remove currency symbols and thousand separators
  let cleaned = amountStr.replace(/[$,€£¥]/g, '')
  
  // Handle parentheses for negative amounts
  let isNegative = false
  if (cleaned.includes('(') && cleaned.includes(')')) {
    isNegative = true
    cleaned = cleaned.replace(/[()]/g, '')
  }
  
  // Handle negative signs
  if (cleaned.startsWith('-')) {
    isNegative = true
    cleaned = cleaned.substring(1)
  }
  
  // Parse the number
  let amount = parseFloat(cleaned)
  
  if (isNaN(amount)) {
    throw new Error(`Unable to parse amount: ${amountStr}`)
  }
  
  // Apply sign based on parentheses/negative signs
  if (isNegative) {
    amount = -Math.abs(amount)
  }
  
      // Enhanced logic for income/expense detection based on description
    if (description) {
      console.log('Enhanced amount processing for:', description, {
        originalAmount: amountStr,
        parsedAmount: amount,
        description: description
      })
      
      // Check if description suggests income (should be positive)
      const incomeKeywords = [
        'deposit', 'salary', 'income', 'refund', 'credit', 'transfer in', 'ach credit', 
        'merchant offers credit', 'cashback', 'reward', 'bonus', 'interest earned'
      ]
      const isIncome = incomeKeywords.some(keyword => 
        description.toLowerCase().includes(keyword)
      )
      
      if (isIncome && amount < 0) {
        amount = Math.abs(amount) // Make income positive
        console.log('Income detected, making amount positive:', amount)
      }
      
      // Check if description suggests expense (should be negative)
      const expenseKeywords = [
        'purchase', 'withdrawal', 'debit', 'charge', 'fee', 'atm', 'amazon', 'chipotle', 
        'staterbros', 'gas', 'fuel', 'restaurant', 'grocery', 'shopping', 'payment'
      ]
      const isExpense = expenseKeywords.some(keyword => 
        description.toLowerCase().includes(keyword)
      )
      
      if (isExpense && amount > 0) {
        amount = -Math.abs(amount) // Make expense negative
        console.log('Expense detected, making amount negative:', amount)
      }
      
      console.log('Final amount for:', description, {
        finalAmount: amount,
        isIncome: amount > 0,
        isExpense: amount < 0
      })
    }
  
  return amount
}

function parseFlexibleDate(dateStr: string): Date {
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
      const parsed = parseDateWithFormat(dateStr, format)
      if (parsed) return parsed
    } catch {
      continue
    }
  }

  throw new Error(`Unable to parse date: ${dateStr}`)
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

function transformRecord(record: Record<string, string>, mapping: Record<string, string>): ParsedTransaction {
  try {
    console.log('transformRecord: Starting transformation with record:', record)
    console.log('transformRecord: Using mapping:', mapping)
    
    // Validate inputs
    if (!record || typeof record !== 'object') {
      throw new Error('Invalid record: record is not an object')
    }
    
    if (!mapping || typeof mapping !== 'object') {
      throw new Error('Invalid mapping: mapping is not an object')
    }
    
    const transformed: any = {}
    
    // Map fields using detected mapping
    for (const [field, header] of Object.entries(mapping)) {
      console.log(`transformRecord: Checking field ${field} with header ${header}`)
      if (record[header] !== undefined && record[header] !== null && record[header] !== '') {
        transformed[field] = record[header]
        console.log(`transformRecord: Mapped ${field} = ${record[header]}`)
      } else {
        console.log(`transformRecord: Field ${field} not found or empty in record`)
      }
    }
    
    console.log('transformRecord: Transformed fields:', transformed)
    
    // Handle missing required fields with defaults
    if (!transformed.date) {
      console.error('transformRecord: Date field is required but not found in CSV')
      console.error('Available fields:', Object.keys(record))
      console.error('Mapping:', mapping)
      throw new Error('Date field is required but not found in CSV. Available fields: ' + Object.keys(record).join(', '))
    }
    
    if (!transformed.description && !transformed.merchant) {
      console.error('transformRecord: Description or merchant field is required but not found in CSV')
      console.error('Available fields:', Object.keys(record))
      throw new Error('Description or merchant field is required but not found in CSV. Available fields: ' + Object.keys(record).join(', '))
    }
    
    // Handle debit/credit format
    let amountValue = transformed.amount
    if (!amountValue) {
      // Check if we have separate debit and credit fields
      const debitValue = record['Debit'] || record['debit']
      const creditValue = record['Credit'] || record['credit']
      
      if (debitValue && debitValue.trim() !== '') {
        amountValue = `-${debitValue}` // Debit is negative
        console.log('transformRecord: Using debit value:', amountValue)
      } else if (creditValue && creditValue.trim() !== '') {
        amountValue = creditValue // Credit is positive
        console.log('transformRecord: Using credit value:', amountValue)
      }
    }
    
    if (!amountValue) {
      console.error('transformRecord: Amount field is required but not found in CSV')
      console.error('Available fields:', Object.keys(record))
      throw new Error('Amount field is required but not found in CSV. Available fields: ' + Object.keys(record).join(', '))
    }
    
    // Parse and validate fields
    console.log('transformRecord: Parsing date:', transformed.date)
    let date: Date
    try {
      date = parseFlexibleDate(transformed.date)
      console.log('transformRecord: Parsed date:', date)
    } catch (error) {
      console.error('transformRecord: Failed to parse date:', transformed.date, error)
      throw new Error(`Failed to parse date: ${transformed.date}. Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY`)
    }
    
    console.log('transformRecord: Parsing amount:', amountValue)
    let amount: number
    try {
      const description = transformed.description || transformed.merchant || 'Unknown transaction'
      amount = normalizeAmount(amountValue, description)
      console.log('transformRecord: Parsed amount:', amount)
    } catch (error) {
      console.error('transformRecord: Failed to parse amount:', amountValue, error)
      throw new Error(`Failed to parse amount: ${amountValue}. Expected format: number with optional currency symbol`)
    }
    
    const description = transformed.description || transformed.merchant || 'Unknown transaction'
    const merchant = transformed.merchant || transformed.description || undefined
    const currency = transformed.currency || 'USD'
    const account = transformed.account || 'Default Account'
    const category = transformed.category || undefined
    const tags = transformed.tags ? transformed.tags.split(/[,;]/).map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : []
    const externalId = transformed.externalId || undefined

    const result = {
      date,
      description,
      merchant,
      amount,
      currency,
      account,
      category,
      tags,
      externalId,
    }
    
    console.log('transformRecord: Final result:', result)
    return result
  } catch (error) {
    console.error('transformRecord: Error during transformation:', error)
    console.error('transformRecord: Record that caused error:', record)
    console.error('transformRecord: Mapping used:', mapping)
    throw error
  }
}

export async function parseCSV(csvContent: string): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    console.log('parseCSV: Starting to parse CSV content')
    const results: ParsedTransaction[] = []
    
    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }, (err, records) => {
      if (err) {
        console.error('parseCSV: CSV parsing error:', err)
        reject(err)
        return
      }

      console.log('parseCSV: Raw records from csv-parse:', records)
      console.log('parseCSV: Number of records:', records.length)

      if (!records || records.length === 0) {
        console.log('parseCSV: No records found, returning empty array')
        resolve([])
        return
      }

      try {
        // Detect field mapping from headers
        const firstRecord = records[0] as Record<string, string>
        if (!firstRecord || typeof firstRecord !== 'object') {
          console.error('parseCSV: First record is invalid:', firstRecord)
          reject(new Error('Invalid CSV format: first record is not an object'))
          return
        }

        const headers = Object.keys(firstRecord)
        console.log('parseCSV: Available headers:', headers)
        
        if (headers.length === 0) {
          console.error('parseCSV: No headers found in CSV')
          reject(new Error('No headers found in CSV file'))
          return
        }
        
        const mapping = detectFieldMapping(headers)
        console.log('parseCSV: Detected field mapping:', mapping)

        // Check if we have the minimum required fields
        if (!mapping.date && !mapping.description && !mapping.amount) {
          console.error('parseCSV: No required fields found. Available headers:', headers)
          reject(new Error(`No required fields found. Available headers: ${headers.join(', ')}. Expected at least: date, description, amount`))
          return
        }

        for (let i = 0; i < records.length; i++) {
          const record = records[i]
          try {
            console.log(`parseCSV: Processing record ${i + 1}:`, record)
            
            if (!record || typeof record !== 'object') {
              console.warn(`parseCSV: Skipping invalid record ${i + 1}:`, record)
              continue
            }

            const parsed = transformRecord(record as Record<string, string>, mapping)
            console.log(`parseCSV: Successfully parsed record ${i + 1}:`, parsed)
            results.push(parsed)
          } catch (error) {
            console.warn(`parseCSV: Failed to parse record ${i + 1}:`, record, error)
            // Continue with other records instead of failing completely
          }
        }

        console.log('parseCSV: Final results:', results)
        resolve(results)
      } catch (error) {
        console.error('parseCSV: Error during processing:', error)
        reject(error)
      }
    })
  })
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
