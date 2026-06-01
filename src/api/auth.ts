// Handles login and access-token retrieval for the CivicPlus API.
import { demoClientSecret, getApiUrl, requestPrefix } from './config'
import type { AuthCredentials, AuthDto, AuthResponse } from './types'

export async function authenticate(credentials: AuthCredentials = {}) {
  const clientSecret = credentials.clientSecret ?? demoClientSecret

  if (!clientSecret) {
    throw new Error('Missing client secret. Add VITE_CLIENT_SECRET to .env.local.')
  }

  const authDto: AuthDto = {
    clientId: credentials.requestPrefix ?? requestPrefix,
    clientSecret,
  }

  const response = await fetch(getApiUrl('/api/Auth'), {
    body: JSON.stringify(authDto),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const data: AuthResponse = await response.json()

  return data
}

export async function getAccessToken(credentials: AuthCredentials = {}) {
  const response = await authenticate(credentials)
  const accessToken = response.access_token ?? response.accessToken ?? response.token

  if (!accessToken) {
    throw new Error('Auth response did not include an access token.')
  }

  return accessToken
}
