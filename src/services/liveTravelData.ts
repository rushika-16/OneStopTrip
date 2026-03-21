import { normalizeCurrencyCode } from './currency'
import {
  type CurrencyCode,
  type ExplorerType,
  type PlannerInput,
  type TravelScope,
} from '../types/travel'

interface OpenMeteoResult {
  name: string
  latitude: number
  longitude: number
  country_code: string
  country: string
  timezone?: string
  population?: number
}

interface OpenMeteoResponse {
  results?: OpenMeteoResult[]
}

interface RestCountry {
  name?: { common?: string }
  cca2?: string
  capital?: string[]
  population?: number
  region?: string
  currencies?: Record<string, { name?: string; symbol?: string }>
}

interface OverpassElement {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements?: OverpassElement[]
}

export interface LivePointOfInterest {
  id: string
  name: string
  category: ExplorerType | 'stay'
  latitude: number
  longitude: number
  distanceKm: number
  estimatedCostUsd: number
  mapUrl: string
  summary: string
  tags: string[]
}

interface RawCityCandidate {
  name: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  timezone: string
  population: number
  region: string
  primaryCurrency: CurrencyCode
}

export interface LiveCityCandidate extends RawCityCandidate {
  popularityScore: number
  costIndex: number
  places: LivePointOfInterest[]
}

export interface LiveTravelContext {
  budgetCurrency: CurrencyCode
  budgetInUsd: number
  usdToBudgetRate: number
  home: {
    name: string
    country: string
    countryCode: string
    latitude: number
    longitude: number
  }
  candidates: LiveCityCandidate[]
  sources: string[]
}

const REGION_ALIASES: Record<string, string> = {
  europe: 'europe',
  eu: 'europe',
  asia: 'asia',
  africa: 'africa',
  oceania: 'oceania',
  america: 'americas',
  americas: 'americas',
  'north america': 'americas',
  'south america': 'americas',
  world: 'americas',
}

const FOOD_AMENITIES = new Set(['restaurant', 'cafe', 'fast_food', 'food_court'])
const STAY_TOURISM = new Set(['hotel', 'hostel', 'guest_house', 'apartment'])
const ACTIVITY_LEISURE = new Set(['park', 'sports_centre', 'water_park', 'marina'])
const ATTRACTION_TOURISM = new Set([
  'attraction',
  'museum',
  'gallery',
  'theme_park',
  'viewpoint',
  'zoo',
])

const DEFAULT_FX_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 0.011,
  EUR: 1.08,
  GBP: 1.28,
  JPY: 0.0067,
  AED: 0.272,
  AUD: 0.65,
  CAD: 0.73,
  CHF: 1.1,
  SGD: 0.74,
}

const fxRateCache = new Map<string, number>()
const pppCache = new Map<string, number>()
const countryCache = new Map<string, RestCountry>()

const proxyBaseUrl = (() => {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env ?? {}
  const value = env.VITE_TRAVEL_PROXY_URL

  if (typeof value !== 'string' || value.trim().length === 0) {
    return ''
  }

  return value.trim().replace(/\/+$/, '')
})()

const usingTravelProxy = proxyBaseUrl.length > 0

function buildProxyUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
): string | null {
  if (!usingTravelProxy) {
    return null
  }

  if (!query) {
    return `${proxyBaseUrl}${path}`
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue
    }
    params.set(key, String(value))
  }

  const suffix = params.toString()
  return suffix.length > 0
    ? `${proxyBaseUrl}${path}?${suffix}`
    : `${proxyBaseUrl}${path}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6371 * c
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

function normalizeScope(
  homeCountryCode: string,
  destinationCountryCode: string,
): Exclude<TravelScope, 'either'> {
  return homeCountryCode === destinationCountryCode ? 'domestic' : 'international'
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 14000,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

async function getFxRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
  if (from === to) {
    return 1
  }

  const key = `${from}->${to}`
  const cached = fxRateCache.get(key)
  if (cached) {
    return cached
  }

  try {
    const url =
      buildProxyUrl('/api/fx', { from, to }) ??
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`
    const payload = await fetchJson<{ rates?: Record<string, number> }>(url)
    const rate = payload.rates?.[to]

    if (!rate || !Number.isFinite(rate)) {
      throw new Error('Invalid FX payload')
    }

    fxRateCache.set(key, rate)
    return rate
  } catch {
    const fromToUsd = DEFAULT_FX_TO_USD[from]
    const usdToTarget = 1 / DEFAULT_FX_TO_USD[to]
    return fromToUsd * usdToTarget
  }
}

