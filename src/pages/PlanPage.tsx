import { useNavigate } from 'react-router-dom'
import { PlannerPanel } from '../features/planner/PlannerPanel'
import { useTravelStore } from '../store/useTravelStore'

export function PlanPage() {
  const navigate = useNavigate()
  const { state, updatePlannerInput, generatePlans, selectTier } = useTravelStore()


  return (
    <div className="page-wrapper">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Plan Your Trip</h1>
      </header>
      <main className="page-content">
        <PlannerPanel
          input={state.plannerInput}
          plans={state.plans}
          selectedTier={state.selectedTier}
          status={state.plannerStatus}
          errorMessage={state.plannerError}
          lastGeneratedAt={state.lastPlanGeneratedAt}
          tripStartDate={state.trip.startDate}
          tripEndDate={state.trip.endDate}
          onInputChange={updatePlannerInput}
          onGenerate={generatePlans}
          onSelectTier={selectTier}
          onNavigateTo={navigate}
        />
      </main>
    </div>
  )
}
