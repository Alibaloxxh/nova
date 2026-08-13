import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, dbReady } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/admin')
  }

  if (!dbReady) {
    return (
      <div className="container section">
        <p className="alert alert-error">Supabase is not configured. See README.</p>
      </div>
    )
  }

  return (
    <div className="container">
      <form className="card login-card" onSubmit={submit}>
        <h1>Admin sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>Sign in with your Nova account to manage the store.</p>
        <label className="field">
          <span className="field-label">Email</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}