async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): Promise<number> {
  const rate = await getFxRate(from, to)
  return amount * rate
}

async function geocode(name: string, count = 8): Promise<OpenMeteoResult[]> {
  const query = name.trim()
  if (!query) {
    return []
  }

  const url =
    buildProxyUrl('/api/geocode', {
      name: query,
      count,
    }) ??
    ('https://geocoding-api.open-meteo.com/v1/search?' +
      new URLSearchParams({
        name: query,
        count: String(count),
        language: 'en',
        format: 'json',
      }).toString())

  try {
    const payload = await fetchJson<OpenMeteoResponse>(url)
    return payload.results ?? []
  } catch {
    return []
  }
}

function detectRegion(query: string): string | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return REGION_ALIASES[normalized] ?? null
}

async function fetchCountriesByRegion(region: string): Promise<RestCountry[]> {
  const url =
    buildProxyUrl(`/api/countries/region/${encodeURIComponent(region)}`) ??
    (`https://restcountries.com/v3.1/region/${encodeURIComponent(region)}?` +
      'fields=name,cca2,population,capital,currencies,region')

  try {
    return await fetchJson<RestCountry[]>(url)
  } catch {
    return []
  }
}

async function fetchCountriesByName(name: string): Promise<RestCountry[]> {
  const url =
    buildProxyUrl(`/api/countries/name/${encodeURIComponent(name)}`) ??
    (`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?` +
      'fields=name,cca2,population,capital,currencies,region')

  try {
    return await fetchJson<RestCountry[]>(url)
  } catch {
    return []
  }
}

async function fetchCountryByCode(code: string): Promise<RestCountry | null> {
  const cached = countryCache.get(code)
  if (cached) {
    return cached
  }

  const url =
    buildProxyUrl(`/api/countries/code/${encodeURIComponent(code)}`) ??
    (`https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}?` +
      'fields=name,cca2,population,capital,currencies,region')

  try {
    const payload = await fetchJson<RestCountry>(url)
    if (payload?.cca2) {
      countryCache.set(payload.cca2, payload)
    }
    return payload
  } catch {
    return null
  }
}

function extractPrimaryCurrency(country: RestCountry | null | undefined): CurrencyCode {
  const entries = Object.keys(country?.currencies ?? {})
  return normalizeCurrencyCode(entries[0])
}

function makeCandidateFromGeo(
  place: OpenMeteoResult,
  fallbackRegion: string,
  fallbackCurrency: CurrencyCode,
): RawCityCandidate {
  return {
    name: place.name,
    country: place.country,
    countryCode: place.country_code,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone ?? 'UTC',
    population: place.population ?? 0,
    region: fallbackRegion,
    primaryCurrency: fallbackCurrency,
  }
}

async function resolveRegionCandidates(region: string): Promise<RawCityCandidate[]> {
  const countries = await fetchCountriesByRegion(region)
  if (countries.length === 0) {
    return []
  }

  const topCountries = countries
    .filter((country) => (country.capital?.length ?? 0) > 0)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, 14)

  const geocoded = await Promise.all(
    topCountries.map(async (country) => {
      const capital = country.capital?.[0]
      if (!capital) {
        return null
      }

      const results = await geocode(`${capital}, ${country.name?.common ?? ''}`, 1)
      const first = results[0]
      if (!first) {
        return null
      }

      return {
        ...makeCandidateFromGeo(first, country.region ?? region, extractPrimaryCurrency(country)),
        countryCode: country.cca2 ?? first.country_code,
        country: country.name?.common ?? first.country,
      } satisfies RawCityCandidate
    }),
  )

  return geocoded.filter((item): item is RawCityCandidate => Boolean(item))
}

