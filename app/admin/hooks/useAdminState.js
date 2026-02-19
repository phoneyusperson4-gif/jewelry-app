import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { debounce } from '@/app/admin/utils'
import { KANBAN_COLUMNS } from '@/app/admin/constants'

/**
 * Central state and data-fetching logic for the Admin page.
 *
 * Encapsulates:
 * - Live WIP jobs and recent audit logs
 * - Completed jobs archive with per-stage duration lookup
 * - Client-side search filtering (debounced)
 * - Kanban stage grouping (derived, memoized)
 * - Order selection for the detail modal
 *
 * All Supabase calls are isolated here; components receive only derived data
 * and stable handler references.
 *
 * @returns {object}
 */
export function useAdminState() {
  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('live')

  // ── Data ──────────────────────────────────────────────────────────────────
  const [logs,           setLogs]           = useState([])
  const [wipJobs,        setWipJobs]        = useState([])
  const [completedJobs,  setCompletedJobs]  = useState([])
  const [stageDurations, setStageDurations] = useState({})

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(true)
  const [isRefreshing,  setIsRefreshing]  = useState(false)
  const [error,         setError]         = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // ── Search terms (internal; exposed only as debounced setters) ────────────
  const [searchTerm,    setSearchTerm]    = useState('')
  const [logSearchTerm, setLogSearchTerm] = useState('')

  // ── Stable debounced setters ──────────────────────────────────────────────
  // Stored in refs so the same instance is reused across renders and cleanup
  // always cancels the right timer.
  const debouncedSetSearch    = useRef(debounce(setSearchTerm,    300))
  const debouncedSetLogSearch = useRef(debounce(setLogSearchTerm, 300))

  useEffect(() => () => {
    debouncedSetSearch.current.cancel()
    debouncedSetLogSearch.current.cancel()
  }, [])

  // ── Stage duration fetcher ────────────────────────────────────────────────

  /**
   * Fetches per-stage active durations for a batch of order IDs and stores
   * them in `stageDurations` keyed by `order_id`.
   *
   * Stage names are accumulated dynamically from `previous_stage` in logs,
   * so adding a new pipeline stage requires no changes here.
   *
   * @param {string[]} orderIds
   */
  const fetchStageTimes = useCallback(async (orderIds) => {
    if (!orderIds?.length) return

    const { data, error } = await supabase
      .from('production_logs')
      .select('order_id, previous_stage, duration_seconds')
      .in('order_id', orderIds)

    if (error) { console.error('[fetchStageTimes]', error.message); return }

    const durations = {}
    for (const log of data ?? []) {
      const id    = log.order_id
      const stage = log.previous_stage
      const secs  = Number(log.duration_seconds) || 0
      if (!durations[id]) durations[id] = { Total: 0 }
      if (stage) durations[id][stage] = (durations[id][stage] || 0) + secs
      durations[id].Total += secs
    }
    setStageDurations(durations)
  }, [])

  // ── Tab-specific fetchers ─────────────────────────────────────────────────

  const fetchLiveData = useCallback(async () => {
    const [liveRes, logsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .neq('current_stage', 'Completed')
        .order('created_at', { ascending: true }),
      supabase
        .from('production_logs')
        .select('*, orders(vtiger_id)')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (liveRes.error) throw new Error(liveRes.error.message)
    if (logsRes.error) throw new Error(logsRes.error.message)
    setWipJobs(liveRes.data ?? [])
    setLogs(logsRes.data ?? [])
  }, [])

  const fetchArchiveData = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .ilike('current_stage', '%completed%')
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) throw new Error(error.message)
    setCompletedJobs(data ?? [])
    if (data?.length) await fetchStageTimes(data.map(j => j.id))
  }, [fetchStageTimes])

  /** Top-level fetch dispatcher — called on tab change and manual refresh. */
  const fetchData = useCallback(async () => {
    setIsRefreshing(true)
    setLoading(true)
    setError(null)
    try {
      await (activeTab === 'live' ? fetchLiveData() : fetchArchiveData())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[fetchData]', msg)
      setError(`Failed to load data: ${msg}`)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [activeTab, fetchLiveData, fetchArchiveData])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived / memoized data ───────────────────────────────────────────────

  /** WIP jobs grouped by kanban column key. */
  const stagesMap = useMemo(() => {
    const map = {}
    for (const col of KANBAN_COLUMNS) {
      map[col.key] = wipJobs.filter(j => col.stages.includes(j.current_stage))
    }
    return map
  }, [wipJobs])

  /** Completed jobs filtered by the archive search input. */
  const filteredArchive = useMemo(() => {
    const term = searchTerm.trim().toUpperCase()
    if (!term) return completedJobs
    return completedJobs.filter(job =>
      job.vtiger_id?.toUpperCase().includes(term) ||
      job.article_code?.toUpperCase().includes(term)
    )
  }, [completedJobs, searchTerm])

  /** Audit log entries filtered by the log search input. */
  const filteredLogs = useMemo(() => {
    const term = logSearchTerm.trim().toLowerCase()
    if (!term) return logs
    return logs.filter(log =>
      log.orders?.vtiger_id?.toLowerCase().includes(term) ||
      log.staff_name?.toLowerCase().includes(term) ||
      log.previous_stage?.toLowerCase().includes(term) ||
      log.new_stage?.toLowerCase().includes(term)
    )
  }, [logs, logSearchTerm])

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Toggle the detail modal — clicking the same job again closes it. */
  const handleSelectJob  = useCallback((job) => setSelectedOrder(prev => prev?.id === job.id ? null : job), [])
  const handleCloseModal = useCallback(() => setSelectedOrder(null), [])

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    // Tab
    activeTab, setActiveTab,

    // Data
    wipJobs, completedJobs, stageDurations,
    stagesMap, filteredArchive, filteredLogs,

    // UI
    loading, isRefreshing, error,
    selectedOrder,

    // Debounced search setters (pass directly to input onChange)
    onSearchChange:    (e) => debouncedSetSearch.current(e.target.value),
    onLogSearchChange: (e) => debouncedSetLogSearch.current(e.target.value),

    // Handlers
    fetchData,
    handleSelectJob,
    handleCloseModal,
  }
}
