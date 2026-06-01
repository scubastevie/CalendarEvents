// Event-specific API calls for listing, reading, and creating calendar events.
import { getApiUrl } from './config'
import type { CalendarEvent, CreateEventRequest, EventList, EventListQuery } from './types'

interface AuthorizedRequestOptions {
  accessToken: string
  signal?: AbortSignal
}

export type ListEventsOptions = AuthorizedRequestOptions & EventListQuery

export async function listEvents({
  accessToken,
  filter,
  orderBy,
  signal,
  skip,
  top,
}: ListEventsOptions) {
  const url = new URL(getApiUrl('/api/Events'))

  addQueryParam(url, '$filter', filter)
  addQueryParam(url, '$orderBy', orderBy)
  addQueryParam(url, '$skip', skip)
  addQueryParam(url, '$top', top)

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const data: EventList = await response.json()

  return data
}

export async function getEventById(
  id: string,
  { accessToken, signal }: AuthorizedRequestOptions,
) {
  const response = await fetch(getApiUrl(`/api/Events/${encodeURIComponent(id)}`), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const data: CalendarEvent = await response.json()

  return data
}

export async function createEvent(
  event: CreateEventRequest,
  { accessToken, signal }: AuthorizedRequestOptions,
) {
  const response = await fetch(getApiUrl('/api/Events'), {
    body: JSON.stringify(event),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const data: CalendarEvent = await response.json()

  return data
}

function addQueryParam(url: URL, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== '') {
    url.searchParams.set(key, String(value))
  }
}
