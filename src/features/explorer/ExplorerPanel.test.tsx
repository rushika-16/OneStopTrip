import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExplorerPanel } from './ExplorerPanel'
import type { ExplorerPlace } from '../../types/travel'
import * as explorerEngine from '../../services/explorerEngine'

vi.mock('../../services/explorerEngine', async () => {
  const actual = await vi.importActual<typeof import('../../services/explorerEngine')>(
    '../../services/explorerEngine',
  )

  return {
    ...actual,
    searchLivePlaces: vi.fn(),
  }
})

const mockedSearchLivePlaces = vi.mocked(explorerEngine.searchLivePlaces)

function createPlace(overrides: Partial<ExplorerPlace> = {}): ExplorerPlace {
  return {
    id: 'p1',
    name: 'City Museum',
    type: 'attractions',
    cuisineTags: [],
    budgetBand: 'low',
    rating: 4.7,
    distanceKm: 2.1,
    estimatedCost: 18,
    mapUrl: 'https://maps.google.com/?q=City+Museum',
    reviewSnippet: 'Great exhibits',
    ...overrides,
  }
}

describe('ExplorerPanel', () => {
  beforeEach(() => {
    mockedSearchLivePlaces.mockReset()
  })

  it('shows planned places by default and marks source', () => {
    render(
      <ExplorerPanel
        location="Tokyo"
        currency="USD"
        places={[createPlace()]}
        bookmarks={[]}
        onToggleBookmark={() => undefined}
        onLocationChange={() => undefined}
      />, 
    )

    expect(screen.getByText('City Museum')).toBeInTheDocument()
    expect(screen.getByText('From your plan')).toBeInTheDocument()
  })

  it('fetches live places and allows resetting back to planned places', async () => {
    mockedSearchLivePlaces.mockResolvedValue({
      cityLabel: 'Tokyo, Japan',
      places: [
        createPlace({
          id: 'live-1',
          name: 'Sushi Alley',
          type: 'food',
          cuisineTags: ['sushi'],
        }),
      ],
    })

    render(
      <ExplorerPanel
        location="Tokyo"
        currency="USD"
        places={[createPlace()]}
        bookmarks={[]}
        onToggleBookmark={() => undefined}
        onLocationChange={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Search Places' }))

    await waitFor(() => {
      expect(screen.getByText('Sushi Alley')).toBeInTheDocument()
    })

    expect(screen.getByText('Live search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use Planned Places' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Use Planned Places' }))

    expect(screen.getByText('City Museum')).toBeInTheDocument()
    expect(screen.getByText('From your plan')).toBeInTheDocument()
  })

  it('shows an error on failed live fetch and clears it when location changes', async () => {
    mockedSearchLivePlaces.mockRejectedValue(new Error('network'))

    render(
      <ExplorerPanel
        location="Tokyo"
        currency="USD"
        places={[createPlace()]}
        bookmarks={[]}
        onToggleBookmark={() => undefined}
        onLocationChange={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Search Places' }))

    await waitFor(() => {
      expect(
        screen.getByText('Could not fetch places right now. Check your connection and try again.'),
      ).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Kyoto' },
    })

    expect(
      screen.queryByText('Could not fetch places right now. Check your connection and try again.'),
    ).not.toBeInTheDocument()
  })
})
