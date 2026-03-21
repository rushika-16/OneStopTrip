import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import type {
  ExplorerPlace,
  PlannerInput,
  PlannerPlan,
  TravelState,
  TripTask,
} from './types/travel'

const STORAGE_KEY = 'onestoptrip-state-v1'

function createPlannerInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    totalBudget: 2400,
    budgetCurrency: 'USD',
    travelDays: 6,
    currentLocation: 'Mumbai',
    travelerCount: 3,
    tripType: 'leisure',
    destinationType: 'beach',
    travelScope: 'either',
    hasVisa: false,
    foodPreferences: ['veg'],
    activityPreferences: ['culture walk'],
    travelMonth: 6,
    ...overrides,
  }
}

function createPlaces(): ExplorerPlace[] {
  return [
    {
      id: 'place-1',
      name: 'City Museum',
      type: 'attractions',
      cuisineTags: [],
      budgetBand: 'low',
      rating: 4.7,
      distanceKm: 2,
      estimatedCost: 20,
      mapUrl: 'https://maps.google.com/?q=City+Museum',
      reviewSnippet: 'A compact museum with excellent city history exhibits.',
    },
    {
      id: 'place-2',
      name: 'Garden Cafe',
      type: 'food',
      cuisineTags: ['veg', 'brunch'],
      budgetBand: 'mid',
      rating: 4.5,
      distanceKm: 1.1,
      estimatedCost: 18,
      mapUrl: 'https://maps.google.com/?q=Garden+Cafe',
      reviewSnippet: 'Relaxed brunch stop with vegetarian plates.',
    },
  ]
}

function createTasks(): TripTask[] {
  return [
    {
      id: 'task-1',
      title: 'Book flights',
      category: 'pre-trip',
      priority: 'high',
      dueDate: '2026-05-01',
      assignedTo: 'u1',
      completed: false,
    },
  ]
}

function createExpenses(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `exp-${index + 1}`,
    title: `Expense ${index + 1}`,
    category: 'food' as const,
    amount: 10 * (index + 1),
    paidBy: 'u1',
    splitMode: 'equal' as const,
    createdAt: new Date().toISOString(),
  }))
}

function createPlan(currency: PlannerInput['budgetCurrency']): PlannerPlan {
  const places = createPlaces()

  return {
    tier: 'mid-range',
    destination: {
      id: 'plan-city-1',
      name: 'Mumbai',
      country: 'India',
      countryCode: 'IN',
      latitude: 19.07,
      longitude: 72.87,
      timezone: 'Asia/Kolkata',
      scope: 'domestic',
      type: 'city',
      popularityScore: 1000,
      primaryCurrency: 'INR',
      visaRequired: false,
      foodTags: ['veg'],
      activityTags: ['museum'],
    },
    route: ['Mumbai, India'],
    breakdown: {
      transport: 300,
      accommodation: 900,
      food: 450,
      activities: 350,
      total: 2000,
      perPerson: 667,
      currency,
      totalInUsd: 2000,
    },
    itinerary: [
      {
        day: 1,
        city: 'Mumbai',
        title: 'Day 1: Explore Mumbai',
        highlights: ['Morning visit', 'Lunch break', 'Afternoon activity'],
        schedule: [
          {
            time: '09:00',
            activity: 'Morning visit: City Museum',
            place: 'City Museum',
            city: 'Mumbai',
            mapUrl: 'https://maps.google.com/?q=City+Museum',
            estimatedCost: 20,
          },
        ],
        estimatedDailyCost: 200,
      },
    ],
    summary: 'Sample plan summary',
    isWithinBudget: true,
    notes: ['Generated from live sources'],
    budgetOptimizerTips: ['Keep 10% contingency'],
    places,
  }
}

function createStoredState(overrides: Partial<TravelState> = {}): Partial<TravelState> {
  const plannerInput = createPlannerInput(overrides.plannerInput)
  const trip = {
    id: 'trip-main',
    name: 'OneStopTrip Escape',
    budget: plannerInput.totalBudget,
    startDate: '2026-06-10',
    endDate: '2026-06-16',
    baseLocation: plannerInput.currentLocation,
    ...overrides.trip,
  }

  return {
    trip,
    participants: overrides.participants ?? [
      { id: 'u1', name: 'Rushika' },
      { id: 'u2', name: 'Aarav' },
      { id: 'u3', name: 'Mia' },
    ],
    plannerInput,
    plannerStatus: overrides.plannerStatus ?? 'success',
    plannerError: overrides.plannerError ?? null,
    lastPlanGeneratedAt: overrides.lastPlanGeneratedAt ?? '2026-03-20T12:00:00.000Z',
    explorerLocation: overrides.explorerLocation ?? plannerInput.currentLocation,
    plans: overrides.plans ?? [createPlan(plannerInput.budgetCurrency)],
    selectedTier: overrides.selectedTier ?? 'mid-range',
    expenses: overrides.expenses ?? [],
    places: overrides.places ?? createPlaces(),
    bookmarks: overrides.bookmarks ?? [],
    tasks: overrides.tasks ?? createTasks(),
    pastTrips: overrides.pastTrips ?? [
      {
        id: 'past-1',
        name: 'Goa Long Weekend',
        location: 'North Goa, India',
        startDate: '2025-11-14',
        endDate: '2025-11-17',
        budget: 1800,
        actualSpend: 1685,
        travelers: ['Rushika', 'Aarav', 'Mia'],
        highlights: ['Sunset cruise'],
        notes: 'Worked well.',
      },
    ],
  }
}

