'use client'
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  History, ArrowRight, Clock, Factory, Hammer, Gem, Sparkles,
  Search, PlayCircle, Archive, X, RotateCcw, Globe,
} from 'lucide-react'

// ─── Pure utilities (module-level — never recreated) ──────────────────────────

/**
 * Returns a debounced version of `func` with a `.cancel()` method
 * so callers can clean up pending invocations on unmount.
 */
function debounce(func, wait) {
  let timeout = null
  function debounced(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => { timeout = null; func(...args) }, wait)
  }
  debounced.cancel = () => { clearTimeout(timeout); timeout = null }
  return debounced
}

/**
 * Human-readable duration from a seconds value.
 * @param {number} seconds
 * @returns {string}  e.g. "2d 3h 15m"
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  if (seconds < 60) return '<1m'
  const days = Math.floor(seconds / 86400)
  const hrs  = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hrs  > 0) parts.push(`${hrs}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`)
  return parts.join(' ')
}

/**
 * Elapsed time between two ISO date strings.
 * @param {string} start
 * @param {string} end
 * @returns {string}
 */
function calculateTotalTime(start, end) {
  if (!start || !end) return '---'
  return formatDuration(Math.floor((new Date(end) - new Date(start)) / 1000))
}

// ─── TimeBreakdown ────────────────────────────────────────────────────────────

/**
 * Fetches production logs for a given order and renders an active/wait timeline
 * plus per-stage duration totals.
 */
