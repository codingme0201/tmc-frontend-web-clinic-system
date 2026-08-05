import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'

function Login() {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (!form.values.email || !form.values.password) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)
    try {
      await login(form.values.email, form.values.password)
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <div className="brand-mark">TC</div>
          <div>
            <strong>TMC CareLink</strong>
            <span>Trinidad Municipal College Clinic</span>
          </div>
        </div>
        <div className="login-copy">
          <p>Clinic Appointment and Medical Record Management System</p>
          <h1>Admin access for organized campus care.</h1>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div>
          <p className="form-kicker">Administrator Login</p>
          <h2 id="login-title">Welcome back</h2>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-banner" role="alert">{error}</div>}

          <label>
            Email Address
            <input
              type="email"
              placeholder="admin@tmc.edu.ph"
              value={form.values.email}
              onChange={(e) => form.setValue('email', e.target.value)}
              disabled={submitting}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter password"
              value={form.values.password}
              onChange={(e) => form.setValue('password', e.target.value)}
              disabled={submitting}
              required
            />
          </label>
          <button type="submit" className="primary-action full-width" disabled={submitting}>
            {submitting && <span className="spinner-sm" aria-hidden="true" />}
            {submitting ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
