import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  createEvent,
  getAccessToken,
  listEvents,
  type CalendarEvent,
  type CreateEventRequest,
} from './api'
import './App.css'

interface EventFormValues {
  title: string
  description: string
  startDate: string
  endDate: string
}

const emptyFormValues: EventFormValues = {
  description: '',
  endDate: '',
  startDate: '',
  title: '',
}

const pageSizeOptions = [10, 25, 50]

function App() {
  const accessTokenRef = useRef('')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [formValues, setFormValues] = useState<EventFormValues>(emptyFormValues)

  useEffect(() => {
    const abortController = new AbortController()

    async function loadEvents() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        let token = accessTokenRef.current

        if (!token) {
          token = await getAccessToken()
          accessTokenRef.current = token
        }

        const eventList = await listEvents({
          accessToken: token,
          orderBy: 'startDate',
          signal: abortController.signal,
          skip: currentPage * pageSize,
          top: pageSize,
        })

        setEvents(eventList.items ?? [])
        setTotalEvents(eventList.total ?? eventList.items?.length ?? 0)
      } catch (error) {
        if (!abortController.signal.aborted) {
          setErrorMessage(getErrorMessage(error))
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadEvents()

    return () => {
      abortController.abort()
    }
  }, [currentPage, pageSize])

  const pageCount = Math.max(1, Math.ceil(totalEvents / pageSize))
  const firstVisibleEvent = totalEvents === 0 ? 0 : currentPage * pageSize + 1
  const lastVisibleEvent = Math.min((currentPage + 1) * pageSize, totalEvents)

  const sortedEvents = useMemo(
    () =>
      [...events].sort((firstEvent, secondEvent) => {
        return getEventTime(firstEvent.startDate) - getEventTime(secondEvent.startDate)
      }),
    [events],
  )

  function updateFormValue(field: keyof EventFormValues, value: string) {
    setFormError('')
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validateEventForm(formValues)

    if (validationError) {
      setFormError(validationError)
      return
    }

    try {
      setIsSaving(true)
      setFormError('')

      let token = accessTokenRef.current

      if (!token) {
        token = await getAccessToken()
        accessTokenRef.current = token
      }

      const createdEvent = await createEvent(toCreateEventRequest(formValues), {
        accessToken: token,
      })

      setEvents((currentEvents) => [createdEvent, ...currentEvents].slice(0, pageSize))
      setTotalEvents((currentTotal) => currentTotal + 1)
      setCurrentPage(0)
      setFormValues(emptyFormValues)
      setIsModalOpen(false)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">CivicPlus Calendar</p>
          <h1>Events</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsModalOpen(true)}>
          <span aria-hidden="true">+</span>
          Add Event
        </button>
      </header>

      {errorMessage ? (
        <section className="status-panel error-panel" role="alert">
          <h2>Unable to load events</h2>
          <p>{errorMessage}</p>
        </section>
      ) : null}

      <section className="event-section" aria-live="polite">
        {isLoading ? (
          <div className="status-panel">
            <h2>Loading events</h2>
            <p>Fetching the latest calendar entries.</p>
          </div>
        ) : sortedEvents.length > 0 ? (
          <ul className="event-list">
            {sortedEvents.map((calendarEvent) => (
              <li className="event-card" key={getEventKey(calendarEvent)}>
                <div className="event-date">
                  <span>{formatDatePart(calendarEvent.startDate, 'month')}</span>
                  <strong>{formatDatePart(calendarEvent.startDate, 'day')}</strong>
                </div>
                <div className="event-content">
                  <h2>{calendarEvent.title || 'Untitled event'}</h2>
                  <p>{calendarEvent.description || 'No description provided.'}</p>
                  <dl>
                    <div>
                      <dt>Starts</dt>
                      <dd>{formatEventDate(calendarEvent.startDate)}</dd>
                    </div>
                    <div>
                      <dt>Ends</dt>
                      <dd>{formatEventDate(calendarEvent.endDate)}</dd>
                    </div>
                  </dl>
                  <div className="event-actions" aria-label="Calendar export options">
                    {canExportEvent(calendarEvent) ? (
                      <>
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => downloadIcsFile(calendarEvent)}
                        >
                          Download .ics
                        </button>
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => downloadIcsFile(calendarEvent)}
                        >
                          Apple Calendar
                        </button>
                        <a
                          className="secondary-button compact-button"
                          href={getGoogleCalendarUrl(calendarEvent)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Google Calendar
                        </a>
                      </>
                    ) : (
                      <p className="export-note">Calendar export needs a start and end date.</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="status-panel">
            <h2>No events yet</h2>
            <p>Add the first event to start building the calendar.</p>
          </div>
        )}
      </section>

      <footer className="pagination-bar" aria-label="Event pagination">
        <label className="page-size-control">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setCurrentPage(0)
            }}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <p className="pagination-summary">
          Showing {firstVisibleEvent}-{lastVisibleEvent} of {totalEvents}
        </p>

        <div className="pagination-actions">
          <button
            className="secondary-button compact-button"
            disabled={currentPage === 0 || isLoading}
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
          >
            Previous
          </button>
          <span aria-live="polite">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            className="secondary-button compact-button"
            disabled={currentPage >= pageCount - 1 || isLoading}
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(pageCount - 1, page + 1))}
          >
            Next
          </button>
        </div>
      </footer>

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="add-event-title"
            aria-modal="true"
            className="modal"
            role="dialog"
          >
            <div className="modal-header">
              <h2 id="add-event-title">Add Event</h2>
              <button
                aria-label="Close modal"
                className="icon-button"
                type="button"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="event-form" onSubmit={handleCreateEvent}>
              <label>
                <span>Event Title</span>
                <input
                  required
                  type="text"
                  value={formValues.title}
                  onChange={(event) => updateFormValue('title', event.target.value)}
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  required
                  rows={4}
                  value={formValues.description}
                  onChange={(event) => updateFormValue('description', event.target.value)}
                />
              </label>

              <div className="form-grid">
                <label>
                  <span>Start Date</span>
                  <input
                    required
                    type="datetime-local"
                    value={formValues.startDate}
                    onChange={(event) => updateFormValue('startDate', event.target.value)}
                  />
                </label>

                <label>
                  <span>End Date</span>
                  <input
                    required
                    type="datetime-local"
                    value={formValues.endDate}
                    onChange={(event) => updateFormValue('endDate', event.target.value)}
                  />
                </label>
              </div>

              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={isSaving} type="submit">
                  {isSaving ? 'Saving...' : 'Add Event'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}

function toCreateEventRequest(formValues: EventFormValues): CreateEventRequest {
  return {
    description: formValues.description.trim(),
    endDate: new Date(formValues.endDate).toISOString(),
    startDate: new Date(formValues.startDate).toISOString(),
    title: formValues.title.trim(),
  }
}

function validateEventForm(formValues: EventFormValues) {
  if (!formValues.title.trim()) {
    return 'Event title is required.'
  }

  if (!formValues.description.trim()) {
    return 'Description is required.'
  }

  if (!formValues.startDate) {
    return 'Start date is required.'
  }

  if (!formValues.endDate) {
    return 'End date is required.'
  }

  if (new Date(formValues.endDate) <= new Date(formValues.startDate)) {
    return 'End date must be after the start date.'
  }

  return ''
}

function formatDatePart(dateValue: string | undefined, part: 'day' | 'month') {
  if (!dateValue) {
    return part === 'month' ? 'TBD' : '--'
  }

  return new Intl.DateTimeFormat('en-US', {
    day: part === 'day' ? '2-digit' : undefined,
    month: part === 'month' ? 'short' : undefined,
  }).format(new Date(dateValue))
}

function formatEventDate(dateValue: string | undefined) {
  if (!dateValue) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

function getEventTime(dateValue: string | undefined) {
  if (!dateValue) {
    return Number.MAX_SAFE_INTEGER
  }

  return new Date(dateValue).getTime()
}

function getEventKey(calendarEvent: CalendarEvent) {
  return calendarEvent.id ?? `${calendarEvent.title}-${calendarEvent.startDate}`
}

function canExportEvent(calendarEvent: CalendarEvent) {
  return Boolean(calendarEvent.startDate && calendarEvent.endDate)
}

function downloadIcsFile(calendarEvent: CalendarEvent) {
  const blob = new Blob([createIcsFile(calendarEvent)], {
    type: 'text/calendar;charset=utf-8',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${getCalendarFileName(calendarEvent)}.ics`
  document.body.append(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function createIcsFile(calendarEvent: CalendarEvent) {
  const now = formatCalendarDate(new Date().toISOString())
  const startDate = formatCalendarDate(calendarEvent.startDate)
  const endDate = formatCalendarDate(calendarEvent.endDate)
  const title = calendarEvent.title || 'Untitled event'
  const description = calendarEvent.description || ''
  const uid = calendarEvent.id ?? `${title}-${calendarEvent.startDate}`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CivicPlus Calendar Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

function getGoogleCalendarUrl(calendarEvent: CalendarEvent) {
  const url = new URL('https://calendar.google.com/calendar/render')

  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', calendarEvent.title || 'Untitled event')
  url.searchParams.set(
    'dates',
    `${formatCalendarDate(calendarEvent.startDate)}/${formatCalendarDate(calendarEvent.endDate)}`,
  )

  if (calendarEvent.description) {
    url.searchParams.set('details', calendarEvent.description)
  }

  return url.toString()
}

function formatCalendarDate(dateValue: string | undefined) {
  if (!dateValue) {
    return ''
  }

  return new Date(dateValue).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function getCalendarFileName(calendarEvent: CalendarEvent) {
  const fileName = (calendarEvent.title || 'calendar-event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return fileName || 'calendar-event'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export default App
