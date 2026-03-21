import { fetchExplorerPlaces } from './liveTravelData'
import { type ExplorerPlace, type ExplorerType } from '../types/travel'

export interface ExplorerFilters {
  query: string
  type: ExplorerType | 'all'
  cuisine: string
  budgetBand: 'all' | 'low' | 'mid' | 'high'
  minimumRating: number
  maxDistanceKm: number
}

export function filterPlaces(
  places: ExplorerPlace[],
  filters: ExplorerFilters,
): ExplorerPlace[] {
  const query = filters.query.trim().toLowerCase()
  const cuisine = filters.cuisine.trim().toLowerCase()

  return places
    .filter((place) => {
      const matchesQuery =
        query.length === 0 ||
        place.name.toLowerCase().includes(query) ||
        place.reviewSnippet.toLowerCase().includes(query) ||
        place.type.toLowerCase().includes(query) ||
        place.budgetBand.toLowerCase().includes(query) ||
        place.cuisineTags.some((tag) => tag.toLowerCase().includes(query))

      const matchesType = filters.type === 'all' || place.type === filters.type
      const matchesCuisine =
        cuisine.length === 0 ||
        place.cuisineTags.some((tag) => tag.toLowerCase().includes(cuisine))
      const matchesBudget =
        filters.budgetBand === 'all' || place.budgetBand === filters.budgetBand
      const matchesRating = place.rating >= filters.minimumRating
      const matchesDistance = place.distanceKm <= filters.maxDistanceKm

      return (
        matchesQuery &&
        matchesType &&
        matchesCuisine &&
        matchesBudget &&
        matchesRating &&
        matchesDistance
      )
    })
    .sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export async function searchLivePlaces(
  cityName: string,
): Promise<{ places: ExplorerPlace[]; cityLabel: string }> {
  const { places: pois, cityLabel } = await fetchExplorerPlaces(cityName)

  const byId = new Map<string, ExplorerPlace>()
  for (const poi of pois) {
    if (poi.category === 'stay') continue

    const budgetBand = poi.estimatedCostUsd < 18 ? 'low' : poi.estimatedCostUsd < 45 ? 'mid' : 'high'
    const rating = clamp(4.1 - poi.distanceKm / 90, 3.6, 4.9)

    const place: ExplorerPlace = {
      id: poi.id,
      name: poi.name,
      type: poi.category as ExplorerType,
      cuisineTags: poi.tags,
      budgetBand,
      rating,
      distanceKm: Number(poi.distanceKm.toFixed(1)),
      estimatedCost: Math.max(0, Math.round(poi.estimatedCostUsd)),
      mapUrl: poi.mapUrl,
      reviewSnippet: `${poi.summary} Distance from city core: ${poi.distanceKm.toFixed(1)} km.`,
    }

    byId.set(poi.id, place)
  }

  return {
    places: Array.from(byId.values()).sort(
      (a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm,
    ),
    cityLabel,
  }
}