async function resolveCountryCandidates(query: string): Promise<RawCityCandidate[]> {
  const countries = await fetchCountriesByName(query)
  const exact = countries.find(
    (country) => country.name?.common?.toLowerCase() === query.toLowerCase(),
  )

  const chosen = exact ?? countries[0]
  if (!chosen || !chosen.capital?.[0]) {
    return []
  }

  const capital = chosen.capital[0]
  const capitalGeo = await geocode(`${capital}, ${chosen.name?.common ?? query}`, 1)
  const countryCities = await geocode(chosen.name?.common ?? query, 8)

  const currency = extractPrimaryCurrency(chosen)
  const region = chosen.region ?? ''
  const countryCode = chosen.cca2 ?? ''

  const first = capitalGeo[0]
  const fromCapital = first
    ? [
        {
          ...makeCandidateFromGeo(first, region, currency),
          country: chosen.name?.common ?? first.country,
          countryCode: countryCode || first.country_code,
        } satisfies RawCityCandidate,
      ]
    : []

  const fromCitySearch = countryCities
    .filter((entry) => entry.country_code === countryCode)
    .map((entry) =>
      makeCandidateFromGeo(entry, region, currency),
    )

  return [...fromCapital, ...fromCitySearch]
}

async function resolveGenericCandidates(query: string): Promise<RawCityCandidate[]> {
  const points = await geocode(query, 10)

  return points.map((place) =>
    makeCandidateFromGeo(place, '', 'USD'),
  )
}

async function resolveCandidateCities(
  destinationQuery: string,
  fallbackQuery: string,
): Promise<RawCityCandidate[]> {
  const query = destinationQuery.trim() || fallbackQuery.trim()
  if (!query) {
    return []
  }

  const region = detectRegion(query)

  const regionCandidates = region ? await resolveRegionCandidates(region) : []
  if (regionCandidates.length > 0) {
    return regionCandidates
  }

  const countryCandidates = await resolveCountryCandidates(query)
  if (countryCandidates.length > 0) {
    return countryCandidates
  }

  return resolveGenericCandidates(query)
}

function buildOverpassQuery(latitude: number, longitude: number): string {
  return [
    '[out:json][timeout:25];',
    '(',
    `node["tourism"~"attraction|museum|gallery|theme_park|viewpoint|zoo"](around:11000,${latitude},${longitude});`,
    `way["tourism"~"attraction|museum|gallery|theme_park|viewpoint|zoo"](around:11000,${latitude},${longitude});`,
    `node["historic"](around:10000,${latitude},${longitude});`,
    `way["historic"](around:10000,${latitude},${longitude});`,
    `node["leisure"~"park|sports_centre|water_park|marina"](around:12000,${latitude},${longitude});`,
    `way["leisure"~"park|sports_centre|water_park|marina"](around:12000,${latitude},${longitude});`,
    `node["amenity"~"restaurant|cafe|fast_food|food_court"](around:7000,${latitude},${longitude});`,
    `way["amenity"~"restaurant|cafe|fast_food|food_court"](around:7000,${latitude},${longitude});`,
    `node["tourism"~"hotel|hostel|guest_house|apartment"](around:14000,${latitude},${longitude});`,
    `way["tourism"~"hotel|hostel|guest_house|apartment"](around:14000,${latitude},${longitude});`,
    ');',
    'out center 120;',
  ].join('')
}

function classifyElement(tags: Record<string, string> | undefined): ExplorerType | 'stay' | null {
  if (!tags) {
    return null
  }

  const amenity = tags.amenity?.toLowerCase()
  if (amenity && FOOD_AMENITIES.has(amenity)) {
    return 'food'
  }

  const tourism = tags.tourism?.toLowerCase()
  if (tourism && STAY_TOURISM.has(tourism)) {
    return 'stay'
  }

  if (tourism && ATTRACTION_TOURISM.has(tourism)) {
    return 'attractions'
  }

  const leisure = tags.leisure?.toLowerCase()
  if (leisure && ACTIVITY_LEISURE.has(leisure)) {
    return 'activities'
  }

  if (tags.historic) {
    return 'attractions'
  }

  return null
}

