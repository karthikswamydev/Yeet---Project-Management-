import { PROVIDERS, type Provider } from '../resources'

export function ProviderBadge({ provider }: { provider: Provider }) {
  const p = PROVIDERS[provider]
  return (
    <span className="provider-badge" style={{ background: p.color, color: p.text }} title={p.label}>
      {p.short}
    </span>
  )
}