function renderApp(overrides: Partial<TravelState> = {}, route = '/') {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createStoredState(overrides)))
  window.history.pushState({}, '', route)

  return render(<App />)
}

function clickModule(label: string) {
  const button = screen.getByText(label).closest('button')

  if (!button) {
    throw new Error(`Module button not found for ${label}`)
  }

  fireEvent.click(button)
}

describe('App integration', () => {
  it('sanitizes persisted demo names and removes the traveler count from the welcome subtitle', async () => {
    renderApp({
      trip: {
        id: 'trip-main',
        name: 'OneStopTrip Demo Escape',
        budget: 2400,
        startDate: '2026-06-10',
        endDate: '2026-06-16',
        baseLocation: 'Mumbai',
      },
    })

    expect(await screen.findByText('Welcome back!')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('OneStopTrip Escape').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/travelers/i)).not.toBeInTheDocument()
  })

  it('updates upcoming trip details from the planner page', async () => {
    renderApp()

    clickModule('Plan')
    expect(await screen.findByRole('heading', { name: 'Plan Your Trip' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('1. Budget Amount'), {
      target: { value: '3600' },
    })
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: 'Goa' },
    })

    fireEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(await screen.findByText('$3,600')).toBeInTheDocument()
    expect(screen.getByText('Goa')).toBeInTheDocument()
  })

  it('disables itinerary generation when required planner fields are invalid', async () => {
    renderApp()

    clickModule('Plan')
    expect(await screen.findByRole('heading', { name: 'Plan Your Trip' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '' },
    })

    const generateButton = screen.getByRole('button', {
      name: 'Generate Live Itinerary',
    })
    expect(generateButton).toBeDisabled()
    expect(
      screen.getByText('Add your departure city to generate an itinerary.'),
    ).toBeInTheDocument()
  })

  it('provides smooth CTA navigation from plan results to explore and track pages', async () => {
    renderApp()

    clickModule('Plan')
    expect(await screen.findByRole('heading', { name: 'Plan Your Trip' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /explore destination/i }))
    expect(await screen.findByRole('heading', { name: 'Explore Destination' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    clickModule('Plan')
    fireEvent.click(screen.getByRole('button', { name: /track your budget/i }))
    expect(await screen.findByRole('heading', { name: 'Track Expenses' })).toBeInTheDocument()
  })

  it('adds an expense and refreshes the budget summary', async () => {
    renderApp({
      trip: {
        id: 'trip-main',
        name: 'OneStopTrip Escape',
        budget: 1000,
        startDate: '2026-06-10',
        endDate: '2026-06-16',
        baseLocation: 'Mumbai',
      },
      expenses: [],
    })

    clickModule('Track')
    expect(await screen.findByRole('heading', { name: 'Track Expenses' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('What?'), {
      target: { value: 'Museum Tickets' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '120' },
    })
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'activities' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }))

    expect(await screen.findByText('Museum Tickets')).toBeInTheDocument()
    expect(screen.getAllByText('$120').length).toBeGreaterThan(0)
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument()
    expect(screen.getByText('12% used')).toBeInTheDocument()
  })

  it('requires positive share values for percentage split mode before adding expenses', async () => {
    renderApp({ expenses: [] })

    clickModule('Track')
    expect(await screen.findByRole('heading', { name: 'Track Expenses' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('What?'), {
      target: { value: 'Boat Ride' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '90' },
    })
    fireEvent.change(screen.getByLabelText('Split Mode'), {
      target: { value: 'percentage' },
    })

    const addButton = screen.getByRole('button', { name: 'Add Expense' })
    expect(addButton).toBeDisabled()
    expect(
      screen.getByText('Enter at least one positive share value before adding this expense.'),
    ).toBeInTheDocument()
  })

  it('supports expanding and collapsing the recent expense list', async () => {
    renderApp({ expenses: createExpenses(6) })

    clickModule('Track')
    expect(await screen.findByRole('heading', { name: 'Track Expenses' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: '▼ Show all 6 expenses' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '▼ Show all 6 expenses' }))
    expect(screen.getByRole('button', { name: '▲ Show less' })).toBeInTheDocument()
  })

  it('filters places and toggles bookmarks in the explorer', async () => {
    renderApp({ bookmarks: [] })

    clickModule('Explore')
    expect(await screen.findByRole('heading', { name: 'Explore Destination' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Tokyo' },
    })

    expect(screen.getByRole('heading', { name: 'Search Places' })).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toHaveValue('Tokyo')

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    clickModule('Explore')

    expect(await screen.findByRole('heading', { name: 'Search Places' })).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toHaveValue('Tokyo')

    fireEvent.change(screen.getByLabelText('What to find?'), {
      target: { value: 'museum' },
    })

    expect(await screen.findByText('Found 1 place')).toBeInTheDocument()
    expect(screen.getByText('City Museum')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument()
  })

  it('migrates legacy hardcoded explore location to the user trip location', async () => {
    renderApp({
      plannerInput: createPlannerInput({ currentLocation: 'Pune' }),
      trip: {
        id: 'trip-main',
        name: 'OneStopTrip Escape',
        budget: 2400,
        startDate: '2026-06-10',
        endDate: '2026-06-16',
        baseLocation: 'Pune',
      },
      explorerLocation: 'Maui',
    })

    clickModule('Explore')

    expect(await screen.findByRole('heading', { name: 'Search Places' })).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toHaveValue('Pune')
  })

  it('adds and completes tasks from the coordinator page', async () => {
    renderApp({ tasks: [] })

    clickModule('Coordinate')
    expect(await screen.findByRole('heading', { name: 'Coordinate Tasks' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Task'), {
      target: { value: 'Confirm airport pickup' },
    })
    fireEvent.change(screen.getByLabelText('Due Date'), {
      target: { value: '2026-06-01' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }))

    expect(await screen.findByText('Confirm airport pickup')).toBeInTheDocument()
    expect(screen.getByText('0% Complete')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox'))

    expect(await screen.findByText('100% Complete')).toBeInTheDocument()
    expect(screen.getByText('1 of 1 tasks done')).toBeInTheDocument()
  })

  it('adds a past trip and reflects the updated count on the home module card', async () => {
    renderApp({ pastTrips: [] })

    clickModule('Trip Log')
    expect(await screen.findByRole('heading', { name: 'Trip Log' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Trip Name'), {
      target: { value: 'Kerala Monsoon Break' },
    })
    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Kerala, India' },
    })
    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '2025-07-10' },
    })
    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '2025-07-15' },
    })
    fireEvent.change(screen.getByLabelText('Planned Budget'), {
      target: { value: '1400' },
    })
    fireEvent.change(screen.getByLabelText('Actual Spend'), {
      target: { value: '1290' },
    })
    fireEvent.change(screen.getByLabelText('Travelers'), {
      target: { value: 'Rushika, Aarav' },
    })
    fireEvent.change(screen.getByLabelText('Highlights'), {
      target: { value: 'Backwater cruise, tea estate' },
    })
    fireEvent.change(screen.getByLabelText('Notes'), {
      target: { value: 'Good rainy season pace.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save to Trip Log' }))

    expect(await screen.findByText('Kerala Monsoon Break')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(await screen.findByText('1 trips saved')).toBeInTheDocument()
  })

  it('blocks trip log submission for invalid date ranges', async () => {
    renderApp({ pastTrips: [] })

    clickModule('Trip Log')
    expect(await screen.findByRole('heading', { name: 'Trip Log' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Trip Name'), {
      target: { value: 'Bad Date Trip' },
    })
    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Test City' },
    })
    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '2026-06-20' },
    })
    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '2026-06-10' },
    })
    fireEvent.change(screen.getByLabelText('Planned Budget'), {
      target: { value: '1000' },
    })
    fireEvent.change(screen.getByLabelText('Actual Spend'), {
      target: { value: '900' },
    })
    fireEvent.change(screen.getByLabelText('Travelers'), {
      target: { value: 'Rushika' },
    })
    fireEvent.change(screen.getByLabelText('Highlights'), {
      target: { value: 'Beach walk' },
    })

    expect(screen.getByRole('button', { name: 'Save to Trip Log' })).toBeDisabled()
    expect(screen.getByText('End date must be on or after the start date.')).toBeInTheDocument()
  })
})
