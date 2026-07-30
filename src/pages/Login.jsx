import { useState } from 'react'
import { useAppContext } from '../context/AppContext'

function Login() {
  const { login } = useAppContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (email === 'admin@tmc.edu.ph' && password === 'admin123') {
      login()
    } else {
      setError('Invalid email or password. Please try again.')
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="primary-action full-width">
            Sign In
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
