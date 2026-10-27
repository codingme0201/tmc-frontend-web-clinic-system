import { useQuery } from '@tanstack/react-query'
import { request } from '../services/api'

export function useAppointmentCalendar(year, { staffId = null, month = null } = {}) {
  return useQuery({
    queryKey: ['appointment-calendar', year, staffId || null, staffId ? month : null],
    queryFn: async () => {
      const params = new URLSearchParams({ year })
      if (staffId) {
        params.set('staff_id', staffId)
        params.set('month', month)
      }
      return (await request(`/appointment-calendar?${params}`)).data
    },
    refetchInterval: staffId ? 15000 : false,
  })
}
