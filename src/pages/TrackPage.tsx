import { useNavigate } from 'react-router-dom'
import { ExpensePanel } from '../features/expenses/ExpensePanel'
import { useTravelStore } from '../store/useTravelStore'

export function TrackPage() {
  const navigate = useNavigate()
  const { state, expenseSummary, addExpense } = useTravelStore()

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Track Expenses</h1>
      </header>
      <main className="page-content">
        <ExpensePanel
          budget={state.trip.budget}
          participants={state.participants}
          expenses={state.expenses}
          summary={expenseSummary}
          onAddExpense={addExpense}
        />
      </main>
    </div>
  )
}
