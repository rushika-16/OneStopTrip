import compression from 'compression'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'

const app = express()

const PORT = Number(process.env.TRAVEL_PROXY_PORT || 8787)
const ALLOWED_ORIGINS = (process.env.TRAVEL_PROXY_ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const cacheStore = new Map()

function nowMs() {
  return Date.now()
}

function getCached(key) {
  const cached = cacheStore.get(key)
  if (!cached) {
    return null
  }

  if (cached.expiresAt <= nowMs()) {
    cacheStore.delete(key)
    return null
  }

  return cached.value
}

function setCached(key, value, ttlMs) {
  cacheStore.set(key, {
    value,
    expiresAt: nowMs() + ttlMs,
  })
}

function clearExpiredCache() {
  const current = nowMs()
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= current) {
      cacheStore.delete(key)
    }
  }
}

setInterval(clearExpiredCache, 60_000).unref()

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function fetchJsonWithRetry(url, init = {}, options = {}) {
  const retries = options.retries ?? 2
  const timeoutMs = options.timeoutMs ?? 14_000

  let attempt = 0
  let lastError

  while (attempt <= retries) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.headers ?? {}),
        },
      })

      if (!response.ok) {
        const retryable = response.status >= 500 || response.status === 429
        if (retryable && attempt < retries) {
          await sleep(220 * (attempt + 1))
          attempt += 1
          continue
        }

        const body = await response.text()
        throw new Error(`HTTP ${response.status} ${body.slice(0, 180)}`)
      }

      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt >= retries) {
        throw lastError
      }
      await sleep(220 * (attempt + 1))
      attempt += 1
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError
}

async function withCache(cacheKey, ttlMs, fn) {
  const cached = getCached(cacheKey)
  if (cached !== null) {
    return cached
  }

  const value = await fn()
  setCached(cacheKey, value, ttlMs)
  return value
}

function sendProxyError(response, error) {
  const message = error instanceof Error ? error.message : 'Proxy upstream failed'
  response.status(502).json({
    error: true,
    message,
  })
}

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
)
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('tiny'))

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.TRAVEL_PROXY_RATE_LIMIT || 180),
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by TRAVEL_PROXY_ALLOWED_ORIGINS'))
    },
  }),
)

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    cacheEntries: cacheStore.size,
    time: new Date().toISOString(),
  })
})

app.get('/api/fx', async (request, response) => {
  try {
    const from = String(request.query.from || '').toUpperCase()
    const to = String(request.query.to || '').toUpperCase()

    if (!from || !to) {
      response.status(400).json({ error: true, message: 'from and to are required' })
      return
    }

    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`

    const payload = await withCache(`fx:${from}:${to}`, 10 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.get('/api/geocode', async (request, response) => {
  try {
    const name = String(request.query.name || '').trim()
    const count = Math.max(1, Math.min(12, Number(request.query.count || 8)))

    if (!name) {
      response.status(400).json({ error: true, message: 'name is required' })
      return
    }

    const url =
      'https://geocoding-api.open-meteo.com/v1/search?' +
      new URLSearchParams({
        name,
        count: String(count),
        language: 'en',
        format: 'json',
      }).toString()

    const payload = await withCache(`geo:${name}:${count}`, 30 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.get('/api/countries/region/:region', async (request, response) => {
  try {
    const region = request.params.region
    const url =
      `https://restcountries.com/v3.1/region/${encodeURIComponent(region)}?` +
      'fields=name,cca2,population,capital,currencies,region'

    const payload = await withCache(`country-region:${region}`, 24 * 60 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.get('/api/countries/name/:name', async (request, response) => {
  try {
    const name = request.params.name
    const url =
      `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?` +
      'fields=name,cca2,population,capital,currencies,region'

    const payload = await withCache(`country-name:${name}`, 24 * 60 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.get('/api/countries/code/:code', async (request, response) => {
  try {
    const code = request.params.code
    const url =
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}?` +
      'fields=name,cca2,population,capital,currencies,region'

    const payload = await withCache(`country-code:${code}`, 24 * 60 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.post('/api/overpass', async (request, response) => {
  try {
    const query = String(request.body?.query || '').trim()

    if (!query) {
      response.status(400).json({ error: true, message: 'query is required' })
      return
    }

    const payload = await withCache(`overpass:${query}`, 12 * 60 * 60 * 1000, () =>
      fetchJsonWithRetry(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: new URLSearchParams({ data: query }).toString(),
        },
        { timeoutMs: 26_000, retries: 1 },
      ),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.get('/api/wiki/pageviews', async (request, response) => {
  try {
    const article = String(request.query.article || '').trim()
    const start = String(request.query.start || '').trim()
    const end = String(request.query.end || '').trim()

    if (!article || !start || !end) {
      response.status(400).json({
        error: true,
        message: 'article, start, and end are required',
      })
      return
    }

    const url =
      'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' +
      `en.wikipedia.org/all-access/user/${encodeURIComponent(article)}/daily/${start}/${end}`

    const payload = await withCache(`wiki-pv:${article}:${start}:${end}`, 6 * 60 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.get('/api/wiki/geosearch', async (request, response) => {
  try {
    const lat = String(request.query.lat || '').trim()
    const lon = String(request.query.lon || '').trim()
    const radius = String(request.query.radius || '10000').trim()
    const limit = String(request.query.limit || '15').trim()

    if (!lat || !lon) {
      response.status(400).json({ error: true, message: 'lat and lon are required' })
      return
    }

    const url =
      'https://en.wikipedia.org/w/api.php?' +
      new URLSearchParams({
        action: 'query',
        list: 'geosearch',
        gscoord: `${lat}|${lon}`,
        gsradius: radius,
        gslimit: limit,
        format: 'json',
        origin: '*',
      }).toString()

    const payload = await withCache(`wiki-geo:${lat}:${lon}:${radius}:${limit}`, 3 * 60 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.get('/api/worldbank/ppp', async (request, response) => {
  try {
    const countryCode = String(request.query.countryCode || '').trim()

    if (!countryCode) {
      response.status(400).json({ error: true, message: 'countryCode is required' })
      return
    }

    const url =
      `https://api.worldbank.org/v2/country/${encodeURIComponent(countryCode)}` +
      '/indicator/PA.NUS.PPP?format=json&per_page=6'

    const payload = await withCache(`worldbank-ppp:${countryCode}`, 24 * 60 * 60 * 1000, () =>
      fetchJsonWithRetry(url),
    )

    response.json(payload)
  } catch (error) {
    sendProxyError(response, error)
  }
})

app.listen(PORT, () => {
  console.log(`OneStopTrip travel proxy running on http://localhost:${PORT}`)
})
