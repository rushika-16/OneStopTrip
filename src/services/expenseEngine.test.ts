import { describe, it, expect } from 'vitest';
import { summarizeExpenses } from './expenseEngine';
import type { Expense, Participant } from '../types/travel';

describe('expenseEngine: summarizeExpenses', () => {
  const createParticipant = (id: string, name: string): Participant => ({
    id,
    name,
  });

  const createExpense = (
    id: string,
    title: string,
    amount: number,
    category: 'accommodation' | 'food' | 'transport' | 'activities' | 'shopping' | 'other',
    paidBy: string,
    splitMode: 'equal' | 'unequal' | 'percentage' = 'equal',
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
  });

  it('should calculate equal splits correctly', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ];
    const expenses = [createExpense('1', 'Dinner', 300, 'food', 'alice')];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.netBalances['alice']).toBe(200);
    expect(summary.netBalances['bob']).toBe(-100);
    expect(summary.netBalances['charlie']).toBe(-100);
    expect(summary.totalSpent).toBe(300);
  });

  it('should handle splits with specific members only', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ];
    const expenses = [
      createExpense('1', 'Dinner', 300, 'food', 'alice', 'equal', [
        'alice',
        'bob',
      ]),
    ];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.netBalances['alice']).toBe(150);
    expect(summary.netBalances['bob']).toBe(-150);
    expect(summary.netBalances['charlie']).toBe(0);
  });

  it('should calculate unequal splits with weights', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ];
    const expenses = [
      createExpense(
        '1',
        'Hotel',
        600,
        'accommodation',
        'alice',
        'unequal',
        undefined,
        { alice: 2, bob: 1 },
      ),
    ];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.netBalances['alice']).toBe(200);
    expect(summary.netBalances['bob']).toBe(-200);
  });

  it('should calculate percentage splits correctly', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ];
    const expenses = [
      createExpense(
        '1',
        'Transport',
        100,
        'transport',
        'alice',
        'percentage',
        undefined,
        { alice: 50, bob: 30, charlie: 20 },
      ),
    ];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.netBalances['alice']).toBe(50);
    expect(summary.netBalances['bob']).toBe(-30);
    expect(summary.netBalances['charlie']).toBe(-20);
  });

  it('should accumulate multiple expenses correctly', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ];
    const expenses = [
      createExpense('1', 'Dinner', 300, 'food', 'alice'),
      createExpense('2', 'Breakfast', 100, 'food', 'bob'),
    ];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(Math.abs(summary.netBalances['alice'] - 166.67)).toBeLessThan(1);
    expect(Math.abs(summary.netBalances['bob'] + 33.33)).toBeLessThan(1);
    expect(Math.abs(summary.netBalances['charlie'] + 133.33)).toBeLessThan(1);
    expect(summary.totalSpent).toBe(400);
  });

  it('should calculate correct budget status', () => {
    const participants = [createParticipant('alice', 'Alice')];
    const expenses = [
      createExpense('1', 'Hotel', 400, 'accommodation', 'alice'),
      createExpense('2', 'Food', 100, 'food', 'alice'),
    ];

    const summary = summarizeExpenses(expenses, participants, 600);

    expect(summary.totalSpent).toBe(500);
    expect(summary.budgetUsedPercent).toBe(83.33);
  });

  it('should handle zero expenses', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ];
    const expenses: Expense[] = [];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.totalSpent).toBe(0);
    expect(summary.budgetUsedPercent).toBe(0);
  });

  it('should generate settlements', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
      createParticipant('charlie', 'Charlie'),
    ];
    const expenses = [
      createExpense('1', 'Dinner', 300, 'food', 'alice'),
    ];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.settlements.length).toBeGreaterThan(0);
    summary.settlements.forEach((settlement) => {
      expect(settlement).toHaveProperty('from');
      expect(settlement).toHaveProperty('to');
      expect(settlement).toHaveProperty('amount');
    });
  });

  it('should calculate category totals correctly', () => {
    const participants = [createParticipant('alice', 'Alice')];
    const expenses = [
      createExpense('1', 'Hotel', 400, 'accommodation', 'alice'),
      createExpense('2', 'Dinner', 100, 'food', 'alice'),
      createExpense('3', 'Taxi', 50, 'transport', 'alice'),
    ];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.categoryTotals['accommodation']).toBe(400);
    expect(summary.categoryTotals['food']).toBe(100);
    expect(summary.categoryTotals['transport']).toBe(50);
  });

  it('should trigger budget alert when spending exceeds 85%', () => {
    const participants = [createParticipant('alice', 'Alice')];
    const expenses = [createExpense('1', 'Expense', 850, 'other', 'alice')];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.alert).toBeTruthy();
  });

  it('should not trigger alert when spending is under 70%', () => {
    const participants = [createParticipant('alice', 'Alice')];
    const expenses = [createExpense('1', 'Expense', 500, 'other', 'alice')];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.alert).toBeNull();
  });

  it('should handle budget exceeded', () => {
    const participants = [
      createParticipant('alice', 'Alice'),
      createParticipant('bob', 'Bob'),
    ];
    const expenses = [
      createExpense('1', 'Expensive', 1500, 'accommodation', 'alice'),
    ];

    const summary = summarizeExpenses(expenses, participants, 1000);

    expect(summary.totalSpent).toBe(1500);
    expect(summary.budgetUsedPercent).toBe(150);
  });
});
