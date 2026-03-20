import { useNavigate } from 'react-router-dom'
import { TripLogPanel } from '../features/triplog/TripLogPanel'
import { useTravelStore } from '../store/useTravelStore'

export function TripLogPage() {
  const navigate = useNavigate()
  const { state, addPastTrip } = useTravelStore()

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Trip Log</h1>
      </header>
      <main className="page-content">
        <TripLogPanel pastTrips={state.pastTrips} onAddPastTrip={addPastTrip} />
      </main>
    </div>
  )
}