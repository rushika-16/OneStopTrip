import {
  estimateCityDailyUsd,
  fetchLiveTravelContext,
  type LiveCityCandidate,
} from './liveTravelData'
import {
  type BudgetTier,
  type DestinationType,
  type ExplorerPlace,
  type ItineraryDay,
  type ItinerarySlot,
  type PlannerInput,
  type PlannerPlan,
  type TripType,
} from '../types/travel'

const DESTINATION_KEYWORDS: Record<DestinationType, string[]> = {
  beach: ['beach', 'coast', 'island', 'bay', 'marina', 'harbor'],
  mountains: ['mountain', 'peak', 'hill', 'alpine', 'ski', 'canyon'],
  city: ['museum', 'downtown', 'plaza', 'cathedral', 'metro', 'urban'],
  adventure: ['rafting', 'climb', 'trail', 'surf', 'hike', 'sports'],
  cultural: ['museum', 'historic', 'temple', 'palace', 'heritage', 'gallery'],
}

const TRIP_TYPE_KEYWORDS: Record<TripType, string[]> = {
  family: ['park', 'zoo', 'aquarium', 'museum', 'garden', 'safe'],
  leisure: ['walk', 'museum', 'cafe', 'viewpoint', 'local', 'market'],
  business: ['downtown', 'convention', 'financial', 'express', 'metro'],
  honeymoon: ['romantic', 'sunset', 'viewpoint', 'garden', 'river', 'cruise'],
  bachelor: ['night', 'bar', 'club', 'adventure', 'sports', 'pub'],
}

const TIER_CONFIG: Record<
  BudgetTier,
  {
    costScale: number
    domesticPerKmUsd: number
    internationalPerKmUsd: number
    localTransitPerDayUsd: number
    ranking: {
      preference: number
      popularity: number
      affordability: number
    }
  }
