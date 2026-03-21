---
title: OneStopTrip
emoji: "🧳"
colorFrom: blue
colorTo: teal
sdk: static
app_build_command: npm run build
app_file: dist/index.html
pinned: false
---

# OneStopTrip

OneStopTrip is a one-stop intelligent travel platform that combines:

- AI-style trip planning with budget-aware destination options
- Group expense tracking with split modes and settlement optimization
- In-destination discovery with filters and bookmarks
- Trip coordination tasks with ownership and readiness scoring
- Past trip logging so completed itineraries, spend, and highlights stay reusable

## Modules

1. Smart Travel Planner
- Collects budget amount and currency, trip duration, origin, destination/region, travel scope, visa status, trip type, and preferences.
- Pulls live data from internet sources for destination popularity, attractions, activities, and cost factors.
- Generates budget, mid-range, and premium live itinerary options.
- Produces day-wise schedules with practical sequencing and detailed budget breakdowns.
- Includes route logic, visa context, and budget optimizer tips.

2. Group Expense Tracker
- Add expenses with categories and payer tracking.
- Supports equal, unequal, and percentage-based splitting.
- Computes who owes whom and proposes optimized settlements.
- Shows budget usage and alerts near threshold.

3. In-Destination Explorer
- Search by food, activities, and attractions sourced from live itinerary generation.
- Filter by cuisine, budget, rating, and distance.
- Save bookmarks and open map directions.

4. Trip Task Tracker
- Add tasks for pre-trip, during-trip, and post-trip phases.
- Assign owners, due dates, and priority levels.
- Toggle completion and monitor readiness score.

5. Trip Log
- Save completed trips with location, dates, planned budget, actual spend, highlights, and notes.
- Review past trips in a dedicated log page.
- Reuse past trip context when planning similar getaways later.

## Tech Setup

- React + TypeScript + Vite
- Optional reliability proxy (Express) for upstream caching, retries, and rate limiting
- Live data integrations:
	- Open-Meteo Geocoding API (city and coordinate resolution)
	- OpenStreetMap Overpass API (attractions, activities, food, stays)
	- Wikimedia Pageviews + Geosearch APIs (popularity and fallback points)
	- Frankfurter API (currency conversion)
	- RestCountries API (country/currency/region metadata)
	- World Bank API (PPP-based cost normalization)
- Local persistence with browser storage
- Storage event sync across tabs for collaborative-style updates
- PWA basics via manifest and service worker for offline-friendly access

## Scripts

- `npm run dev` - Start development server
- `npm run dev:proxy` - Start optional travel proxy server locally on port 8787
- `npm run lint` - Run ESLint checks
- `npm run build` - Build production assets
- `npm run preview` - Preview production build
- `npm run start:proxy` - Run proxy in production/server environment
- `npm run test:run` - Run the full automated test suite once
- `npm run test:coverage` - Run tests with coverage reporting

## Deploying to Production

### Frontend → Hugging Face Spaces (current deploy target)

The YAML frontmatter at the top of this file is the Hugging Face Spaces config. To redeploy:

1. Push changes to the connected HF repository (or `git push` to the HF Spaces git remote).
2. HF Spaces automatically runs `npm run build` and serves `dist/index.html`.
3. *(Optional)* Set `VITE_TRAVEL_PROXY_URL` as a Space secret if you want to point to an external proxy.

### Optional Proxy Layer (local development)

To reduce client-side throttling and improve reliability under higher traffic, route live-data requests through the included proxy service.

1. Copy `.env.example` to `.env`.
2. Set `VITE_TRAVEL_PROXY_URL` to your proxy origin (for local: `http://localhost:8787`).
3. Start proxy: `npm run dev:proxy`.
4. Start app: `npm run dev`.

The frontend will automatically use proxy endpoints when `VITE_TRAVEL_PROXY_URL` is set, and keeps direct API fallbacks when it is not set.

## Notes

- The planner now runs on live internet data and no longer depends on static destination seed lists.
- If one provider is temporarily unavailable, the app degrades gracefully and prompts retry with actionable feedback.
- If the proxy is enabled, requests use centralized caching/retries/rate limiting before hitting upstream travel data sources.
- Booking/payment APIs are linked as external actions; direct booking flows are a future enhancement.
- The YAML block at the top allows this repo to be deployed directly as a Hugging Face Static Space.
