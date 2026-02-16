'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  History, ArrowRight, Clock, Factory, Hammer, Gem, Sparkles,
  Search, PlayCircle, Archive, X, RotateCcw
} from 'lucide-react'

// Simple debounce utility
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

// Time formatter with days
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0m'
  if (seconds < 60) return '<1m'
  const days = Math.floor(seconds / 86400)
  const hrs = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hrs > 0) parts.push(`${hrs}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`)
  return parts.join(' ')
}

// ---------- ENHANCED TIME BREAKDOWN WITH TIMELINE ----------
const TimeBreakdown = ({ order }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('production_logs')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })
      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [order.id])

  if (loading) return <div className="animate-pulse text-[10px] font-black uppercase text-gray-400 mt-4">Calculating...</div>

  // Overall time frame
  const startTime = new Date(order.created_at).getTime()
  const endTime = order.current_stage === 'Completed'
    ? new Date(order.updated_at).getTime()
    : Date.now()
  const totalSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000))

  // Build timeline: interleave waiting and stage entries
  const timeline = []
  let prevEnd = startTime

  logs.forEach((log) => {
    const logTime = new Date(log.created_at).getTime()
    const stageSeconds = log.duration_seconds || 0
    const stageStart = logTime - stageSeconds * 1000
    // Use previous_stage if available, otherwise fallback to new_stage
    const stageName = (log.previous_stage || log.new_stage || 'Unknown').trim()

    // Waiting before this stage (if any)
    const waitSeconds = Math.max(0, Math.floor((stageStart - prevEnd) / 1000))
    if (waitSeconds > 0) {
      timeline.push({
        type: 'wait',
        name: 'Waiting',
        seconds: waitSeconds,
        from: new Date(prevEnd),
        to: new Date(stageStart)
      })
    }

    // The stage itself (skip if zero duration to avoid clutter)
    if (stageSeconds > 0) {
      timeline.push({
        type: 'stage',
        name: stageName,
        seconds: stageSeconds,
        staff: log.staff_name,
        isRedo: log.action === 'REJECTED',
        from: new Date(stageStart),
        to: new Date(logTime)
      })
    }

    prevEnd = logTime
  })

  // Final waiting after last stage
  const finalWaitSeconds = Math.max(0, Math.floor((endTime - prevEnd) / 1000))
  if (finalWaitSeconds > 0) {
    timeline.push({
      type: 'wait',
      name: 'Waiting',
      seconds: finalWaitSeconds,
      from: new Date(prevEnd),
      to: new Date(endTime)
    })
  }

  // Totals from timeline
  const activeSeconds = timeline.filter(t => t.type === 'stage').reduce((acc, t) => acc + t.seconds, 0)
  const waitingSeconds = timeline.filter(t => t.type === 'wait').reduce((acc, t) => acc + t.seconds, 0)

  // Stage totals (dynamically from logs, trimmed, using same fallback)
  const summary = logs.reduce((acc, log) => {
    const stage = (log.previous_stage || log.new_stage || 'Unknown').trim()
    acc[stage] = (acc[stage] || 0) + (log.duration_seconds || 0)
    return acc
  }, {})

  // Get all stages that have time (for display)
  const stageList = Object.keys(summary).filter(stage => summary[stage] > 0)

  return (
    <div className="mt-6 space-y-6">
      {/* Overall time summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
          <p className="text-[8px] font-black uppercase text-gray-400">Total</p>
          <p className="text-xs font-black">{formatDuration(totalSeconds)}</p>
        </div>
        <div className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
          <p className="text-[8px] font-black uppercase text-gray-400">Active</p>
          <p className="text-xs font-black">{formatDuration(activeSeconds)}</p>
        </div>
        <div className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
          <p className="text-[8px] font-black uppercase text-gray-400">Waiting</p>
          <p className="text-xs font-black">{formatDuration(waitingSeconds)}</p>
        </div>
      </div>

      {/* Stage totals – dynamically show all stages that have time */}
      <div className="grid grid-cols-3 gap-2">
        {stageList.map(stage => (
          <div key={stage} className="bg-gray-50 border-2 border-black p-2 rounded-xl text-center">
            <p className="text-[8px] font-black uppercase text-gray-400">{stage}</p>
            <p className="text-xs font-black">{formatDuration(summary[stage])}</p>
          </div>
        ))}
      </div>

      {/* Detailed Timeline */}
      <div className="border-t-4 border-black pt-4">
        <h4 className="font-black text-[10px] mb-3 uppercase text-gray-400 tracking-widest flex items-center gap-2">
          <History size={12}/> Timeline (with waiting)
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {timeline.map((item, i) => (
            <div
              key={i}
              className={`flex justify-between items-center text-[11px] py-2 border-b-2 border-gray-100 last:border-0 ${
                item.type === 'wait' ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {item.type === 'wait' ? (
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
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
                  {item.from.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
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
}

// ---------- MAIN ADMIN PAGE ----------
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

  // Debounced search handlers
  const debouncedSetSearchTerm = useMemo(() => debounce(setSearchTerm, 300), [])
  const debouncedSetLogSearchTerm = useMemo(() => debounce(setLogSearchTerm, 300), [])

  useEffect(() => {
    return () => {
      debouncedSetSearchTerm.cancel?.()
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
        const { data: live, error: liveError } = await supabase
          .from('orders')
          .select('*')
          .neq('current_stage', 'Completed')
          .order('created_at', { ascending: true })
        
        if (liveError) throw new Error(liveError.message || 'Live board query failed')
        setWipJobs(live || [])

        const { data: logData, error: logError } = await supabase
          .from('production_logs')
          .select('*, orders(vtiger_id)')
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (logError) throw new Error(logError.message || 'Activity log query failed')
        setLogs(logData || [])
        
      } else {
        const { data: done, error: doneError } = await supabase
          .from('orders')
          .select('*')
          .ilike('current_stage', '%completed%')
          .order('updated_at', { ascending: false })
          .limit(100)
        
        if (doneError) throw new Error(doneError.message || 'Archive query failed')

        setCompletedJobs(done || [])
        if (done && done.length > 0) {
          await fetchStageTimes(done.map(j => j.id))
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

  // Stage duration calculation (dynamic + total)
  async function fetchStageTimes(orderIds) {
    if (!orderIds || orderIds.length === 0) return

    try {
      const { data: logsData, error } = await supabase
        .from('production_logs')
        .select('order_id, previous_stage, duration_seconds')
        .in('order_id', orderIds)

      if (error) {
        console.error('Error fetching stage durations:', error.message)
        return
      }

      const durations = {}
      logsData?.forEach(log => {
        const id = log.order_id
        if (!durations[id]) durations[id] = { Goldsmithing: 0, Setting: 0, Polishing: 0, Total: 0 }
        const stage = log.previous_stage
        const secs = Number(log.duration_seconds) || 0

        if (stage === 'Goldsmithing') durations[id].Goldsmithing += secs
        if (stage === 'Setting') durations[id].Setting += secs
        if (stage === 'Polishing' || stage === 'QC') durations[id].Polishing += secs

        durations[id].Total += secs
      })

      setStageDurations(durations)
    } catch (err) {
      console.error('Critical error in fetchStageTimes:', err)
    }
  }

  // Memoized stage filtering for live board
  const stagesMap = useMemo(() => ({
    Casting: wipJobs.filter(j => j.current_stage === 'At Casting'),
    Goldsmithing: wipJobs.filter(j => j.current_stage === 'Goldsmithing'),
    Setting: wipJobs.filter(j => j.current_stage === 'Setting'),
    Polishing: wipJobs.filter(j => ['Polishing', 'QC'].includes(j.current_stage))
  }), [wipJobs])

  // Client-side search for archive
  const filteredArchive = useMemo(() => {
    const term = searchTerm.trim().toUpperCase()
    if (!term) return completedJobs
    return completedJobs.filter(job => {
      const id = job.vtiger_id?.toUpperCase() || ''
      const code = job.article_code?.toUpperCase() || ''
      return id.includes(term) || code.includes(term)
    })
  }, [completedJobs, searchTerm])

  // Client-side search for activity logs
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

  // Total time from order dates (used in archive)
  const calculateTotalTime = (start, end) => {
    if (!start || !end) return '---'
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    const totalSecs = Math.floor(diffMs / 1000)
    return formatDuration(totalSecs)
  }

  // Kanban column renderer
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

      {/* JOB DETAIL MODAL (now passes full order) */}
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

            <TimeBreakdown order={hoveredOrder} />

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
        // --- COMPLETIONS ARCHIVE VIEW ---
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
                    const durations = stageDurations[job.id] || { Goldsmithing: 0, Setting: 0, Polishing: 0, Total: 0 }
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
                        <td className="p-6 text-sm font-black text-gray-500">{formatDuration(durations.Goldsmithing)}</td>
                        <td className="p-6 text-sm font-black text-gray-500">{formatDuration(durations.Setting)}</td>
                        <td className="p-6 text-sm font-black text-gray-500">{formatDuration(durations.Polishing)}</td>
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