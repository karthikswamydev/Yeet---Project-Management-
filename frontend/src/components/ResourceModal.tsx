import { Link2, ShieldAlert } from 'lucide-react'
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
import { Avatar } from './Avatar'
import { Modal } from './Modal'
import { ProviderBadge } from './ProviderBadge'
import { SelectField } from './SelectField'

const STATUS_HINT: Record<ResourceStatus, string> = {
  active: 'In use today',
  planned: 'Not created yet',
  retired: 'Shut down; kept for the record',
}

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

  const providerOptions = PROVIDER_ORDER.map((p) => ({
    value: p,
    label: PROVIDERS[p].label,
    icon: <ProviderBadge provider={p} />,
  }))
  const envOptions = ENVIRONMENTS.map((env) => ({
    value: env,
    label: ENV_LABEL[env],
    icon: <span className={`env-dot env-dot-${env}`} />,
  }))
  const statusOptions = (Object.keys(STATUS_LABEL) as ResourceStatus[]).map((st) => ({
    value: st,
    label: STATUS_LABEL[st],
    icon: <span className={`status-dot status-dot-${st}`} />,
    hint: STATUS_HINT[st],
  }))
  const ownerOptions = [
    { value: '', label: 'No owner', icon: <span className="avatar-empty select-avatar" /> },
    ...users.map((u) => ({ value: u.id, label: u.name, icon: <Avatar name={u.name} size={22} />, hint: u.email ?? undefined })),
  ]

  return (
    <Modal title={resource ? 'Edit resource' : 'Add resource'} onClose={onClose} wide>
      <form className="form resource-form" onSubmit={submit}>
        <p className="form-intro">Track a server, bucket, database or service this project depends on.</p>

        <fieldset className="form-section">
          <legend>What it is</legend>
          <div className="form-row">
            <div className="field">
              <span className="field-label">Provider</span>
              <SelectField
                ariaLabel="Provider"
                value={form.provider}
                options={providerOptions}
                onChange={(v) => set('provider', v as Provider)}
              />
            </div>
            <label className="field">
              <span className="field-label">
                Service <span className="req">*</span>
              </span>
              <input
                required
                list="resource-services"
                maxLength={60}
                value={form.service}
                onChange={(e) => set('service', e.target.value)}
                placeholder={`e.g. ${SERVICES[form.provider].slice(0, 2).join(', ')}`}
              />
              <datalist id="resource-services">
                {SERVICES[form.provider].map((sv) => (
                  <option key={sv} value={sv} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="field">
            <span className="field-label">
              Name <span className="req">*</span>
            </span>
            <input
              autoFocus
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. api-server, media-uploads"
            />
          </label>
        </fieldset>

        <fieldset className="form-section">
          <legend>Where it runs</legend>
          <div className="form-row">
            <div className="field">
              <span className="field-label">Environment</span>
              <SelectField
                ariaLabel="Environment"
                value={form.environment}
                options={envOptions}
                onChange={(v) => set('environment', v as Environment)}
              />
            </div>
            <label className="field">
              <span className="field-label">Region</span>
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
          <label className="field">
            <span className="field-label">Identifier</span>
            <input
              className="mono-input"
              maxLength={300}
              value={form.identifier}
              onChange={(e) => set('identifier', e.target.value)}
              placeholder="i-0a1b2c3d4e5f  or  arn:aws:s3:::my-bucket"
            />
            <span className="field-help">Instance ID, bucket name or ARN, whatever finds it fastest.</span>
          </label>
          <label className="field">
            <span className="field-label">Console link</span>
            <span className="input-group">
              <span className="input-adorn icon">
                <Link2 size={15} />
              </span>
              <input
                type="url"
                maxLength={500}
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="https://console.aws.amazon.com/…"
              />
            </span>
          </label>
        </fieldset>

        <fieldset className="form-section">
          <legend>Ownership &amp; cost</legend>
          <div className="form-row form-row-3">
            <label className="field">
              <span className="field-label">Monthly cost</span>
              <span className="input-group">
                <span className="input-adorn">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
                <span className="input-adorn end">/mo</span>
              </span>
            </label>
            <div className="field">
              <span className="field-label">Owner</span>
              <SelectField
                ariaLabel="Owner"
                value={form.owner_id ?? ''}
                options={ownerOptions}
                onChange={(v) => set('owner_id', v || null)}
              />
            </div>
            <div className="field">
              <span className="field-label">Status</span>
              <SelectField
                ariaLabel="Status"
                value={form.status}
                options={statusOptions}
                onChange={(v) => set('status', v as ResourceStatus)}
              />
            </div>
          </div>
          <label className="field">
            <span className="field-label">Notes</span>
            <textarea
              rows={3}
              maxLength={5000}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Instance size, what depends on it, backup policy…"
            />
          </label>
        </fieldset>

        <p className="secret-note">
          <ShieldAlert size={16} />
          <span>Keep secrets out: don&apos;t paste passwords, access keys or connection strings.</span>
        </p>

        <div className="form-actions modal-footer">
          <button type="button" className="btn subtle" onClick={onClose}>
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
