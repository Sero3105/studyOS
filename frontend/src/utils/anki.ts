/** Testo come campo HTML di Anki: niente tab (separano i campi), a capo come <br>. */
const field = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>')

/** File di testo che Anki importa così com'è (File → Importa): fronte, retro e tag per riga. */
export function ankiExport(cards: { front: string; back: string; tag: string }[]): string {
  const header = ['#separator:tab', '#html:true', '#tags column:3']
  const rows = cards.map((c) => [field(c.front), field(c.back), c.tag.trim().replace(/\s+/g, '_')].join('\t'))
  return [...header, ...rows].join('\n') + '\n'
}

export interface CardFace { front: string; back: string }

/** Righe "domanda :: risposta" nelle note di un argomento (anche dentro un elenco puntato). */
export function cardsFromNotes(notes: string): CardFace[] {
  return notes.split(/\r?\n/).flatMap((line) => {
    const match = /^\s*(?:[-*+]\s+)?(.+?)\s*::\s*(.+?)\s*$/.exec(line)
    return match ? [{ front: match[1], back: match[2] }] : []
  })
}

/** Da campo HTML di Anki a testo: <br> → a capo, tag tolti, entità comuni decodificate. */
const plain = (html: string) =>
  html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim()

/** Una riga CSV con virgolette ("" = virgoletta) e separatore dato. */
function splitRow(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"' && cur === '') quoted = true
    else if (ch === sep) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

/**
 * File esportato da Anki ("Note in testo semplice", con righe #intestazione) o CSV di un foglio di calcolo:
 * prime due colonne = fronte e retro. Separatore: tab, ";" o ",", il primo che compare.
 * shortcut: un campo CSV su più righe non è supportato; Anki li esporta come <br>, quindi va bene così.
 */
export function parseCardFile(text: string): CardFace[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
  const sample = lines[0] ?? ''
  const sep = sample.includes('\t') ? '\t' : sample.includes(';') ? ';' : ','
  const rows = lines.flatMap((line) => {
    const [front = '', back = ''] = splitRow(line, sep).map(plain)
    return front && back ? [{ front, back }] : []
  })
  // Intestazione di un foglio di calcolo ("Domanda;Risposta"): non è una carta.
  return /^(front|fronte|domanda|question)$/i.test(rows[0]?.front ?? '') ? rows.slice(1) : rows
}
