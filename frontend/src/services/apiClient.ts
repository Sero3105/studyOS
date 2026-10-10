const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

let accessToken: string | null = null
let csrfToken: string | null = null
let refreshHandler: (() => Promise<boolean>) | null = null
let pendingRefresh: Promise<boolean> | null = null

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function setAuthTokens(nextAccessToken: string | null, nextCsrfToken: string | null) {
  accessToken = nextAccessToken
  csrfToken = nextCsrfToken
}

export function setRefreshHandler(handler: (() => Promise<boolean>) | null) {
  refreshHandler = handler
}

async function readResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json() : null
}

async function recoverSession(): Promise<boolean> {
  if (!refreshHandler) return false
  pendingRefresh ??= refreshHandler().finally(() => { pendingRefresh = null })
  return pendingRefresh
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retryAfterRefresh = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method?.toUpperCase() ?? 'GET')) {
    headers.set('X-CSRF-Token', csrfToken)
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
  } catch {
    throw new ApiError('Errore di rete. Controlla la connessione e riprova.')
  }
  if (response.status === 401 && retryAfterRefresh && !path.startsWith('/auth/')) {
    if (await recoverSession()) return apiRequest<T>(path, options, false)
  }
  const data = await readResponse(response)
  if (!response.ok) throw new ApiError(data?.detail ?? 'Si è verificato un errore', response.status)
  return data as T
}
