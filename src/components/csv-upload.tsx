'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { parseCSV, detectDuplicates } from '@/lib/csv-parser'
import { transactionService, categoryService, accountService } from '@/lib/firebase-data'
import { useAuth } from '@/components/providers/firebase-auth-provider'
import { eventEmitter, EVENTS } from '@/lib/events'

// Simple fallback CSV parser
function parseCSVSimple(csvContent: string): ParsedTransaction[] {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0)
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    console.log('Simple parser headers:', headers)
    
    const results: ParsedTransaction[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length !== headers.length) continue
      
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        record[header] = values[index]
      })
      
      console.log('Simple parser record:', record)
      
      // Try to parse basic fields
      const dateIndex = headers.findIndex(h => h.includes('date'))
      const descriptionIndex = headers.findIndex(h => h.includes('description') || h.includes('memo') || h.includes('payee'))
      const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit'))
      const accountIndex = headers.findIndex(h => h.includes('account'))
      
      if (dateIndex >= 0 && descriptionIndex >= 0 && amountIndex >= 0) {
        try {
          const date = new Date(record[headers[dateIndex]])
          const description = record[headers[descriptionIndex]]
          const amountStr = record[headers[amountIndex]]
          const account = accountIndex >= 0 ? record[headers[accountIndex]] : 'Default Account'
          
          // Enhanced amount parsing for bank statements
          let amount = parseFloat(amountStr.replace(/[$,]/g, ''))
          if (isNaN(amount)) continue
          
          console.log('Amount processing for:', description, {
            originalAmount: amountStr,
            parsedAmount: amount,
            description: description
          })
          
          // Handle parentheses notation for negative amounts
          if (amountStr.includes('(') && amountStr.includes(')')) {
            amount = -Math.abs(amount)
          }
          
          // For bank statements: typically debits (expenses) are positive, credits (income) are negative
          // We need to invert this so that expenses are negative and income is positive
          // Check if this looks like a bank statement format
          const isBankStatement = headers.some(h => 
            h.toLowerCase().includes('debit') || 
            h.toLowerCase().includes('credit') || 
            h.toLowerCase().includes('withdrawal') || 
            h.toLowerCase().includes('deposit')
          )
          
          if (isBankStatement) {
            // Invert the amounts: positive becomes negative (expense), negative becomes positive (income)
            amount = -amount
          }
          
          // Additional logic: if description suggests income, make sure it's positive
          const incomeKeywords = ['deposit', 'salary', 'income', 'payment', 'refund', 'credit', 'transfer in', 'ach credit']
          const isIncome = incomeKeywords.some(keyword => 
            description.toLowerCase().includes(keyword)
          )
          
          if (isIncome && amount < 0) {
            amount = Math.abs(amount) // Make income positive
          }
          
          // Additional logic: if description suggests expense, make sure it's negative
          const expenseKeywords = ['purchase', 'payment', 'withdrawal', 'debit', 'charge', 'fee', 'atm']
          const isExpense = expenseKeywords.some(keyword => 
            description.toLowerCase().includes(keyword)
          )
          
          if (isExpense && amount > 0) {
            amount = -Math.abs(amount) // Make expense negative
          }
          
          console.log('Final amount for:', description, {
            finalAmount: amount,
            isIncome: amount > 0,
            isExpense: amount < 0
          })
          
          results.push({
            date,
            description,
            merchant: description,
            amount,
            currency: 'USD',
            account,
            category: undefined,
            tags: [],
            externalId: undefined
          })
        } catch (error: unknown) {
          console.warn('Simple parser failed to parse line:', lines[i], error)
        }
      }
    }
    
    return results
      } catch (error: unknown) {
      console.error('Simple parser error:', error)
      return []
  }
}

interface ParsedTransaction {
  date: Date
  description: string
  merchant?: string
  amount: number
  currency: string
  account: string
  category?: string
  tags?: string[]
  externalId?: string
  isDuplicate?: boolean
  suggestedCategory?: string
  confidence?: number
  existingId?: string
}

