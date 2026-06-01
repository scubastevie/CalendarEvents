export interface AuthCredentials {
  clientSecret?: string
  requestPrefix?: string
}

export interface AuthDto {
  clientId: string
  clientSecret: string
}

export interface AuthResponse {
  access_token?: string
  accessToken?: string
  token?: string
  token_type?: string
  expires_in?: number
}

export interface CalendarEvent {
  id?: string
  title?: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface EventList {
  total?: number
  items?: CalendarEvent[]
}

export interface EventListQuery {
  top?: number
  skip?: number
  filter?: string
  orderBy?: string
}

export type CreateEventRequest = Omit<CalendarEvent, 'id'>
