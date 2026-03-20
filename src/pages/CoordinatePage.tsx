import { useNavigate } from 'react-router-dom'
import { TasksPanel } from '../features/tasks/TasksPanel'
import { useTravelStore } from '../store/useTravelStore'

export function CoordinatePage() {
  const navigate = useNavigate()
  const { state, addTask, toggleTask } = useTravelStore()

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Coordinate Tasks</h1>
      </header>
      <main className="page-content">
        <TasksPanel
          tasks={state.tasks}
          participants={state.participants}
          onAddTask={addTask}
          onToggleTask={toggleTask}
        />
      </main>
    </div>
  )
}
