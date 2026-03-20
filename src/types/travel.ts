export type DestinationType =
  | 'beach'
  | 'mountains'
  | 'city'
  | 'adventure'
  | 'cultural'

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

export type TaskCategory = 'pre-trip' | 'during-trip' | 'post-trip'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface PlannerInput {
  totalBudget: number
  travelDays: number
  currentLocation: string
  targetDestination?: string
  travelerCount: number
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
  scope: Exclude<TravelScope, 'either'>
  type: DestinationType
  averageDailyCostPerPerson: number
  visaRequired: boolean
  seasonMonths: number[]
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
}

export interface ItineraryDay {
  day: number
  title: string
  highlights: string[]
  estimatedDailyCost: number
}

export interface PlannerPlan {
  tier: BudgetTier
  destination: DestinationOption
  breakdown: CostBreakdown
  itinerary: ItineraryDay[]
  notes: string[]
  budgetOptimizerTips: string[]
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
  plans: PlannerPlan[]
  selectedTier: BudgetTier | null
  expenses: Expense[]
  places: ExplorerPlace[]
  bookmarks: string[]
  tasks: TripTask[]
  pastTrips: PastTrip[]
}
