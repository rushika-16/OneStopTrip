import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateLiveDestinationPlans } from './plannerEngine'
import { type PlannerInput } from '../types/travel'
import * as liveTravelData from './liveTravelData'

vi.mock('./liveTravelData', () => ({
  fetchLiveTravelContext: vi.fn(),
  estimateCityDailyUsd: vi.fn(),
}))

const mockedFetchLiveTravelContext = vi.mocked(liveTravelData.fetchLiveTravelContext)
const mockedEstimateCityDailyUsd = vi.mocked(liveTravelData.estimateCityDailyUsd)

function createInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    totalBudget: 5000,
    budgetCurrency: 'USD',
    travelDays: 6,
    currentLocation: 'Delhi, India',
    travelerCount: 2,
    tripType: 'leisure',
    destinationType: 'city',
    travelScope: 'either',
    hasVisa: true,
    foodPreferences: ['local'],
    activityPreferences: ['museum'],
    travelMonth: 3,
    ...overrides,
  }
}

const mockContext = {
  budgetCurrency: 'USD' as const,
  budgetInUsd: 5000,
  usdToBudgetRate: 1,
  home: {
    name: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.209,
  },
  candidates: [
    {
      name: 'Paris',
      country: 'France',
      countryCode: 'FR',
      latitude: 48.8566,
      longitude: 2.3522,
      timezone: 'Europe/Paris',
      population: 2100000,
      region: 'Europe',
      primaryCurrency: 'EUR' as const,
      popularityScore: 9000,
      costIndex: 1.2,
      places: [
        {
          id: 'paris-attraction-1',
          name: 'Eiffel Tower',
          category: 'attractions' as const,
          latitude: 48.8584,
          longitude: 2.2945,
          distanceKm: 3,
          estimatedCostUsd: 28,
          mapUrl: 'https://maps.google.com/?q=Eiffel+Tower',
          summary: 'Iconic attraction',
          tags: ['museum', 'historic'],
        },
        {
          id: 'paris-food-1',
          name: 'Riverfront Bistro',
          category: 'food' as const,
          latitude: 48.857,
          longitude: 2.35,
          distanceKm: 1,
          estimatedCostUsd: 25,
          mapUrl: 'https://maps.google.com/?q=Riverfront+Bistro',
          summary: 'French dining',
          tags: ['restaurant'],
        },
        {
          id: 'paris-activity-1',
          name: 'Seine Cruise',
          category: 'activities' as const,
          latitude: 48.86,
          longitude: 2.33,
          distanceKm: 2,
          estimatedCostUsd: 35,
          mapUrl: 'https://maps.google.com/?q=Seine+Cruise',
          summary: 'Cruise activity',
          tags: ['romantic'],
        },
        {
          id: 'paris-stay-1',
          name: 'Paris Central Hotel',
          category: 'stay' as const,
          latitude: 48.859,
          longitude: 2.34,
          distanceKm: 2.3,
          estimatedCostUsd: 120,
          mapUrl: 'https://maps.google.com/?q=Paris+Central+Hotel',
          summary: 'Hotel option',
          tags: ['hotel'],
        },
      ],
    },
    {
      name: 'Rome',
      country: 'Italy',
      countryCode: 'IT',
      latitude: 41.9028,
      longitude: 12.4964,
      timezone: 'Europe/Rome',
      population: 2800000,
      region: 'Europe',
      primaryCurrency: 'EUR' as const,
      popularityScore: 7800,
      costIndex: 1.1,
      places: [
        {
          id: 'rome-attraction-1',
          name: 'Colosseum',
          category: 'attractions' as const,
          latitude: 41.8902,
          longitude: 12.4922,
          distanceKm: 2,
          estimatedCostUsd: 26,
          mapUrl: 'https://maps.google.com/?q=Colosseum',
          summary: 'Historic site',
          tags: ['historic', 'culture'],
        },
      ],
    },
    {
      name: 'Amsterdam',
      country: 'Netherlands',
      countryCode: 'NL',
      latitude: 52.3676,
      longitude: 4.9041,
      timezone: 'Europe/Amsterdam',
      population: 900000,
      region: 'Europe',
      primaryCurrency: 'EUR' as const,
      popularityScore: 6900,
      costIndex: 1,
      places: [
        {
          id: 'ams-attraction-1',
          name: 'Canal District',
          category: 'attractions' as const,
          latitude: 52.37,
          longitude: 4.89,
          distanceKm: 1.5,
          estimatedCostUsd: 18,
          mapUrl: 'https://maps.google.com/?q=Canal+District',
          summary: 'Canal walk',
          tags: ['walk', 'romantic'],
        },
      ],
    },
  ],
  sources: ['Open-Meteo', 'Overpass'],
}

