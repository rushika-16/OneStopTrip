import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterPlaces, searchLivePlaces, type ExplorerFilters } from './explorerEngine'
import type { ExplorerPlace } from '../types/travel'
import * as liveTravelData from './liveTravelData'

vi.mock('./liveTravelData', () => ({
  fetchExplorerPlaces: vi.fn(),
}))

const mockedFetchExplorerPlaces = vi.mocked(liveTravelData.fetchExplorerPlaces)

describe('explorerEngine: filterPlaces', () => {
  const createPlace = (overrides?: Partial<ExplorerPlace>): ExplorerPlace => ({
    id: '1',
    name: 'Coastal Spice Kitchen',
    type: 'food',
    cuisineTags: ['Indian', 'Seafood'],
    budgetBand: 'mid',
    rating: 4.8,
    distanceKm: 2.5,
    estimatedCost: 1500,
    mapUrl: 'https://maps.example.com',
    reviewSnippet: 'Amazing food and great service',
    ...overrides,
  })

  const createFilters = (overrides?: Partial<ExplorerFilters>): ExplorerFilters => ({
    query: '',
    type: 'all',
    cuisine: '',
    budgetBand: 'all',
    minimumRating: 0,
    maxDistanceKm: 100,
    ...overrides,
  })

  it('returns all places when no filters are applied', () => {
    const places = [
      createPlace({ id: '1', name: 'Restaurant A' }),
      createPlace({ id: '2', name: 'Restaurant B' }),
      createPlace({ id: '3', name: 'Museum', type: 'attractions' }),
    ]

    const filtered = filterPlaces(places, createFilters())

    expect(filtered).toHaveLength(3)
  })

  it('filters by query across name, review, type and cuisine tags', () => {
    const places = [
      createPlace({ id: '1', name: 'Coastal Spice Kitchen', reviewSnippet: 'Sea-facing restaurant' }),
      createPlace({ id: '2', name: 'Mountain Breeze Resort', reviewSnippet: 'Amazing hill stay' }),
      createPlace({ id: '3', name: 'Ocean View Cafe', cuisineTags: ['Vegan'], reviewSnippet: 'Quiet vegan cafe', type: 'attractions' }),
    ]

    expect(filterPlaces(places, createFilters({ query: 'coastal' }))).toHaveLength(1)
    expect(filterPlaces(places, createFilters({ query: 'amazing' }))).toHaveLength(1)
    expect(filterPlaces(places, createFilters({ query: 'food' }))).toHaveLength(2)
    expect(filterPlaces(places, createFilters({ query: 'vegan' }))).toHaveLength(1)
  })

  it('is case-insensitive and trims query/cuisine values', () => {
    const places = [
      createPlace({ id: '1', name: 'COASTAL Kitchen', cuisineTags: ['Indian'] }),
      createPlace({ id: '2', name: 'Mountain Resort', cuisineTags: ['Italian'] }),
    ]

    expect(filterPlaces(places, createFilters({ query: '  coastal ' }))).toHaveLength(1)
    expect(filterPlaces(places, createFilters({ cuisine: '  INDIAN ' }))).toHaveLength(1)
  })

  it('applies type, budget, rating and distance filters together', () => {
    const places = [
      createPlace({ id: '1', type: 'food', budgetBand: 'mid', rating: 4.7, distanceKm: 3 }),
      createPlace({ id: '2', type: 'food', budgetBand: 'high', rating: 4.8, distanceKm: 2 }),
      createPlace({ id: '3', type: 'activities', budgetBand: 'mid', rating: 4.6, distanceKm: 1 }),
      createPlace({ id: '4', type: 'food', budgetBand: 'mid', rating: 4.3, distanceKm: 9 }),
    ]

    const filtered = filterPlaces(
      places,
      createFilters({
        type: 'food',
        budgetBand: 'mid',
        minimumRating: 4.5,
        maxDistanceKm: 5,
      }),
    )

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })

  it('sorts by rating desc and then by nearest distance', () => {
    const places = [
      createPlace({ id: '1', rating: 4.7, distanceKm: 4 }),
      createPlace({ id: '2', rating: 4.8, distanceKm: 6 }),
      createPlace({ id: '3', rating: 4.8, distanceKm: 2 }),
    ]

    const filtered = filterPlaces(places, createFilters())

    expect(filtered.map((p) => p.id)).toEqual(['3', '2', '1'])
  })

  it('returns empty array for empty inputs or no matches', () => {
    expect(filterPlaces([], createFilters())).toEqual([])

    const places = [createPlace({ id: '1', cuisineTags: ['Italian'], type: 'food' })]
    const filtered = filterPlaces(
      places,
      createFilters({ query: 'sushi', type: 'activities' }),
    )

    expect(filtered).toEqual([])
  })
})

