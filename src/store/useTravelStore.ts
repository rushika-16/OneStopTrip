import { useCallback, useEffect, useMemo, useState } from 'react'
import { summarizeExpenses } from '../services/expenseEngine'
import { generateLiveDestinationPlans } from '../services/plannerEngine'
import {
  type BudgetTier,
  type Expense,
  type PastTrip,
  type PlannerInput,
  type PlannerPlan,
  type TravelState,
  type TaskCategory,
  type TaskPriority,
} from '../types/travel'

const STORAGE_KEY = 'onestoptrip-state-v1'

const DEFAULT_MONTH = new Date().getMonth() + 1

function sanitizeTripName(name: string): string {
  return name.replace(/\bDemo\s*/gi, '').replace(/\s{2,}/g, ' ').trim()
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function defaultTripDates(days: number): { start: string; end: string } {
  const start = new Date()
  start.setDate(start.getDate() + 45)

  const end = new Date(start)
  end.setDate(end.getDate() + Math.max(1, days - 1))

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  }
}

function seedState(): TravelState {
  const plannerInput: PlannerInput = {
    totalBudget: 2500,
    budgetCurrency: 'USD',
    travelDays: 6,
    currentLocation: 'Mumbai',
    targetDestination: '',
    travelerCount: 2,
    tripType: 'leisure',
    destinationType: 'city',
    travelScope: 'either',
    hasVisa: false,
    foodPreferences: ['local', 'veg'],
    activityPreferences: ['culture', 'walking tours'],
    travelMonth: DEFAULT_MONTH,
  }

  const tripDates = defaultTripDates(plannerInput.travelDays)

  return {
    trip: {
      id: 'trip-main',
      name: 'OneStopTrip Escape',
      budget: plannerInput.totalBudget,
      startDate: tripDates.start,
      endDate: tripDates.end,
      baseLocation: plannerInput.currentLocation,
    },
    participants: [
      { id: 'u1', name: 'Traveler 1' },
      { id: 'u2', name: 'Traveler 2' },
    ],
    plannerInput,
    plannerStatus: 'idle',
    plannerError: null,
    lastPlanGeneratedAt: null,
    explorerLocation: plannerInput.currentLocation,
    plans: [],
    selectedTier: null,
    expenses: [],
    places: [],
    bookmarks: [],
    tasks: [],
    pastTrips: [],
  }
}

function pickSelectedTier(
  selected: BudgetTier | null | undefined,
  plans: PlannerPlan[],
): BudgetTier | null {
  if (!selected) {
    return plans[1]?.tier ?? plans[0]?.tier ?? null
  }

  return plans.some((plan) => plan.tier === selected)
    ? selected
    : plans[1]?.tier ?? plans[0]?.tier ?? null
}

function normalizeTravelState(value: unknown): TravelState {
  const seededState = seedState()

  if (!value || typeof value !== 'object') {
    return seededState
  }

  const rawState = value as Partial<TravelState>
  const mergedPlannerInput = {
    ...seededState.plannerInput,
    ...rawState.plannerInput,
  }

  const rawExplorerLocation =
    typeof rawState.explorerLocation === 'string'
      ? rawState.explorerLocation.trim()
      : ''

  const defaultExplorerLocation =
    mergedPlannerInput.targetDestination?.trim() ||
    mergedPlannerInput.currentLocation?.trim() ||
    rawState.trip?.baseLocation?.trim() ||
    seededState.explorerLocation

  const isLegacyMauiPlaceholder = rawExplorerLocation.toLowerCase() === 'maui'
  const normalizedExplorerLocation =
    rawExplorerLocation.length > 0 && !isLegacyMauiPlaceholder
      ? rawExplorerLocation
      : defaultExplorerLocation

  const normalizedPlans = Array.isArray(rawState.plans) ? rawState.plans : seededState.plans
  const normalizedSelectedTier = pickSelectedTier(rawState.selectedTier, normalizedPlans)
  const activePlan = normalizedPlans.find((plan) => plan.tier === normalizedSelectedTier)

  return {
    ...seededState,
    ...rawState,
    trip: {
      ...seededState.trip,
      ...rawState.trip,
      name: sanitizeTripName(rawState.trip?.name ?? seededState.trip.name),
      budget:
        rawState.trip?.budget ??
        mergedPlannerInput.totalBudget ??
        seededState.trip.budget,
      baseLocation:
        rawState.trip?.baseLocation ??
        mergedPlannerInput.currentLocation ??
        seededState.trip.baseLocation,
    },
    plannerInput: mergedPlannerInput,
    plannerStatus: rawState.plannerStatus ?? seededState.plannerStatus,
    plannerError: rawState.plannerError ?? seededState.plannerError,
    lastPlanGeneratedAt:
      rawState.lastPlanGeneratedAt ?? seededState.lastPlanGeneratedAt,
    explorerLocation: normalizedExplorerLocation,
    participants: Array.isArray(rawState.participants)
      ? rawState.participants
      : seededState.participants,
    plans: normalizedPlans,
    selectedTier: normalizedSelectedTier,
    expenses: Array.isArray(rawState.expenses)
      ? rawState.expenses
      : seededState.expenses,
    places:
      Array.isArray(rawState.places) && rawState.places.length > 0
        ? rawState.places
        : activePlan?.places ?? seededState.places,
    bookmarks: Array.isArray(rawState.bookmarks)
      ? rawState.bookmarks
      : seededState.bookmarks,
    tasks: Array.isArray(rawState.tasks) ? rawState.tasks : seededState.tasks,
    pastTrips: Array.isArray(rawState.pastTrips)
      ? rawState.pastTrips
      : seededState.pastTrips,
  }
}

