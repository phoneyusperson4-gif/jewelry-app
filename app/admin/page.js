'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  History, ArrowRight, Clock, Factory, Hammer, Gem, Sparkles,
  Search, PlayCircle, Archive, X, RotateCcw
} from 'lucide-react'

// Simple debounce utility (no external dependency)
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// ---------- 1. TIME BREAKDOWN COMPONENT ----------
const TimeBreakdown = ({ orderId }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('production_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [orderId])

  if (loading) return <div className="text-[10px] text-gray-400 font-black uppercase mt-4">Loading logs...</div>

  return (
    <div className="mt-6 border-t-4 border-black pt-4">
      <h4 className="font-black text-[10px] mb-3 uppercase text-gray-400 tracking-widest">Stage Time Logs</h4>
      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-[10px] text-gray-400 font-bold uppercase">No stage logs found.</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex justify-between items-center text-xs py-2 border-b-2 border-gray-100 last:border-0">
              <span className="font-bold uppercase text-black">
                {log.action === 'REJECTED' ? '⚠️ REDO: ' : ''}
                {log.previous_stage || log.new_stage}
                <span className="text-gray-400 font-black ml-1">({log.staff_name})</span>
              </span>
              <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                {log.duration_seconds ? Math.floor(log.duration_seconds / 60) : 0}m
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------- 2. MAIN ADMIN PAGE ----------
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('live')
  const [logs, setLogs] = useState([])
  const [wipJobs, setWipJobs] = useState([])
  const [completedJobs, setCompletedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [logSearchTerm, setLogSearchTerm] = useState('')
  const [hoveredOrder, setHoveredOrder] = useState(null)
  const [stageDurations, setStageDurations] = useState({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // --- Debounced search handlers (custom debounce) ---
  const debouncedSetSearchTerm = useMemo(() => debounce(setSearchTerm, 300), [])
  const debouncedSetLogSearchTerm = useMemo(() => debounce(setLogSearchTerm, 300), [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetSearchTerm.cancel?.() // our debounce doesn't have .cancel, but we can add; for safety we just let it be
      debouncedSetLogSearchTerm.cancel?.()
    }
  }, [debouncedSetSearchTerm, debouncedSetLogSearchTerm])

  useEffect(() => {
    fetchData()
  }, [activeTab])

  async function fetchData() {
    setIsRefreshing(true)
    setLoading(true)
    setError(null)

    try {
      if (activeTab === 'live') {
        // Live board: orders not completed
        const { data: live, error: liveError } = await supabase
          .from('orders')
          .select('*')
          .neq('current_stage', 'Completed')
          .order('created_at', { ascending: true })
        
        if (liveError) {
          throw new Error(liveError.message || 'Live board query failed')
        }
        setWipJobs(live || [])

        // Recent activity logs (fixed duplicate limit)
        const { data: logData, error: logError } = await supabase
          .from('production_logs')
          .select('*, orders(vtiger_id)')
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (logError) {
          throw new Error(logError.message || 'Activity log query failed')
        }
        setLogs(logData || [])
      } else {
        // Archive: completed orders – case‑insensitive, trimmed match
        const { data: done, error: doneError } = await supabase
          .from('orders')
          .select('*')
          .ilike('current_stage', '%completed%')
          .order('updated_at', { ascending: false })
          .limit(100)
        
        if (doneError) {
          throw new Error(doneError.message || 'Archive query failed')
        }

        setCompletedJobs(done || [])
        if (done && done.length > 0) {
          await fetchStageTimes(done.map(j => j.id))
        } else {
          console.warn('No completed orders found – check your data or stage name')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Fetch error:', errorMessage, err)
      setError(`Failed to load data: ${errorMessage}`)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // --- IMPROVED STAGE DURATION CALCULATION ---
  async function fetchStageTimes(orderIds) {
    if (orderIds.length === 0) return
    const { data: logsData, error } = await supabase
      .from('production_logs')
      .select('order_id, previous_stage, duration_seconds')
      .in('order_id', orderIds)

    if (error) {
      console.error('Error fetching stage durations:', error.message)
      return
    }

    // Use reduce to dynamically accumulate durations per stage
    const durations = logsData?.reduce((acc, log) => {
      const { order_id, previous_stage, duration_seconds } = log
      if (!acc[order_id]) acc[order_id] = {}
      acc[order_id][previous_stage] = (acc[order_id][previous_stage] || 0) + (duration_seconds || 0)
      return acc
    }, {})

    setStageDurations(durations || {})
  }

  // --- MEMOIZED STAGE FILTERING FOR LIVE BOARD ---
  const stagesMap = useMemo(() => ({
    Casting: wipJobs.filter(j => j.current_stage === 'At Casting'),
    Goldsmithing: wipJobs.filter(j => j.current_stage === 'Goldsmithing'),
    Setting: wipJobs.filter(j => j.current_stage === 'Setting'),
    Polishing: wipJobs.filter(j => ['Polishing', 'QC'].includes(j.current_stage))
  }), [wipJobs])

  // --- CLIENT-SIDE SEARCH FOR ARCHIVE ---
  const filteredArchive = useMemo(() => {
    const term = searchTerm.trim().toUpperCase()
    if (!term) return completedJobs
    return completedJobs.filter(job => {
      const id = job.vtiger_id?.toUpperCase() || ''
      const code = job.article_code?.toUpperCase() || ''
      return id.includes(term) || code.includes(term)
    })
  }, [completedJobs, searchTerm])

  // --- CLIENT-SIDE SEARCH FOR ACTIVITY LOGS ---
  const filteredLogs = useMemo(() => {
    const term = logSearchTerm.trim().toLowerCase()
    if (!term) return logs
    return logs.filter(log => {
      const vtiger = log.orders?.vtiger_id?.toLowerCase() || ''
      const staff = log.staff_name?.toLowerCase() || ''
      const prevStage = log.previous_stage?.toLowerCase() || ''
      const newStage = log.new_stage?.toLowerCase() || ''
      return vtiger.includes(term) || staff.includes(term) || prevStage.includes(term) || newStage.includes(term)
    })
  }, [logs, logSearchTerm])

  // --- TIME FORMATTERS ---
  const formatDurationPrecise = (seconds) => {
    if (!seconds || seconds <= 0 || isNaN(seconds)) return '0m'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) return `${hrs}h ${mins}m`
    return `${mins}m`
  }

  const calculateTotalTime = (start, end) => {
    if (!start || !end) return '---'
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    const totalSecs = Math.floor(diffMs / 1000)
    return formatDurationPrecise(totalSecs)
  }

  // --- KANBAN COLUMN RENDERER ---
  const renderColumn = (title, icon, jobs, color) => (
    <div className={`${color.bg} border-4 ${color.border} rounded-[2rem] p-5 shadow-[6px_6px_0px_0px_black]`}>
      <div className={`flex items-center gap-2 ${color.text} mb-4 border-b-4 ${color.accent} pb-3 font-black uppercase text-xs tracking-tighter`}>
        {icon} {title} ({jobs.length})
      </div>
      <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
        {jobs.map(job => (
          <div
            key={job.id}
            onClick={() => setHoveredOrder(hoveredOrder?.id === job.id ? null : job)}
            className="bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-none"
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-black text-lg leading-none">{job.vtiger_id}</p>
              {job.is_rush && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">RUSH</span>}
            </div>
            <p className="text-[10px] font-black text-blue-600 uppercase truncate">
              {job.article_code || 'No Article'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-[90rem] mx-auto p-6 space-y-8 pb-20 relative font-sans">

      {/* JOB DETAIL MODAL */}
      {hoveredOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border-[6px] border-black p-8 rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg animate-in zoom-in duration-150">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-5xl font-black tracking-tighter leading-none">{hoveredOrder.vtiger_id}</h2>
                  {hoveredOrder.is_rush && <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm">RUSH</span>}
                </div>
                <p className="text-blue-600 font-black text-sm uppercase mt-3 bg-blue-50 inline-block px-3 py-1 rounded-lg">Model: {hoveredOrder.article_code}</p>
              </div>
              <button onClick={() => setHoveredOrder(null)} className="bg-black text-white p-3 rounded-full hover:rotate-90 hover:scale-110 transition-all shadow-md">
                <X size={24} />
              </button>
            </div>

            <TimeBreakdown orderId={hoveredOrder.id} />

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 border-2 border-black p-3 rounded-2xl flex flex-col items-center">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Created</p>
                <p className="text-xs font-black">{new Date(hoveredOrder.created_at).toLocaleDateString()}</p>
              </div>
              <div className="bg-gray-50 border-2 border-black p-3 rounded-2xl flex flex-col items-center">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
                <p className="text-xs font-black uppercase text-green-600">{hoveredOrder.current_stage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABS & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-8 border-black pb-6 gap-4">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Atelier OS</h1>
        <div className="flex bg-black p-1.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase transition-all ${activeTab === 'live' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <PlayCircle size={18} /> Live Board
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase transition-all ${activeTab === 'completed' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Archive size={18} /> Archive
          </button>
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="bg-red-100 border-4 border-red-500 text-red-700 p-4 rounded-2xl font-black">
          {error}
        </div>
      )}

      {activeTab === 'live' ? (
        // --- LIVE BOARD VIEW ---
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderColumn('Casting', <Factory size={18} />, stagesMap.Casting, { bg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-700', accent: 'border-blue-200' })}
            {renderColumn('Goldsmithing', <Hammer size={18} />, stagesMap.Goldsmithing, { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', accent: 'border-orange-200' })}
            {renderColumn('Setting', <Gem size={18} />, stagesMap.Setting, { bg: 'bg-purple-50', border: 'border-purple-600', text: 'text-purple-700', accent: 'border-purple-200' })}
            {renderColumn('Polishing', <Sparkles size={18} />, stagesMap.Polishing, { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', accent: 'border-emerald-200' })}
          </div>

          {/* ACTIVITY LOG with debounced search */}
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
                  value={logSearchTerm}
                  onChange={(e) => debouncedSetLogSearchTerm(e.target.value)}
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
        // --- COMPLETIONS ARCHIVE VIEW with debounced search ---
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
                  value={searchTerm}
                  onChange={(e) => debouncedSetSearchTerm(e.target.value)}
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent"></div>
                <p className="mt-4 font-black uppercase text-gray-400">Loading archive...</p>
              </div>
            ) : completedJobs.length === 0 ? (
              <div className="p-20 text-center">
                <p className="font-black uppercase text-gray-400 text-lg">No completed orders found</p>
                <p className="text-sm text-gray-400 mt-2">Check that orders have a stage exactly matching "Completed" (case‑insensitive) and that you have permission to read them.</p>
              </div>
            ) : filteredArchive.length === 0 ? (
              <div className="p-20 text-center">
                <p className="font-black uppercase text-gray-400 text-lg">No jobs match your search</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black text-white text-[10px] uppercase font-black tracking-widest">
                    <th className="p-6 whitespace-nowrap">Job ID</th>
                    <th className="p-6 whitespace-nowrap">Article Code</th>
                    <th className="p-6 whitespace-nowrap">Total Time</th>
                    <th className="p-6 whitespace-nowrap text-orange-400">Goldsmithing</th>
                    <th className="p-6 whitespace-nowrap text-purple-400">Setting</th>
                    <th className="p-6 whitespace-nowrap text-emerald-400">Polishing</th>
                    <th className="p-6 whitespace-nowrap text-right">Date Finished</th>
                  </tr>
                </thead>
                <tbody className="divide-y-4 divide-gray-100">
                  {filteredArchive.map(job => {
                    const durations = stageDurations[job.id] || {} // now dynamic
                    return (
                      <tr
                        key={job.id}
                        onClick={() => setHoveredOrder(job)}
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
                        <td className="p-6 text-sm font-black text-gray-500">{formatDurationPrecise(durations.Goldsmithing)}</td>
                        <td className="p-6 text-sm font-black text-gray-500">{formatDurationPrecise(durations.Setting)}</td>
                        <td className="p-6 text-sm font-black text-gray-500">{formatDurationPrecise(durations.Polishing)}</td>
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