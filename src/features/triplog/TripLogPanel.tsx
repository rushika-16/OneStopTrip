import { type FormEvent, useState } from 'react'
import { formatMoney } from '../../services/currency'
import { type CurrencyCode, type PastTrip } from '../../types/travel'

interface TripLogPanelProps {
  pastTrips: PastTrip[]
  currency: CurrencyCode
  onAddPastTrip: (trip: Omit<PastTrip, 'id'>) => void
}

interface TripLogFormState {
  name: string
  location: string
  startDate: string
  endDate: string
  budget: string
  actualSpend: string
  travelers: string
  highlights: string
  notes: string
}

const INITIAL_FORM: TripLogFormState = {
  name: '',
  location: '',
  startDate: '',
  endDate: '',
  budget: '',
  actualSpend: '',
  travelers: '',
  highlights: '',
  notes: '',
}

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return isoDate
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function TripLogPanel({
  pastTrips,
  currency,
  onAddPastTrip,
}: TripLogPanelProps) {
  const [form, setForm] = useState<TripLogFormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const totalLoggedSpend = pastTrips.reduce(
    (sum, trip) => sum + trip.actualSpend,
    0,
  )

  const parsedTravelers = parseList(form.travelers)
  const parsedHighlights = parseList(form.highlights)
  const isDateRangeInvalid =
    form.startDate.length > 0 &&
    form.endDate.length > 0 &&
    form.endDate < form.startDate

  const canSubmit =
    form.name.trim().length > 0 &&
    form.location.trim().length > 0 &&
    form.startDate.length > 0 &&
    form.endDate.length > 0 &&
    form.budget.length > 0 &&
    form.actualSpend.length > 0 &&
    Number(form.budget) >= 0 &&
    Number(form.actualSpend) >= 0 &&
    parsedTravelers.length > 0 &&
    parsedHighlights.length > 0 &&
    !isDateRangeInvalid

  const updateField = (field: keyof TripLogFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formError) {
      setFormError(null)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isDateRangeInvalid) {
      setFormError('End date must be on or after the start date.')
      return
    }

    if (!parsedTravelers.length || !parsedHighlights.length) {
      setFormError('Add at least one traveler and one highlight.')
      return
    }

    if (!canSubmit) {
      setFormError('Complete all required trip details before saving.')
      return
    }

    onAddPastTrip({
      name: form.name.trim(),
      location: form.location.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      budget: Number(form.budget),
      actualSpend: Number(form.actualSpend),
      travelers: parsedTravelers,
      highlights: parsedHighlights,
      notes: form.notes.trim(),
    })

    setForm(INITIAL_FORM)
    setFormError(null)
  }

  return (
    <section className="panel">
      <div className="card">
        <h3>Log a Completed Trip</h3>
        <p>
          Save the key details from previous trips so you can reuse budgets,
          highlights, and group notes later.
        </p>

        <div className="trip-log-summary">
          <div className="entry">
            <small>Trips Saved</small>
            <strong>{pastTrips.length}</strong>
          </div>
          <div className="entry">
            <small>Total Logged Spend</small>
            <strong>{formatMoney(totalLoggedSpend, currency)}</strong>
          </div>
        </div>

        <form className="trip-log-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Trip Name
              <input
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>

            <label>
              Location
              <input
                required
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
              />
            </label>

            <label>
              Start Date
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
              />
            </label>

            <label>
              End Date
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(event) => updateField('endDate', event.target.value)}
              />
            </label>

            <label>
              Planned Budget
              <input
                required
                min={0}
                type="number"
                value={form.budget}
                onChange={(event) => updateField('budget', event.target.value)}
              />
            </label>

            <label>
              Actual Spend
              <input
                required
                min={0}
                type="number"
                value={form.actualSpend}
                onChange={(event) => updateField('actualSpend', event.target.value)}
              />
            </label>

            <label>
              Travelers
              <input
                required
                placeholder="Rushika, Aarav, Mia"
                value={form.travelers}
                onChange={(event) => updateField('travelers', event.target.value)}
              />
            </label>

            <label>
              Highlights
              <input
                required
                placeholder="Sunrise hike, local food crawl"
                value={form.highlights}
                onChange={(event) => updateField('highlights', event.target.value)}
              />
            </label>

            <label className="trip-log-notes">
              Notes
              <textarea
                rows={4}
                placeholder="What worked well, what you would repeat, or what to avoid next time."
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
              />
            </label>
          </div>

          {isDateRangeInvalid ? (
            <p className="alert">End date must be on or after the start date.</p>
          ) : null}

          {formError ? <p className="alert">{formError}</p> : null}

          <button className="cta" type="submit" disabled={!canSubmit}>
            Save to Trip Log
          </button>
        </form>
      </div>

      {pastTrips.length ? (
        <div className="trip-log-grid">
          {pastTrips.map((trip) => (
            <article key={trip.id} className="card trip-log-card">
              <div className="trip-log-card-head">
                <div>
                  <h3>{trip.name}</h3>
                  <p>{trip.location}</p>
                </div>
                <span className="trip-log-spend">
                  Spent {formatMoney(trip.actualSpend, currency)}
                </span>
              </div>

              <div className="trip-log-meta">
                <div className="entry">
                  <small>Dates</small>
                  <strong>
                    {formatDate(trip.startDate)} to {formatDate(trip.endDate)}
                  </strong>
                </div>
                <div className="entry">
                  <small>Budget vs Spend</small>
                  <strong>
                    {formatMoney(trip.budget, currency)} planned /{' '}
                    {formatMoney(trip.actualSpend, currency)}
                  </strong>
                </div>
              </div>

              <div className="trip-log-travelers">
                <h4>Travelers</h4>
                <p>{trip.travelers.join(', ')}</p>
              </div>

              <div>
                <h4>Highlights</h4>
                <div className="trip-log-highlights">
                  {trip.highlights.map((highlight) => (
                    <span key={highlight} className="trip-log-highlight">
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>

              {trip.notes ? <p className="trip-log-note">{trip.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No Past Trips Yet</h3>
          <p>Your completed trips will show up here once you start logging them.</p>
        </div>
      )}
    </section>
  )
}