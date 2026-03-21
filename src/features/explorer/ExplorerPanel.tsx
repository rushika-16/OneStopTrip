import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatMoney } from '../../services/currency'
import { filterPlaces, searchLivePlaces } from '../../services/explorerEngine'
import {
  type CurrencyCode,
  type ExplorerPlace,
  type ExplorerType,
} from '../../types/travel'

interface ExplorerPanelProps {
  location: string
  currency: CurrencyCode
  places: ExplorerPlace[]
  bookmarks: string[]
  onToggleBookmark: (placeId: string) => void
  onLocationChange: (location: string) => void
}

export function ExplorerPanel({
  location,
  currency,
  places,
  bookmarks,
  onToggleBookmark,
  onLocationChange,
}: ExplorerPanelProps) {
  const [searchLocation, setSearchLocation] = useState(location)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<ExplorerType | 'all'>('all')
  const [cuisine, setCuisine] = useState('')
  const [budgetBand, setBudgetBand] = useState<'all' | 'low' | 'mid' | 'high'>('all')
  const [liveResults, setLiveResults] = useState<ExplorerPlace[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    setSearchLocation(location)
  }, [location])

  const handleLocationInput = (val: string) => {
    setSearchLocation(val)
    onLocationChange(val)
    setLiveResults(null)
    setSearchError(null)
  }

  const triggerSearch = useCallback(async () => {
    const target = searchLocation.trim()
    if (!target) return
    setIsSearching(true)
    setSearchError(null)
    try {
      const { places: fetched, cityLabel } = await searchLivePlaces(target)
      if (fetched.length === 0) {
        setSearchError(`No places found for "${cityLabel || target}". Try a different location.`)
        setLiveResults([])
      } else {
        setLiveResults(fetched)
        onLocationChange(target)
      }
    } catch {
      setSearchError('Could not fetch places right now. Check your connection and try again.')
      setLiveResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [searchLocation, onLocationChange])

  const activePlaces = liveResults ?? places

  const normalizedLocation = searchLocation.trim()

  const buildMapUrl = (placeName: string) => {
    const terms = [placeName, normalizedLocation].filter(Boolean).join(' ')
    return `https://maps.google.com/?q=${encodeURIComponent(terms)}`
  }

  const filtered = useMemo(
    () =>
      filterPlaces(activePlaces, {
        query,
        type,
        cuisine,
        budgetBand,
        minimumRating: 3,
        maxDistanceKm: 15,
      }),
    [activePlaces, query, type, cuisine, budgetBand],
  )

  return (
    <section className="panel">
      <div className="card">
        <h3>Search in {searchLocation || 'your destination'}</h3>
        <div className="form-grid">
          <label>
            Location
            <input
              value={searchLocation}
              onChange={(event) => handleLocationInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') triggerSearch() }}
              placeholder="City, region, or neighborhood"
            />
          </label>

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

        <div style={{ marginTop: '1rem' }}>
          <button
            className="cta"
            onClick={triggerSearch}
            disabled={isSearching || !searchLocation.trim()}
            style={{ minWidth: '140px' }}
          >
            {isSearching ? 'Searching…' : 'Search Places'}
          </button>

          {liveResults !== null ? (
            <button
              onClick={() => {
                setLiveResults(null)
                setSearchError(null)
              }}
              style={{
                marginLeft: '0.6rem',
                border: '1px solid #b8d0d9',
                borderRadius: '0.75rem',
                background: '#fff',
                color: '#2f5863',
                padding: '0.64rem 0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Use Planned Places
            </button>
          ) : null}
        </div>

        {searchError && (
          <p style={{ marginTop: '0.75rem', color: '#c0392b', fontSize: '0.9rem' }}>
            {searchError}
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <h3 style={{ margin: 0 }}>
            {isSearching
              ? 'Fetching live places…'
              : `Found ${filtered.length} place${filtered.length !== 1 ? 's' : ''}`}
          </h3>
          {!isSearching && activePlaces.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#fff', background: liveResults ? '#0f7d87' : '#7f9ba4', borderRadius: '0.5rem', padding: '0.2rem 0.55rem' }}>
              {liveResults ? 'Live search' : 'From your plan'}
            </span>
          )}
        </div>
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
                    {`Rating ${place.rating.toFixed(1)} • ${place.distanceKm.toFixed(1)}km • ~${formatMoney(place.estimatedCost, currency)}`}
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
                      href={buildMapUrl(place.name)}
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
            {liveResults === null
              ? 'Enter a location above and click "Search Places" to discover live spots.'
              : 'No places matched your filters. Try adjusting the filters or search a different location.'}
          </p>
        )}
      </div>
    </section>
  )
}
