import { useState, type FormEvent } from 'react'
import { MailIcon, Sparkle } from '../components/Icons'
import { IS_DEMO } from '../lib/config'
import { Link } from '../lib/router'
import { auth } from '../lib/supabase'

export default function Login({ error, onDemo, onSignedIn }: { error?: string; onDemo: () => void; onSignedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'link' | 'password'>('link')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState<string | null>(error ?? null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      if (mode === 'link') {
        await auth.sendMagicLink(email, `${window.location.origin}/admin`)
        setSent(true)
      } else {
        await auth.signInWithPassword(email, password)
        onSignedIn()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setMessage(
        /rate|limit|security purposes/i.test(msg)
          ? 'Too many login emails in a short time. Wait a few minutes, or use your password.'
          : /invalid login|credentials/i.test(msg)
            ? 'That email and password don’t match. Try again or use an email link.'
            : msg || 'Something went wrong. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gingham grid min-h-dvh place-items-center px-4 py-10">
      <div className="card relative w-full max-w-md px-6 py-8">
        <Sparkle size={28} color="var(--color-hotpink)" className="absolute right-6 top-6 animate-twinkle" />
        <p className="font-script text-2xl text-rose">welcome back!</p>
        <h1 className="text-3xl font-semibold">Shop dashboard</h1>

        {IS_DEMO ? (
          <>
            <p className="mt-3 text-muted">
              The shop database isn’t connected yet, so this is a <strong>practice dashboard</strong>. Click around and try
              everything: changes are saved only in this browser.
            </p>
            <button className="btn btn-primary mt-6 w-full text-lg" onClick={onDemo}>
              Open practice dashboard
            </button>
          </>
        ) : sent ? (
          <div className="mt-5 rounded-2xl bg-blush p-5">
            <MailIcon className="text-rose" />
            <p className="mt-2 font-display text-lg">Check your email!</p>
            <p className="text-muted">We sent a login link to <strong>{email}</strong>. Tap it on this device to log in.</p>
            <button className="btn btn-ghost btn-sm mt-3 !px-0" onClick={() => setSent(false)}>Use a different email</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Your email</span>
              <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            {mode === 'password' && (
              <label className="block">
                <span className="label">Password</span>
                <input className="field" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}
            {message && <p role="alert" className="rounded-xl bg-blush px-3 py-2 text-sm text-rose">{message}</p>}
            <button className="btn btn-primary w-full text-lg" disabled={busy}>
              {busy ? 'One sec…' : mode === 'link' ? 'Email me a login link' : 'Log in'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => setMode(mode === 'link' ? 'password' : 'link')}>
              {mode === 'link' ? 'Use a password instead' : 'Email me a link instead'}
            </button>
          </form>
        )}
        <Link to="/" className="mt-6 block text-center text-sm text-muted underline">← Back to the shop</Link>
      </div>
    </div>
  )
}
