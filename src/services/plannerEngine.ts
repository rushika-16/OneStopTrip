import {
  type BudgetTier,
  type CostBreakdown,
  type DestinationOption,
  type DestinationType,
  type ItineraryDay,
  type PlannerInput,
  type PlannerPlan,
} from '../types/travel'

const DESTINATIONS: DestinationOption[] = [
  {
    id: 'goa',
    name: 'Goa',
    country: 'India',
    scope: 'domestic',
    type: 'beach',
    averageDailyCostPerPerson: 52,
    visaRequired: false,
    seasonMonths: [10, 11, 12, 1, 2, 3],
    foodTags: ['veg', 'seafood', 'halal'],
    activityTags: ['water sports', 'nightlife', 'relaxation'],
  },
  {
    id: 'manali',
    name: 'Manali',
    country: 'India',
    scope: 'domestic',
    type: 'mountains',
    averageDailyCostPerPerson: 44,
    visaRequired: false,
    seasonMonths: [3, 4, 5, 6, 9, 10],
    foodTags: ['veg', 'vegan'],
    activityTags: ['trekking', 'adventure', 'scenic'],
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    country: 'India',
    scope: 'domestic',
    type: 'cultural',
    averageDailyCostPerPerson: 48,
    visaRequired: false,
    seasonMonths: [10, 11, 12, 1, 2, 3],
    foodTags: ['veg', 'halal'],
    activityTags: ['history', 'shopping', 'food walk'],
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh',
    country: 'India',
    scope: 'domestic',
    type: 'adventure',
    averageDailyCostPerPerson: 46,
    visaRequired: false,
    seasonMonths: [2, 3, 4, 5, 9, 10, 11],
    foodTags: ['veg', 'healthy'],
    activityTags: ['rafting', 'yoga', 'nature'],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    scope: 'domestic',
    type: 'city',
    averageDailyCostPerPerson: 58,
    visaRequired: false,
    seasonMonths: [10, 11, 12, 1, 2, 3],
    foodTags: ['veg', 'halal', 'street food'],
    activityTags: ['city walk', 'shopping', 'nightlife'],
  },
  {
    id: 'bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    scope: 'international',
    type: 'city',
    averageDailyCostPerPerson: 78,
    visaRequired: true,
    seasonMonths: [11, 12, 1, 2, 3],
    foodTags: ['vegan', 'halal', 'street food'],
    activityTags: ['culture', 'shopping', 'night markets'],
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    scope: 'international',
    type: 'adventure',
    averageDailyCostPerPerson: 92,
    visaRequired: true,
    seasonMonths: [4, 5, 6, 7, 8, 9],
    foodTags: ['vegan', 'halal', 'fusion'],
    activityTags: ['surfing', 'temple visit', 'nature'],
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    scope: 'international',
    type: 'cultural',
    averageDailyCostPerPerson: 96,
    visaRequired: true,
    seasonMonths: [4, 5, 9, 10, 11],
    foodTags: ['halal', 'veg'],
    activityTags: ['heritage', 'food tour', 'shopping'],
  },
  {
    id: 'miami',
    name: 'Miami',
    country: 'United States',
    scope: 'domestic',
    type: 'beach',
    averageDailyCostPerPerson: 118,
    visaRequired: false,
    seasonMonths: [11, 12, 1, 2, 3, 4],
    foodTags: ['vegan', 'seafood', 'halal'],
    activityTags: ['beach', 'nightlife', 'water sports'],
  },
  {
    id: 'maui',
    name: 'Maui',
    country: 'United States',
    scope: 'domestic',
    type: 'beach',
    averageDailyCostPerPerson: 134,
    visaRequired: false,
    seasonMonths: [4, 5, 6, 7, 8, 9, 10],
    foodTags: ['fusion', 'vegan'],
    activityTags: ['snorkeling', 'nature', 'relaxation'],
  },
  {
    id: 'aspen',
    name: 'Aspen',
    country: 'United States',
    scope: 'domestic',
    type: 'mountains',
    averageDailyCostPerPerson: 146,
    visaRequired: false,
    seasonMonths: [1, 2, 3, 6, 7, 8, 9],
    foodTags: ['vegan', 'healthy'],
    activityTags: ['ski', 'hiking', 'scenic'],
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    scope: 'domestic',
    type: 'city',
    averageDailyCostPerPerson: 128,
    visaRequired: false,
    seasonMonths: [4, 5, 6, 9, 10, 11],
    foodTags: ['vegan', 'halal', 'street food'],
    activityTags: ['city tour', 'museum', 'nightlife'],
  },
  {
    id: 'moab',
    name: 'Moab',
    country: 'United States',
    scope: 'domestic',
    type: 'adventure',
    averageDailyCostPerPerson: 102,
    visaRequired: false,
    seasonMonths: [3, 4, 5, 9, 10, 11],
    foodTags: ['veg'],
    activityTags: ['hiking', 'off-road', 'canyon tours'],
  },
  {
    id: 'new-orleans',
    name: 'New Orleans',
    country: 'United States',
    scope: 'domestic',
    type: 'cultural',
    averageDailyCostPerPerson: 112,
    visaRequired: false,
    seasonMonths: [2, 3, 4, 10, 11],
    foodTags: ['halal', 'veg'],
    activityTags: ['music', 'heritage', 'food walk'],
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    scope: 'international',
    type: 'city',
    averageDailyCostPerPerson: 116,
    visaRequired: true,
    seasonMonths: [4, 5, 6, 7, 8, 9, 10],
    foodTags: ['veg', 'seafood'],
    activityTags: ['architecture', 'culture', 'food'],
  },
  {
    id: 'phuket',
    name: 'Phuket',
    country: 'Thailand',
    scope: 'international',
    type: 'beach',
    averageDailyCostPerPerson: 88,
    visaRequired: true,
    seasonMonths: [11, 12, 1, 2, 3, 4],
    foodTags: ['veg', 'halal', 'seafood'],
    activityTags: ['island hopping', 'beach', 'water sports'],
  },
  {
    id: 'zurich',
    name: 'Zurich',
    country: 'Switzerland',
    scope: 'international',
    type: 'mountains',
    averageDailyCostPerPerson: 172,
    visaRequired: true,
    seasonMonths: [1, 2, 3, 6, 7, 8, 9, 12],
    foodTags: ['vegan', 'veg'],
    activityTags: ['scenic train', 'hiking', 'lake'],
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    scope: 'international',
    type: 'cultural',
    averageDailyCostPerPerson: 128,
    visaRequired: true,
    seasonMonths: [3, 4, 5, 10, 11],
    foodTags: ['veg', 'fusion'],
    activityTags: ['temples', 'heritage', 'walks'],
  },
]

