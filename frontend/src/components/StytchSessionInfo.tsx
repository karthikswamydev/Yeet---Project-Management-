import { useStytchMemberSession } from '@stytch/react/b2b'
import { useState } from 'react'
import { formatDateTime } from '../time'

// Only rendered when the Stytch provider is mounted (AUTH_MODE=stytch).
export function StytchSessionInfo() {
  const { session } = useStytchMemberSession()
  // Time when the page opened; good enough for a 'session ends in' hint.
  const [now] = useState(() => Date.now())
  if (!session) return <span className="muted">No active session</span>
  const minsLeft = Math.max(0, Math.round((new Date(session.expires_at).getTime() - now) / 60_000))
  const left = minsLeft >= 120 ? `${Math.round(minsLeft / 60)} hours` : `${minsLeft} minutes`
  return (
    <dl className="kv">
      <dt>Signed in</dt>
      <dd>{formatDateTime(session.started_at)}</dd>
      <dt>Session ends</dt>
      <dd>
        {formatDateTime(session.expires_at)} <span className="muted">· in {left}</span>
      </dd>
    </dl>
  )
}
