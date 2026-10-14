/** Messaggio leggibile da un errore sconosciuto (ApiError o generico). */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
