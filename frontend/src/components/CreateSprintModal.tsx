import { useState, type FormEvent } from 'react'
import { api, type Sprint } from '../api'
import { Modal } from './Modal'

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function CreateSprintModal({
  projectId,
  nextNumber,
  onClose,
  onCreated,
}: {
  projectId: string
  nextNumber: number
  onClose: () => void
  onCreated: (s: Sprint) => void
}) {
  const [name, setName] = useState(`Sprint ${nextNumber}`)
  const [goal, setGoal] = useState('')
  const [start, setStart] = useState(() => iso(new Date()))
  const [due, setDue] = useState(() => iso(new Date(Date.now() + 14 * 86_400_000)))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onCreated(await api.createSprint(projectId, { name, goal, start_date: start || null, due_date: due }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <Modal title="Create sprint" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Sprint name
          <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Goal
          <textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What should this sprint achieve?" />
        </label>
        <div className="form-row">
          <label>
            Start date
            <input type="date" value={start} max={due || undefined} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            Due date
            <input type="date" required value={due} min={start || undefined} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={saving || !name.trim() || !due}>
            {saving ? 'Creating…' : 'Create sprint'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