export function CSVUpload() {
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)
  const { user } = useAuth()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please sign in to upload CSV files')
      return
    }

    const file = acceptedFiles[0]
    if (!file) return

    setIsProcessing(true)
    try {
      console.log('Starting CSV processing for file:', file.name, 'Size:', file.size)
      
      const text = await file.text()
      console.log('CSV content (first 1000 chars):', text.substring(0, 1000))
      console.log('CSV content length:', text.length)
      console.log('CSV content lines:', text.split('\n').length)

      // Simple test: try to parse the first few lines manually
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      console.log('CSV lines:', lines)
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim())
        console.log('Manual header parsing:', headers)
        if (lines.length > 1) {
          const firstDataLine = lines[1].split(',').map(f => f.trim())
          console.log('Manual first data line:', firstDataLine)
        }
      }

      if (!text || text.trim().length === 0) {
        toast.error('CSV file is empty')
        setIsProcessing(false)
        return
      }

      // Parse CSV using the local parser
      console.log('Calling parseCSV function...')
      
      // Simple test: try to create a basic transaction manually first
      try {
        const testTransaction = {
          date: new Date('2024-01-15'),
          description: 'Test transaction',
          merchant: 'Test merchant',
          amount: -100.00,
          currency: 'USD',
          account: 'Test account',
          category: undefined,
          tags: [],
          externalId: undefined
        }
        console.log('Test transaction created successfully:', testTransaction)
      } catch (error) {
        console.error('Error creating test transaction:', error)
      }
      
      const parsedData = await parseCSV(text)
      console.log('parseCSV returned:', parsedData)
      console.log('Parsed data length:', parsedData.length)
      
      // Debug: Check the first few transactions for amount values
      if (parsedData.length > 0) {
        console.log('First 3 parsed transactions with amounts:')
        parsedData.slice(0, 3).forEach((transaction, index) => {
          console.log(`Transaction ${index + 1}:`, {
            description: transaction.description,
            amount: transaction.amount,
            isNegative: transaction.amount < 0,
            isPositive: transaction.amount > 0
          })
        })
      }
      
      if (parsedData.length === 0) {
        // Try simple fallback parsing
        console.log('Trying fallback CSV parsing...')
        const fallbackData = parseCSVSimple(text)
        console.log('Fallback parsing result:', fallbackData)
        
        if (fallbackData.length > 0) {
          toast.success(`Detected ${fallbackData.length} transactions using fallback parser`)
          // Use fallback data instead
          const transactionsWithSuggestions = fallbackData.map((transaction: ParsedTransaction, index: number) => {
            // Simple category suggestion based on description keywords
            const description = transaction.description.toLowerCase()
            let suggestedCategory = 'Uncategorized'
            let confidence = 0.1

            if (description.includes('food') || description.includes('restaurant') || description.includes('grocery')) {
              suggestedCategory = 'Food & Dining'
              confidence = 0.8
            } else if (description.includes('gas') || description.includes('fuel') || description.includes('uber')) {
              suggestedCategory = 'Transportation'
              confidence = 0.7
            } else if (description.includes('amazon') || description.includes('walmart') || description.includes('target')) {
              suggestedCategory = 'Shopping'
              confidence = 0.6
            }

            return {
              ...transaction,
              suggestedCategory,
              confidence: 0.1,
              isDuplicate: false,
              existingId: undefined
            }
          })

          setParsedTransactions(transactionsWithSuggestions)
          return
        }
        
        toast.error('No transactions found in CSV. Please check the format.')
        console.log('CSV parsing returned 0 transactions')
        console.log('Try using these column headers: date, description, amount, account')
        setIsProcessing(false)
        return
      }
      
      toast.success(`Detected ${parsedData.length} transactions from CSV`)
      
      // Get existing transactions for duplicate detection
      console.log('Fetching existing transactions for duplicate detection...')
      const existingTransactions = await transactionService.getTransactions(user.uid)

      // Transform Firebase transactions to match the expected interface
      const existingForDuplicates = existingTransactions.map(t => ({
        id: t.id || '',
        date: t.date,
        amount: t.amount,
        merchant: t.merchant || null,
        externalId: undefined
      }))

      // Detect duplicates
      console.log('Detecting duplicates...')
      const duplicateResults = detectDuplicates(parsedData, existingForDuplicates)

      // Get categories and accounts for suggestions
      console.log('Fetching categories and accounts for suggestions...')
      let categories: unknown[] = []
      let accounts: unknown[] = []
      
      try {
        categories = await categoryService.getCategories(user.uid)
        console.log('Found categories:', categories.length)
      } catch (error) {
        console.warn('Could not fetch categories (index may be building):', error)
        categories = []
      }
      
      try {
        accounts = await accountService.getAccounts(user.uid)
        console.log('Found accounts:', accounts.length)
      } catch (error) {
        console.warn('Could not fetch accounts (index may be building):', error)
        accounts = []
      }

      // Combine parsed data with duplicate detection and suggestions
      const transactionsWithSuggestions = parsedData.map((transaction, index) => {
        const duplicateInfo = duplicateResults[index]

        // Simple category suggestion based on description keywords
        const description = transaction.description.toLowerCase()
        let suggestedCategory = 'Uncategorized'
        let confidence = 0.1

        if (description.includes('food') || description.includes('restaurant') || description.includes('grocery')) {
          suggestedCategory = 'Food & Dining'
          confidence = 0.8
        } else if (description.includes('gas') || description.includes('fuel') || description.includes('uber')) {
          suggestedCategory = 'Transportation'
          confidence = 0.7
        } else if (description.includes('amazon') || description.includes('walmart') || description.includes('target')) {
          suggestedCategory = 'Shopping'
          confidence = 0.6
        }

        return {
          ...transaction,
          suggestedCategory,
          confidence: duplicateInfo.confidence,
          isDuplicate: duplicateInfo.isDuplicate,
          existingId: duplicateInfo.existingId
        }
      })

      console.log('Final transactions with suggestions:', transactionsWithSuggestions)
      setParsedTransactions(transactionsWithSuggestions)
      toast.success(`Parsed ${transactionsWithSuggestions.length} transactions`)
    } catch (error) {
      console.error('CSV parsing error details:', error)
      toast.error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [user])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  })

  const handleImport = async () => {
    if (!user || parsedTransactions.length === 0) {
      console.log('Import cancelled: no user or no transactions')
      return
    }

    console.log('Starting import process...')
    console.log('User:', user.uid)
    console.log('Transactions to import:', parsedTransactions.length)
    
    setIsUploading(true)
    
    try {
      let importedCount = 0

      console.log('Starting import process for user:', user.uid)

      // Test Firebase connection by trying to access existing data
      try {
        console.log('Testing Firebase connection...')
        // Try to get existing transactions to test connection
        const existingTransactions = await transactionService.getTransactions(user.uid, 1)
        console.log('Firebase connection test successful, found', existingTransactions.length, 'existing transactions')
      } catch (error) {
        console.error('Firebase connection test failed:', error)
        // Don't throw error here, just log it and continue
        console.log('Continuing with import despite connection test failure...')
      }

      // Get or create default categories and accounts
      let categories: unknown[] = []
      let accounts: unknown[] = []
      
      try {
        console.log('Fetching existing categories...')
        categories = await categoryService.getCategories(user.uid)
        console.log('Found categories:', categories.length)
      } catch (error) {
        console.error('Error fetching categories:', error)
        categories = []
      }

      try {
        console.log('Fetching existing accounts...')
        accounts = await accountService.getAccounts(user.uid)
        console.log('Found accounts:', accounts.length)
      } catch (error) {
        console.error('Error fetching accounts:', error)
        accounts = []
      }

      // Create default categories if none exist
      if (categories.length === 0) {
        console.log('Creating default categories...')
        const defaultCategories = [
          { name: 'Food & Dining', type: 'SPEND' as const, color: '#FF6B6B' },
          { name: 'Transportation', type: 'SPEND' as const, color: '#4ECDC4' },
          { name: 'Shopping', type: 'SPEND' as const, color: '#45B7D1' },
          { name: 'Entertainment', type: 'SPEND' as const, color: '#96CEB4' },
          { name: 'Utilities', type: 'SPEND' as const, color: '#FFEAA7' },
          { name: 'Income', type: 'SAVE' as const, color: '#DDA0DD' },
          { name: 'Uncategorized', type: 'SPEND' as const, color: '#F8F9FA' }
        ]

        for (const category of defaultCategories) {
          try {
            await categoryService.addCategory({
              userId: user.uid,
              ...category,
              isDefault: true
            })
            console.log('Created category:', category.name)
          } catch (error) {
            console.error('Error creating category:', category.name, error)
          }
        }
        
        try {
          categories = await categoryService.getCategories(user.uid)
          console.log('Created default categories:', categories.length)
        } catch (error) {
          console.error('Error fetching categories after creation:', error)
        }
      }

      // Create default account if none exist
      if (accounts.length === 0) {
        console.log('Creating default account...')
        try {
          await accountService.addAccount({
            userId: user.uid,
            name: 'Default Account',
            type: 'CHECKING',
            isActive: true
          })
          console.log('Created default account')
        } catch (error) {
          console.error('Error creating default account:', error)
        }
        
        try {
          accounts = await accountService.getAccounts(user.uid)
          console.log('Created default account:', accounts.length)
        } catch (error) {
          console.error('Error fetching accounts after creation:', error)
        }
      }

      // Ensure we have at least one account
      if (accounts.length === 0) {
        console.log('No accounts found, creating a default account...')
        try {
          const accountId = await accountService.addAccount({
            userId: user.uid,
            name: 'Default Account',
            type: 'CHECKING',
            isActive: true
          })
          console.log('Created default account with ID:', accountId)
          
          // Create a mock account object for the import
          accounts = [{
            id: accountId,
            name: 'Default Account',
            type: 'CHECKING',
            isActive: true
          }]
        } catch (error) {
          console.error('Failed to create default account:', error)
          throw new Error('Could not create default account for import. Please try again.')
        }
      }

      console.log('Accounts available for import:', accounts)

      // If force import is enabled, delete existing transactions first
      if (updateExisting) {
        console.log('Force import enabled - deleting existing transactions...')
        try {
          const existingTransactions = await transactionService.getTransactions(user.uid, 1000)
          console.log(`Found ${existingTransactions.length} existing transactions to delete`)
          
          for (const existingTransaction of existingTransactions) {
            if (existingTransaction.id) {
              try {
                await transactionService.deleteTransaction(existingTransaction.id)
                console.log(`Deleted existing transaction: ${existingTransaction.description}`)
              } catch (error) {
                console.warn(`Failed to delete transaction ${existingTransaction.id}:`, error)
              }
            }
          }
          console.log('Finished deleting existing transactions')
        } catch (error) {
          console.error('Error deleting existing transactions:', error)
          // Continue with import anyway
        }
      }
      
      console.log('Starting to import', parsedTransactions.length, 'transactions...')
      
      for (let i = 0; i < parsedTransactions.length; i++) {
        const transaction = parsedTransactions[i]
        
        if (!transaction) {
          console.warn(`Transaction ${i + 1} is undefined, skipping`)
          continue
        }
        
        if (transaction.isDuplicate && !updateExisting) {
          console.log(`Skipping duplicate transaction ${i + 1}:`, transaction.description)
          continue
        }

        if (transaction.isDuplicate && updateExisting) {
          console.log(`Force importing duplicate transaction ${i + 1}:`, transaction.description)
          // Clear the duplicate flag to allow import
          transaction.isDuplicate = false
          
          // If we have an existing ID, we could update instead of create new
          // For now, we'll create new transactions but with better amount parsing
          console.log(`Creating new transaction to replace existing:`, transaction.description)
        }

        console.log(`Processing transaction ${i + 1}/${parsedTransactions.length}:`, transaction.description)

        // Find account ID
        const account = accounts.find((a: any) => a.name === transaction.account)
        const accountId = account?.id || (accounts[0] as any)?.id
        console.log('Using account ID:', accountId, 'for account:', transaction.account)

        if (!accountId) {
          console.error('No account found for transaction:', transaction)
          continue
        }

        // Find category ID
        let categoryId: string | undefined
        if (transaction.suggestedCategory) {
          const category = categories.find((c: any) => c.name === transaction.suggestedCategory)
          categoryId = category?.id
          console.log('Using category ID:', categoryId, 'for category:', transaction.suggestedCategory)
        }

        const transactionData = {
          userId: user.uid,
          accountId,
          date: transaction.date,
          description: transaction.description,
          merchant: transaction.merchant,
          amount: transaction.amount,
          currency: transaction.currency,
          categoryId,
          tags: transaction.tags?.join(',') || '',
          isTransfer: false,
          ...(transaction.externalId && { notes: `External ID: ${transaction.externalId}` })
        }

        console.log(`Adding transaction ${i + 1} to Firebase:`, transactionData)
        
        try {
          await transactionService.addTransaction(transactionData)
          console.log(`Successfully added transaction ${i + 1}:`, transaction.description)
          importedCount++
          
          // Show progress every 10 transactions
          if (importedCount % 10 === 0) {
            console.log(`Import progress: ${importedCount}/${parsedTransactions.length} transactions imported`)
          }
        } catch (error) {
          console.error(`Error adding transaction ${i + 1}:`, transaction.description, error)
          // Continue with other transactions
        }
      }

      console.log(`Import completed. Successfully imported ${importedCount} out of ${parsedTransactions.length} transactions`)
      toast.success(`Successfully imported ${importedCount} transactions`)
      setParsedTransactions([])
      
      // Emit event to refresh all components
      console.log('Emitting TRANSACTIONS_UPDATED event to refresh components...')
      eventEmitter.emit(EVENTS.TRANSACTIONS_UPDATED)
      console.log('Event emitted successfully')
    } catch (error) {
      console.error('Import error details:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      toast.error(`Failed to import transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supported format: date, description, merchant, amount, currency, account, category, tags, externalId
        </p>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Processing CSV file...</p>
        </div>
      )}

      {/* Preview Table */}
      {parsedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview ({parsedTransactions.length} transactions)</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="updateExisting"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="updateExisting" className="text-sm text-gray-600">
                    Force import duplicates (update existing)
                  </label>
                </div>
                <Button onClick={handleImport} disabled={isUploading}>
                  {isUploading ? 'Importing...' : 'Import All'}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Review the parsed transactions before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(transaction.date, 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      <TableCell>{transaction.merchant || '-'}</TableCell>
                      <TableCell className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{transaction.account}</TableCell>
                      <TableCell>
                        {transaction.suggestedCategory ? (
                          <Badge variant="secondary">{transaction.suggestedCategory}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.isDuplicate ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Duplicate
                          </Badge>
                        ) : (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            New
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
