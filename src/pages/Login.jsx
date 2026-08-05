import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'

function Login() {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '' } })

  const onSubmit = async ({ email, password }) => {
    if (submitting) return
    setError('')

    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasValidationErrors = Object.keys(errors).length > 0

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

        <form onSubmit={handleSubmit(onSubmit)}>
          {(error || hasValidationErrors) && (
            <div className="error-banner" role="alert">
              {hasValidationErrors ? 'Please fill in all fields.' : error}
            </div>
          )}

          <label>
            Email Address
            <input
              type="email"
              placeholder="admin@tmc.edu.ph"
              {...register('email', { required: 'Email address is required.' })}
              disabled={submitting}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter password"
              {...register('password', { required: 'Password is required.' })}
              disabled={submitting}
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
