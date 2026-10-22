import { createStytchB2BClient } from '@stytch/react/b2b'

// The public token is safe to ship to browsers; it only identifies the Stytch project.
const publicToken = import.meta.env.VITE_STYTCH_PUBLIC_TOKEN as string | undefined

// Null when Stytch isn't configured (dev mode without login).
export const stytch = publicToken ? createStytchB2BClient(publicToken) : null

// Where Stytch's magic-link emails send people back to. Must also be listed under
// Redirect URLs in the Stytch dashboard.
// How long a sign-in lasts. Must not exceed the maximum session duration set under
// SDK configuration in the Stytch dashboard (new projects default to 60 minutes).
export const sessionMinutes = Number(import.meta.env.VITE_STYTCH_SESSION_MINUTES) || 60

export const authenticateUrl = () => `${window.location.origin}/authenticate`

export async function signOut() {
  try {
    // Ends the session at Stytch too, not just in this browser.
    await stytch?.session.revoke()
  } catch {
    // Already expired or unreachable: the local cookies are cleared either way.
  }
  window.location.replace('/')
}
