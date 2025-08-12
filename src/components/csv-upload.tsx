'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
}

export function CSVUpload() {
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const text = await file.text()
      const response = await fetch('/api/transactions/parse-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: text }),
      })

      if (!response.ok) {
        throw new Error('Failed to parse CSV')
      }

      const data = await response.json()
      setParsedTransactions(data.transactions)
      toast.success(`Parsed ${data.transactions.length} transactions`)
    } catch (error) {
      toast.error('Failed to parse CSV file')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  })

  const handleImport = async () => {
    if (parsedTransactions.length === 0) return

    setIsUploading(true)
    try {
      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: parsedTransactions }),
      })

      if (!response.ok) {
        throw new Error('Failed to import transactions')
      }

      const data = await response.json()
      toast.success(`Successfully imported ${data.imported} transactions`)
      setParsedTransactions([])
    } catch (error) {
      toast.error('Failed to import transactions')
      console.error(error)
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
              <Button onClick={handleImport} disabled={isUploading}>
                {isUploading ? 'Importing...' : 'Import All'}
              </Button>
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
