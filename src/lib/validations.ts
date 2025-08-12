import { z } from 'zod'

// User schemas
export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

// Account schemas
export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT']),
  balance: z.number().default(0),
  currency: z.string().default('USD'),
  isActive: z.boolean().default(true),
})

export const accountUpdateSchema = accountSchema.partial()

// Category schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['SPEND', 'SAVE']),
  parentId: z.string().optional(),
  isDefault: z.boolean().default(false),
})

export const categoryUpdateSchema = categorySchema.partial()

// Rule schemas
export const ruleSchema = z.object({
  matchType: z.enum(['KEYWORD', 'MERCHANT', 'AMOUNT_RANGE', 'ACCOUNT']),
  pattern: z.string().min(1, 'Pattern is required'),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  categoryId: z.string().min(1, 'Category is required'),
})

export const ruleUpdateSchema = ruleSchema.partial()

// Transaction schemas
export const transactionSchema = z.object({
  date: z.date(),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional(),
  amount: z.number(),
  currency: z.string().default('USD'),
  isTransfer: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
  externalId: z.string().optional(),
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().optional(),
})

export const transactionUpdateSchema = transactionSchema.partial()

// Budget schemas
export const budgetSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/, 'Month key must be in YYYY-MM format'),
  amount: z.number().positive('Budget amount must be positive'),
  categoryId: z.string().min(1, 'Category is required'),
})

export const budgetUpdateSchema = budgetSchema.partial()

// Savings Goal schemas
export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.date().optional(),
})

export const savingsGoalUpdateSchema = savingsGoalSchema.partial()

// CSV Import schemas
export const csvTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  merchant: z.string().optional(),
  amount: z.string(),
  currency: z.string().default('USD'),
  account: z.string(),
  category: z.string().optional(),
  tags: z.string().optional(),
  externalId: z.string().optional(),
})

export const csvImportSchema = z.object({
  transactions: z.array(csvTransactionSchema),
})

// Filter schemas
export const transactionFilterSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  accountId: z.string().optional(),
  merchant: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  isTransfer: z.boolean().optional(),
})

// API Response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
})
