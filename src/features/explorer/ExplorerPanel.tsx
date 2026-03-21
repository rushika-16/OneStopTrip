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
        <h3>Search Places</h3>
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

        <div className="explorer-actions">
          <button
            className="cta explorer-search-btn"
            onClick={triggerSearch}
            disabled={isSearching || !searchLocation.trim()}
          >
            {isSearching ? 'Searching…' : 'Search Places'}
          </button>

          {liveResults !== null ? (
            <button
              className="explorer-reset-btn"
              onClick={() => {
                setLiveResults(null)
                setSearchError(null)
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
        <div className="explorer-results-header">
          <h3 className="explorer-results-title">
            {isSearching
              ? 'Fetching live places…'
              : `Found ${filtered.length} place${filtered.length !== 1 ? 's' : ''}`}
          </h3>
          {!isSearching && activePlaces.length > 0 && (
            <span
              className={`explorer-source-badge ${liveResults ? 'explorer-source-badge-live' : 'explorer-source-badge-plan'}`}
            >
              {liveResults ? 'Live search' : 'From your plan'}
            </span>
          )}
        </div>
        {filtered.length > 0 ? (
          <div className="explorer-results-list">
            {filtered.map((place) => {
              const isBookmarked = bookmarks.includes(place.id)
              return (
                <article
                  key={place.id}
                  className="explorer-place-card"
                >
                  <div className="explorer-place-head">
                    <strong>{place.name}</strong>
                    <span className="explorer-type-badge">
                      {place.type.charAt(0).toUpperCase() + place.type.slice(1)}
                    </span>
                  </div>
                  <p className="explorer-place-meta">
                    {`Rating ${place.rating.toFixed(1)} • ${place.distanceKm.toFixed(1)}km • ~${formatMoney(place.estimatedCost, currency)}`}
                  </p>
                  <p className="explorer-place-review">
                    {place.reviewSnippet}
                  </p>
                  {place.cuisineTags.length > 0 && (
                    <p className="explorer-place-cuisines">
                      {place.cuisineTags.join(' • ')}
                    </p>
                  )}
                  <div className="explorer-place-actions">
                    <button
                      className="cta explorer-save-btn"
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
                      className="explorer-map-link"
                    >
                      Maps
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="explorer-empty-state">
            {liveResults === null
              ? 'Enter a location above and click "Search Places" to discover live spots.'
              : 'No places matched your filters. Try adjusting the filters or search a different location.'}
          </p>
        )}
      </div>
    </section>
  )
}
