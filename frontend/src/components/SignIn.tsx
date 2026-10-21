import { AuthFlowType, B2BProducts, StytchB2B, useStytchMemberSession } from '@stytch/react/b2b'
import { LockKeyhole } from 'lucide-react'
import { useEffect } from 'react'
import { authenticateUrl, sessionMinutes, stytch } from '../stytch'

// Shown when the backend requires sign-in (AUTH_MODE=stytch) and there's no valid session.
export function SignIn() {
  return (
    <div className="signin">
      <div className="signin-card">
        <span className="brand-mark signin-mark">Y</span>
        <h1>Sign in to Yeet</h1>
        {stytch ? (
          <StytchLogin />
        ) : (
          <>
            <p className="signin-text">This workspace requires sign-in, but the frontend has no Stytch public token.</p>
            <p className="secret-note">
              <LockKeyhole size={16} />
              <span>
                Set <code>VITE_STYTCH_PUBLIC_TOKEN</code> for the frontend, or <code>AUTH_MODE=dev</code> on the backend to
                use the app without login.
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function StytchLogin() {
  const { session, isInitialized } = useStytchMemberSession()

  // Once Stytch has a session (after the magic link, or one already exists), start the
  // app fresh from the home page; the session cookie now goes with every API call.
  useEffect(() => {
    if (isInitialized && session) window.location.replace('/')
  }, [isInitialized, session])

  return (
    <>
      <p className="signin-text">Enter your work email and we&apos;ll send you a sign-in link.</p>
      <div className="stytch-host">
        <StytchB2B
          config={{
            products: [B2BProducts.emailMagicLinks],
            // Discovery: sign in with an email, then pick (or create) the workspace.
            authFlowType: AuthFlowType.Discovery,
            // One workspace: go straight in. Teammates join by invite, so nobody needs
            // to create another workspace from here (that made empty duplicates).
            directLoginForSingleMembership: { status: true, ignoreInvites: false, ignoreJitProvisioning: false },
            disableCreateOrganization: true,
            sessionOptions: { sessionDurationMinutes: sessionMinutes },
            emailMagicLinksOptions: {
              discoveryRedirectURL: authenticateUrl(),
              loginRedirectURL: authenticateUrl(),
              signupRedirectURL: authenticateUrl(),
            },
          }}
          presentation={{ options: { hideHeaderText: true } }}
        />
      </div>
    </>
  )
}
