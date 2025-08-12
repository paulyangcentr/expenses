import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categorizeTransaction } from './categorization'

// Mock Prisma client
vi.mock('./db', () => ({
  prisma: {
    rule: {
      findMany: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
  },
}))

describe('Categorization Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should categorize Starbucks transactions as Dining', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        matchType: 'MERCHANT',
        pattern: 'starbucks',
        priority: 10,
        isActive: true,
        categoryId: 'dining-category',
        category: { name: 'Dining' },
      },
    ]

    const { prisma } = await import('./db')
    vi.mocked(prisma.rule.findMany).mockResolvedValue(mockRules)

    const result = await categorizeTransaction(
      'user-1',
      'Coffee purchase',
      'Starbucks',
      -4.50,
      'account-1'
    )

    expect(result).toEqual({
      categoryId: 'dining-category',
      confidence: 0.9,
      matchedRule: 'starbucks',
    })
  })

  it('should categorize Netflix transactions as Subscriptions', async () => {
    const mockRules = [
      {
        id: 'rule-2',
        matchType: 'KEYWORD',
        pattern: 'netflix',
        priority: 5,
        isActive: true,
        categoryId: 'subscriptions-category',
        category: { name: 'Subscriptions' },
      },
    ]

    const { prisma } = await import('./db')
    vi.mocked(prisma.rule.findMany).mockResolvedValue(mockRules)

    const result = await categorizeTransaction(
      'user-1',
      'Netflix subscription',
      'Netflix',
      -15.99,
      'account-1'
    )

    expect(result).toEqual({
      categoryId: 'subscriptions-category',
      confidence: 0.9,
      matchedRule: 'netflix',
    })
  })

  it('should return null when no rules match', async () => {
    const { prisma } = await import('./db')
    vi.mocked(prisma.rule.findMany).mockResolvedValue([])

    const result = await categorizeTransaction(
      'user-1',
      'Random transaction',
      'Unknown Merchant',
      100.00,
      'account-1'
    )

    expect(result).toBeNull()
  })

  it('should apply rules in priority order', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        matchType: 'KEYWORD',
        pattern: 'coffee',
        priority: 5,
        isActive: true,
        categoryId: 'dining-category',
        category: { name: 'Dining' },
      },
      {
        id: 'rule-2',
        matchType: 'MERCHANT',
        pattern: 'starbucks',
        priority: 10,
        isActive: true,
        categoryId: 'coffee-category',
        category: { name: 'Coffee' },
      },
    ]

    const { prisma } = await import('./db')
    vi.mocked(prisma.rule.findMany).mockResolvedValue(mockRules)

    const result = await categorizeTransaction(
      'user-1',
      'Coffee purchase',
      'Starbucks',
      -4.50,
      'account-1'
    )

    // Should match the higher priority rule (starbucks merchant)
    expect(result?.categoryId).toBe('coffee-category')
  })
})
