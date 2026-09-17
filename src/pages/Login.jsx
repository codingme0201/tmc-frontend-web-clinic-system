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
      // Surface the failure as a toast too (e.g. "Invalid email or password.")
      // while keeping the inline box for persistent, accessible feedback.
      const message = err?.message || 'Unable to sign in. Please try again.'
      setError(message)
      showToast(message, 'error')
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
        className="flex flex-col justify-between bg-cover bg-center p-6 sm:p-[34px] text-white max-[980px]:py-8 max-[980px]:gap-6"
        style={{
          backgroundImage: `linear-gradient(rgba(8, 59, 63, 0.9), rgba(8, 59, 63, 0.94)), url(${heroImage})`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold font-extrabold text-primary-dark shadow-md">
            TC
          </div>
          <div>
            <strong className="block text-[17px] leading-[1.1] text-white font-extrabold">TMC CareLink</strong>
            <span className="mt-[3px] block text-[12px] text-[#a9d1ca]">
              Trinidad Municipal College Clinic
            </span>
          </div>
        </div>
        <div className="max-w-[620px] my-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11.5px] font-extrabold text-[#c1e2dc] backdrop-blur-sm mb-3">
            Clinic Appointment and Medical Record Management System
          </span>
          <h1 className="text-[26px] sm:text-[36px] lg:text-[46px] font-extrabold leading-[1.1] text-white tracking-tight">
            Admin access for organized campus care.
          </h1>
        </div>
      </section>

      <section
        className="w-[min(420px,calc(100%-32px))] justify-self-center self-center rounded-2xl border border-line-strong/80 bg-white p-6 sm:p-[32px] shadow-[0_8px_32px_rgba(18,57,59,0.08)] my-6 max-[620px]:p-5"
        aria-labelledby="login-title"
      >
        <div>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-soft">
            Administrator Login
          </p>
          <h2 id="login-title" className="m-0 text-[26px] sm:text-[30px] font-extrabold text-ink tracking-tight">
            Welcome back
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4">
          {(error || hasValidationErrors) && (
            <div className="rounded-xl border border-[#f2cfc2] bg-[#fdf1ec] p-[10px_14px] text-left text-[13px] font-bold text-danger shadow-2xs" role="alert">
              {hasValidationErrors ? 'Please fill in all fields.' : error}
            </div>
          )}

          <label className="grid gap-[6px] text-[12.5px] font-extrabold text-ink">
            Email Address
            <input
              type="email"
              placeholder="admin@tmc.edu.ph"
              className="min-h-11 w-full rounded-xl border border-[#d4e4e0] bg-white px-3.5 text-[13.5px] text-ink placeholder:text-muted/75 transition-all focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 shadow-2xs"
              {...register('email', { required: 'Email address is required.' })}
              disabled={submitting}
            />
          </label>
          <label className="grid gap-[6px] text-[12.5px] font-extrabold text-ink">
            Password
            <input
              type="password"
              placeholder="Enter password"
              className="min-h-11 w-full rounded-xl border border-[#d4e4e0] bg-white px-3.5 text-[13.5px] text-ink placeholder:text-muted/75 transition-all focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 shadow-2xs"
              {...register('password', { required: 'Password is required.' })}
              disabled={submitting}
            />
          </label>
          <button
            type="submit"
            className="min-h-11 w-full cursor-pointer rounded-xl bg-gradient-to-r from-primary to-[#0f635a] px-[18px] text-[13.5px] font-extrabold text-white shadow-[0_8px_20px_rgba(20,120,109,0.25)] transition-all hover:shadow-[0_12px_26px_rgba(20,120,109,0.35)] active:scale-[0.98] disabled:opacity-60"
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
