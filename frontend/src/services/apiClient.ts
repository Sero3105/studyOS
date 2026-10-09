const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function apiRequest(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail ?? 'Si è verificato un errore')
  }

  return data
}