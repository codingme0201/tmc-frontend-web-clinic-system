function Login({ onEnterAdmin }) {
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

        <form>
          <label>
            Email Address
            <input type="email" placeholder="admin@tmc.edu.ph" />
          </label>
          <label>
            Password
            <input type="password" placeholder="Enter password" />
          </label>
          <button type="button" className="primary-action full-width" onClick={onEnterAdmin}>
            Sign In
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login
