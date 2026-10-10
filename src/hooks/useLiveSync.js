import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { syncService } from '../services/syncService'

const POLL_MS = 3000

// Server sync module → query keys whose data comes from it.
const MODULE_QUERIES = {
  appointments: ['appointments', 'queue', 'follow-up-options', 'clinic-insights', 'patient-history', 'reports', 'reports-statistics', 'staff-schedules', 'clinic-staff', 'clinic-staff-member', 'patients'],
  consultations: ['consultations', 'queue', 'follow-up-options', 'patient-history', 'reports', 'reports-statistics', 'medical-records', 'patients'],
  medical_records: ['medical-records', 'patient-medical', 'patient-history'],
  medical_certificates: ['medical-certificates', 'patient-history', 'reports', 'reports-statistics', 'patients'],
  prescriptions: ['prescriptions', 'patient-history', 'reports', 'reports-statistics', 'medical-records', 'patients'],
  patients: ['patients', 'patient', 'patient-medical', 'medical-records', 'reports', 'reports-statistics', 'users'],
  users: ['users', 'clinic-staff', 'clinic-staff-member', 'eligible-staff', 'notification-recipients', 'staff-schedules'],
  notifications: ['notifications', 'notifications-unread-count'],
  staff_schedules: ['staff-schedules', 'clinic-staff', 'clinic-staff-member', 'eligible-staff'],
  staff_profiles: ['clinic-staff', 'clinic-staff-member', 'eligible-staff'],
  settings: ['settings'],
  activity_logs: ['activity-logs', 'audit-logs'],
  roles: ['roles', 'permissions'],
  staff: ['staff'],
  clinic_insights: ['clinic-insights'],
}

/**
 * Real-time sync with the mobile app (and other staff sessions).
 *
 * Polls the tiny `/sync` endpoint every few seconds and, for each module
 * whose version changed (a student booked an appointment, updated their
 * profile, requested a certificate...), invalidates the matching queries so
 * the open page refetches in the background without a reload.
 */
export function useLiveSync(enabled = true) {
  const queryClient = useQueryClient()
  const previousRef = useRef(null)

  const { data } = useQuery({
    queryKey: ['live-sync'],
    queryFn: syncService.fetchSyncVersions,
    enabled,
    refetchInterval: POLL_MS,
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    if (!data) return
    const previous = previousRef.current
    previousRef.current = data
    if (!previous) return

    const keys = new Set()
    Object.keys(data).forEach((module) => {
      if (data[module] === previous[module]) return
      for (const key of MODULE_QUERIES[module] ?? []) keys.add(key)
    })
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
  }, [data, queryClient])
}
