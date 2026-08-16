import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, dbReady } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)
      if (error) return setError(error.message)
      navigate('/admin')
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    if (data.session) {
      navigate('/account')
      return
    }
    setNotice('Account created — check your email to confirm, then sign in.')
    setMode('signin')
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
        <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          {mode === 'signin'
            ? 'Sign in to manage the store or view your orders.'
            : 'Create a Nova account to track your orders.'}
        </p>
        <label className="field">
          <span className="field-label">Email</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        {notice && <p className="alert alert-success">{notice}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
        <button
          type="button"
          className="muted"
          style={{ margin: '16px auto 0', display: 'block', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null) }}
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}