const washingtonScenarioContext = {
  budgetCurrency: 'USD' as const,
  budgetInUsd: 5000,
  usdToBudgetRate: 1,
  home: {
    name: 'San Francisco',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
  },
  candidates: [
    {
      name: 'Seattle',
      country: 'United States',
      countryCode: 'US',
      latitude: 47.6062,
      longitude: -122.3321,
      timezone: 'America/Los_Angeles',
      population: 737015,
      region: 'Americas',
      primaryCurrency: 'USD' as const,
      popularityScore: 7800,
      costIndex: 1,
      places: [
        {
          id: 'sea-attraction-1',
          name: 'Pike Place Market',
          category: 'attractions' as const,
          latitude: 47.6097,
          longitude: -122.3425,
          distanceKm: 2.1,
          estimatedCostUsd: 15,
          mapUrl: 'https://maps.google.com/?q=Pike+Place+Market',
          summary: 'Popular market area',
          tags: ['market', 'city'],
        },
        {
          id: 'sea-activity-1',
          name: 'Seattle Waterfront Cruise',
          category: 'activities' as const,
          latitude: 47.607,
          longitude: -122.341,
          distanceKm: 1.8,
          estimatedCostUsd: 40,
          mapUrl: 'https://maps.google.com/?q=Seattle+Waterfront+Cruise',
          summary: 'Scenic waterfront experience',
          tags: ['waterfront', 'scenic'],
        },
        {
          id: 'sea-food-1',
          name: 'Cedars Indian Cuisine',
          category: 'food' as const,
          latitude: 47.615,
          longitude: -122.335,
          distanceKm: 2.3,
          estimatedCostUsd: 24,
          mapUrl: 'https://maps.google.com/?q=Cedars+Indian+Cuisine+Seattle',
          summary: 'Indian dining in Seattle',
          tags: ['indian', 'vegetarian', 'restaurant'],
        },
      ],
    },
  ],
  sources: ['Open-Meteo', 'Overpass'],
}

beforeEach(() => {
  mockedFetchLiveTravelContext.mockResolvedValue(mockContext)
  mockedEstimateCityDailyUsd.mockImplementation((city) => ({
    stay: Math.max(70, city.costIndex * 80),
    food: Math.max(35, city.costIndex * 40),
    activities: Math.max(30, city.costIndex * 36),
  }))
})

