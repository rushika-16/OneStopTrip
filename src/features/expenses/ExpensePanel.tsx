import { useMemo, useState } from 'react'
import {
  type Expense,
  type ExpenseCategory,
  type ExpenseSummary,
  type Participant,
  type SplitMode,
} from '../../types/travel'

interface ExpensePanelProps {
  budget: number
  participants: Participant[]
  expenses: Expense[]
  summary: ExpenseSummary
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void
}

function participantName(id: string, participants: Participant[]): string {
  return participants.find((participant) => participant.id === id)?.name ?? id
}

export function ExpensePanel({
  budget,
  participants,
  expenses,
  summary,
  onAddExpense,
}: ExpensePanelProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [paidBy, setPaidBy] = useState(participants[0]?.id ?? '')
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [excludedSplitMembers, setExcludedSplitMembers] = useState<string[]>([])
  const [shares, setShares] = useState<Record<string, number>>({})

  const splitWith = useMemo(() => {
    const participantIds = participants.map((participant) => participant.id)
    return participantIds.filter((id) => !excludedSplitMembers.includes(id))
  }, [participants, excludedSplitMembers])

  const normalizedShares = useMemo(
    () =>
      splitWith.reduce<Record<string, number>>((acc, participantId) => {
        acc[participantId] = shares[participantId] ?? 0
        return acc
      }, {}),
    [splitWith, shares],
  )

  const remainingBudget = budget - summary.totalSpent

  const canSubmit =
    title.trim().length > 1 &&
    amount > 0 &&
    paidBy.length > 0 &&
    splitWith.length > 0

  const toggleSplitParticipant = (participantId: string) => {
    setExcludedSplitMembers((previous) =>
      previous.includes(participantId)
        ? previous.filter((id) => id !== participantId)
        : [...previous, participantId],
    )
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }

    onAddExpense({
      title: title.trim(),
      category,
      amount,
      paidBy,
      splitMode,
      splitWith,
      shares: splitMode === 'equal' ? undefined : normalizedShares,
    })

    setTitle('')
    setAmount(0)
    setCategory('food')
    setSplitMode('equal')
    setExcludedSplitMembers([])
    setShares({})
  }

  return (
    <section className="panel">
      <div className="card">
        <h3>Add Expense</h3>
          <div className="form-grid">
            <label>
              What?
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Amount
              <input
                type="number"
                min={0}
                value={amount || ''}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </label>
            <label>
              Category
              <select
                value={category || 'food'}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
              >
                <option value="food">Food</option>
                <option value="accommodation">Accommodation</option>
                <option value="transport">Transport</option>
                <option value="activities">Activities</option>
                <option value="shopping">Shopping</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Paid By
              <select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Split Mode
              <select
                value={splitMode || 'equal'}
                onChange={(event) => setSplitMode(event.target.value as SplitMode)}
              >
                <option value="equal">Equal</option>
                <option value="unequal">Unequal</option>
                <option value="percentage">Percentage</option>
              </select>
            </label>
          </div>

          <div className="split-with-section">
            <p className="split-with-title">Split with</p>
            <div className="split-with-grid">
              {participants.map((participant) => (
                <label key={participant.id} className="split-with-item">
                  <input
                    type="checkbox"
                    checked={splitWith.includes(participant.id)}
                    onChange={() => toggleSplitParticipant(participant.id)}
                  />
                  <span>{participant.name}</span>
                </label>
              ))}
            </div>
            {splitWith.length === 0 ? (
              <p className="alert">Select at least one member to split this expense.</p>
            ) : null}
          </div>

          {splitMode !== 'equal' ? (
            <div className="split-grid">
              {participants
                .filter((participant) => splitWith.includes(participant.id))
                .map((participant) => (
                  <label key={participant.id}>
                    {participant.name} {splitMode === 'percentage' ? '(%)' : '(weight)'}
                    <input
                      type="number"
                      min={0}
                      value={normalizedShares[participant.id] || ''}
                      onChange={(event) =>
                        setShares((prev) => ({
                          ...prev,
                          [participant.id]: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                ))}
            </div>
          ) : null}
          <button className="cta" disabled={!canSubmit} onClick={handleSubmit}>
            Add Expense
          </button>
      </div>

      <div className="card">
        <h3>Who Owes Whom</h3>
        {summary.settlements.length > 0 ? (
          <div className="settlement-list">
            {summary.settlements.map((item) => (
              <div className="settlement-item" key={`${item.from}-${item.to}`}>
                <div>
                  <strong>{participantName(item.from, participants)}</strong>
                  <span className="arrow"> → </span>
                  <strong>{participantName(item.to, participants)}</strong>
                </div>
                <span className="settlement-amount">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="settled-msg">Everyone is settled up! 🎉</p>
        )}
      </div>

      <div className="card">
        <h3>Balances</h3>
        <div className="balance-list">
          {Object.entries(summary.netBalances).map(([id, balance]) => (
            <div key={id} className="balance-item">
              <span>{participantName(id, participants)}</span>
              <span className={balance >= 0 ? 'gets' : 'owes'}>
                {balance >= 0 ? '+ ' : '- '}${Math.abs(balance).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Budget Status</h3>
        <div className="budget-summary">
          <div className="budget-row">
            <span>Total Budget</span>
            <strong>${budget.toFixed(0)}</strong>
          </div>
          <div className="budget-row">
            <span>Spent</span>
            <strong>${summary.totalSpent.toFixed(2)}</strong>
          </div>
          <div className="budget-row">
            <span>Remaining</span>
            <strong>${remainingBudget.toFixed(2)}</strong>
          </div>
        </div>
        <div className="progress-wrap">
          <span
            className="progress-bar"
            style={{ width: `${Math.min(summary.budgetUsedPercent, 100)}%` }}
          />
        </div>
        <p className="progress-label">{summary.budgetUsedPercent.toFixed(0)}% used</p>
        {summary.alert ? <p className="alert">{summary.alert}</p> : null}
      </div>

      <div className="card">
        <h3>By Category</h3>
          <div className="category-list">
            {Object.entries(summary.categoryTotals).map(([key, value]) => (
              value > 0 && (
                <div key={key} className="category-row">
                  <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <strong>${value.toFixed(2)}</strong>
                </div>
              )
            ))}
          </div>
      </div>

      {expenses.length > 0 ? (
        <div className="card">
          <h3>Recent Expenses</h3>
          <div className="expense-list">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="expense-item">
                <div>
                  <strong>{expense.title}</strong>
                  <p className="expense-meta">by {participantName(expense.paidBy, participants)}</p>
                </div>
                <strong>${expense.amount.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