describe('explorerEngine: searchLivePlaces', () => {
  beforeEach(() => {
    mockedFetchExplorerPlaces.mockReset()
  })

  it('maps live POIs to explorer places and excludes stay category', async () => {
    mockedFetchExplorerPlaces.mockResolvedValue({
      cityLabel: 'Tokyo, Japan',
      places: [
        {
          id: 'a',
          name: 'Tsukiji',
          category: 'food',
          latitude: 0,
          longitude: 0,
          distanceKm: 1.249,
          estimatedCostUsd: 14.4,
          mapUrl: 'https://maps.example.com/a',
          summary: 'Fresh food market',
          tags: ['seafood'],
        },
        {
          id: 'b',
          name: 'City Hotel',
          category: 'stay',
          latitude: 0,
          longitude: 0,
          distanceKm: 0.8,
          estimatedCostUsd: 120,
          mapUrl: 'https://maps.example.com/b',
          summary: 'Hotel',
          tags: ['hotel'],
        },
      ],
    })

    const result = await searchLivePlaces('Tokyo')

    expect(result.cityLabel).toBe('Tokyo, Japan')
    expect(result.places).toHaveLength(1)
    expect(result.places[0].name).toBe('Tsukiji')
    expect(result.places[0].distanceKm).toBe(1.2)
    expect(result.places[0].estimatedCost).toBe(14)
    expect(result.places[0].budgetBand).toBe('low')
  })

  it('deduplicates by id and keeps the latest mapped item', async () => {
    mockedFetchExplorerPlaces.mockResolvedValue({
      cityLabel: 'Paris, France',
      places: [
        {
          id: 'dup',
          name: 'Old Name',
          category: 'food',
          latitude: 0,
          longitude: 0,
          distanceKm: 2,
          estimatedCostUsd: 20,
          mapUrl: 'https://maps.example.com/old',
          summary: 'Old summary',
          tags: ['brasserie'],
        },
        {
          id: 'dup',
          name: 'New Name',
          category: 'food',
          latitude: 0,
          longitude: 0,
          distanceKm: 1,
          estimatedCostUsd: 48,
          mapUrl: 'https://maps.example.com/new',
          summary: 'New summary',
          tags: ['french'],
        },
      ],
    })

    const result = await searchLivePlaces('Paris')

    expect(result.places).toHaveLength(1)
    expect(result.places[0].name).toBe('New Name')
    expect(result.places[0].budgetBand).toBe('high')
  })

  it('clamps rating and classifies budget bands at boundaries', async () => {
    mockedFetchExplorerPlaces.mockResolvedValue({
      cityLabel: 'Seattle, US',
      places: [
        {
          id: 'low-boundary',
          name: 'Low Boundary',
          category: 'food',
          latitude: 0,
          longitude: 0,
          distanceKm: 900,
          estimatedCostUsd: 17.99,
          mapUrl: 'x',
          summary: 'x',
          tags: [],
        },
        {
          id: 'mid-boundary',
          name: 'Mid Boundary',
          category: 'activities',
          latitude: 0,
          longitude: 0,
          distanceKm: 3,
          estimatedCostUsd: 18,
          mapUrl: 'y',
          summary: 'y',
          tags: [],
        },
        {
          id: 'high-boundary',
          name: 'High Boundary',
          category: 'attractions',
          latitude: 0,
          longitude: 0,
          distanceKm: 1,
          estimatedCostUsd: 45,
          mapUrl: 'z',
          summary: 'z',
          tags: [],
        },
      ],
    })

    const result = await searchLivePlaces('Seattle')

    const low = result.places.find((p) => p.id === 'low-boundary')
    const mid = result.places.find((p) => p.id === 'mid-boundary')
    const high = result.places.find((p) => p.id === 'high-boundary')

    expect(low?.budgetBand).toBe('low')
    expect(mid?.budgetBand).toBe('mid')
    expect(high?.budgetBand).toBe('high')
    expect(low?.rating).toBe(3.6)
  })
})
