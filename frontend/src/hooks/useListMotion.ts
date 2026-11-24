import { useRef, useState } from 'react'

// Entrata: dissolvenza con una piccola discesa. Solo per le righe aggiunte dall'utente, non al caricamento.
const ENTER = 'animate-in fade-in-0 slide-in-from-top-1 duration-200 ease-out'

/** Riga che si sta chiudendo: `done` risolve a fine animazione, `cancel` la riporta com'era. */
export interface Leaving { done: Promise<void>; cancel: () => void }

/**
 * Righe di una lista che entrano ed escono senza comparire o sparire di colpo.
 * - `ref(key)` va sul `<li>`, `enter(key)` nella sua className;
 * - `added(key)` quando arriva una riga nuova (creata o ripristinata con Annulla);
 * - `leave(key, delay)` prima di toglierla: ne chiude altezza e opacità.
 */
export function useListMotion<K>() {
  const rows = useRef(new Map<K, HTMLElement>())
  const [fresh, setFresh] = useState<ReadonlySet<K>>(() => new Set())
  return {
    ref: (key: K) => (el: HTMLElement | null) => { if (el) rows.current.set(key, el); else rows.current.delete(key) },
    enter: (key: K) => (fresh.has(key) ? ENTER : undefined),
    added: (key: K) => setFresh((current) => new Set(current).add(key)),
    leave: (key: K, delay = 0): Leaving => collapse(rows.current.get(key), delay),
  }
}

function collapse(el: HTMLElement | undefined, delay: number): Leaving {
  // La regola CSS su "riduci movimento" non tocca le Web Animations: qui va controllata a mano.
  if (!el?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { done: Promise.resolve(), cancel: () => {} }
  const style = getComputedStyle(el)
  el.style.overflow = 'hidden'
  const animation = el.animate(
    [
      { height: `${el.offsetHeight}px`, opacity: 1, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom },
      { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' },
    ],
    // Uscita più rapida dell'entrata, con accelerazione: la riga "se ne va".
    { duration: 200, delay, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
  )
  return {
    done: animation.finished.then(() => undefined, () => undefined),
    cancel: () => { animation.cancel(); el.style.overflow = '' },
  }
}
