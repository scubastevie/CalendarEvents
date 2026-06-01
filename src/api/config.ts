// Reads the Vite environment values used to build CivicPlus API requests.
const defaultApiOrigin = 'https://interview.civicplus.com'

export const apiOrigin = import.meta.env.VITE_API_ORIGIN ?? defaultApiOrigin
export const demoClientSecret = import.meta.env.VITE_CLIENT_SECRET
export const requestPrefix = import.meta.env.VITE_REQUEST_PREFIX

if (!requestPrefix) {
  throw new Error('Missing VITE_REQUEST_PREFIX. Add it to .env.local.')
}

export function getApiUrl(path: string) {
  const cleanOrigin = apiOrigin.replace(/\/$/, '')
  const cleanPath = path.replace(/^\//, '')

  return `${cleanOrigin}/${encodeURIComponent(requestPrefix)}/${cleanPath}`
}
