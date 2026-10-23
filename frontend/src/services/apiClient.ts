import { LANGUAGE_STORAGE_KEY, isLanguage, translate } from '../i18n/translations'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function currentLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(stored) ? stored : 'it'
  } catch { return 'it' as const }
}

let accessToken: string | null = null
let csrfToken: string | null = null
let refreshHandler: (() => Promise<boolean>) | null = null
let pendingRefresh: Promise<boolean> | null = null

function csrfFromCookie(): string | null {
  const prefix = 'studyos_csrf='
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null
}

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** URL assoluto di un endpoint, per link usati fuori dall'app (es. feed iCal). */
export function apiUrl(path: string): string {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin).href
}

export function setAuthTokens(nextAccessToken: string | null, nextCsrfToken: string | null) {
  accessToken = nextAccessToken
  csrfToken = nextCsrfToken
}

export function setRefreshHandler(handler: (() => Promise<boolean>) | null) {
  refreshHandler = handler
}

/**
 * Le DELETE rispondono 204 con content-type JSON ma corpo vuoto: niente da leggere.
 * Le risposte riuscite non JSON (zip, .ics) arrivano come Blob.
 */
async function readResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (response.status === 204) return null
  if (!contentType.includes('application/json')) return response.ok ? response.blob() : null
  const body = await response.text()
  return body ? JSON.parse(body) : null
}

async function recoverSession(): Promise<boolean> {
  if (!refreshHandler) return false
  pendingRefresh ??= refreshHandler().finally(() => { pendingRefresh = null })
  return pendingRefresh
}

/** Shares startup and 401 recovery refreshes, including React StrictMode mounts. */
export function restoreAuthentication(): Promise<boolean> {
  return recoverSession()
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retryAfterRefresh = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  const currentCsrf = csrfToken ?? csrfFromCookie()
  if (currentCsrf && !['GET', 'HEAD', 'OPTIONS'].includes(options.method?.toUpperCase() ?? 'GET')) {
    headers.set('X-CSRF-Token', currentCsrf)
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
  } catch {
    throw new ApiError(translate(currentLanguage(), 'api.networkError'))
  }
  if (response.status === 401 && retryAfterRefresh && !path.startsWith('/auth/')) {
    if (await recoverSession()) return apiRequest<T>(path, options, false)
  }
  const data = await readResponse(response)
  // Gli errori di validazione FastAPI (422) hanno `detail` come lista: si mostra il primo messaggio.
  const detail = Array.isArray(data?.detail) ? data.detail[0]?.msg : data?.detail
  if (!response.ok) throw new ApiError(detail ?? translate(currentLanguage(), 'api.genericError'), response.status)
  return data as T
}