function estimatePoiCostUsd(category: ExplorerType | 'stay', costIndex: number, tags: Record<string, string>): number {
  const base =
    category === 'food'
      ? 14
      : category === 'activities'
        ? 34
        : category === 'stay'
          ? 85
          : 20

  if (tags.fee === 'no') {
    return 0
  }

  if (category === 'stay' && tags.stars) {
    const stars = Number(tags.stars)
    if (Number.isFinite(stars) && stars > 0) {
      return base * costIndex * clamp(stars / 3, 0.8, 1.7)
    }
  }

  return base * costIndex
}

function buildPoiSummary(tags: Record<string, string>, category: ExplorerType | 'stay'): string {
  if (tags['opening_hours']) {
    return `Live OSM listing with opening hours: ${tags['opening_hours']}`
  }

  if (tags.website) {
    return `Official listing available: ${tags.website}`
  }

  if (category === 'food') {
    return 'Popular dining spot found from live OpenStreetMap data.'
  }

  if (category === 'activities') {
    return 'Activity spot suitable for day planning based on live map data.'
  }

  if (category === 'stay') {
    return 'Accommodation candidate discovered via live map listings.'
  }

  return 'Attraction discovered from live OpenStreetMap and geo metadata.'
}

async function fetchWikiGeoFallback(
  city: RawCityCandidate,
  costIndex: number,
): Promise<LivePointOfInterest[]> {
  const url =
    buildProxyUrl('/api/wiki/geosearch', {
      lat: city.latitude,
      lon: city.longitude,
      radius: 10000,
      limit: 15,
    }) ??
    ('https://en.wikipedia.org/w/api.php?' +
      new URLSearchParams({
        action: 'query',
        list: 'geosearch',
        gscoord: `${city.latitude}|${city.longitude}`,
        gsradius: '10000',
        gslimit: '15',
        format: 'json',
        origin: '*',
      }).toString())

  try {
    const payload = await fetchJson<{
      query?: { geosearch?: Array<{ title: string; lat: number; lon: number; dist: number }> }
    }>(url)

    return (payload.query?.geosearch ?? [])
      .filter((item) => item.title && item.title.toLowerCase() !== city.name.toLowerCase())
      .map((item, index) => ({
        id: `${toId(city.name)}-wiki-${index + 1}`,
        name: item.title,
        category: 'attractions' as const,
        latitude: item.lat,
        longitude: item.lon,
        distanceKm: item.dist / 1000,
        estimatedCostUsd: 16 * costIndex,
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`${item.title}, ${city.name}`)}`,
        summary: 'Nearby point from live Wikimedia geosearch.',
        tags: [],
      }))
      .slice(0, 8)
  } catch {
    return []
  }
}

async function fetchOverpassPoints(city: RawCityCandidate, costIndex: number): Promise<LivePointOfInterest[]> {
  const query = buildOverpassQuery(city.latitude, city.longitude)

  try {
    const proxyUrl = buildProxyUrl('/api/overpass')
    const payload = await fetchJson<OverpassResponse>(
      proxyUrl ?? 'https://overpass-api.de/api/interpreter',
      proxyUrl
        ? {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          }
        : {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: new URLSearchParams({ data: query }).toString(),
          },
      26000,
    )

    const byKey = new Map<string, LivePointOfInterest>()

    for (const element of payload.elements ?? []) {
      const tags = element.tags ?? {}
      const category = classifyElement(tags)
      const name = tags['name:en'] ?? tags.name
      const latitude = element.lat ?? element.center?.lat
      const longitude = element.lon ?? element.center?.lon

      if (!category || !name || latitude === undefined || longitude === undefined) {
        continue
      }

      const key = `${category}-${name.toLowerCase()}`
      if (byKey.has(key)) {
        continue
      }

      const distanceKm = haversineKm(city.latitude, city.longitude, latitude, longitude)
      const estimatedCostUsd = estimatePoiCostUsd(category, costIndex, tags)

      const place: LivePointOfInterest = {
        id: `${toId(city.name)}-${toId(name)}-${category}`,
        name,
        category,
        latitude,
        longitude,
        distanceKm,
        estimatedCostUsd,
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`${name}, ${city.name}`)}`,
        summary: buildPoiSummary(tags, category),
        tags: [
          tags.amenity,
          tags.tourism,
          tags.leisure,
          tags.historic,
          tags.cuisine,
        ].filter((value): value is string => Boolean(value)),
      }

      byKey.set(key, place)
    }

    const grouped = Array.from(byKey.values()).sort(
      (a, b) => a.distanceKm - b.distanceKm,
    )

    const attractions = grouped.filter((item) => item.category === 'attractions').slice(0, 14)
    const activities = grouped.filter((item) => item.category === 'activities').slice(0, 12)
    const food = grouped.filter((item) => item.category === 'food').slice(0, 16)
    const stay = grouped.filter((item) => item.category === 'stay').slice(0, 10)

    const combined = [...attractions, ...activities, ...food, ...stay]
    if (combined.length > 0) {
      return combined
    }
  } catch {
    // Network failures are handled by wiki fallback.
  }

  return fetchWikiGeoFallback(city, costIndex)
}

