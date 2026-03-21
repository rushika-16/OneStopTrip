import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../services/currency'
import { useTravelStore } from '../store/useTravelStore'
import './HomePage.css'

export function HomePage() {
  const navigate = useNavigate()
  const { state } = useTravelStore()

  const planBadge =
    state.plannerStatus === 'loading'
      ? '⏳ Generating…'
      : state.plans.length > 0
        ? `✓ Plan ready · ${state.plans[0]?.destination?.name ?? ''}`
        : null

  const modules = [
    { id: 'plan', label: 'Plan', icon: '✈️', desc: planBadge ?? 'Smart itinerary builder' },
    {
      id: 'track',
      label: 'Track',
      icon: '💰',
      desc: 'Expense & budget splits',
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: '🗺️',
      desc: 'Discover nearby places',
    },
    {
      id: 'coordinate',
      label: 'Coordinate',
      icon: '✓',
      desc: 'Task readiness tracker',
    },
    {
      id: 'log',
      label: 'Trip Log',
      icon: '🧳',
      desc: `${state.pastTrips.length} trips saved`,
    },
  ]

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>One Stop Trip</h1>
        <p>Plan, split, explore, coordinate, and remember every trip</p>
      </header>

      <section className="home-welcome">
        <h2>Welcome back!</h2>
        <p>{state.trip.name}</p>
      </section>

      <section className="home-trip-card">
        <h2 style={{ marginBottom: '0.8rem' }}>Upcoming Trips</h2>
        <div className="trip-preview">
          <h3>{state.trip.name}</h3>
          <div className="trip-meta">
            <div>
              <small>Budget</small>
              <strong>
                {formatMoney(
                  state.trip.budget,
                  state.plannerInput.budgetCurrency,
                )}
              </strong>
            </div>
            <div>
              <small>Dates</small>
              <strong>{state.trip.startDate}</strong>
            </div>
            <div>
              <small>Location</small>
              <strong>{state.trip.baseLocation}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="home-modules">
        <div className="module-grid">
          {modules.map((module) => (
            <button
              key={module.id}
              className={`module-card${module.id === 'plan' && state.plans.length > 0 ? ' module-card--active' : ''}`}
              onClick={() => navigate(`/${module.id}`)}
            >
              <div className="module-icon">{module.icon}</div>
              <h3>{module.label}</h3>
              <p>{module.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
