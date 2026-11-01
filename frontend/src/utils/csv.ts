/**
 * CSV per Excel in italiano: separatore ";" (la virgola è il separatore decimale) e BOM, così le
 * lettere accentate si leggono bene. I campi con ; " o a capo vanno tra virgolette, con " raddoppiate.
 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return '\uFEFF' + rows.map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n'
}
