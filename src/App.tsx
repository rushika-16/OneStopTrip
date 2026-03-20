import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { PlanPage } from './pages/PlanPage'
import { TrackPage } from './pages/TrackPage'
import { ExplorePage } from './pages/ExplorePage'
import { CoordinatePage } from './pages/CoordinatePage'
import { TripLogPage } from './pages/TripLogPage'
import './App.css'

function App() {
  const Router = import.meta.env.PROD ? HashRouter : BrowserRouter

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/coordinate" element={<CoordinatePage />} />
        <Route path="/log" element={<TripLogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