function loadInitialState(): TravelState {
  if (typeof window === 'undefined') {
    return seedState()
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return seedState()
    }

    return normalizeTravelState(JSON.parse(stored))
  } catch {
    return seedState()
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to generate a live itinerary right now. Please retry in a moment.'
}

export function useTravelStore() {
  const [state, setState] = useState<TravelState>(loadInitialState)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return
      }

      try {
        setState(normalizeTravelState(JSON.parse(event.newValue)))
      } catch {
        setState(seedState())
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const updatePlannerInput = useCallback((patch: Partial<PlannerInput>) => {
    setState((prev) => {
      const nextInput = { ...prev.plannerInput, ...patch }

      const nextExplorerLocation =
        patch.targetDestination !== undefined
          ? patch.targetDestination.trim() || nextInput.currentLocation
          : patch.currentLocation !== undefined
            ? patch.currentLocation
            : prev.explorerLocation

      return {
        ...prev,
        plannerInput: nextInput,
        plannerError: null,
        trip: {
          ...prev.trip,
          budget:
            patch.totalBudget !== undefined ? patch.totalBudget : prev.trip.budget,
          baseLocation:
            patch.currentLocation !== undefined
              ? patch.currentLocation
              : prev.trip.baseLocation,
        },
        explorerLocation: nextExplorerLocation,
      }
    })
  }, [])

  const generatePlans = useCallback(async () => {
    const plannerInput = state.plannerInput
    const previousTier = state.selectedTier

    setState((prev) => ({
      ...prev,
      plannerStatus: 'loading',
      plannerError: null,
    }))

    try {
      const plans = await generateLiveDestinationPlans(plannerInput)
      const selectedTier = pickSelectedTier(previousTier, plans)
      const activePlan = plans.find((plan) => plan.tier === selectedTier) ?? plans[0] ?? null

      setState((prev) => ({
        ...prev,
        plans,
        selectedTier,
        places: activePlan?.places ?? [],
        explorerLocation:
          plannerInput.targetDestination?.trim() ||
          activePlan?.destination.name ||
          prev.explorerLocation,
        plannerStatus: 'success',
        plannerError: null,
        lastPlanGeneratedAt: new Date().toISOString(),
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        plannerStatus: 'error',
        plannerError: toErrorMessage(error),
      }))
    }
  }, [state.plannerInput, state.selectedTier])

  const setExplorerLocation = useCallback((location: string) => {
    setState((prev) => ({
      ...prev,
      explorerLocation:
        prev.explorerLocation === location ? prev.explorerLocation : location,
    }))
  }, [])

  const selectTier = useCallback((tier: BudgetTier) => {
    setState((prev) => {
      const activePlan = prev.plans.find((plan) => plan.tier === tier)

      return {
        ...prev,
        selectedTier: tier,
        places: activePlan?.places ?? prev.places,
        explorerLocation: activePlan?.destination.name ?? prev.explorerLocation,
      }
    })
  }, [])

  const addExpense = useCallback(
    (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      setState((prev) => ({
        ...prev,
        expenses: [
          {
            ...expense,
            id: createId('exp'),
            createdAt: new Date().toISOString(),
          },
          ...prev.expenses,
        ],
      }))
    },
    [],
  )

  const toggleBookmark = useCallback((placeId: string) => {
    setState((prev) => {
      const exists = prev.bookmarks.includes(placeId)
      return {
        ...prev,
        bookmarks: exists
          ? prev.bookmarks.filter((id) => id !== placeId)
          : [placeId, ...prev.bookmarks],
      }
    })
  }, [])

  const addTask = useCallback(
    (payload: {
      title: string
      category: TaskCategory
      priority: TaskPriority
      dueDate: string
      assignedTo: string
    }) => {
      setState((prev) => ({
        ...prev,
        tasks: [
          {
            ...payload,
            id: createId('task'),
            completed: false,
          },
          ...prev.tasks,
        ],
      }))
    },
    [],
  )

  const toggleTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    }))
  }, [])

  const addPastTrip = useCallback((pastTrip: Omit<PastTrip, 'id'>) => {
    setState((prev) => ({
      ...prev,
      pastTrips: [
        {
          ...pastTrip,
          id: createId('trip-log'),
        },
        ...prev.pastTrips,
      ],
    }))
  }, [])

  const expenseSummary = useMemo(
    () => summarizeExpenses(state.expenses, state.participants, state.trip.budget),
    [state.expenses, state.participants, state.trip.budget],
  )

  return {
    state,
    expenseSummary,
    updatePlannerInput,
    generatePlans,
    setExplorerLocation,
    selectTier,
    addExpense,
    toggleBookmark,
    addTask,
    toggleTask,
    addPastTrip,
  }
}
