import {
  type Expense,
  type ExpenseCategory,
  type ExpenseSummary,
  type Participant,
  type Settlement,
} from '../types/travel'

const EPSILON = 0.01

function normalize(value: number): number {
  return Math.round(value * 100) / 100
}

function equalShare(amount: number, participantIds: string[]): Record<string, number> {
  const each = amount / Math.max(1, participantIds.length)
  return participantIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = each
    return acc
  }, {})
}

function unequalShare(
  amount: number,
  participantIds: string[],
  shares?: Record<string, number>,
): Record<string, number> {
  if (!shares) {
    return equalShare(amount, participantIds)
  }

  const enteredTotal = participantIds.reduce((sum, id) => sum + (shares[id] ?? 0), 0)
  if (enteredTotal <= EPSILON) {
    return equalShare(amount, participantIds)
  }

  return participantIds.reduce<Record<string, number>>((acc, id) => {
    const value = shares[id] ?? 0
    acc[id] = (value / enteredTotal) * amount
    return acc
  }, {})
}

function percentageShare(
  amount: number,
  participantIds: string[],
  shares?: Record<string, number>,
): Record<string, number> {
  if (!shares) {
    return equalShare(amount, participantIds)
  }

  const percentTotal = participantIds.reduce((sum, id) => sum + (shares[id] ?? 0), 0)
  const safeDivisor = percentTotal <= EPSILON ? 100 : percentTotal

  return participantIds.reduce<Record<string, number>>((acc, id) => {
    const ratio = (shares[id] ?? 0) / safeDivisor
    acc[id] = amount * ratio
    return acc
  }, {})
}

function resolveShares(
  expense: Expense,
  participantIds: string[],
): Record<string, number> {
  if (expense.splitMode === 'unequal') {
    return unequalShare(expense.amount, participantIds, expense.shares)
  }

  if (expense.splitMode === 'percentage') {
    return percentageShare(expense.amount, participantIds, expense.shares)
  }

  return equalShare(expense.amount, participantIds)
}

function optimizeSettlements(netBalances: Record<string, number>): Settlement[] {
  const debtors = Object.entries(netBalances)
    .filter(([, amount]) => amount < -EPSILON)
    .map(([id, amount]) => ({ id, amount: Math.abs(amount) }))

  const creditors = Object.entries(netBalances)
    .filter(([, amount]) => amount > EPSILON)
    .map(([id, amount]) => ({ id, amount }))

  const settlements: Settlement[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]

    const value = Math.min(debtor.amount, creditor.amount)
    if (value > EPSILON) {
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: normalize(value),
      })
    }

    debtor.amount -= value
    creditor.amount -= value

    if (debtor.amount <= EPSILON) {
      debtorIndex += 1
    }

    if (creditor.amount <= EPSILON) {
      creditorIndex += 1
    }
  }

  return settlements
}

function initCategoryTotals(): Record<ExpenseCategory, number> {
  return {
    transport: 0,
    accommodation: 0,
    food: 0,
    activities: 0,
    shopping: 0,
    other: 0,
  }
}

function budgetAlert(usedPercent: number): string | null {
  if (usedPercent >= 100) {
    return 'Budget exceeded. Triggering strict mode recommendations now.'
  }

  if (usedPercent >= 85) {
    return 'Approaching budget limit. Consider lower-cost alternatives for upcoming spends.'
  }

  if (usedPercent >= 70) {
    return 'Healthy warning: monitor transport and activity expenses closely.'
  }

  return null
}

export function summarizeExpenses(
  expenses: Expense[],
  participants: Participant[],
  totalBudget: number,
): ExpenseSummary {
  const participantIds = participants.map((participant) => participant.id)
  const netBalances = participantIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = 0
    return acc
  }, {})

  const categoryTotals = initCategoryTotals()

  for (const expense of expenses) {
    categoryTotals[expense.category] += expense.amount

    const splitParticipants =
      expense.splitWith?.filter((id) => participantIds.includes(id)) ?? participantIds
    const effectiveSplitParticipants =
      splitParticipants.length > 0 ? splitParticipants : participantIds
    const shares = resolveShares(expense, effectiveSplitParticipants)

    for (const id of effectiveSplitParticipants) {
      netBalances[id] -= shares[id] ?? 0
    }

    netBalances[expense.paidBy] += expense.amount
  }

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const budgetUsedPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  return {
    totalSpent: normalize(totalSpent),
    budgetUsedPercent: normalize(budgetUsedPercent),
    categoryTotals: Object.fromEntries(
      Object.entries(categoryTotals).map(([key, value]) => [key, normalize(value)]),
    ) as Record<ExpenseCategory, number>,
    netBalances: Object.fromEntries(
      Object.entries(netBalances).map(([key, value]) => [key, normalize(value)]),
    ),
    settlements: optimizeSettlements(netBalances),
    alert: budgetAlert(budgetUsedPercent),
  }
}
