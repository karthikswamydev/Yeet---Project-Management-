import { ShieldAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Resource, ResourceInput, User } from '../api'
import {
  ENV_LABEL,
  ENVIRONMENTS,
  PROVIDER_ORDER,
  PROVIDERS,
  REGIONS,
  SERVICES,
  STATUS_LABEL,
  type Environment,
  type Provider,
  type ResourceStatus,
} from '../resources'
import { Modal } from './Modal'

const EMPTY: ResourceInput = {
  name: '',
  provider: 'aws',
  service: '',
  environment: 'production',
  region: '',
  identifier: '',
  url: '',
  monthly_cost: null,
  owner_id: null,
  status: 'active',
  notes: '',
}

export function ResourceModal({
  resource,
  users,
  onClose,
  onSave,
}: {
  resource: Resource | null
  users: User[]
  onClose: () => void
  onSave: (input: ResourceInput) => Promise<void>
}) {
  const [form, setForm] = useState<ResourceInput>(() => (resource ? { ...resource } : EMPTY))
  const [cost, setCost] = useState(resource?.monthly_cost?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ResourceInput>(key: K, value: ResourceInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...form, monthly_cost: cost === '' ? null : Number(cost) })
    } catch {
      // The API client already showed an error toast.
      setSaving(false)
    }
  }

  return (
    <Modal title={resource ? 'Edit resource' : 'Add resource'} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label>
            Provider
            <select value={form.provider} onChange={(e) => set('provider', e.target.value as Provider)}>
              {PROVIDER_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PROVIDERS[p].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service
            <input
              required
              list="resource-services"
              maxLength={60}
              value={form.service}
              onChange={(e) => set('service', e.target.value)}
              placeholder={SERVICES[form.provider][0] ?? 'Service'}
            />
            <datalist id="resource-services">
              {SERVICES[form.provider].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
        </div>

        <label>
          Name
          <input
            autoFocus
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. api-server, media-uploads bucket"
          />
        </label>

        <div className="form-row">
          <label>
            Environment
            <select value={form.environment} onChange={(e) => set('environment', e.target.value as Environment)}>
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {ENV_LABEL[env]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Region
            <input
              list="resource-regions"
              maxLength={50}
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder={REGIONS[form.provider]?.[0] ?? 'Optional'}
            />
            <datalist id="resource-regions">
              {(REGIONS[form.provider] ?? []).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
        </div>

        <label>
          <span>
            Identifier <span className="hint">(instance ID, bucket name, ARN…)</span>
          </span>
          <input
            className="mono-input"
            maxLength={300}
            value={form.identifier}
            onChange={(e) => set('identifier', e.target.value)}
            placeholder="i-0a1b2c3d4e5f / arn:aws:s3:::my-bucket"
          />
        </label>

        <label>
          Console link
          <input
            type="url"
            maxLength={500}
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://console.aws.amazon.com/…"
          />
        </label>

        <div className="form-row form-row-3">
          <label>
            Monthly cost (USD)
            <input
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label>
            Owner
            <select value={form.owner_id ?? ''} onChange={(e) => set('owner_id', e.target.value || null)}>
              <option value="">No owner</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => set('status', e.target.value as ResourceStatus)}>
              {(Object.keys(STATUS_LABEL) as ResourceStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Notes
          <textarea
            rows={3}
            maxLength={5000}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Instance size, what depends on it, backup policy…"
          />
        </label>

        <p className="secret-warning">
          <ShieldAlert size={14} /> Don't paste passwords, access keys or connection strings here.
        </p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={saving || !form.name.trim() || !form.service.trim()}>
            {saving ? 'Saving…' : resource ? 'Save changes' : 'Add resource'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
