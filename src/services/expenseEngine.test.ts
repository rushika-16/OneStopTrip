import { describe, expect, it } from 'vitest'
import { summarizeExpenses } from './expenseEngine'
import type { Expense, Participant } from '../types/travel'

const createParticipant = (id: string, name: string): Participant => ({ id, name })

const createExpense = (
  id: string,
  title: string,
  amount: number,
  category: Expense['category'],
  paidBy: string,
  splitMode: Expense['splitMode'] = 'equal',
  splitWith?: string[],
  shares?: Record<string, number>,
): Expense => ({
  id,
  title,
  amount,
  category,
  paidBy,
  splitMode,
  splitWith,
  shares,
  createdAt: new Date().toISOString(),
})

describe('expenseEngine: summarizeExpenses', () => {
  it('calculates equal splits correctly', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ]

    const summary = summarizeExpenses(
      [createExpense('1', 'Dinner', 300, 'food', 'alice')],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(200)
    expect(summary.netBalances.bob).toBe(-100)
    expect(summary.netBalances.charlie).toBe(-100)
    expect(summary.totalSpent).toBe(300)
  })

  it('supports splitWith subsets', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ]

    const summary = summarizeExpenses(
      [
        createExpense('1', 'Dinner', 300, 'food', 'alice', 'equal', [
          'alice',
          'bob',
        ]),
      ],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(150)
    expect(summary.netBalances.bob).toBe(-150)
    expect(summary.netBalances.charlie).toBe(0)
  })

  it('handles unequal weighted splits', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ]

    const summary = summarizeExpenses(
      [
        createExpense('1', 'Hotel', 600, 'accommodation', 'alice', 'unequal', undefined, {
          alice: 2,
          bob: 1,
        }),
      ],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(200)
    expect(summary.netBalances.bob).toBe(-200)
  })

  it('falls back to equal split when unequal weights are zero', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ]

    const summary = summarizeExpenses(
      [
        createExpense('1', 'Cab', 90, 'transport', 'alice', 'unequal', undefined, {
          alice: 0,
          bob: 0,
          charlie: 0,
        }),
      ],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(60)
    expect(summary.netBalances.bob).toBe(-30)
    expect(summary.netBalances.charlie).toBe(-30)
  })

  it('normalizes percentage splits even when total is not 100', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ]

    const summary = summarizeExpenses(
      [
        createExpense('1', 'Tickets', 180, 'activities', 'alice', 'percentage', undefined, {
          alice: 60,
          bob: 20,
          charlie: 20,
        }),
      ],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(72)
    expect(summary.netBalances.bob).toBe(-36)
    expect(summary.netBalances.charlie).toBe(-36)
  })

  it('falls back to equal split when percentage values are all zero', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ]

    const summary = summarizeExpenses(
      [
        createExpense('1', 'Train', 80, 'transport', 'alice', 'percentage', undefined, {
          alice: 0,
          bob: 0,
        }),
      ],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(40)
    expect(summary.netBalances.bob).toBe(-40)
  })

  it('falls back to all participants when splitWith has no valid member', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ]

    const summary = summarizeExpenses(
      [createExpense('1', 'Lunch', 50, 'food', 'alice', 'equal', ['ghost'])],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(25)
    expect(summary.netBalances.bob).toBe(-25)
  })

  it('handles unknown payer ids gracefully', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ]

    const summary = summarizeExpenses(
      [createExpense('1', 'Fuel', 100, 'transport', 'ghost')],
      participants,
      1000,
    )

    expect(summary.netBalances.alice).toBe(50)
    expect(summary.netBalances.bob).toBe(-50)
    expect(summary.settlements).toEqual([
      {
        from: 'bob',
        to: 'alice',
        amount: 50,
      },
    ])
  })

  it('returns stable summary when participant list is empty', () => {
    const summary = summarizeExpenses(
      [createExpense('1', 'Dinner', 120, 'food', 'ghost')],
      [],
      600,
    )

    expect(summary.totalSpent).toBe(120)
    expect(summary.budgetUsedPercent).toBe(20)
    expect(summary.netBalances).toEqual({})
    expect(summary.settlements).toEqual([])
    expect(summary.categoryTotals.food).toBe(120)
  })

  it('aggregates multiple expenses and keeps balances near expected totals', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ]

    const summary = summarizeExpenses(
      [
        createExpense('1', 'Dinner', 300, 'food', 'alice'),
        createExpense('2', 'Breakfast', 100, 'food', 'bob'),
      ],
      participants,
      1000,
    )

    expect(Math.abs(summary.netBalances.alice - 166.67)).toBeLessThan(1)
    expect(Math.abs(summary.netBalances.bob + 33.33)).toBeLessThan(1)
    expect(Math.abs(summary.netBalances.charlie + 133.33)).toBeLessThan(1)
    expect(summary.totalSpent).toBe(400)
  })

  it('computes category totals correctly', () => {
    const participants = [createParticipant('alice', 'Alice')]

    const summary = summarizeExpenses(
      [
        createExpense('1', 'Hotel', 400, 'accommodation', 'alice'),
        createExpense('2', 'Dinner', 100, 'food', 'alice'),
        createExpense('3', 'Taxi', 50, 'transport', 'alice'),
      ],
      participants,
      1000,
    )

    expect(summary.categoryTotals.accommodation).toBe(400)
    expect(summary.categoryTotals.food).toBe(100)
    expect(summary.categoryTotals.transport).toBe(50)
  })

  it('handles zero expenses', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ]

    const summary = summarizeExpenses([], participants, 1000)

    expect(summary.totalSpent).toBe(0)
    expect(summary.budgetUsedPercent).toBe(0)
    expect(summary.settlements).toEqual([])
  })

  it('returns zero budget usage when total budget is zero', () => {
    const participants = [createParticipant('alice', 'Alice')]
    const summary = summarizeExpenses(
      [createExpense('1', 'Ticket', 250, 'activities', 'alice')],
      participants,
      0,
    )

    expect(summary.totalSpent).toBe(250)
    expect(summary.budgetUsedPercent).toBe(0)
  })

  it('triggers warning alerts by threshold', () => {
    const participants = [createParticipant('alice', 'Alice')]

    expect(
      summarizeExpenses(
        [createExpense('1', 'Spend', 700, 'other', 'alice')],
        participants,
        1000,
      ).alert,
    ).toContain('Healthy warning')

    expect(
      summarizeExpenses(
        [createExpense('1', 'Spend', 850, 'other', 'alice')],
        participants,
        1000,
      ).alert,
    ).toContain('Approaching budget')

    expect(
      summarizeExpenses(
        [createExpense('1', 'Spend', 1000, 'other', 'alice')],
        participants,
        1000,
      ).alert,
    ).toContain('Budget exceeded')
  })
})