> = {
  budget: {
    costScale: 0.84,
    domesticPerKmUsd: 0.06,
    internationalPerKmUsd: 0.11,
    localTransitPerDayUsd: 7,
    ranking: { preference: 0.46, popularity: 0.2, affordability: 0.34 },
  },
  'mid-range': {
    costScale: 1,
    domesticPerKmUsd: 0.09,
    internationalPerKmUsd: 0.16,
    localTransitPerDayUsd: 11,
    ranking: { preference: 0.5, popularity: 0.35, affordability: 0.15 },
  },
  premium: {
    costScale: 1.3,
    domesticPerKmUsd: 0.14,
    internationalPerKmUsd: 0.24,
    localTransitPerDayUsd: 20,
    ranking: { preference: 0.44, popularity: 0.43, affordability: 0.13 },
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
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

function collectSignalText(city: LiveCityCandidate): string {
  const parts: string[] = [city.name, city.country]

  city.places.forEach((place) => {
    parts.push(place.name)
    parts.push(...place.tags)
  })

  return parts.join(' ').toLowerCase()
}

function computeDestinationTypeScore(
  destinationType: DestinationType,
  city: LiveCityCandidate,
): number {
  const text = collectSignalText(city)
  const matches = DESTINATION_KEYWORDS[destinationType].filter((word) =>
    text.includes(word),
  ).length

  const placeBoost =
    destinationType === 'city'
      ? Math.min(city.population / 4_000_000, 1)
      : Math.min(city.places.length / 25, 1)

  return clamp(matches / 5 + placeBoost * 0.45, 0, 1)
}

function computeTripTypeScore(tripType: TripType, city: LiveCityCandidate): number {
  const text = collectSignalText(city)
  const matches = TRIP_TYPE_KEYWORDS[tripType].filter((word) =>
    text.includes(word),
  ).length

  const categoryCount = new Set(city.places.map((place) => place.category)).size

  const base = matches / 5
  const variety = clamp(categoryCount / 4, 0, 1) * 0.25

  if (tripType === 'business') {
    const compactness = clamp(1.2 - city.costIndex * 0.2, 0.5, 1)
    return clamp(base + variety + compactness * 0.2, 0, 1)
  }

  return clamp(base + variety, 0, 1)
}

function orderCitiesByTravelEfficiency(
  cities: LiveCityCandidate[],
  startLat: number,
  startLon: number,
): LiveCityCandidate[] {
  if (cities.length <= 1) {
    return cities
  }

  const remaining = [...cities]
  const ordered: LiveCityCandidate[] = []
  let cursorLat = startLat
  let cursorLon = startLon

  while (remaining.length > 0) {
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY

    remaining.forEach((city, index) => {
      const distance = haversineKm(cursorLat, cursorLon, city.latitude, city.longitude)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    })

    const [next] = remaining.splice(bestIndex, 1)
    ordered.push(next)
    cursorLat = next.latitude
    cursorLon = next.longitude
  }

  return ordered
}

function chooseCityCount(days: number, tripType: TripType): number {
  const defaultCount = days >= 8 ? 3 : days >= 4 ? 2 : 1

  if (tripType === 'business') {
    return Math.min(defaultCount, 2)
  }

  if (tripType === 'honeymoon') {
    return Math.min(defaultCount, 2)
  }

  return defaultCount
}

function allocateDays(totalDays: number, cityCount: number): number[] {
  const safeCityCount = Math.max(1, cityCount)
  const base = Math.floor(totalDays / safeCityCount)
  const remainder = totalDays % safeCityCount

  return Array.from({ length: safeCityCount }, (_, index) =>
    base + (index < remainder ? 1 : 0),
  )
}

function rankCities(
  candidates: LiveCityCandidate[],
  input: PlannerInput,
  tier: BudgetTier,
): LiveCityCandidate[] {
  const popularityMax = Math.max(...candidates.map((city) => city.popularityScore), 1)

  return [...candidates]
    .map((city) => {
      const preference =
        computeDestinationTypeScore(input.destinationType, city) * 0.58 +
        computeTripTypeScore(input.tripType, city) * 0.42
      const popularity = clamp(city.popularityScore / popularityMax, 0, 1)
      const affordability = clamp(1.5 - city.costIndex / 1.2, 0, 1)

      const weights = TIER_CONFIG[tier].ranking
      const score =
        preference * weights.preference +
        popularity * weights.popularity +
        affordability * weights.affordability

      return { city, score }
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.city)
}

function pickRotating<T>(items: T[], index: number, fallback: T): T {
  if (items.length === 0) {
    return fallback
  }

  return items[index % items.length]
}

function makeSlot(
  time: string,
  activity: string,
  place: string,
  city: string,
  mapUrl: string,
  estimatedCost: number,
): ItinerarySlot {
  return {
    time,
    activity,
    place,
    city,
    mapUrl,
    estimatedCost,
  }
}

function buildDailySchedule(
  city: LiveCityCandidate,
  dayIndex: number,
  tripType: TripType,
  costScale: number,
  usdToBudgetRate: number,
  transitionFrom: LiveCityCandidate | null,
): ItinerarySlot[] {
  const attractions = city.places.filter((place) => place.category === 'attractions')
  const food = city.places.filter((place) => place.category === 'food')
  const activities = city.places.filter((place) => place.category === 'activities')

  const fallbackAttraction = {
    name: `${city.name} city highlights`,
    mapUrl: `https://maps.google.com/?q=${encodeURIComponent(city.name)}`,
    estimatedCostUsd: 18 * city.costIndex,
  }

  const fallbackFood = {
    name: `Local dining in ${city.name}`,
    mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`restaurants in ${city.name}`)}`,
    estimatedCostUsd: 16 * city.costIndex,
  }

  const fallbackActivity = {
    name:
      tripType === 'business'
        ? `Efficient city center walk in ${city.name}`
        : `Curated ${tripType} experience in ${city.name}`,
    mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`activities in ${city.name}`)}`,
    estimatedCostUsd: 24 * city.costIndex,
  }

  const morning = pickRotating(attractions, dayIndex, fallbackAttraction)
  const lunch = pickRotating(food, dayIndex + 1, fallbackFood)
  const afternoon = pickRotating(activities, dayIndex, fallbackActivity)
  const evening = pickRotating(attractions, dayIndex + 2, fallbackAttraction)

  const slots: ItinerarySlot[] = []

  if (transitionFrom) {
    const distance = haversineKm(
      transitionFrom.latitude,
      transitionFrom.longitude,
      city.latitude,
      city.longitude,
    )
    slots.push(
      makeSlot(
        '08:00',
        `Transfer to ${city.name}`,
        `${transitionFrom.name} to ${city.name} (${Math.round(distance)} km)`,
        city.name,
        `https://maps.google.com/?q=${encodeURIComponent(`${transitionFrom.name} to ${city.name}`)}`,
        Math.round(distance * 0.11 * usdToBudgetRate),
      ),
    )
  }

  slots.push(
    makeSlot(
      transitionFrom ? '11:00' : '09:00',
      `Morning visit: ${morning.name}`,
      morning.name,
      city.name,
      morning.mapUrl,
      Math.round(morning.estimatedCostUsd * costScale * usdToBudgetRate),
    ),
  )

  slots.push(
    makeSlot(
      '13:30',
      `Lunch break at ${lunch.name}`,
      lunch.name,
      city.name,
      lunch.mapUrl,
      Math.round(lunch.estimatedCostUsd * costScale * usdToBudgetRate),
    ),
  )

  slots.push(
    makeSlot(
      '16:00',
      `Afternoon activity: ${afternoon.name}`,
      afternoon.name,
      city.name,
      afternoon.mapUrl,
      Math.round(afternoon.estimatedCostUsd * costScale * usdToBudgetRate),
    ),
  )

  slots.push(
    makeSlot(
      '19:00',
      `Evening experience: ${evening.name}`,
      evening.name,
      city.name,
      evening.mapUrl,
      Math.round(evening.estimatedCostUsd * costScale * usdToBudgetRate),
    ),
  )

  return slots
}

function estimateTransportUsd(
  home: { latitude: number; longitude: number; countryCode: string },
  route: LiveCityCandidate[],
  travelers: number,
  days: number,
  tier: BudgetTier,
): number {
  if (route.length === 0) {
    return 0
  }

  const config = TIER_CONFIG[tier]
  let total = days * travelers * config.localTransitPerDayUsd

  const legs: Array<{ km: number; international: boolean }> = []

  legs.push({
    km: haversineKm(home.latitude, home.longitude, route[0].latitude, route[0].longitude),
    international: route[0].countryCode !== home.countryCode,
  })

  for (let index = 0; index < route.length - 1; index += 1) {
    const from = route[index]
    const to = route[index + 1]

    legs.push({
      km: haversineKm(from.latitude, from.longitude, to.latitude, to.longitude),
      international: from.countryCode !== to.countryCode,
    })
  }

  const last = route[route.length - 1]
  legs.push({
    km: haversineKm(last.latitude, last.longitude, home.latitude, home.longitude),
    international: last.countryCode !== home.countryCode,
  })

  legs.forEach((leg) => {
    const perKm = leg.international
      ? config.internationalPerKmUsd
      : config.domesticPerKmUsd

    const longHaulMultiplier = leg.km > 1100 ? 1.15 : 1
    total += leg.km * perKm * travelers * longHaulMultiplier
  })

  return total
}

function toExplorerPlaces(
  cities: LiveCityCandidate[],
  usdToBudgetRate: number,
): ExplorerPlace[] {
  const byId = new Map<string, ExplorerPlace>()

  cities.forEach((city) => {
    city.places.forEach((place) => {
      if (place.category === 'stay') {
        return
      }

      const converted = place.estimatedCostUsd * usdToBudgetRate
      const budgetBand = converted < 18 ? 'low' : converted < 45 ? 'mid' : 'high'
      const rating = clamp(4.1 + city.popularityScore / 100_000 - place.distanceKm / 90, 3.8, 4.9)

      const mapped: ExplorerPlace = {
        id: place.id,
        name: place.name,
        type: place.category,
        cuisineTags: place.tags,
        budgetBand,
        rating,
        distanceKm: Number(place.distanceKm.toFixed(1)),
        estimatedCost: Math.max(0, Math.round(converted)),
        mapUrl: place.mapUrl,
        reviewSnippet: `${place.summary} Distance from city core: ${place.distanceKm.toFixed(1)} km.`,
      }

      byId.set(place.id, mapped)
    })
  })

  return Array.from(byId.values()).sort(
    (a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm,
  )
}

function inferDestinationType(city: LiveCityCandidate, requestedType: DestinationType): DestinationType {
  const ranked = (Object.keys(DESTINATION_KEYWORDS) as DestinationType[])
    .map((type) => ({ type, score: computeDestinationTypeScore(type, city) }))
    .sort((a, b) => b.score - a.score)

  const winner = ranked[0]
  return winner.score >= 0.35 ? winner.type : requestedType
}

function buildBudgetTips(totalInUsd: number, budgetInUsd: number, route: string[]): string[] {
  if (totalInUsd > budgetInUsd) {
    const overBy = Math.round(totalInUsd - budgetInUsd)
    return [
      `Plan is over budget by about ${overBy} USD. Reduce one inter-city move to cut transport costs.`,
      'Prioritize free-entry attractions and park days on 2 itinerary days.',
      `Book stays near transit in ${route[0]} to reduce local transfer spend.`,
    ]
  }

  if (totalInUsd < budgetInUsd * 0.82) {
    return [
      'You are safely under budget. Reserve a comfort upgrade for one stay night.',
      'Keep 10% contingency for surge pricing and weather-driven changes.',
      'Pre-book top attractions to lock prices before departure.',
    ]
  }

  return [
    'Budget fit is healthy. Keep local transit and activity booking windows tight.',
    'Use one buffer slot every two days to absorb delays without itinerary drift.',
  ]
}

function summarizePlan(route: LiveCityCandidate[], tripType: TripType): string {
  const cityNames = route.map((city) => city.name).join(' -> ')
  const style =
    tripType === 'honeymoon'
      ? 'romantic and scenic'
      : tripType === 'business'
        ? 'time-efficient and meeting-friendly'
        : tripType === 'family'
          ? 'kid-friendly and low-friction'
          : tripType === 'bachelor'
            ? 'high-energy and nightlife-friendly'
            : 'balanced and discovery-focused'

  return `Live-data route across ${cityNames}, tuned for a ${style} trip.`
}

function buildPlanForTier(
  context: Awaited<ReturnType<typeof fetchLiveTravelContext>>,
  input: PlannerInput,
  tier: BudgetTier,
): PlannerPlan | null {
  const ranked = rankCities(context.candidates, input, tier)
  if (ranked.length === 0) {
    return null
  }

  const requestedCityCount = chooseCityCount(input.travelDays, input.tripType)
  const cityCount = Math.min(requestedCityCount, ranked.length)
  const selected = ranked.slice(0, cityCount)
  const route = orderCitiesByTravelEfficiency(
    selected,
    context.home.latitude,
    context.home.longitude,
  )

  const daysPerCity = allocateDays(input.travelDays, route.length)
  const config = TIER_CONFIG[tier]

  let dayNumber = 1
  let accommodationUsd = 0
  let foodUsd = 0
  let activitiesUsd = 0

  const itinerary: ItineraryDay[] = []

  route.forEach((city, cityIndex) => {
    const daysInCity = daysPerCity[cityIndex]
    const daily = estimateCityDailyUsd(city)

    for (let localDay = 0; localDay < daysInCity; localDay += 1) {
      const isFirstInCity = localDay === 0
      const transitionFrom =
        isFirstInCity && cityIndex > 0 ? route[cityIndex - 1] : null

      const schedule = buildDailySchedule(
        city,
        localDay,
        input.tripType,
        config.costScale,
        context.usdToBudgetRate,
        transitionFrom,
      )

      const dailyAccommodation = daily.stay * config.costScale * input.travelerCount
      const dailyFood = daily.food * config.costScale * input.travelerCount
      const dailyActivities = daily.activities * config.costScale * input.travelerCount

      accommodationUsd += dailyAccommodation
      foodUsd += dailyFood
      activitiesUsd += dailyActivities

      const estimatedDailyCost =
        (dailyAccommodation + dailyFood + dailyActivities) * context.usdToBudgetRate

      itinerary.push({
        day: dayNumber,
        city: city.name,
        title: isFirstInCity
          ? `Day ${dayNumber}: Arrive and explore ${city.name}`
          : `Day ${dayNumber}: Experience ${city.name}`,
        highlights: schedule.map((slot) => slot.activity),
        schedule,
        estimatedDailyCost: Math.round(estimatedDailyCost),
      })

      dayNumber += 1
    }
  })

  const transportUsd = estimateTransportUsd(
    {
      latitude: context.home.latitude,
      longitude: context.home.longitude,
      countryCode: context.home.countryCode,
    },
    route,
    input.travelerCount,
    input.travelDays,
    tier,
  )

  const totalInUsd = accommodationUsd + foodUsd + activitiesUsd + transportUsd
  const total = totalInUsd * context.usdToBudgetRate

  const destination = route[0]

  return {
    tier,
    destination: {
      id: `${destination.countryCode}-${destination.name.toLowerCase()}`,
      name: destination.name,
      country: destination.country,
      countryCode: destination.countryCode,
      latitude: destination.latitude,
      longitude: destination.longitude,
      timezone: destination.timezone,
      scope:
        destination.countryCode === context.home.countryCode
          ? 'domestic'
          : 'international',
      type: inferDestinationType(destination, input.destinationType),
      popularityScore: destination.popularityScore,
      primaryCurrency: destination.primaryCurrency,
      visaRequired: destination.countryCode !== context.home.countryCode,
      foodTags: destination.places
        .filter((place) => place.category === 'food')
        .flatMap((place) => place.tags)
        .slice(0, 6),
      activityTags: destination.places
        .filter(
          (place) => place.category === 'activities' || place.category === 'attractions',
        )
        .flatMap((place) => place.tags)
        .slice(0, 6),
    },
    route: route.map((city) => `${city.name}, ${city.country}`),
    breakdown: {
      transport: Math.round(transportUsd * context.usdToBudgetRate),
      accommodation: Math.round(accommodationUsd * context.usdToBudgetRate),
      food: Math.round(foodUsd * context.usdToBudgetRate),
      activities: Math.round(activitiesUsd * context.usdToBudgetRate),
      total: Math.round(total),
      perPerson: Math.round(total / Math.max(1, input.travelerCount)),
      currency: context.budgetCurrency,
      totalInUsd: Math.round(totalInUsd),
    },
    itinerary,
    summary: summarizePlan(route, input.tripType),
    isWithinBudget: totalInUsd <= context.budgetInUsd,
    notes: [
      `Generated from live internet sources: ${context.sources.join(', ')}.`,
      `Trip type focus: ${input.tripType}. Destination style: ${input.destinationType}.`,
      `Route optimized for shorter transfer legs: ${route.map((city) => city.name).join(' -> ')}.`,
    ],
    budgetOptimizerTips: buildBudgetTips(
      totalInUsd,
      context.budgetInUsd,
      route.map((city) => city.name),
    ),
    places: toExplorerPlaces(route, context.usdToBudgetRate),
  }
}

export async function generateLiveDestinationPlans(
  input: PlannerInput,
): Promise<PlannerPlan[]> {
  const context = await fetchLiveTravelContext(input)
  const tiers: BudgetTier[] = ['budget', 'mid-range', 'premium']

  return tiers
    .map((tier) => buildPlanForTier(context, input, tier))
    .filter((plan): plan is PlannerPlan => Boolean(plan))
}
