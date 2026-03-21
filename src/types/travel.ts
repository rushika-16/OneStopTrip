export type DestinationType =
  | 'beach'
  | 'mountains'
  | 'city'
  | 'adventure'
  | 'cultural'

export type CurrencyCode =
  | 'USD'
  | 'INR'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'AED'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'SGD'

export type TripType =
  | 'family'
  | 'leisure'
  | 'business'
  | 'honeymoon'
  | 'bachelor'

export type TravelScope = 'domestic' | 'international' | 'either'
export type BudgetTier = 'budget' | 'mid-range' | 'premium'

export type ExpenseCategory =
  | 'transport'
  | 'accommodation'
  | 'food'
  | 'activities'
  | 'shopping'
  | 'other'

export type SplitMode = 'equal' | 'unequal' | 'percentage'

export type ExplorerType = 'food' | 'activities' | 'attractions'
export type PlannerGenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export type TaskCategory = 'pre-trip' | 'during-trip' | 'post-trip'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface PlannerInput {
  totalBudget: number
  budgetCurrency: CurrencyCode
  travelDays: number
  currentLocation: string
  targetDestination?: string
  travelerCount: number
  tripType: TripType
  destinationType: DestinationType
  travelScope: TravelScope
  hasVisa: boolean
  foodPreferences: string[]
  activityPreferences: string[]
  travelMonth: number
}

export interface DestinationOption {
  id: string
  name: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  timezone: string
  scope: Exclude<TravelScope, 'either'>
  type: DestinationType
  popularityScore: number
  primaryCurrency: CurrencyCode
  visaRequired: boolean
  foodTags: string[]
  activityTags: string[]
}

export interface CostBreakdown {
  transport: number
  accommodation: number
  food: number
  activities: number
  total: number
  perPerson: number
  currency: CurrencyCode
  totalInUsd: number
}

export interface ItinerarySlot {
  time: string
  activity: string
  place: string
  city: string
  mapUrl: string
  estimatedCost: number
}

export interface ItineraryDay {
  day: number
  city: string
  title: string
  highlights: string[]
  schedule: ItinerarySlot[]
  estimatedDailyCost: number
}

export interface PlannerPlan {
  tier: BudgetTier
  destination: DestinationOption
  route: string[]
  breakdown: CostBreakdown
  itinerary: ItineraryDay[]
  summary: string
  isWithinBudget: boolean
  notes: string[]
  budgetOptimizerTips: string[]
  places: ExplorerPlace[]
}

export interface Participant {
  id: string
  name: string
}

export interface Expense {
  id: string
  title: string
  category: ExpenseCategory
  amount: number
  paidBy: string
  splitMode: SplitMode
  splitWith?: string[]
  shares?: Record<string, number>
  createdAt: string
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

export interface ExpenseSummary {
  totalSpent: number
  budgetUsedPercent: number
  categoryTotals: Record<ExpenseCategory, number>
  netBalances: Record<string, number>
  settlements: Settlement[]
  alert: string | null
}

export interface ExplorerPlace {
  id: string
  name: string
  type: ExplorerType
  cuisineTags: string[]
  budgetBand: 'low' | 'mid' | 'high'
  rating: number
  distanceKm: number
  estimatedCost: number
  mapUrl: string
  reviewSnippet: string
}

export interface TripTask {
  id: string
  title: string
  category: TaskCategory
  priority: TaskPriority
  dueDate: string
  assignedTo: string
  completed: boolean
}

export interface PastTrip {
  id: string
  name: string
  location: string
  startDate: string
  endDate: string
  budget: number
  actualSpend: number
  travelers: string[]
  highlights: string[]
  notes: string
}

export interface TripMeta {
  id: string
  name: string
  budget: number
  startDate: string
  endDate: string
  baseLocation: string
}

export interface TravelState {
  trip: TripMeta
  participants: Participant[]
  plannerInput: PlannerInput
  plannerStatus: PlannerGenerationStatus
  plannerError: string | null
  lastPlanGeneratedAt: string | null
  explorerLocation: string
  plans: PlannerPlan[]
  selectedTier: BudgetTier | null
  expenses: Expense[]
  places: ExplorerPlace[]
  bookmarks: string[]
  tasks: TripTask[]
  pastTrips: PastTrip[]
}
