import { useMemo, useState } from 'react'
import {
  type Participant,
  type TaskCategory,
  type TaskPriority,
  type TripTask,
} from '../../types/travel'

interface TasksPanelProps {
  tasks: TripTask[]
  participants: Participant[]
  onAddTask: (payload: {
    title: string
    category: TaskCategory
    priority: TaskPriority
    dueDate: string
    assignedTo: string
  }) => void
  onToggleTask: (taskId: string) => void
}

const CATEGORIES: TaskCategory[] = ['pre-trip', 'during-trip', 'post-trip']

function getParticipantName(id: string, participants: Participant[]): string {
  return participants.find((participant) => participant.id === id)?.name ?? id
}

export function TasksPanel({
  tasks,
  participants,
  onAddTask,
  onToggleTask,
}: TasksPanelProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('pre-trip')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState(participants[0]?.id ?? '')

  const readiness = useMemo(() => {
    if (tasks.length === 0) {
      return 0
    }

    const completed = tasks.filter((task) => task.completed).length
    return (completed / tasks.length) * 100
  }, [tasks])

  const grouped = useMemo(
    () =>
      CATEGORIES.reduce<Record<TaskCategory, TripTask[]>>(
        (acc, item) => {
          acc[item] = tasks.filter((task) => task.category === item)
          return acc
        },
        {
          'pre-trip': [],
          'during-trip': [],
          'post-trip': [],
        },
      ),
    [tasks],
  )

  const canSubmit = title.trim().length > 1 && dueDate.length > 0 && assignedTo.length > 0

  const submitTask = () => {
    if (!canSubmit) {
      return
    }

    onAddTask({
      title: title.trim(),
      category,
      priority,
      dueDate,
      assignedTo,
    })

    setTitle('')
    setCategory('pre-trip')
    setPriority('medium')
    setDueDate('')
  }

  return (
    <section className="panel">
      <div className="planner-grid">
        <div className="card">
          <h3>Add Task</h3>
          <div className="form-grid">
            <label>
              Task
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as TaskCategory)}
              >
                <option value="pre-trip">Pre-Trip</option>
                <option value="during-trip">During Trip</option>
                <option value="post-trip">Post-Trip</option>
              </select>
            </label>

            <label>
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
              >
                <option value="high">High 🔴</option>
                <option value="medium">Medium 🟡</option>
                <option value="low">Low 🟢</option>
              </select>
            </label>

            <label>
              Due Date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>

            <label>
              Assign To
              <select
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
              >
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="cta" disabled={!canSubmit} onClick={submitTask}>
            Add Task
          </button>
        </div>

        <div className="card">
          <h3>{readiness.toFixed(0)}% Complete</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            {tasks.filter((task) => task.completed).length} of {tasks.length} tasks done
          </p>
          <div className="progress-wrap" role="img" aria-label="Readiness progress">
            <span className="progress-bar" style={{ width: `${readiness}%` }} />
          </div>
        </div>
      </div>

      <div className="task-columns">
        {CATEGORIES.map((item) => {
          const headingMap: Record<TaskCategory, string> = {
            'pre-trip': 'Pre-Trip',
            'during-trip': 'During Trip',
            'post-trip': 'Post-Trip',
          }
          return (
          <div key={item} className="card">
            <h3>{headingMap[item]}</h3>
            {grouped[item].length > 0 ? (
              <div className="stack">
                {grouped[item].map((task) => (
                  <article
                    key={task.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '0.8rem',
                      borderLeft: task.priority === 'high' ? '4px solid #d32f2f' : task.priority === 'medium' ? '4px solid #f57c00' : '4px solid #388e3c',
                    }}
                  >
                    <label className="task-toggle">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                      />
                      <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                      Due: {task.dueDate} • {' '}
                      {getParticipantName(task.assignedTo, participants)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#999', padding: '1.5rem 0', fontSize: '0.9rem' }}>None yet</p>
            )}
          </div>
          )
        })}
      </div>
    </section>
  )
}
