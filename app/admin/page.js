'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart3, History, ArrowRight, ChevronDown, 
  Factory, Hammer, Gem, Sparkles, Search, 
  LayoutDashboard, Loader2, CheckCircle2 
} from 'lucide-react'

export default function AdminPage() {
  const [logs, setLogs] = useState([])
  const [wipJobs, setWipJobs] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // UI State
  const [displayLimit, setDisplayLimit] = useState(15)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredOrder, setHoveredOrder] = useState(null)

  useEffect(() => {
    fetchLiveProduction()
    fetchLogs()
  }, [displayLimit])

  const fetchLiveProduction = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('current_stage', ['At Casting', 'Goldsmithing', 'Setting', 'Polishing'])
      .order('created_at', { ascending: true })
    if (data) setWipJobs(data)
  }

  const fetchLogs = async () => {
    if (displayLimit === 15) setLoading(true)
    else setLoadingMore(true)
    
    const { data: logData } = await supabase
      .from('production_logs')
      .select('*, orders(vtiger_id)') 
      .order('created_at', { ascending: false })
      .limit(displayLimit)

    if (logData) setLogs(logData)
    setLoading(false)
    setLoadingMore(false)
  }

  const renderColumn = (title, icon, jobs, color) => (
    <div className={`${color.bg} border-4 ${color.border} rounded-[2rem] p-5 shadow-[4px_4px_0px_0px_black]`}>
      <div className={`flex items-center gap-2 ${color.text} mb-4 border-b ${color.accent} pb-2 font-black uppercase text-[10px]`}>
        {icon} {title} ({jobs.length})
      </div>
      <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
        {jobs.map(job => (
          <div 
            key={job.id} 
            // Persistent Hover Logic
            onMouseEnter={() => setHoveredOrder(job)}
            onMouseLeave={() => setHoveredOrder(null)}
            className="bg-white p-3 rounded-xl border-2 border-black shadow-sm cursor-help transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_black] active:scale-95"
          >
            <p className="font-black text-sm">{job.vtiger_id}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{job.client_name || 'Stock'}</p>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-center py-4 text-[9px] font-black text-gray-300 italic uppercase">Station Empty</p>}
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-20 relative">
      
      {/* --- PERSISTENT HOVER MODAL --- */}
      {hoveredOrder && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[6px] border-black p-8 rounded-[3rem] shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm animate-in zoom-in duration-150 pointer-events-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-5xl font-black tracking-tighter leading-tight">{hoveredOrder.vtiger_id}</h2>
              <div className="bg-yellow-400 p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_black]">
                <Sparkles size={20} className="text-white" />
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Production Notes</p>
                <p className="text-sm font-bold leading-snug text-gray-800 italic">"{hoveredOrder.description || "No specific instructions listed."}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-2xl border-2 border-black flex items-center justify-center gap-2 ${hoveredOrder.center_stone_received ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 border-dashed'}`}>
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase">Center Stone</span>
                </div>
                <div className={`p-3 rounded-2xl border-2 border-black flex items-center justify-center gap-2 ${hoveredOrder.side_stones_received ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 border-dashed'}`}>
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase">Side Stones</span>
                </div>
              </div>
              
              <div className="pt-4 border-t-2 border-gray-100 flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase">Current Department</span>
                <span className="text-[10px] font-black text-blue-600 uppercase">{hoveredOrder.current_stage}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
          <div className="bg-black text-white p-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"><LayoutDashboard size={28} /></div>
          Control Center
        </h1>
      </div>

      {/* --- 4-COLUMN PRODUCTION OVERVIEW --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderColumn('Casting', <Factory size={16}/>, wipJobs.filter(j => j.current_stage === 'At Casting'), { bg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-700', accent: 'border-blue-200' })}
        {renderColumn('Goldsmithing', <Hammer size={16}/>, wipJobs.filter(j => j.current_stage === 'Goldsmithing'), { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', accent: 'border-orange-200' })}
        {renderColumn('Setting', <Gem size={16}/>, wipJobs.filter(j => j.current_stage === 'Setting'), { bg: 'bg-purple-50', border: 'border-purple-600', text: 'text-purple-700', accent: 'border-purple-200' })}
        {renderColumn('Polishing', <Sparkles size={16}/>, wipJobs.filter(j => j.current_stage === 'Polishing'), { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', accent: 'border-emerald-200' })}
      </div>

      

      {/* --- AUDIT LOG --- */}
      <div className="bg-white border-4 border-black p-8 rounded-[3rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-4 border-gray-50 pb-6">
          <div className="flex items-center gap-2">
            <History size={24} className="text-black"/>
            <h2 className="font-black uppercase text-xl">Audit History</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
            <input 
              type="text" 
              placeholder="Search vTiger ID..." 
              className="pl-10 pr-4 py-2 border-2 border-black rounded-xl text-xs font-bold outline-none focus:ring-2 ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
          ) : logs.filter(l => l.orders?.vtiger_id?.includes(searchTerm.toUpperCase())).map((log, i) => (
            <div key={i} className="flex items-start justify-between gap-4 text-sm border-b border-gray-50 pb-4 last:border-0 hover:bg-gray-50/50 p-2 rounded-lg transition-colors">
              <div className="flex-1">
                <p className="font-bold">
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[10px] uppercase mr-2 font-black">{log.staff_name}</span>
                  processed <span className="font-black text-blue-600">{log.orders?.vtiger_id || 'UNKNOWN'}</span>
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mt-1 uppercase">
                  <span>{log.previous_stage}</span>
                  <ArrowRight size={10} />
                  <span className={log.redo_reason ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>{log.new_stage}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-300 uppercase">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          ))}
          
          <button 
            onClick={() => setDisplayLimit(prev => prev + 15)}
            disabled={loadingMore}
            className="w-full mt-4 py-4 border-4 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-black text-xs uppercase hover:bg-gray-50 hover:border-black hover:text-black transition-all"
          >
            {loadingMore ? <Loader2 className="animate-spin" size={16} /> : "Extend List (+15 Entries)"}
          </button>
        </div>
      </div>
    </div>
  )
}