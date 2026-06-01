import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('event API calls', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.test')
    vi.stubEnv('VITE_REQUEST_PREFIX', 'demo-prefix')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('gets events with pagination query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { listEvents } = await import('./events')

    await listEvents({
      accessToken: 'test-token',
      orderBy: 'startDate',
      skip: 10,
      top: 25,
    })

    const [url, options] = fetchMock.mock.calls[0]

    expect(url.toString()).toBe(
      'https://api.example.test/demo-prefix/api/Events?%24orderBy=startDate&%24skip=10&%24top=25',
    )
    expect(options.headers.Authorization).toBe('Bearer test-token')
  })

  it('posts a new event as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'event-1', title: 'Demo event' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { createEvent } = await import('./events')

    await createEvent(
      {
        description: 'Simple test',
        endDate: '2026-06-01T15:00:00.000Z',
        startDate: '2026-06-01T14:00:00.000Z',
        title: 'Demo event',
      },
      { accessToken: 'test-token' },
    )

    const [, options] = fetchMock.mock.calls[0]

    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer test-token')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.body).toBe(
      JSON.stringify({
        description: 'Simple test',
        endDate: '2026-06-01T15:00:00.000Z',
        startDate: '2026-06-01T14:00:00.000Z',
        title: 'Demo event',
      }),
    )
  })
})
