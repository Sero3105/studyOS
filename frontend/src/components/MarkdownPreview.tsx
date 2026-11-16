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
  if (!source.trim()) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return <div className="prose prose-sm max-w-none rounded-lg border bg-muted/20 p-4 dark:prose-invert prose-a:text-primary prose-code:font-mono" dangerouslySetInnerHTML={{ __html: html }} />
}

export default MarkdownPreview
