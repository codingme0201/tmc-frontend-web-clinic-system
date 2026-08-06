import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import InlineSpinner from '../components/Spinner'
import BackendStatusBanner from '../components/BackendStatusBanner'
import heroImage from '../assets/hero.png'

function Login() {
  const { login } = useAuth()
  const { showToast } = useToast()
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
      const signedIn = await login(email, password)
      showToast(`Welcome back, ${signedIn.name}!`)
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasValidationErrors = Object.keys(errors).length > 0

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <BackendStatusBanner />
      <main className="grid flex-1 grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] max-[980px]:grid-cols-1">
      <section
        className="flex flex-col justify-between bg-cover bg-center p-[34px] text-white max-[980px]:min-h-[38svh] max-[620px]:p-[22px]"
        style={{
          backgroundImage: `linear-gradient(rgba(8, 59, 63, 0.88), rgba(8, 59, 63, 0.9)), url(${heroImage})`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-gold font-extrabold text-primary-dark">
            TC
          </div>
          <div>
            <strong className="block text-[17px] leading-[1.1] text-white">TMC CareLink</strong>
            <span className="mt-[3px] block text-[12px] text-[#a9d1ca]">
              Trinidad Municipal College Clinic
            </span>
          </div>
        </div>
        <div className="max-w-[620px]">
          <p className="mb-3 font-extrabold text-[#c1e2dc]">
            Clinic Appointment and Medical Record Management System
          </p>
          <h1 className="text-[clamp(30px,5vw,48px)] leading-[1.02] text-white">
            Admin access for organized campus care.
          </h1>
        </div>
      </section>

      <section
        className="w-[min(410px,calc(100%-40px))] justify-self-center self-center rounded-lg border border-line-strong bg-surface p-[30px] shadow-[0_16px_34px_rgba(38,71,67,0.08)] max-[620px]:p-[22px]"
        aria-labelledby="login-title"
      >
        <div>
          <p className="mb-1 text-[12px] font-extrabold uppercase tracking-normal text-muted-soft">
            Administrator Login
          </p>
          <h2 id="login-title" className="m-0 text-[32px] text-ink">
            Welcome back
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4">
          {(error || hasValidationErrors) && (
            <div className="rounded-md border border-[#f2cfc2] bg-[#fdf1ec] p-[10px_12px] text-left text-[13px] font-bold text-danger" role="alert">
              {hasValidationErrors ? 'Please fill in all fields.' : error}
            </div>
          )}

          <label className="grid gap-[7px] text-[13px] font-extrabold text-ink">
            Email Address
            <input
              type="email"
              placeholder="admin@tmc.edu.ph"
              className="min-h-11 w-full rounded-lg border border-[#d4e4e0] px-3 text-ink placeholder:text-muted"
              {...register('email', { required: 'Email address is required.' })}
              disabled={submitting}
            />
          </label>
          <label className="grid gap-[7px] text-[13px] font-extrabold text-ink">
            Password
            <input
              type="password"
              placeholder="Enter password"
              className="min-h-11 w-full rounded-lg border border-[#d4e4e0] px-3 text-ink placeholder:text-muted"
              {...register('password', { required: 'Password is required.' })}
              disabled={submitting}
            />
          </label>
          <button
            type="submit"
            className="min-h-11 w-full cursor-pointer rounded-lg bg-primary px-[18px] font-extrabold text-white shadow-[0_12px_22px_rgba(var(--color-primary-rgb),0.2)]"
            disabled={submitting}
          >
            {submitting && <InlineSpinner />}
            {submitting ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </section>
      </main>
    </div>
  )
}

export default Login
