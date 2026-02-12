'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, Users, ShieldAlert, History, ArrowRight } from 'lucide-react'

export default function AdminPage() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ completed: 0, redos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    // Fetch Logs
    const { data: logData } = await supabase
      .from('production_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) // Limit to last 50 for performance

    if (logData) {
      setLogs(logData)
      const redos = logData.filter(l => l.redo_reason).length
      const completed = logData.filter(l => l.new_stage === 'Completed').length
      setStats({ redos, completed })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-black text-white p-2 rounded-lg"><BarChart3 size={24} /></div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Shop Analytics</h1>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-4 border-black p-8 rounded-4xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
          <div className="flex items-center justify-between mb-4">
             <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Jobs Completed</p>
             <div className="bg-green-100 text-green-600 p-2 rounded-full"><CheckCircle size={20}/></div>
          </div>
          <p className="text-6xl font-black">{stats.completed}</p>
          <p className="text-xs font-bold text-gray-400 mt-2">In recent history</p>
        </div>

        <div className="bg-white border-4 border-black p-8 rounded-4xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
          <div className="flex items-center justify-between mb-4">
             <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Quality Redos</p>
             <div className="bg-red-50 text-red-500 p-2 rounded-full"><ShieldAlert size={20}/></div>
          </div>
          <p className="text-6xl font-black text-red-500">{stats.redos}</p>
          <p className="text-xs font-bold text-gray-400 mt-2">Failed QC checks</p>
        </div>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-6 border-b-2 border-gray-100 pb-4">
          <History size={20} className="text-blue-600"/>
          <h2 className="font-black uppercase text-lg">Production Log</h2>
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <p className="text-center font-bold text-gray-300 py-10">LOADING DATA...</p>
          ) : logs.length === 0 ? (
            <p className="text-center font-bold text-gray-300 py-10">NO LOGS FOUND</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="mt-1 min-w-2 h-2 rounded-full bg-black group-hover:bg-blue-600 transition-colors"></div>
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    <span className="bg-black text-white px-2 py-0.5 rounded text-[10px] uppercase mr-2">{log.staff_name}</span>
                    moved <span className="font-black text-blue-600">{log.order_id}</span>
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mt-1 uppercase">
                    <span>{log.previous_stage}</span>
                    <ArrowRight size={10} />
                    <span className={log.redo_reason ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>{log.new_stage}</span>
                  </div>
                  {log.redo_reason && (
                    <p className="text-[10px] font-black text-red-500 mt-1 uppercase border border-red-100 bg-red-50 inline-block px-2 rounded">
                      ⚠️ Reason: {log.redo_reason}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-300">
                  {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADMIN UTILITIES (Placeholder) */}
      <div className="bg-gray-100 p-8 rounded-[2.5rem] border-4 border-dashed border-gray-300 text-center opacity-50 hover:opacity-100 transition-opacity">
        <Users className="mx-auto mb-2 text-gray-400" size={32}/>
        <h3 className="font-black text-gray-400 uppercase">User Management</h3>
        <p className="text-xs font-bold text-gray-400">Add/Remove Staff (Coming Soon)</p>
      </div>

    </div>
  )
}
// Helper icon for stats
function CheckCircle({size}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}