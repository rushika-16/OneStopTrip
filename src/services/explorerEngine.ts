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
