import { useMemo } from 'react'
import { Marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

// Formule: $...$ in linea, $$...$$ a blocco; un errore di sintassi mostra la formula in rosso invece di rompere la pagina.
const markdown = new Marked(markedKatex({ throwOnError: false, nonStandard: true }))

/**
 * Note in Markdown con formule. Caricato solo quando si apre l'anteprima (marked e KaTeX pesano).
 * L'HTML passa da DOMPurify: le note possono arrivare da un backup importato.
 */
function MarkdownPreview({ source, emptyText }: { source: string; emptyText: string }) {
  const html = useMemo(() => DOMPurify.sanitize(markdown.parse(source, { async: false })), [source])
  if (!source.trim()) return <p className="panel-meta">{emptyText}</p>
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
}

export default MarkdownPreview
