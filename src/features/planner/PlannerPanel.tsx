import { useState } from 'react'
import { formatMoney, SUPPORTED_CURRENCIES } from '../../services/currency'
import {
  type BudgetTier,
  type PlannerGenerationStatus,
  type PlannerInput,
  type PlannerPlan,
} from '../../types/travel'

const SKYSCANNER_AIRPORT_HINTS: Record<string, string> = {
  mumbai: 'BOM',
  delhi: 'DEL',
  bengaluru: 'BLR',
  bangalore: 'BLR',
  chennai: 'MAA',
  hyderabad: 'HYD',
  kolkata: 'CCU',
  pune: 'PNQ',
  goa: 'GOI',
  paris: 'PAR',
  rome: 'ROM',
  amsterdam: 'AMS',
  venice: 'VCE',
  zurich: 'ZRH',
  bangkok: 'BKK',
  bali: 'DPS',
  istanbul: 'IST',
  barcelona: 'BCN',
  kyoto: 'KIX',
  singapore: 'SIN',
}

function resolveAirportCode(place: string): string {
  const normalized = place.trim().toLowerCase()
  if (!normalized) {
    return place
  }

  for (const [hint, code] of Object.entries(SKYSCANNER_AIRPORT_HINTS)) {
    if (normalized.includes(hint)) {
      return code
    }
  }

  return place
}

function buildFlightUrl(
  from: string,
  to: string,
  outboundDate?: string,
  inboundDate?: string,
): string {
  const fromCode = resolveAirportCode(from)
  const toCode = resolveAirportCode(to)

  let url = `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(fromCode)}+to+${encodeURIComponent(toCode)}`

  if (outboundDate) {
    url += `+on+${outboundDate}`
  }
  if (inboundDate) {
    url += `+returning+${inboundDate}`
  }

  return url
}

function listToInputValue(items: string[]): string {
  return items.join(', ')
}

