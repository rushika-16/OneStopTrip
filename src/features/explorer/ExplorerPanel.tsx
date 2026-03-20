import { useMemo, useState } from 'react'
import { filterPlaces } from '../../services/explorerEngine'
import { type ExplorerPlace, type ExplorerType } from '../../types/travel'

interface ExplorerPanelProps {
  location: string
  places: ExplorerPlace[]
  bookmarks: string[]
  onToggleBookmark: (placeId: string) => void
}

export function ExplorerPanel({
  location,
  places,
  bookmarks,
  onToggleBookmark,
}: ExplorerPanelProps) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<ExplorerType | 'all'>('all')
  const [cuisine, setCuisine] = useState('')
  const [budgetBand, setBudgetBand] = useState<'all' | 'low' | 'mid' | 'high'>('all')

  const filtered = useMemo(
    () =>
      filterPlaces(places, {
        query,
        type,
        cuisine,
        budgetBand,
        minimumRating: 3,
        maxDistanceKm: 15,
      }),
    [places, query, type, cuisine, budgetBand],
  )

  return (
    <section className="panel">
      <div className="card">
        <h3>Search in {location}</h3>
        <div className="form-grid">
          <label>
            What to find?
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="coffee, museum, hiking..."
            />
          </label>

          <label>
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ExplorerType | 'all')}
            >
              <option value="all">All</option>
              <option value="food">Food</option>
              <option value="activities">Activities</option>
              <option value="attractions">Attractions</option>
            </select>
          </label>

          <label>
            Cuisine / Style
            <input
              value={cuisine}
              onChange={(event) => setCuisine(event.target.value)}
              placeholder="veg, vegan, local..."
            />
          </label>

          <label>
            Budget
            <select
              value={budgetBand}
              onChange={(event) =>
                setBudgetBand(event.target.value as 'all' | 'low' | 'mid' | 'high')
              }
            >
              <option value="all">All</option>
              <option value="low">Low ($)</option>
              <option value="mid">Mid ($$)</option>
              <option value="high">High ($$$)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>
          Found {filtered.length} place{filtered.length !== 1 ? 's' : ''}
        </h3>
        {filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {filtered.map((place) => {
              const isBookmarked = bookmarks.includes(place.id)
              return (
                <article
                  key={place.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '0.8rem',
                    borderLeft: '3px solid #5eb3a6',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <strong>{place.name}</strong>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        backgroundColor: '#e8f5f3',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '0.4rem',
                      }}
                    >
                      {place.type.charAt(0).toUpperCase() + place.type.slice(1)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.75rem' }}>
                    {`Rating ${place.rating.toFixed(1)} • ${place.distanceKm.toFixed(1)}km • ~$${place.estimatedCost}`}
                  </p>
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {place.reviewSnippet}
                  </p>
                  {place.cuisineTags.length > 0 && (
                    <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem' }}>
                      {place.cuisineTags.join(' • ')}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      className="cta"
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        fontSize: '0.9rem',
                        border: isBookmarked ? '2px solid #5eb3a6' : 'none',
                        backgroundColor: isBookmarked ? '#e8f5f3' : undefined,
                        color: isBookmarked ? '#5eb3a6' : undefined,
                      }}
                      onClick={() => onToggleBookmark(place.id)}
                    >
                      {isBookmarked ? 'Saved' : 'Save'}
                    </button>
                    <a
                      href={place.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '0.6rem 1rem',
                        borderRadius: '0.5rem',
                        backgroundColor: '#f0f0f0',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      Maps
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#999', padding: '2rem 0', fontSize: '0.9rem' }}>
            No places matched your filters. Try different search terms.
          </p>
        )}
      </div>
    </section>
  )
}
