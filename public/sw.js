const CACHE_VERSION = 'onestoptrip-v2'

const scopePath = new URL(self.registration.scope).pathname
const scopedAsset = (value) => new URL(value, self.registration.scope).toString()

const CORE_ASSETS = [
  scopedAsset('./'),
  scopedAsset('./index.html'),
  scopedAsset('./manifest.webmanifest'),
  scopedAsset('./favicon.svg'),
]

async function networkFirst(request, fallbackToIndex = false) {
  const cache = await caches.open(CACHE_VERSION)

  try {
    const response = await fetch(request)
    if (response && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }

    if (fallbackToIndex) {
      const indexFallback = await caches.match(scopedAsset('./index.html'))
      if (indexFallback) {
        return indexFallback
      }
    }

    throw new Error('Offline and no cache hit')
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)

  const updatePromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    return cached
  }

  const updated = await updatePromise
  if (updated) {
    return updated
  }

  throw new Error('Offline and no cache hit')
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset))),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  const isNavigation = event.request.mode === 'navigate'
  const isStaticAsset = ['script', 'style', 'image', 'font'].includes(event.request.destination)
  const inScope = requestUrl.pathname.startsWith(scopePath)

  if (!inScope) {
    return
  }

  if (isNavigation) {
    event.respondWith(networkFirst(event.request, true))
    return
  }

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(event.request))
    return
  }

  event.respondWith(networkFirst(event.request, false))
})
