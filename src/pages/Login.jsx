import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import InlineSpinner from '../components/Spinner'
import BackendStatusBanner from '../components/BackendStatusBanner'
import ClinicLogo from '../components/ClinicLogo'
import heroImage from '../assets/hero.png'

function Login() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const [error, setError] = useState('')
  const [patientModalOpen, setPatientModalOpen] = useState(false)
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
      const isPatient =
        err?.data?.code === 'PATIENT_MOBILE_ONLY' ||
        err?.data?.role === 'patient' ||
        err?.message?.toLowerCase().includes('patient accounts') ||
        err?.message?.toLowerCase().includes('patient') && err?.message?.toLowerCase().includes('mobile')

      if (isPatient) {
        setError('')
        setPatientModalOpen(true)
      } else {
        // Surface the failure as a toast too (e.g. "Invalid email or password.")
        // while keeping the inline box for persistent, accessible feedback.
        const message = err?.message || 'Unable to sign in. Please try again.'
        setError(message)
        showToast(message, 'error')
      }
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
        <ClinicLogo size={46} subtitle="Trinidad Municipal College Clinic" />
        <div className="max-w-[620px] my-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11.5px] font-extrabold text-[#c1e2dc] backdrop-blur-sm mb-3">
            Clinic Appointment and Medical Record Management System
          </span>
          <h1 className="text-[26px] sm:text-[36px] lg:text-[46px] font-extrabold leading-[1.1] text-white tracking-tight">
            Clinic portal for doctors, nurses, and administrators.
          </h1>
        </div>
      </section>

      <section
        className="w-[min(420px,calc(100%-32px))] justify-self-center self-center rounded-2xl border border-line-strong/80 bg-white p-6 sm:p-[32px] shadow-[0_8px_32px_rgba(18,57,59,0.08)] my-6 max-[620px]:p-5"
        aria-labelledby="login-title"
      >
        <div>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-soft">
            Clinic Personnel Login
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

      {/* Patient Mobile Only Restriction Modal */}
      {patientModalOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.5)] p-5 backdrop-blur-[4px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="patient-restriction-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPatientModalOpen(false)
          }}
        >
          <div className="flex max-h-[90vh] w-[min(500px,100%)] animate-modal-scale flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)] border border-[#e2e8f0]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-red-50/60 p-[18px_22px]">
              <div className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-100 text-danger shadow-xs">
                  <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <div>
                  <h3 id="patient-restriction-title" className="m-0 text-[18px] font-extrabold text-ink leading-tight">
                    No Permission to Enter
                  </h3>
                  <span className="text-[12px] font-semibold text-danger">
                    Patient accounts are mobile-only
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded-lg border-0 bg-transparent p-1.5 text-[18px] text-muted-soft transition hover:bg-red-100 hover:text-ink"
                onClick={() => setPatientModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 text-[13px] text-amber-950">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block size-2 rounded-full bg-amber-500" />
                  <strong className="font-extrabold text-amber-900 text-[13.5px]">
                    Mobile Access Only
                  </strong>
                </div>
                <p className="leading-relaxed text-[12.5px]">
                  Patients can only access their clinic records, appointments, and prescriptions through the <strong>TMC CareLink Mobile App</strong>. You cannot log in to the web clinic management system.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4 text-[13px]">
                <p className="font-extrabold text-[13px] text-primary-dark mb-1.5">
                  Authorized Web Users:
                </p>
                <p className="text-[12.5px] text-muted mb-2">
                  Only the following personnel are permitted to enter this web system:
                </p>
                <ul className="grid gap-2 text-[12.5px] font-bold text-ink">
                  <li className="flex items-center gap-2.5">
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary text-[11px] font-extrabold">✓</span>
                    Clinic Administrators
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary text-[11px] font-extrabold">✓</span>
                    School Physicians & Doctors
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary text-[11px] font-extrabold">✓</span>
                    Clinic Nurses
                  </li>
                </ul>
              </div>

              <p className="text-[12px] text-muted-soft text-center pt-1">
                Please open the <strong>TMC CareLink Mobile App</strong> on your smartphone to sign in to your patient account.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-line bg-[#fafcfb] p-[14px_22px]">
              <button
                type="button"
                className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.98]"
                onClick={() => setPatientModalOpen(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