const TimeBreakdown = memo(function TimeBreakdown({ order }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('production_logs')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) { setLogs(data ?? []); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [order.id])

  // Memoize the expensive timeline assembly so it only reruns when logs change
  const { timeline, totalSeconds, activeSeconds, waitingSeconds, summary } = useMemo(() => {
    const startTime = new Date(order.created_at).getTime()
    const endTime   = order.current_stage === 'Completed'
      ? new Date(order.updated_at).getTime()
      : Date.now()
    const totalSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000))

    const timeline = []
    let prevEnd = startTime

    for (const log of logs) {
      const logTime     = new Date(log.created_at).getTime()
      const stageSecs   = log.duration_seconds || 0
      const stageStart  = logTime - stageSecs * 1000
      const stageName   = (log.previous_stage || log.new_stage || 'Unknown').trim()

      const waitSecs = Math.max(0, Math.floor((stageStart - prevEnd) / 1000))
      if (waitSecs > 0) {
        timeline.push({ type: 'wait', name: 'Waiting', seconds: waitSecs, from: new Date(prevEnd), to: new Date(stageStart) })
      }
      if (stageSecs > 0) {
        timeline.push({ type: 'stage', name: stageName, seconds: stageSecs, staff: log.staff_name, isRedo: log.action === 'REJECTED', from: new Date(stageStart), to: new Date(logTime) })
      }
      prevEnd = logTime
    }

    const finalWait = Math.max(0, Math.floor((endTime - prevEnd) / 1000))
    if (finalWait > 0) {
      timeline.push({ type: 'wait', name: 'Waiting', seconds: finalWait, from: new Date(prevEnd), to: new Date(endTime) })
    }

    const activeSeconds  = timeline.filter(t => t.type === 'stage').reduce((s, t) => s + t.seconds, 0)
    const waitingSeconds = timeline.filter(t => t.type === 'wait').reduce((s, t) => s + t.seconds, 0)

    const summary = logs.reduce((acc, log) => {
      const stage = (log.previous_stage || log.new_stage || 'Unknown').trim()
      acc[stage] = (acc[stage] || 0) + (log.duration_seconds || 0)
      return acc
    }, {})

    return { timeline, totalSeconds, activeSeconds, waitingSeconds, summary }
  }, [logs, order.created_at, order.updated_at, order.current_stage])

  if (loading) {
    return <div className="animate-pulse text-[10px] font-black uppercase text-gray-400 mt-4">Calculating...</div>
  }

  const stageList = Object.keys(summary).filter(s => summary[s] > 0)

  return (
    <div className="mt-6 space-y-6">
      {/* Overall summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total',   value: totalSeconds   },
          { label: 'Active',  value: activeSeconds  },
          { label: 'Waiting', value: waitingSeconds },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
            <p className="text-[8px] font-black uppercase text-gray-400">{label}</p>
            <p className="text-xs font-black">{formatDuration(value)}</p>
          </div>
        ))}
      </div>

      {/* Per-stage totals */}
      {stageList.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {stageList.map(stage => (
            <div key={stage} className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
              <p className="text-[8px] font-black uppercase text-gray-400">{stage}</p>
              <p className="text-xs font-black">{formatDuration(summary[stage])}</p>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="border-t-4 border-black pt-4">
        <h4 className="font-black text-[10px] mb-3 uppercase text-gray-400 tracking-widest flex items-center gap-2">
          <History size={12} /> Timeline (with waiting)
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {timeline.map((item, i) => (
            <div
              key={i}
              className={`flex justify-between items-center text-[11px] py-2 border-b-2 border-gray-100 last:border-0 ${item.type === 'wait' ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.type === 'wait' ? 'bg-gray-400' : 'bg-blue-500'}`} />
                <span className="font-bold uppercase">
                  {item.type === 'wait' ? (
                    <>⏳ Waiting</>
                  ) : (
                    <>
                      {item.isRedo && <span className="text-red-600">REDO: </span>}
                      {item.name}
                      {item.staff && <span className="text-gray-400 ml-1">({item.staff})</span>}
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-gray-500">
                  {item.from.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {item.to.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-mono font-black bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                  {formatDuration(item.seconds)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

/**
 * A single stage column on the live board.
 * Extracted as a proper component (not a render function) so React.memo works.
 */
const KanbanColumn = memo(function KanbanColumn({ title, icon, jobs, color, onSelectJob }) {
  return (
    <div className={`${color.bg} border-4 ${color.border} rounded-[2rem] p-5 shadow-[6px_6px_0px_0px_black]`}>
      <div className={`flex items-center gap-2 ${color.text} mb-4 border-b-4 ${color.accent} pb-3 font-black uppercase text-xs tracking-tighter`}>
        {icon} {title} ({jobs.length})
      </div>
      <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
        {jobs.map(job => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className="bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-none"
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-black text-lg leading-none">{job.vtiger_id}</p>
              {job.is_rush && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">RUSH</span>
              )}
            </div>
            <p className="text-[10px] font-black text-blue-600 uppercase truncate">
              {job.article_code || 'No Article'}
              {(job.current_stage === 'Setting' || job.current_stage === 'Polishing') && job.is_external && (
                <span className="ml-2 inline-flex items-center gap-0.5 bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[8px] font-black uppercase">
                  <Globe size={8} /> EXT
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
})

// Column definitions are static — defined once at module level
const KANBAN_COLUMNS = [
  { key: 'Casting',      title: 'Casting',      icon: <Factory  size={18} />, stages: ['At Casting'],          color: { bg: 'bg-blue-50',    border: 'border-blue-600',   text: 'text-blue-700',    accent: 'border-blue-200'   } },
  { key: 'Goldsmithing', title: 'Goldsmithing', icon: <Hammer   size={18} />, stages: ['Goldsmithing'],         color: { bg: 'bg-orange-50',  border: 'border-orange-500', text: 'text-orange-700',  accent: 'border-orange-200' } },
  { key: 'Setting',      title: 'Setting',      icon: <Gem      size={18} />, stages: ['Setting'],              color: { bg: 'bg-purple-50',  border: 'border-purple-600', text: 'text-purple-700',  accent: 'border-purple-200' } },
  { key: 'Polishing',    title: 'Polishing',    icon: <Sparkles size={18} />, stages: ['Polishing', 'QC'],      color: { bg: 'bg-emerald-50', border: 'border-emerald-500',text: 'text-emerald-700', accent: 'border-emerald-200'} },
]

// ─── Order detail modal ───────────────────────────────────────────────────────

const OrderModal = memo(function OrderModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white border-[6px] border-black p-8 rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg animate-in zoom-in duration-150">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-5xl font-black tracking-tighter leading-none">{order.vtiger_id}</h2>
              {order.is_rush && (
                <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm">RUSH</span>
              )}
            </div>
            <p className="text-blue-600 font-black text-sm uppercase mt-3 bg-blue-50 inline-block px-3 py-1 rounded-lg">
              Model: {order.article_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-black text-white p-3 rounded-full hover:rotate-90 hover:scale-110 transition-all shadow-md"
          >
            <X size={24} />
          </button>
        </div>

        <TimeBreakdown order={order} />

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border-2 border-black p-3 rounded-2xl flex flex-col items-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Created</p>
            <p className="text-xs font-black">{new Date(order.created_at).toLocaleDateString()}</p>
          </div>
          <div className="bg-gray-50 border-2 border-black p-3 rounded-2xl flex flex-col items-center">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
            <p className="text-xs font-black uppercase text-green-600">{order.current_stage}</p>
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab,      setActiveTab]      = useState('live')
  const [logs,           setLogs]           = useState([])
  const [wipJobs,        setWipJobs]        = useState([])
  const [completedJobs,  setCompletedJobs]  = useState([])
  const [stageDurations, setStageDurations] = useState({})
  const [loading,        setLoading]        = useState(true)
  const [isRefreshing,   setIsRefreshing]   = useState(false)
  const [error,          setError]          = useState(null)
  const [searchTerm,     setSearchTerm]     = useState('')
  const [logSearchTerm,  setLogSearchTerm]  = useState('')
  const [selectedOrder,  setSelectedOrder]  = useState(null)

  // ── Stable debounced setters ─────────────────────────────────────────────
  // Stored in refs so they're never recreated and cleanup always refers to the same instance
  const debouncedSetSearch    = useRef(debounce(setSearchTerm,    300))
  const debouncedSetLogSearch = useRef(debounce(setLogSearchTerm, 300))

  useEffect(() => () => {
    debouncedSetSearch.current.cancel()
    debouncedSetLogSearch.current.cancel()
  }, [])

  // ── Stage duration fetcher ───────────────────────────────────────────────
  const fetchStageTimes = useCallback(async (orderIds) => {
    if (!orderIds?.length) return
    const { data, error } = await supabase
      .from('production_logs')
      .select('order_id, previous_stage, duration_seconds')
      .in('order_id', orderIds)

    if (error) { console.error('[fetchStageTimes]', error.message); return }

    // Dynamically accumulate any stage name that appears in logs
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

  // ── Tab-specific fetch functions ─────────────────────────────────────────
  const fetchLiveData = useCallback(async () => {
    const [liveRes, logsRes] = await Promise.all([
      supabase.from('orders').select('*').neq('current_stage', 'Completed').order('created_at', { ascending: true }),
      supabase.from('production_logs').select('*, orders(vtiger_id)').order('created_at', { ascending: false }).limit(50),
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

  // ── Derived data ─────────────────────────────────────────────────────────
  const stagesMap = useMemo(() => {
    const map = {}
    for (const col of KANBAN_COLUMNS) {
      map[col.key] = wipJobs.filter(j => col.stages.includes(j.current_stage))
    }
    return map
  }, [wipJobs])

  const filteredArchive = useMemo(() => {
    const term = searchTerm.trim().toUpperCase()
    if (!term) return completedJobs
    return completedJobs.filter(job =>
      job.vtiger_id?.toUpperCase().includes(term) ||
      job.article_code?.toUpperCase().includes(term)
    )
  }, [completedJobs, searchTerm])

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

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectJob = useCallback((job) => {
    setSelectedOrder(prev => prev?.id === job.id ? null : job)
  }, [])

  const handleCloseModal = useCallback(() => setSelectedOrder(null), [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[90rem] mx-auto p-6 space-y-8 pb-20 relative font-sans">

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={handleCloseModal} />
      )}

      {/* Header & tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-8 border-black pb-6 gap-4">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Atelier OS</h1>
        <div className="flex bg-black p-1.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          {[
            { id: 'live',      label: 'Live Board', icon: <PlayCircle size={18} /> },
            { id: 'completed', label: 'Archive',    icon: <Archive    size={18} /> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase transition-all ${activeTab === id ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-4 border-red-500 text-red-700 p-4 rounded-2xl font-black">
          {error}
        </div>
      )}

      {activeTab === 'live' ? (
        <div className="space-y-12 animate-in fade-in duration-500">
          {/* Kanban board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {KANBAN_COLUMNS.map(col => (
              <KanbanColumn
                key={col.key}
                title={col.title}
                icon={col.icon}
                jobs={stagesMap[col.key] ?? []}
                color={col.color}
                onSelectJob={handleSelectJob}
              />
            ))}
          </div>

          {/* Activity log */}
          <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_black]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="font-black uppercase flex items-center gap-3 text-xl tracking-tighter">
                <History size={24} /> Recent Audit Log
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl text-xs font-black outline-none uppercase shadow-[2px_2px_0px_0px_black] focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-none transition-all"
                  onChange={e => debouncedSetLogSearch.current(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLogs.length === 0 ? (
                <p className="text-gray-400 font-bold uppercase text-xs col-span-full">No logs match your filter.</p>
              ) : (
                filteredLogs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border-2 border-black hover:bg-yellow-50 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-base leading-none">{log.orders?.vtiger_id}</span>
                      <span className="text-[10px] font-black uppercase text-gray-500">{log.staff_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white px-3 py-2 rounded-xl border-2 border-black">
                      <span className="text-gray-400 truncate max-w-[60px]">{log.previous_stage}</span>
                      <ArrowRight size={12} className="text-black shrink-0" />
                      <span className="text-blue-600 truncate max-w-[60px]">{log.new_stage}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Archive */
        <div className="bg-white border-4 border-black rounded-[3rem] overflow-hidden shadow-[12px_12px_0px_0px_black] animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 bg-gray-50 border-b-4 border-black flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="font-black uppercase text-3xl tracking-tighter">Completed Jobs Archive</h2>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">
                Showing {filteredArchive.length} of {completedJobs.length} Finished Pieces
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-4 top-4 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="SEARCH ID OR MODEL..."
                  className="w-full pl-12 pr-4 py-4 border-4 border-black rounded-2xl text-sm font-black outline-none uppercase shadow-[4px_4px_0px_0px_black] focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all"
                  onChange={e => debouncedSetSearch.current(e.target.value)}
                />
              </div>
              <button
                onClick={fetchData}
                disabled={isRefreshing}
                className="bg-black text-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-gray-800 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                title="Refresh archive"
              >
                <RotateCcw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent" />
                <p className="mt-4 font-black uppercase text-gray-400">Loading archive...</p>
              </div>
            ) : completedJobs.length === 0 ? (
              <p className="p-20 text-center font-black uppercase text-gray-400 text-lg">No completed orders found</p>
            ) : filteredArchive.length === 0 ? (
              <p className="p-20 text-center font-black uppercase text-gray-400 text-lg">No jobs match your search</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black text-white text-[10px] uppercase font-black tracking-widest">
                    <th className="p-6 whitespace-nowrap">Job ID</th>
                    <th className="p-6 whitespace-nowrap">Article Code</th>
                    <th className="p-6 whitespace-nowrap">Total Time</th>
                    <th className="p-6 whitespace-nowrap text-orange-400">Goldsmithing</th>
                    <th className="p-6 whitespace-nowrap text-purple-400">Setting</th>
                    <th className="p-6 whitespace-nowrap text-purple-400">Set Ext</th>
                    <th className="p-6 whitespace-nowrap text-emerald-400">Polishing</th>
                    <th className="p-6 whitespace-nowrap text-emerald-400">Pol Ext</th>
                    <th className="p-6 whitespace-nowrap text-right">Date Finished</th>
                  </tr>
                </thead>
                <tbody className="divide-y-4 divide-gray-100">
                  {filteredArchive.map(job => {
                    const d = stageDurations[job.id] ?? {}
                    return (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedOrder(job)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors group"
                      >
                        <td className="p-6 font-black text-xl group-hover:text-blue-600 transition-colors">
                          {job.vtiger_id}
                          {job.is_rush && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded text-[8px] align-middle">RUSH</span>}
                        </td>
                        <td className="p-6 text-sm font-black text-blue-600 uppercase">{job.article_code}</td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-black" />
                            <span className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                              {calculateTotalTime(job.created_at, job.updated_at)}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 text-sm font-black text-gray-500">{formatDuration(d.Goldsmithing)}</td>
                        <td className="p-6 text-sm font-black text-gray-500">{formatDuration(d.Setting)}</td>
                        <td className="p-6 text-center">
                          {job.is_external
                            ? <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-full font-black">✓</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-6 text-sm font-black text-gray-500">{formatDuration(d.Polishing)}</td>
                        <td className="p-6 text-center">
                          {job.is_external
                            ? <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-full font-black">✓</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-6 text-right text-xs font-black text-gray-400 uppercase tracking-wider">
                          {new Date(job.updated_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}