const TIER_MULTIPLIERS: Record<BudgetTier, number> = {
  budget: 0.82,
  'mid-range': 1,
  premium: 1.32,
}

const DESTINATION_HIGHLIGHTS: Record<DestinationType, string[]> = {
  beach: ['sunrise coastline walk', 'beach cafe hopping', 'sunset leisure'],
  mountains: ['scenic viewpoint visit', 'guided nature trail', 'local market'],
  city: ['old quarter walking tour', 'museum visit', 'evening skyline stop'],
  adventure: ['adventure activity slot', 'local village encounter', 'sunset trek'],
  cultural: ['heritage monument trail', 'artisan workshop', 'street food circuit'],
}

const LOCATION_COUNTRY_HINTS: Record<string, string[]> = {
  India: [
    'india',
    'mumbai',
    'delhi',
    'bengaluru',
    'bangalore',
    'goa',
    'jaipur',
    'manali',
    'rishikesh',
    'hyderabad',
    'chennai',
    'kolkata',
    'pune',
  ],
  'United States': [
    'usa',
    'us',
    'united states',
    'california',
    'new york',
    'florida',
    'texas',
    'washington',
    'seattle',
    'los angeles',
    'san francisco',
    'chicago',
    'miami',
  ],
  'United Kingdom': ['uk', 'united kingdom', 'england', 'london', 'manchester'],
  Australia: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'],
  Canada: ['canada', 'toronto', 'vancouver', 'montreal', 'calgary'],
}

function inferHomeCountry(location: string): string {
  const normalized = location.trim().toLowerCase()
  if (!normalized) {
    return 'India'
  }

  for (const [country, hints] of Object.entries(LOCATION_COUNTRY_HINTS)) {
    if (hints.some((hint) => normalized.includes(hint))) {
      return country
    }
  }

  return 'India'
}

function isInternationalTrip(homeCountry: string, destination: DestinationOption): boolean {
  return destination.country !== homeCountry
}

function pickDestinationByTier(
  candidates: DestinationOption[],
  input: PlannerInput,
  tier: BudgetTier,
  usedDestinationIds: Set<string>,
): DestinationOption | null {
  const budgetPerPersonPerDay =
    input.totalBudget / Math.max(1, input.travelerCount * input.travelDays)
  const tierTarget = budgetPerPersonPerDay * TIER_MULTIPLIERS[tier]

  const ranked = [...candidates].sort((a, b) => {
    const scoreA = Math.abs(a.averageDailyCostPerPerson - tierTarget)
    const scoreB = Math.abs(b.averageDailyCostPerPerson - tierTarget)
    return scoreA - scoreB
  })

  const preferred = ranked.find((destination) => !usedDestinationIds.has(destination.id))
  return preferred ?? ranked[0] ?? null
}

