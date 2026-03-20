import {
  type BudgetTier,
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
  manali: 'KUU',
  jaipur: 'JAI',
  rishikesh: 'DED',
  bangkok: 'BKK',
  bali: 'DPS',
  istanbul: 'IST',
  miami: 'MIA',
  maui: 'OGG',
  aspen: 'ASE',
  'new york': 'NYCA',
  moab: 'CNY',
  'new orleans': 'MSY',
  barcelona: 'BCN',
  phuket: 'HKT',
  zurich: 'ZRH',
  kyoto: 'KIX',
  california: 'SFO',
}

function resolveAirportCode(place: string): string | null {
  const normalized = place.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  for (const [hint, code] of Object.entries(SKYSCANNER_AIRPORT_HINTS)) {
    if (normalized.includes(hint)) {
      return code
    }
  }

  return null
}

function toGoogleFlightsDate(isoDate: string): string | null {
  // Google Flights date format: YYYY-MM-DD (same as ISO)
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : null
}

function buildFlightUrl(
  from: string,
  to: string,
  outboundDate?: string,
  inboundDate?: string,
): string {
  const fromCode = resolveAirportCode(from) ?? from.trim()
  const toCode = resolveAirportCode(to) ?? to.trim()
  const depDate = outboundDate ? toGoogleFlightsDate(outboundDate) : null
  const retDate = inboundDate ? toGoogleFlightsDate(inboundDate) : null

  let url = `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(fromCode)}+to+${encodeURIComponent(toCode)}`

  if (depDate) {
    url += `+on+${depDate}`
  }
  if (retDate) {
    url += `+returning+${retDate}`
  }

  return url
}

interface PlannerPanelProps {
  input: PlannerInput
  plans: PlannerPlan[]
  selectedTier: BudgetTier | null
  tripStartDate: string
  tripEndDate: string
  onInputChange: (patch: Partial<PlannerInput>) => void
  onGenerate: () => void
  onSelectTier: (tier: BudgetTier) => void
}

const TIERS: BudgetTier[] = ['budget', 'mid-range', 'premium']

export function PlannerPanel({
  input,
  plans,
  selectedTier,
  tripStartDate,
  tripEndDate,
  onInputChange,
  onGenerate,
  onSelectTier,
}: PlannerPanelProps) {
  const activePlan =
    plans.find((plan) => plan.tier === selectedTier) ?? plans[0] ?? null
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
            Budget
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
            Days
            <input
              type="number"
              min={1}
              max={30}
              value={input.travelDays}
              onChange={(event) =>
                onInputChange({ travelDays: Number(event.target.value) })
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
            />
          </label>

          <label>
            Destination (Optional)
            <input
              value={input.targetDestination ?? ''}
              onChange={(event) =>
                onInputChange({ targetDestination: event.target.value })
              }
              placeholder="e.g., Mumbai, Bali, Kyoto"
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
            Type
            <select
              value={input.destinationType}
              onChange={(event) =>
                onInputChange({
                  destinationType: event.target
                    .value as PlannerInput['destinationType'],
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
        </div>

        <button className="cta" onClick={onGenerate}>
          Generate Plans
        </button>
      </div>

      {activePlan ? (
        <>
          <div className="card">
            <h3>Choose Style</h3>
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
              {activePlan.destination.name}, {activePlan.destination.country}
            </h4>

            <div className="plan-summary">
              <div>
                <small>Total</small>
                <strong>${activePlan.breakdown.total.toFixed(0)}</strong>
              </div>
              <div>
                <small>Per Person</small>
                <strong>${activePlan.breakdown.perPerson.toFixed(0)}</strong>
              </div>
            </div>

            <div className="cost-breakdown">
              <p>
                <span>Transport</span>
                <strong>${activePlan.breakdown.transport.toFixed(0)}</strong>
              </p>
              <p>
                <span>Stay</span>
                <strong>${activePlan.breakdown.accommodation.toFixed(0)}</strong>
              </p>
              <p>
                <span>Food</span>
                <strong>${activePlan.breakdown.food.toFixed(0)}</strong>
              </p>
              <p>
                <span>Activities</span>
                <strong>${activePlan.breakdown.activities.toFixed(0)}</strong>
              </p>
            </div>

            <a
              className="external-link-btn"
              href={flightUrl}
              target="_blank"
              rel="noreferrer"
            >
              Check Live Flight Cost on Google Flights
            </a>
          </div>

          <div className="card">
            <h3>Day-by-Day</h3>
            <div className="itinerary-compact">
              {activePlan.itinerary.map((day) => (
                <div key={day.day} className="day-card">
                  <div>
                    <strong>Day {day.day}</strong>
                    <p>{day.title}</p>
                  </div>
                  <span>${day.estimatedDailyCost.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          {activePlan.budgetOptimizerTips.length > 0 ? (
            <div className="card">
              <h3>Budget Tips</h3>
              <ul>
                {activePlan.budgetOptimizerTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {activePlan.notes.length > 0 ? (
            <div className="card">
              <h3>Plan Notes</h3>
              <ul>
                {activePlan.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#7f9fa4' }}>
            Set your trip details and tap "Generate Plans" to see options.
          </p>
        </div>
      )}
    </section>
  )
}
