import { useState } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase'
import { LogIn, UserPlus, Mail, LogOut, Cloud, CloudOff } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface AuthPanelProps {
  user: User | null
  loading: boolean
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onMagicLink: (email: string) => Promise<void>
  onSignOut: () => Promise<void>
  onSyncNow?: () => void
}

type AuthMode = 'login' | 'signup' | 'magic'

export function AuthPanel({
  user, loading, onSignIn, onSignUp, onMagicLink, onSignOut, onSyncNow,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const configured = isSupabaseConfigured()

  const mono = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.12em',
    
  }

  if (!configured) {
    return (
      <div className="panel-section p-4">
        <div className="flex items-center gap-2 mb-2">
          <CloudOff size={14} style={{ color: 'var(--theme-text-muted)' }} />
          <span style={{ ...mono, color: 'var(--theme-text-muted)' }}>
            CLOUD SYNC NOT CONFIGURED
          </span>
        </div>
        <p style={{ ...mono, fontSize: '9px', color: 'var(--theme-text-muted)', lineHeight: '1.5' }}>
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to enable cloud sync.
          Your library is saved locally for now.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="panel-section p-4 flex items-center gap-2">
        <Cloud size={14} className="animate-pulse" style={{ color: 'var(--theme-accent)' }} />
        <span style={{ ...mono, color: 'var(--theme-text-muted)' }}>CONNECTING...</span>
      </div>
    )
  }

  // Logged in
  if (user) {
    return (
      <div className="panel-section p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cloud size={14} style={{ color: 'var(--theme-accent)' }} />
          <span style={{ ...mono, color: 'var(--theme-accent)' }}>SYNCED</span>
        </div>
        <p className="truncate mb-3" style={{ ...mono, fontSize: '9px', color: 'var(--theme-text-secondary)' }}>
          {user.email}
        </p>
        <div className="flex gap-2">
          {onSyncNow && (
            <button
              onClick={onSyncNow}
              className="btn-outline flex items-center gap-1.5 flex-1"
              style={{ padding: '6px 10px' }}
            >
              <Cloud size={11} /> SYNC NOW
            </button>
          )}
          <button
            onClick={onSignOut}
            className="btn-outline flex items-center gap-1.5 flex-1"
            style={{ padding: '6px 10px', color: 'var(--color-error)' }}
          >
            <LogOut size={11} /> SIGN OUT
          </button>
        </div>
      </div>
    )
  }

  // Not logged in — show auth form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      if (mode === 'magic') {
        await onMagicLink(email)
        setMessage('Check your email for a login link!')
      } else if (mode === 'signup') {
        await onSignUp(email, password)
        setMessage('Check your email to confirm your account!')
      } else {
        await onSignIn(email, password)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel-section p-4">
      <div className="flex items-center gap-2 mb-3">
        <CloudOff size={14} style={{ color: 'var(--theme-text-muted)' }} />
        <span style={{ ...mono, color: 'var(--theme-text-muted)' }}>NOT SIGNED IN</span>
      </div>

      <p style={{ ...mono, fontSize: '9px', color: 'var(--theme-text-muted)', marginBottom: '10px', lineHeight: '1.5' }}>
        Sign in to save your library to the cloud. Your links, playlists, and settings sync across devices.
      </p>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-3">
        {(['login', 'signup', 'magic'] as AuthMode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); setMessage('') }}
            className={mode === m ? 'btn-accent' : 'btn-outline'}
            style={{ flex: 1, padding: '5px 6px', fontSize: '8px' }}
          >
            {m === 'login' && <><LogIn size={9} /> LOGIN</>}
            {m === 'signup' && <><UserPlus size={9} /> SIGN UP</>}
            {m === 'magic' && <><Mail size={9} /> MAGIC LINK</>}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="panel-section w-full px-3 py-2 mb-2 outline-none"
          style={{ ...mono, fontSize: '11px', color: 'var(--theme-text)' }}
          required
        />
        {mode !== 'magic' && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="panel-section w-full px-3 py-2 mb-2 outline-none"
            style={{ ...mono, fontSize: '11px', color: 'var(--theme-text)' }}
            required
            minLength={6}
          />
        )}

        {error && (
          <p style={{ ...mono, fontSize: '9px', color: 'var(--color-error)', marginBottom: '8px' }}>
            {error}
          </p>
        )}
        {message && (
          <p style={{ ...mono, fontSize: '9px', color: 'var(--theme-accent)', marginBottom: '8px' }}>
            {message}
          </p>
        )}

        <button
          type="submit"
          className="btn-accent w-full flex items-center justify-center gap-2"
          style={{ padding: '8px', opacity: submitting ? 0.5 : 1 }}
          disabled={submitting}
        >
          {mode === 'login' && <><LogIn size={12} /> SIGN IN</>}
          {mode === 'signup' && <><UserPlus size={12} /> CREATE ACCOUNT</>}
          {mode === 'magic' && <><Mail size={12} /> SEND MAGIC LINK</>}
        </button>
      </form>
    </div>
  )
}