function buildBreakdown(
  destination: DestinationOption,
  input: PlannerInput,
  tier: BudgetTier,
  homeCountry: string,
): CostBreakdown {
  const scale = TIER_MULTIPLIERS[tier]
  const estimatedTotal =
    destination.averageDailyCostPerPerson *
    input.travelDays *
    input.travelerCount *
    scale

  const transportShare = isInternationalTrip(homeCountry, destination) ? 0.36 : 0.22
  const accommodationShare = tier === 'premium' ? 0.42 : 0.35
  const foodShare = 0.2
  const activitiesShare = 1 - transportShare - accommodationShare - foodShare

  const transport = estimatedTotal * transportShare
  const accommodation = estimatedTotal * accommodationShare
  const food = estimatedTotal * foodShare
  const activities = estimatedTotal * activitiesShare

  return {
    transport,
    accommodation,
    food,
    activities,
    total: transport + accommodation + food + activities,
    perPerson: estimatedTotal / Math.max(1, input.travelerCount),
  }
}

function buildItinerary(
  destination: DestinationOption,
  input: PlannerInput,
  tier: BudgetTier,
): ItineraryDay[] {
  const highlights = DESTINATION_HIGHLIGHTS[destination.type]

  return Array.from({ length: input.travelDays }, (_, index) => {
    const day = index + 1
    const focus = highlights[index % highlights.length]
    const pace =
      tier === 'budget'
        ? 'smart-budget day plan'
        : tier === 'premium'
          ? 'comfort-first day plan'
          : 'balanced day plan'

    return {
      day,
      title: `Day ${day}: ${focus}`,
      highlights: [
        `Morning: ${focus}`,
        `Afternoon: ${input.activityPreferences[0] ?? 'local experiences'}`,
        `Evening: ${pace}`,
      ],
      estimatedDailyCost:
        (destination.averageDailyCostPerPerson * input.travelerCount * TIER_MULTIPLIERS[tier]) /
        1,
    }
  })
}

function buildOptimizerTips(
  total: number,
  budget: number,
  destination: DestinationOption,
): string[] {
  if (total > budget) {
    return [
      `Switch one accommodation night to a homestay to save ~${Math.round((total - budget) * 0.35)} USD.`,
      'Use local transit passes instead of taxis for inter-city movement.',
      `Choose free walking tours on two days in ${destination.name} to reduce activity spend.`,
    ]
  }

  if (total < budget * 0.82) {
    return [
      'You are under budget: consider upgrading one stay night to a premium property.',
      'Add one guided local culinary experience without crossing your budget.',
      'Reserve contingency for weather disruptions and last-minute transport changes.',
    ]
  }

  return [
    'Budget fit looks healthy. Keep at least 8% as emergency reserve.',
    'Pre-book top attractions to avoid dynamic pricing spikes.',
  ]
}

function buildPlanNotes(
  destination: DestinationOption,
  input: PlannerInput,
  homeCountry: string,
): string[] {
  const notes: string[] = []

  if (!destination.seasonMonths.includes(input.travelMonth)) {
    notes.push('Selected month is shoulder/off-season for this destination. Prices may vary.')
  }

  if (isInternationalTrip(homeCountry, destination) && destination.visaRequired && !input.hasVisa) {
    notes.push('Visa is required. Plan processing lead-time before booking non-refundable tickets.')
  }

  if (!isInternationalTrip(homeCountry, destination)) {
    notes.push(`Domestic recommendation based on origin: ${homeCountry}.`)
  }

  if (input.foodPreferences.length > 0) {
    notes.push(`Food-fit confidence: ${input.foodPreferences.join(', ')}`)
  }

  return notes
}

export function buildDestinationPlans(input: PlannerInput): PlannerPlan[] {
  const homeCountry = inferHomeCountry(input.currentLocation)

  const filtered = DESTINATIONS.filter((destination) => {
    const scopeMatch =
      input.travelScope === 'either' ||
      (input.travelScope === 'domestic'
        ? !isInternationalTrip(homeCountry, destination)
        : isInternationalTrip(homeCountry, destination))
    const typeMatch = destination.type === input.destinationType
    const visaMatch =
      !isInternationalTrip(homeCountry, destination) || input.hasVisa || !destination.visaRequired
    return scopeMatch && typeMatch && visaMatch
  })

  const fallback =
    filtered.length > 0
      ? filtered
      : DESTINATIONS.filter(
          (destination) =>
            destination.type === input.destinationType &&
            (input.hasVisa || !destination.visaRequired || destination.country === homeCountry),
        )

  const tiers: BudgetTier[] = ['budget', 'mid-range', 'premium']
  const usedDestinationIds = new Set<string>()

  return tiers
    .map((tier) => {
      const destination = pickDestinationByTier(fallback, input, tier, usedDestinationIds)
      if (!destination) {
        return null
      }
      usedDestinationIds.add(destination.id)

      const breakdown = buildBreakdown(destination, input, tier, homeCountry)
      return {
        tier,
        destination,
        breakdown,
        itinerary: buildItinerary(destination, input, tier),
        notes: buildPlanNotes(destination, input, homeCountry),
        budgetOptimizerTips: buildOptimizerTips(
          breakdown.total,
          input.totalBudget,
          destination,
        ),
      } satisfies PlannerPlan
    })
    .filter((plan): plan is PlannerPlan => Boolean(plan))
}
