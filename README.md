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
- Collects budget, trip duration, location, travel scope, visa status, and preferences.
- Generates budget, mid-range, and premium options.
- Produces day-wise itineraries and detailed cost breakdowns.
- Includes seasonality and visa notes plus budget optimizer tips.

2. Group Expense Tracker
- Add expenses with categories and payer tracking.
- Supports equal, unequal, and percentage-based splitting.
- Computes who owes whom and proposes optimized settlements.
- Shows budget usage and alerts near threshold.

3. In-Destination Explorer
- Search by food, activities, and attractions.
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
- Local persistence with browser storage
- Storage event sync across tabs for collaborative-style updates
- PWA basics via manifest and service worker for offline-friendly access

## Scripts

- `npm run dev` - Start development server
- `npm run lint` - Run ESLint checks
- `npm run build` - Build production assets
- `npm run preview` - Preview production build
- `npm run test:run` - Run the full automated test suite once
- `npm run test:coverage` - Run tests with coverage reporting

## Notes

- Current data uses seeded sample trip content for immediate testing.
- Booking, payments, weather, and advisory APIs are designed as next integrations.
- The YAML block at the top allows this repo to be deployed directly as a Hugging Face Static Space.
