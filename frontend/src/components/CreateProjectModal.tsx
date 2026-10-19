import { useState, type FormEvent } from 'react'
import { api, type Project } from '../api'
import { Modal } from './Modal'

const COLORS = ['#0047ab', '#7c3aed', '#0ea5e9', '#059669', '#ea580c', '#475569']

export function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onCreated(await api.createProject({ name, key: key || undefined, description, color }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <Modal title="Create project" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Project name
          <input autoFocus required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website redesign" />
        </label>
        <label>
          <span>
            Key <span className="hint">(optional, used in story IDs like WEB-12)</span>
          </span>
          <input maxLength={10} value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="Auto-generated from name" />
        </label>
        <label>
          Description
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="field">
          Color
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={c === color ? 'swatch selected' : 'swatch'}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
