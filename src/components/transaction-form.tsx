'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { transactionSchema } from '@/lib/validations'

type TransactionFormData = {
  date: Date
  description: string
  merchant?: string
  amount: number
  currency: string
  accountId: string
  categoryId?: string
  isTransfer: boolean
  tags: string[]
  notes?: string
}

interface Account {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  type: 'SPEND' | 'SAVE'
}

export function TransactionForm() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      currency: 'USD',
      isTransfer: false,
      tags: [],
    },
  })

  useEffect(() => {
    fetchAccountsAndCategories()
  }, [])

  const fetchAccountsAndCategories = async () => {
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData.accounts)
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData.categories)
      }
    } catch (error) {
      console.error('Failed to fetch accounts and categories:', error)
    }
  }

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('Transaction added successfully')
        reset()
      } else {
        throw new Error('Failed to add transaction')
      }
    } catch (error) {
      toast.error('Failed to add transaction')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className={errors.date ? 'border-red-500' : ''}
          />
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date.message}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('amount', { valueAsNumber: true })}
            className={errors.amount ? 'border-red-500' : ''}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="Transaction description"
            {...register('description')}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Merchant */}
        <div className="space-y-2">
          <Label htmlFor="merchant">Merchant (Optional)</Label>
          <Input
            id="merchant"
            placeholder="Merchant name"
            {...register('merchant')}
          />
        </div>

        {/* Account */}
        <div className="space-y-2">
          <Label htmlFor="accountId">Account</Label>
          <Select onValueChange={(value) => register('accountId').onChange({ target: { value } })}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="text-sm text-red-500">{errors.accountId.message}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category (Optional)</Label>
          <Select onValueChange={(value) => register('categoryId').onChange({ target: { value } })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transfer Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isTransfer"
          {...register('isTransfer')}
        />
        <Label htmlFor="isTransfer">This is a transfer between accounts</Label>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Adding Transaction...' : 'Add Transaction'}
      </Button>
    </form>
  )
}
