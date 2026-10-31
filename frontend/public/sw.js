// Service worker di StudyOS: rende l'app installabile e ne tiene una copia per quando manca la rete.
// Prima la rete (un rebuild arriva subito), la cache solo se la rete non risponde.
// L'API (/api/) non passa mai dalla cache: i salvataggi falliti li gestisce già la coda del timer.
// shortcut: i vecchi asset con hash restano in cache dopo ogni rebuild (pochi KB), da ripulire se la cache cresce troppo.
const CACHE = 'studyos-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  // Tutte le pagine della SPA sono lo stesso index.html.
  const key = request.mode === 'navigate' ? '/index.html' : request
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(key, copy)))
        }
        return response
      })
      .catch(async () => (await caches.match(key)) ?? Response.error()),
  )
})
