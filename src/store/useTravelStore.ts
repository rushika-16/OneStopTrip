import { useCallback, useEffect, useMemo, useState } from 'react'
import { summarizeExpenses } from '../services/expenseEngine'
import { buildDestinationPlans } from '../services/plannerEngine'
import {
  type BudgetTier,
  type Expense,
  type ExplorerPlace,
  type PastTrip,
  type PlannerInput,
  type TaskCategory,
  type TaskPriority,
  type TravelState,
} from '../types/travel'

const STORAGE_KEY = 'onestoptrip-state-v1'

const DEFAULT_MONTH = new Date().getMonth() + 1

function sanitizeTripName(name: string): string {
  return name.replace(/\bDemo\s*/gi, '').replace(/\s{2,}/g, ' ').trim()
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`
}

function seedState(): TravelState {
  const plannerInput: PlannerInput = {
    totalBudget: 2400,
    travelDays: 6,
    currentLocation: 'Mumbai',
    targetDestination: '',
    travelerCount: 3,
    destinationType: 'beach',
    travelScope: 'either',
    hasVisa: false,
    foodPreferences: ['veg', 'halal'],
    activityPreferences: ['water sports', 'culture walk'],
    travelMonth: DEFAULT_MONTH,
  }

  const places: ExplorerPlace[] = [
    {
      id: 'p1',
      name: 'Coastal Spice Kitchen',
      type: 'food',
      cuisineTags: ['veg', 'halal', 'local'],
      budgetBand: 'mid',
      rating: 4.6,
      distanceKm: 1.2,
      estimatedCost: 18,
      mapUrl: 'https://maps.google.com/?q=Coastal+Spice+Kitchen',
      reviewSnippet: 'Great local flavors and quick service for groups.',
    },
    {
      id: 'p2',
      name: 'Skyline Kayak Dock',
      type: 'activities',
      cuisineTags: [],
      budgetBand: 'mid',
      rating: 4.7,
      distanceKm: 3.4,
      estimatedCost: 35,
      mapUrl: 'https://maps.google.com/?q=Skyline+Kayak+Dock',
      reviewSnippet: 'Sunset kayaking with beginner-friendly guides.',
    },
    {
      id: 'p3',
      name: 'Old Port Heritage Walk',
      type: 'attractions',
      cuisineTags: [],
      budgetBand: 'low',
      rating: 4.5,
      distanceKm: 2.1,
      estimatedCost: 10,
      mapUrl: 'https://maps.google.com/?q=Old+Port+Heritage+Walk',
      reviewSnippet: 'A compact history route with excellent photo stops.',
    },
    {
      id: 'p4',
      name: 'Green Bowl Vegan Studio',
      type: 'food',
      cuisineTags: ['vegan', 'healthy'],
      budgetBand: 'low',
      rating: 4.4,
      distanceKm: 0.9,
      estimatedCost: 12,
      mapUrl: 'https://maps.google.com/?q=Green+Bowl+Vegan+Studio',
      reviewSnippet: 'Reliable vegan choices with clear allergen labels.',
    },
  ]

  const pastTrips: PastTrip[] = [
    {
      id: 'trip-log-1',
      name: 'Goa Long Weekend',
      location: 'North Goa, India',
      startDate: '2025-11-14',
      endDate: '2025-11-17',
      budget: 1800,
      actualSpend: 1685,
      travelers: ['Rushika', 'Aarav', 'Mia'],
      highlights: ['Sunset cruise', 'Anjuna market', 'Beachfront dinner'],
      notes: 'Kept the itinerary light and stayed close to the beach for easy group movement.',
    },
    {
      id: 'trip-log-2',
      name: 'Udaipur Culture Escape',
      location: 'Udaipur, India',
      startDate: '2025-08-21',
      endDate: '2025-08-24',
      budget: 1450,
      actualSpend: 1390,
      travelers: ['Rushika', 'Mia'],
      highlights: ['City Palace', 'Lake Pichola boat ride', 'Old town cafe crawl'],
      notes: 'Worked well as a short-format trip with most transport handled through one hotel pickup.',
    },
    {
      id: 'trip-log-3',
      name: 'Istanbul Winter Sprint',
      location: 'Istanbul, Turkey',
      startDate: '2025-02-10',
      endDate: '2025-02-16',
      budget: 3200,
      actualSpend: 3015,
      travelers: ['Rushika', 'Aarav'],
      highlights: ['Bosporus ferry', 'Grand Bazaar', 'Blue Mosque at sunrise'],
      notes: 'The museum-heavy days benefited from pre-booked tickets and a tighter neighborhood plan.',
    },
  ]

  return {
    trip: {
      id: 'trip-main',
      name: 'OneStopTrip Escape',
      budget: plannerInput.totalBudget,
      startDate: '2026-06-10',
      endDate: '2026-06-16',
      baseLocation: plannerInput.currentLocation,
    },
    participants: [
      { id: 'u1', name: 'Rushika' },
      { id: 'u2', name: 'Aarav' },
      { id: 'u3', name: 'Mia' },
    ],
    plannerInput,
    explorerLocation: plannerInput.targetDestination || plannerInput.currentLocation,
    plans: buildDestinationPlans(plannerInput),
    selectedTier: 'mid-range',
    expenses: [
      {
        id: createId('exp'),
        title: 'Initial hotel booking',
        category: 'accommodation',
        amount: 720,
        paidBy: 'u1',
        splitMode: 'equal',
        createdAt: new Date().toISOString(),
      },
      {
        id: createId('exp'),
        title: 'Airport transfer',
        category: 'transport',
        amount: 120,
        paidBy: 'u2',
        splitMode: 'equal',
        createdAt: new Date().toISOString(),
      },
    ],
    places,
    bookmarks: ['p1'],
    tasks: [
      {
        id: createId('task'),
        title: 'Book outbound flights',
        category: 'pre-trip',
        priority: 'high',
        dueDate: '2026-04-02',
        assignedTo: 'u1',
        completed: true,
      },
      {
        id: createId('task'),
        title: 'Apply for visa documents',
        category: 'pre-trip',
        priority: 'high',
        dueDate: '2026-04-08',
        assignedTo: 'u2',
        completed: false,
      },
      {
        id: createId('task'),
        title: 'Create packing checklist',
        category: 'pre-trip',
        priority: 'medium',
        dueDate: '2026-05-20',
        assignedTo: 'u3',
        completed: false,
      },
    ],
    pastTrips,
  }
}

function normalizeTravelState(value: unknown): TravelState {
  const seededState = seedState()

  if (!value || typeof value !== 'object') {
    return seededState
  }

  const rawState = value as Partial<TravelState>

  return {
    ...seededState,
    ...rawState,
    trip: {
      ...seededState.trip,
      ...rawState.trip,
      name: sanitizeTripName(rawState.trip?.name ?? seededState.trip.name),
    },
    plannerInput: { ...seededState.plannerInput, ...rawState.plannerInput },
    explorerLocation:
      typeof rawState.explorerLocation === 'string' &&
      rawState.explorerLocation.trim().length > 0
        ? rawState.explorerLocation
        : seededState.explorerLocation,
    participants: Array.isArray(rawState.participants)
      ? rawState.participants
      : seededState.participants,
    plans: Array.isArray(rawState.plans) ? rawState.plans : seededState.plans,
    expenses: Array.isArray(rawState.expenses)
      ? rawState.expenses
      : seededState.expenses,
    places: Array.isArray(rawState.places) ? rawState.places : seededState.places,
    bookmarks: Array.isArray(rawState.bookmarks)
      ? rawState.bookmarks
      : seededState.bookmarks,
    tasks: Array.isArray(rawState.tasks) ? rawState.tasks : seededState.tasks,
    pastTrips: Array.isArray(rawState.pastTrips)
      ? rawState.pastTrips
      : seededState.pastTrips,
    selectedTier: rawState.selectedTier ?? seededState.selectedTier,
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
    setState((prev) => ({
      ...prev,
      plannerInput: { ...prev.plannerInput, ...patch },
      trip: {
        ...prev.trip,
        budget:
          patch.totalBudget !== undefined ? patch.totalBudget : prev.trip.budget,
        baseLocation:
          patch.currentLocation !== undefined
            ? patch.currentLocation
            : prev.trip.baseLocation,
      },
    }))
  }, [])

  const generatePlans = useCallback(() => {
    setState((prev) => ({
      ...prev,
      plans: buildDestinationPlans(prev.plannerInput),
      selectedTier: prev.selectedTier ?? 'mid-range',
    }))
  }, [])

  const setExplorerLocation = useCallback((location: string) => {
    setState((prev) => ({
      ...prev,
      explorerLocation:
        prev.explorerLocation === location ? prev.explorerLocation : location,
    }))
  }, [])

  const selectTier = useCallback((tier: BudgetTier) => {
    setState((prev) => ({ ...prev, selectedTier: tier }))
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