function pageViewDateRange(): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)
  start.setDate(now.getDate() - 14)

  const toWikimediaDate = (value: Date) =>
    `${value.getUTCFullYear()}${String(value.getUTCMonth() + 1).padStart(2, '0')}${String(
      value.getUTCDate(),
    ).padStart(2, '0')}`

  return {
    start: toWikimediaDate(start),
    end: toWikimediaDate(end),
  }
}

async function fetchPopularityScore(cityName: string): Promise<number> {
  const { start, end } = pageViewDateRange()
  const articleTitle = cityName.replace(/\s+/g, '_')
  const url =
    buildProxyUrl('/api/wiki/pageviews', {
      article: articleTitle,
      start,
      end,
    }) ??
    ('https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' +
      `en.wikipedia.org/all-access/user/${encodeURIComponent(articleTitle)}/daily/${start}/${end}`)

  try {
    const payload = await fetchJson<{ items?: Array<{ views: number }> }>(url)
    const views = payload.items?.map((item) => item.views) ?? []
    if (views.length === 0) {
      return 0
    }

    return views.reduce((sum, value) => sum + value, 0) / views.length
  } catch {
    return 0
  }
}

async function fetchCostIndex(countryCode: string, currency: CurrencyCode): Promise<number> {
  const cacheKey = `${countryCode}-${currency}`
  const cached = pppCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  try {
    const url =
      buildProxyUrl('/api/worldbank/ppp', {
        countryCode,
      }) ??
      (`https://api.worldbank.org/v2/country/${encodeURIComponent(countryCode)}` +
        '/indicator/PA.NUS.PPP?format=json&per_page=6')

    const payload = await fetchJson<[unknown, Array<{ value: number | null }>]>(url)
    const latest = (payload[1] ?? []).find((entry) => entry.value !== null)
    const pppValue = latest?.value

    if (!pppValue || !Number.isFinite(pppValue)) {
      throw new Error('PPP unavailable')
    }

    const usdToLocal = await getFxRate('USD', currency)
    const index = clamp(pppValue / Math.max(usdToLocal, 0.0001), 0.55, 2.2)
    pppCache.set(cacheKey, index)
    return index
  } catch {
    const fallback = 1
    pppCache.set(cacheKey, fallback)
    return fallback
  }
}

async function enrichCandidate(candidate: RawCityCandidate): Promise<LiveCityCandidate> {
  const resolvedCountry = await fetchCountryByCode(candidate.countryCode)
  const currency = extractPrimaryCurrency(resolvedCountry) || candidate.primaryCurrency
  const effectiveCurrency = normalizeCurrencyCode(currency)
  const [popularityScore, costIndex] = await Promise.all([
    fetchPopularityScore(candidate.name),
    fetchCostIndex(candidate.countryCode, effectiveCurrency),
  ])

  const places = await fetchOverpassPoints(candidate, costIndex)

  return {
    ...candidate,
    primaryCurrency: effectiveCurrency,
    popularityScore,
    costIndex,
    places,
  }
}