function parseListValue(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

interface PlannerPanelProps {
  input: PlannerInput
  plans: PlannerPlan[]
  selectedTier: BudgetTier | null
  status: PlannerGenerationStatus
  errorMessage: string | null
  lastGeneratedAt: string | null
  tripStartDate: string
  tripEndDate: string
  onInputChange: (patch: Partial<PlannerInput>) => void
  onGenerate: () => void | Promise<void>
  onSelectTier: (tier: BudgetTier) => void
  onNavigateTo?: (path: string) => void
}

const TIERS: BudgetTier[] = ['budget', 'mid-range', 'premium']

export function PlannerPanel({
  input,
  plans,
  selectedTier,
  status,
  errorMessage,
  lastGeneratedAt,
  tripStartDate,
  tripEndDate,
  onInputChange,
  onGenerate,
  onSelectTier,
  onNavigateTo,
}: PlannerPanelProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())

  const toggleDay = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) {
        next.delete(day)
      } else {
        next.add(day)
      }
      return next
    })
  }
  const activePlan =
    plans.find((plan) => plan.tier === selectedTier) ?? plans[0] ?? null

  const validationIssues: string[] = []
  if (!input.currentLocation.trim()) {
    validationIssues.push('Add your departure city to generate an itinerary.')
  }
  if (!Number.isFinite(input.totalBudget) || input.totalBudget < 100) {
    validationIssues.push('Budget should be at least 100 in your selected currency.')
  }
  if (!Number.isFinite(input.travelDays) || input.travelDays < 1) {
    validationIssues.push('Trip duration must be at least 1 day.')
  }
  if (!Number.isFinite(input.travelerCount) || input.travelerCount < 1) {
    validationIssues.push('Traveler count must be at least 1.')
  }

  const canGenerate = status !== 'loading' && validationIssues.length === 0

  const flightUrl = activePlan
    ? buildFlightUrl(
        input.currentLocation,
        activePlan.destination.name,
        tripStartDate,
        tripEndDate,
      )
    : ''

  return (
    <section className="panel">
      <div className="card">
        <h3>Trip Details</h3>
        <div className="form-grid">
          <label>
            1. Budget Amount
            <input
              type="number"
              min={100}
              value={input.totalBudget}
              onChange={(event) =>
                onInputChange({ totalBudget: Number(event.target.value) })
              }
            />
          </label>

          <label>
            2. Budget Currency
            <select
              value={input.budgetCurrency}
              onChange={(event) =>
                onInputChange({
                  budgetCurrency: event.target.value as PlannerInput['budgetCurrency'],
                })
              }
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label>
            Duration (Days)
            <input
              type="number"
              min={1}
              max={20}
              value={input.travelDays}
              onChange={(event) =>
                onInputChange({ travelDays: Number(event.target.value) })
              }
            />
          </label>

          <label>
            Travelers
            <input
              type="number"
              min={1}
              max={20}
              value={input.travelerCount}
              onChange={(event) =>
                onInputChange({ travelerCount: Number(event.target.value) })
              }
            />
          </label>

          <label>
            From
            <input
              value={input.currentLocation}
              onChange={(event) =>
                onInputChange({ currentLocation: event.target.value })
              }
              placeholder="Your departure city"
            />
          </label>

          <label>
            Destination / Region
            <input
              value={input.targetDestination ?? ''}
              onChange={(event) =>
                onInputChange({ targetDestination: event.target.value })
              }
              placeholder="e.g., Europe, Japan, Paris"
            />
          </label>

          <label>
            Trip Type
            <select
              value={input.tripType}
              onChange={(event) =>
                onInputChange({
                  tripType: event.target.value as PlannerInput['tripType'],
                })
              }
            >
              <option value="family">Family</option>
              <option value="leisure">Leisure</option>
              <option value="business">Business</option>
              <option value="honeymoon">Honeymoon</option>
              <option value="bachelor">Bachelor</option>
            </select>
          </label>

          <label>
            Destination Style
            <select
              value={input.destinationType}
              onChange={(event) =>
                onInputChange({
                  destinationType: event.target.value as PlannerInput['destinationType'],
                })
              }
            >
              <option value="beach">Beach</option>
              <option value="mountains">Mountains</option>
              <option value="city">City</option>
              <option value="adventure">Adventure</option>
              <option value="cultural">Cultural</option>
            </select>
          </label>

          <label>
            Scope
            <select
              value={input.travelScope}
              onChange={(event) =>
                onInputChange({
                  travelScope: event.target.value as PlannerInput['travelScope'],
                })
              }
            >
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
              <option value="either">Either</option>
            </select>
          </label>

          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={input.hasVisa}
              onChange={(event) =>
                onInputChange({ hasVisa: event.target.checked })
              }
            />
            Visa Ready
          </label>

          <label>
            Food Preferences (comma separated)
            <input
              value={listToInputValue(input.foodPreferences)}
              onChange={(event) =>
                onInputChange({ foodPreferences: parseListValue(event.target.value) })
              }
              placeholder="veg, halal, local"
            />
          </label>

          <label>
            Activity Preferences (comma separated)
            <input
              value={listToInputValue(input.activityPreferences)}
              onChange={(event) =>
                onInputChange({ activityPreferences: parseListValue(event.target.value) })
              }
              placeholder="museums, nightlife, hiking"
            />
          </label>
        </div>

        <button className="cta" onClick={() => void onGenerate()} disabled={!canGenerate}>
          {status === 'loading' ? 'Generating Live Itinerary...' : 'Generate Live Itinerary'}
        </button>

        {validationIssues.length > 0 ? (
          <p className="alert" style={{ marginTop: '0.6rem' }}>
            {validationIssues[0]}
          </p>
        ) : null}

        {lastGeneratedAt ? (
          <p className="progress-label">
            Last updated: {new Date(lastGeneratedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {status === 'loading' ? (
        <div className="card">
          <h3>Fetching live travel data...</h3>
          <p>
            Pulling destinations, attractions, costs, and currency rates from live
            sources. This can take up to 20 seconds depending on network/API load.
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="card">
          <h3>Could not build live itinerary</h3>
          <p className="alert">{errorMessage}</p>
          <p>
            Try changing destination scope, verifying city names, or retrying once.
          </p>
        </div>
      ) : null}

      {activePlan ? (
        <>
          <div className="card">
            <h3>Choose Plan Tier</h3>
            <div className="tier-switch">
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  className={selectedTier === tier ? 'chip chip-active' : 'chip'}
                  onClick={() => onSelectTier(tier)}
                >
                  {tier}
                </button>
              ))}
            </div>

            <h4 style={{ marginTop: '0.8rem' }}>
              Primary city: {activePlan.destination.name}, {activePlan.destination.country}
            </h4>
            <p>{activePlan.summary}</p>
            <p>
              Route: <strong>{activePlan.route.join(' -> ')}</strong>
            </p>

            <div className="plan-summary">
              <div>
                <small>Total</small>
                <strong>
                  {formatMoney(activePlan.breakdown.total, activePlan.breakdown.currency)}
                </strong>
              </div>
              <div>
                <small>Per Person</small>
                <strong>
                  {formatMoney(activePlan.breakdown.perPerson, activePlan.breakdown.currency)}
                </strong>
              </div>
            </div>

            <div className="cost-breakdown">
              <p>
                <span>Transport</span>
                <strong>
                  {formatMoney(activePlan.breakdown.transport, activePlan.breakdown.currency)}
                </strong>
              </p>
              <p>
                <span>Stay</span>
                <strong>
                  {formatMoney(
                    activePlan.breakdown.accommodation,
                    activePlan.breakdown.currency,
                  )}
                </strong>
              </p>
              <p>
                <span>Food</span>
                <strong>
                  {formatMoney(activePlan.breakdown.food, activePlan.breakdown.currency)}
                </strong>
              </p>
              <p>
                <span>Activities</span>
                <strong>
                  {formatMoney(activePlan.breakdown.activities, activePlan.breakdown.currency)}
                </strong>
              </p>
            </div>

            <a
              className="external-link-btn"
              href={flightUrl}
              target="_blank"
              rel="noreferrer"
            >
              Check Flight Pricing on Google Flights
            </a>
          </div>

          <div className="card">
            <h3>Day-by-Day Itinerary</h3>
            <div className="itinerary-compact">
              {activePlan.itinerary.map((day) => {
                const isExpanded = expandedDays.has(day.day)
                const slots = isExpanded ? day.schedule : day.schedule.slice(0, 3)
                return (
                  <div key={day.day} className="day-card">
                    <div>
                      <strong>
                        Day {day.day}: {day.city}
                      </strong>
                      <p>{day.title}</p>
                      <ul>
                        {slots.map((slot) => (
                          <li key={`${day.day}-${slot.time}-${slot.place}`}>
                            <a href={slot.mapUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                              {slot.time} – {slot.activity}
                            </a>
                          </li>
                        ))}
                      </ul>
                      {day.schedule.length > 3 ? (
                        <button
                          onClick={() => toggleDay(day.day)}
                          style={{ marginTop: '0.4rem', background: 'none', border: 'none', color: '#0f7d87', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                        >
                          {isExpanded ? '▲ Show less' : `▼ +${day.schedule.length - 3} more slots`}
                        </button>
                      ) : null}
                    </div>
                    <span>
                      {formatMoney(day.estimatedDailyCost, activePlan.breakdown.currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {activePlan.budgetOptimizerTips.length > 0 ? (
            <div className="card">
              <h3>Budget Guidance</h3>
              <ul>
                {activePlan.budgetOptimizerTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {activePlan.notes.length > 0 ? (
            <div className="card">
              <h3>Planning Notes</h3>
              <ul>
                {activePlan.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {onNavigateTo ? (
            <div className="card" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button
                className="cta"
                style={{ flex: 1, minWidth: '160px', marginTop: 0, background: 'linear-gradient(130deg, #0f7d87, #1a9eab)' }}
                onClick={() => onNavigateTo('/explore')}
              >
                🗺️ Explore Destination
              </button>
              <button
                className="cta"
                style={{ flex: 1, minWidth: '160px', marginTop: 0, background: 'linear-gradient(130deg, #2d7d52, #3a9e6a)' }}
                onClick={() => onNavigateTo('/track')}
              >
                💰 Track Your Budget
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#7f9fa4' }}>
            Enter trip details and generate a live itinerary.
          </p>
        </div>
      )}
    </section>
  )
}
