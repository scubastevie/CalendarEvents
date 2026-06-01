import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createEvent, getAccessToken, listEvents } from './api'

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api')

  return {
    ...actual,
    createEvent: vi.fn(),
    getAccessToken: vi.fn(),
    listEvents: vi.fn(),
  }
})

const getAccessTokenMock = vi.mocked(getAccessToken)
const listEventsMock = vi.mocked(listEvents)
const createEventMock = vi.mocked(createEvent)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAccessTokenMock.mockResolvedValue('access-token')
    listEventsMock.mockResolvedValue({
      items: [
        {
          description: 'Planning and prep',
          endDate: '2026-06-01T15:00:00.000Z',
          id: 'event-1',
          startDate: '2026-06-01T14:00:00.000Z',
          title: 'Demo Event',
        },
      ],
      total: 1,
    })
  })

  it('loads and renders events with calendar actions', async () => {
    render(<App />)

    expect(screen.getByText('Loading events')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Demo Event' })).toBeInTheDocument()
    expect(screen.getByText('Planning and prep')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download .ics' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Google Calendar' })).toHaveAttribute(
      'href',
      expect.stringContaining('calendar.google.com/calendar/render'),
    )
    expect(screen.getByText('Showing 1-1 of 1')).toBeInTheDocument()
  })

  it('has no obvious accessibility violations on the event list', async () => {
    const { container } = render(<App />)

    await screen.findByRole('heading', { name: 'Demo Event' })

    expect(await axe(container)).toHaveNoViolations()
  })

  it('requests a larger page when rows per page changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Demo Event' })
    await user.selectOptions(screen.getByLabelText('Rows per page'), '25')

    await waitFor(() => {
      expect(listEventsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          skip: 0,
          top: 25,
        }),
      )
    })
  })

  it('validates and submits the add event form', async () => {
    const user = userEvent.setup()
    createEventMock.mockResolvedValue({
      description: 'Release notes',
      endDate: '2026-06-02T16:00:00.000Z',
      id: 'event-2',
      startDate: '2026-06-02T15:00:00.000Z',
      title: 'Launch Review',
    })

    render(<App />)
    await screen.findByRole('heading', { name: 'Demo Event' })

    await user.click(screen.getByRole('button', { name: 'Add Event' }))

    const dialog = screen.getByRole('dialog', { name: 'Add Event' })
    await user.type(within(dialog).getByLabelText('Event Title'), 'Launch Review')
    await user.type(within(dialog).getByLabelText('Description'), 'Release notes')
    await user.type(within(dialog).getByLabelText('Start Date'), '2026-06-02T11:00')
    await user.type(within(dialog).getByLabelText('End Date'), '2026-06-02T12:00')
    await user.click(within(dialog).getByRole('button', { name: 'Add Event' }))

    await waitFor(() => {
      expect(createEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Release notes',
          title: 'Launch Review',
        }),
        { accessToken: 'access-token' },
      )
    })
    expect(await screen.findByRole('heading', { name: 'Launch Review' })).toBeInTheDocument()
  })

  it('has no obvious accessibility violations in the add event modal', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await screen.findByRole('heading', { name: 'Demo Event' })
    await user.click(screen.getByRole('button', { name: 'Add Event' }))

    expect(await axe(container)).toHaveNoViolations()
  })
})
