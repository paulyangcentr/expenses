import { prisma } from './db'
import { MatchType } from '@prisma/client'

export interface CategorizationResult {
  categoryId: string
  confidence: number
  matchedRule?: string
}

export async function categorizeTransaction(
  userId: string,
  description: string,
  merchant: string | null,
  amount: number,
  accountId: string
): Promise<CategorizationResult | null> {
  // Get user's active rules ordered by priority
  const rules = await prisma.rule.findMany({
    where: { userId, isActive: true },
    include: { category: true },
    orderBy: { priority: 'desc' }
  })

  for (const rule of rules) {
    if (matchesRule(rule, description, merchant, amount, accountId)) {
      return {
        categoryId: rule.categoryId,
        confidence: 0.9,
        matchedRule: rule.pattern
      }
    }
  }

  // Fallback to merchant dictionary
  const merchantCategory = await getMerchantCategory(merchant)
  if (merchantCategory) {
    return {
      categoryId: merchantCategory,
      confidence: 0.7
    }
  }

  // Fallback to keyword matching
  const keywordCategory = await getKeywordCategory(description)
  if (keywordCategory) {
    return {
      categoryId: keywordCategory,
      confidence: 0.5
    }
  }

  return null
}

function matchesRule(
  rule: any,
  description: string,
  merchant: string | null,
  amount: number,
  accountId: string
): boolean {
  switch (rule.matchType) {
    case 'KEYWORD':
      return description.toLowerCase().includes(rule.pattern.toLowerCase())
    
    case 'MERCHANT':
      return merchant?.toLowerCase().includes(rule.pattern.toLowerCase()) ?? false
    
    case 'ACCOUNT':
      return accountId === rule.pattern
    
    case 'AMOUNT_RANGE':
      const [min, max] = rule.pattern.split('-').map(Number)
      return amount >= min && amount <= max
    
    default:
      return false
  }
}

async function getMerchantCategory(merchant: string | null): Promise<string | null> {
  if (!merchant) return null

  const merchantMap: Record<string, string> = {
    'starbucks': 'coffee',
    'mcdonalds': 'fast-food',
    'uber': 'transportation',
    'lyft': 'transportation',
    'amazon': 'shopping',
    'walmart': 'groceries',
    'target': 'shopping',
    'netflix': 'entertainment',
    'spotify': 'entertainment',
    'gym': 'health',
    'doctor': 'health',
    'dentist': 'health',
    'gas': 'transportation',
    'shell': 'transportation',
    'exxon': 'transportation',
    'home depot': 'home-improvement',
    'lowes': 'home-improvement',
    'restaurant': 'dining',
    'pizza': 'dining',
    'coffee': 'dining'
  }

  const lowerMerchant = merchant.toLowerCase()
  for (const [pattern, category] of Object.entries(merchantMap)) {
    if (lowerMerchant.includes(pattern)) {
      // Find the category ID by name
      const categoryRecord = await prisma.category.findFirst({
        where: { name: { equals: category, mode: 'insensitive' } }
      })
      return categoryRecord?.id ?? null
    }
  }

  return null
}

async function getKeywordCategory(description: string): Promise<string | null> {
  const keywordMap: Record<string, string> = {
    'groceries': 'groceries',
    'food': 'groceries',
    'restaurant': 'dining',
    'coffee': 'dining',
    'gas': 'transportation',
    'fuel': 'transportation',
    'uber': 'transportation',
    'lyft': 'transportation',
    'netflix': 'entertainment',
    'spotify': 'entertainment',
    'gym': 'health',
    'doctor': 'health',
    'medical': 'health',
    'insurance': 'insurance',
    'rent': 'housing',
    'mortgage': 'housing',
    'utilities': 'utilities',
    'electric': 'utilities',
    'water': 'utilities',
    'internet': 'utilities',
    'phone': 'utilities',
    'shopping': 'shopping',
    'amazon': 'shopping',
    'clothing': 'shopping',
    'entertainment': 'entertainment',
    'movie': 'entertainment',
    'travel': 'travel',
    'hotel': 'travel',
    'flight': 'travel',
    'education': 'education',
    'school': 'education',
    'tuition': 'education',
    'investment': 'investments',
    'savings': 'savings',
    'transfer': 'transfer'
  }

  const lowerDescription = description.toLowerCase()
  for (const [keyword, category] of Object.entries(keywordMap)) {
    if (lowerDescription.includes(keyword)) {
      const categoryRecord = await prisma.category.findFirst({
        where: { name: { equals: category, mode: 'insensitive' } }
      })
      return categoryRecord?.id ?? null
    }
  }

  return null
}
