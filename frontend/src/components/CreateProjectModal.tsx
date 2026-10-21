import { Globe, Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, type Project, type Visibility } from '../api'
import { Modal } from './Modal'

const COLORS = ['#0047ab', '#7c3aed', '#0ea5e9', '#059669', '#ea580c', '#475569']

export function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [visibility, setVisibility] = useState<Visibility>('open')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      onCreated(await api.createProject({ name, key: key || undefined, description, color, visibility }))
    } catch {
      // The API client already showed an error toast.
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
        <div className="field">
          <span className="field-label">Visibility</span>
          <div className="choice-grid compact" role="radiogroup" aria-label="Visibility">
            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'open'}
              className={visibility === 'open' ? 'choice active' : 'choice'}
              onClick={() => setVisibility('open')}
            >
              <Globe size={16} />
              <span>
                <strong>Open</strong>
                <span>Everyone in the workspace can read it</span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'private'}
              className={visibility === 'private' ? 'choice active' : 'choice'}
              onClick={() => setVisibility('private')}
            >
              <Lock size={16} />
              <span>
                <strong>Private</strong>
                <span>Only people you add</span>
              </span>
            </button>
          </div>
          <span className="field-help">You&apos;ll be the scrum master. Add people from the project&apos;s Settings tab.</span>
        </div>
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
