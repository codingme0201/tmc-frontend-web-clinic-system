import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { reportsService } from '../services/reportsService'

export function useReportsStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const [activeReport, setActiveReport] = useState('appointments')
  const [filters, setFilters] = useState({})

  const buildQueryKey = useCallback(
    (reportType, filterState) => ['reports', reportType, filterState, scope],
    [scope],
  )

  const { data: reportData, isLoading: reportLoading, error: reportError, refetch: refetchReport, isRefetching: reportRefetching } = useQuery({
    queryKey: buildQueryKey(activeReport, filters),
    queryFn: () => {
      switch (activeReport) {
        case 'appointments':
          return reportsService.fetchAppointmentReport(filters)
        case 'consultations':
          return reportsService.fetchConsultationReport(filters)
        case 'patients':
          return reportsService.fetchPatientReport(filters)
        case 'medical-certificates':
          return reportsService.fetchMedicalCertificateReport(filters)
        case 'prescriptions':
          return reportsService.fetchPrescriptionReport(filters)
        default:
          return reportsService.fetchAppointmentReport(filters)
      }
    },
    enabled: false,
  })

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['reports-statistics', filters, scope],
    queryFn: () => reportsService.fetchStatistics(filters),
    enabled: false,
  })

  const generateReport = useCallback(
    (reportType, filterState) => {
      setActiveReport(reportType)
      setFilters(filterState)
      queryClient.invalidateQueries({ queryKey: ['reports', reportType] })
    },
    [queryClient],
  )

  const generateStats = useCallback(
    (filterState) => {
      setFilters(filterState)
      queryClient.invalidateQueries({ queryKey: ['reports-statistics'] })
    },
    [queryClient],
  )

  const exportMutation = useMutation({
    mutationFn: ({ type, filters: exportFilters }) => reportsService.exportReport(type, exportFilters),
    onSuccess: () => {
      onLogRef.current?.('Exported a report')
    },
  })

  const downloadExport = useCallback(
    async (type, exportFilters) => {
      const result = await exportMutation.mutateAsync({ type, filters: exportFilters })
      if (result?.data && result?.columns) {
        const csvContent = [
          result.columns.join(','),
          ...result.data.map((row) =>
            result.columns.map((col) => {
              const val = row[col] ?? ''
              const escaped = String(val).replace(/"/g, '""')
              return `"${escaped}"`
            }).join(','),
          ),
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      return result
    },
    [exportMutation],
  )

  return {
    activeReport,
    setActiveReport,
    filters,
    setFilters,
    generateReport,
    generateStats,
    reportData: reportData?.data ?? [],
    reportMeta: reportData?.meta ?? null,
    reportLoading,
    reportError: reportError?.message ?? null,
    refetchReport,
    reportRefetching,
    statsData: statsData?.data ?? null,
    statsLoading,
    refetchStats,
    downloadExport,
    exportBusy: exportMutation.isPending,
  }
}

export function useReports(scope = 'page') {
  const { log } = useAppContext()
  return useReportsStore({ onLog: log }, scope)
}
