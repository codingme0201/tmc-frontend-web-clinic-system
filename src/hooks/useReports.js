import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { reportsService } from '../services/reportsService'
import { formatDate, todayISO } from '../lib/format'

const REPORT_TITLES = {
  appointments: 'Appointments',
  consultations: 'Consultations',
  patients: 'Patients',
  'medical-certificates': 'Medical Certificates',
  prescriptions: 'Prescriptions',
}

// Quoted CSV cell. Values starting with a formula character are prefixed so
// Excel shows them as text instead of evaluating them.
function csvCell(value) {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

// Excel turns a plain yyyy-mm-dd value into a locale date and shows
// "########" in a narrow column; a ="..." text formula keeps the date
// exactly as it appears in the system.
function csvDateCell(value) {
  if (!value) return '""'
  return `"=""${String(value).replace(/"/g, '')}"""`
}

/**
 * Excel-ready CSV: UTF-8 BOM, a header block with the report period and
 * generation date, then the table with every date column kept as text.
 */
function buildReportCsv(type, result) {
  const meta = result.meta || {}
  const dateColumns = new Set(result.dateColumns || [])
  const period =
    meta.startDate || meta.endDate
      ? `${meta.startDate ? formatDate(meta.startDate) : 'Earliest record'} to ${meta.endDate ? formatDate(meta.endDate) : 'Latest record'}`
      : 'All dates'
  const generated = meta.generatedAt ? new Date(meta.generatedAt) : new Date()
  const generatedLabel = `${formatDate(todayISO())} ${generated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

  const lines = [
    [csvCell(`TMC CareLink — ${REPORT_TITLES[type] ?? type} Report`)],
    [csvCell('Report period'), csvCell(period)],
    [csvCell('Generated on'), csvCell(generatedLabel)],
    [csvCell('Total records'), csvCell(meta.total ?? result.data.length)],
    [],
    result.columns.map(csvCell),
    ...result.data.map((row) =>
      result.columns.map((col) => (dateColumns.has(col) ? csvDateCell(row[col]) : csvCell(row[col]))),
    ),
  ]

  return '﻿' + lines.map((cells) => cells.join(',')).join('\r\n')
}

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

  const [statsEnabled, setStatsEnabled] = useState(true)
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
        const blob = new Blob([buildReportCsv(type, result)], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const range = [result.meta?.startDate, result.meta?.endDate].filter(Boolean).join('_to_')
        const link = document.createElement('a')
        link.href = url
        link.download = `${type}-report-${range || `as-of-${todayISO()}`}.csv`
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