function dedupeCandidates(candidates: RawCityCandidate[]): RawCityCandidate[] {
  const byKey = new Map<string, RawCityCandidate>()

  for (const candidate of candidates) {
    const key = `${candidate.name.toLowerCase()}-${candidate.countryCode}`
    if (!byKey.has(key)) {
      byKey.set(key, candidate)
      continue
    }

    const existing = byKey.get(key)
    if ((candidate.population ?? 0) > (existing?.population ?? 0)) {
      byKey.set(key, candidate)
    }
  }

  return Array.from(byKey.values())
}

function applyScopeFilter(
  candidates: RawCityCandidate[],
  homeCountryCode: string,
  scope: TravelScope,
): RawCityCandidate[] {
  if (scope === 'either') {
    return candidates
  }

  return candidates.filter((candidate) => {
    const cityScope = normalizeScope(homeCountryCode, candidate.countryCode)
    return cityScope === scope
  })
}

async function resolveHomeLocation(query: string): Promise<RawCityCandidate> {
  const points = await geocode(query, 1)
  const first = points[0]

  if (!first) {
    throw new Error('Could not resolve your starting location. Please use a city name.')
  }

  const country = await fetchCountryByCode(first.country_code)

  return {
    ...makeCandidateFromGeo(first, country?.region ?? '', extractPrimaryCurrency(country)),
    countryCode: first.country_code,
    country: country?.name?.common ?? first.country,
  }
}

export async function fetchLiveTravelContext(input: PlannerInput): Promise<LiveTravelContext> {
  const budgetCurrency = normalizeCurrencyCode(input.budgetCurrency)
  const [budgetInUsd, usdToBudgetRate, home] = await Promise.all([
    convertCurrency(input.totalBudget, budgetCurrency, 'USD'),
    getFxRate('USD', budgetCurrency),
    resolveHomeLocation(input.currentLocation),
  ])

  const destinationQuery = input.targetDestination?.trim() ?? ''
  const fallbackQuery = destinationQuery || home.country || home.name

  const rawCandidates = dedupeCandidates(
    await resolveCandidateCities(destinationQuery, fallbackQuery),
  )

  const filteredByScope = applyScopeFilter(rawCandidates, home.countryCode, input.travelScope)
  const byPopulation = [...filteredByScope].sort((a, b) => b.population - a.population)
  const limited = byPopulation.slice(0, 8)

  if (limited.length === 0) {
    throw new Error(
      'No live destinations matched your filters. Try widening scope or changing destination.',
    )
  }

  const enriched = await Promise.all(limited.map((candidate) => enrichCandidate(candidate)))
  const viable = enriched.filter(
    (candidate) => candidate.places.length > 0 || candidate.popularityScore > 0,
  )

  if (viable.length === 0) {
    throw new Error(
      'Live travel sources responded, but no usable destination data was returned right now. Please retry.',
    )
  }

  return {
    budgetCurrency,
    budgetInUsd,
    usdToBudgetRate,
    home: {
      name: home.name,
      country: home.country,
      countryCode: home.countryCode,
      latitude: home.latitude,
      longitude: home.longitude,
    },
    candidates: viable,
    sources: [
      ...(usingTravelProxy ? ['OneStopTrip Proxy'] : []),
      'Open-Meteo Geocoding',
      'RestCountries',
      'Frankfurter FX',
      'Wikimedia Pageviews',
      'OpenStreetMap Overpass',
      'World Bank PPP',
    ],
  }
}

export function estimateCityDailyUsd(city: LiveCityCandidate): {
  stay: number
  food: number
  activities: number
} {
  const stayMedian = median(
    city.places.filter((place) => place.category === 'stay').map((place) => place.estimatedCostUsd),
  )
  const foodMedian = median(
    city.places.filter((place) => place.category === 'food').map((place) => place.estimatedCostUsd),
  )
  const activityMedian = median(
    city.places
      .filter((place) => place.category === 'activities' || place.category === 'attractions')
      .map((place) => place.estimatedCostUsd),
  )

  return {
    stay: stayMedian || 78 * city.costIndex,
    food: (foodMedian || 13 * city.costIndex) * 2.8,
    activities: (activityMedian || 21 * city.costIndex) * 1.1,
  }
}
