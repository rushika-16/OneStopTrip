import { useNavigate } from 'react-router-dom'
import { ExplorerPanel } from '../features/explorer/ExplorerPanel'
import { useTravelStore } from '../store/useTravelStore'

export function ExplorePage() {
  const navigate = useNavigate()
  const { state, toggleBookmark, setExplorerLocation } = useTravelStore()

  const selectedPlan =
    state.plans.find((plan) => plan.tier === state.selectedTier) ?? state.plans[0] ?? null

  const activeLocation =
    state.explorerLocation ||
    state.plannerInput.targetDestination ||
    state.plannerInput.currentLocation ||
    state.trip.baseLocation ||
    selectedPlan?.destination.name ||
    ''

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Explore Destination</h1>
      </header>
      <main className="page-content">
        <ExplorerPanel
          location={activeLocation}
          places={state.places}
          bookmarks={state.bookmarks}
          onToggleBookmark={toggleBookmark}
          onLocationChange={setExplorerLocation}
        />
      </main>
    </div>
  )
}
