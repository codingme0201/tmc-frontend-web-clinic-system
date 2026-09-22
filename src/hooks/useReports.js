import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { reportsService } from '../services/reportsService'

function fetchReportByType(reportType, filterState) {
  switch (reportType) {
    case 'appointments':
      return reportsService.fetchAppointmentReport(filterState)
    case 'consultations':
      return reportsService.fetchConsultationReport(filterState)
    case 'patients':
      return reportsService.fetchPatientReport(filterState)
    case 'medical-certificates':
      return reportsService.fetchMedicalCertificateReport(filterState)
    case 'prescriptions':
      return reportsService.fetchPrescriptionReport(filterState)
    default:
      return reportsService.fetchAppointmentReport(filterState)
  }
}

export function useReportsStore({ onLog } = {}, scope = 'page') {
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const [activeReport, setActiveReport] = useState('appointments')
  const [filters, setFilters] = useState({})

  const {
    data: reportResult,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport,
    isRefetching: reportRefetching,
  } = useQuery({
    queryKey: ['reports', activeReport, filters, scope],
    queryFn: () => fetchReportByType(activeReport, filters),
  })

  const [statsEnabled, setStatsEnabled] = useState(false)
  const [statsFilters, setStatsFilters] = useState({})

  const {
    data: statsResult,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['reports-statistics', statsFilters, scope],
    queryFn: () => reportsService.fetchStatistics(statsFilters),
    enabled: statsEnabled,
  })

  const generateReport = useCallback((reportType, filterState = {}) => {
    setActiveReport(reportType)
    setFilters(filterState)
  }, [])

  const generateStats = useCallback((filterState = {}) => {
    setStatsFilters(filterState)
    setStatsEnabled(true)
  }, [])

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
    reportData: reportResult?.data ?? [],
    reportMeta: reportResult?.meta ?? null,
    reportLoading,
    reportError: reportError?.message ?? null,
    refetchReport,
    reportRefetching,
    statsData: statsResult?.data ?? null,
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