describe('plannerEngine: generateLiveDestinationPlans', () => {
  it('returns budget, mid-range, and premium plans', async () => {
    const plans = await generateLiveDestinationPlans(createInput())

    expect(plans.map((plan) => plan.tier)).toEqual(['budget', 'mid-range', 'premium'])
    expect(plans.every((plan) => plan.itinerary.length === 6)).toBe(true)
  })

  it('keeps costs in selected currency and computes totals', async () => {
    const plans = await generateLiveDestinationPlans(
      createInput({ budgetCurrency: 'USD', totalBudget: 3200 }),
    )

    plans.forEach((plan) => {
      expect(plan.breakdown.currency).toBe('USD')
      expect(plan.breakdown.total).toBeGreaterThan(0)
      expect(plan.breakdown.perPerson).toBeGreaterThan(0)
      expect(plan.breakdown.totalInUsd).toBeGreaterThan(0)
      const componentTotal =
        plan.breakdown.transport +
        plan.breakdown.accommodation +
        plan.breakdown.food +
        plan.breakdown.activities
      expect(Math.abs(plan.breakdown.total - componentTotal)).toBeLessThanOrEqual(2)
    })
  })

  it('builds practical route and schedule slots for each day', async () => {
    const plans = await generateLiveDestinationPlans(createInput({ travelDays: 7 }))

    plans.forEach((plan) => {
      expect(plan.route.length).toBeGreaterThan(0)
      expect(plan.itinerary).toHaveLength(7)
      plan.itinerary.forEach((day) => {
        expect(day.city.length).toBeGreaterThan(0)
        expect(day.schedule.length).toBeGreaterThan(0)
        expect(day.schedule[0].time).toMatch(/\d{2}:\d{2}/)
      })
      expect(plan.places.every((place) => place.type !== undefined)).toBe(true)
    })
  })

  it('adapts summary and notes to trip type', async () => {
    const plans = await generateLiveDestinationPlans(createInput({ tripType: 'honeymoon' }))

    plans.forEach((plan) => {
      expect(plan.summary.toLowerCase()).toContain('romantic')
      expect(plan.notes[0].toLowerCase()).toContain('live')
      expect(plan.places.length).toBeGreaterThan(0)
    })
  })

  it('creates a 3-day Washington itinerary and surfaces Seattle Indian food', async () => {
    mockedFetchLiveTravelContext.mockResolvedValueOnce(washingtonScenarioContext)

    const plans = await generateLiveDestinationPlans(
      createInput({
        totalBudget: 5000,
        travelDays: 3,
        currentLocation: 'San Francisco, USA',
        targetDestination: 'Washington State',
        travelerCount: 2,
        tripType: 'leisure',
        destinationType: 'city',
        travelScope: 'domestic',
      }),
    )

    plans.forEach((plan) => {
      expect(plan.itinerary).toHaveLength(3)
      expect(plan.breakdown.total).toBeLessThanOrEqual(5000)
      expect(plan.destination.name).toBe('Seattle')

      const indianFoodPlaces = plan.places.filter(
        (place) =>
          place.type === 'food' &&
          place.cuisineTags.some((tag) => tag.toLowerCase().includes('indian')),
      )

      expect(indianFoodPlaces.length).toBeGreaterThan(0)
      expect(
        plan.itinerary.some((day) =>
          day.schedule.some(
            (slot) =>
              slot.activity.toLowerCase().includes('lunch') &&
              slot.place.toLowerCase().includes('indian'),
          ),
        ),
      ).toBe(true)
    })
  })

  it('returns empty plans when no candidate cities exist', async () => {
    mockedFetchLiveTravelContext.mockResolvedValueOnce({
      ...mockContext,
      candidates: [],
    })

    const plans = await generateLiveDestinationPlans(createInput())
    expect(plans).toEqual([])
  })

  it('propagates live context fetch failures', async () => {
    mockedFetchLiveTravelContext.mockRejectedValueOnce(new Error('Live API down'))

    await expect(generateLiveDestinationPlans(createInput())).rejects.toThrow('Live API down')
  })

  it('generates budget optimizer over-budget guidance when estimates are very high', async () => {
    mockedEstimateCityDailyUsd.mockImplementation(() => ({
      stay: 420,
      food: 260,
      activities: 240,
    }))

    const plans = await generateLiveDestinationPlans(
      createInput({ totalBudget: 900, travelDays: 4, travelerCount: 2 }),
    )

    expect(plans.length).toBeGreaterThan(0)
    plans.forEach((plan) => {
      expect(plan.isWithinBudget).toBe(false)
      expect(plan.budgetOptimizerTips[0].toLowerCase()).toContain('over budget')
    })
  })
})
