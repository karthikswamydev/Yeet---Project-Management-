import { StytchB2BProvider } from '@stytch/react/b2b'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { stytch } from './stytch'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {stytch ? (
      <StytchB2BProvider stytch={stytch}>
        <App />
      </StytchB2BProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
