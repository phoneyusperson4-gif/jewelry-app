'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart3, ShieldAlert, History, ArrowRight, 
  CheckCircle2, Factory, ArrowUpRight, Search, Filter, X 
} from 'lucide-react'

export default function AdminPage() {
  const [logs, setLogs] = useState([])
  const [castingJobs, setCastingJobs] = useState([])
  const [stats, setStats] = useState({ completed: 0, redos: 0 })
  const [loading, setLoading] = useState(true)
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [staffFilter, setStaffFilter] = useState('All')

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    
    // 1. Fetch Analytics Logs with JOIN to get vtiger_id
    // We limit to 20 items here as requested
    const { data: logData } = await supabase
      .from('production_logs')
      .select('*, orders(vtiger_id)') 
      .order('created_at', { ascending: false })
      .limit(20)

    if (logData) {
      setLogs(logData)
      // Calculate stats based on a wider range if needed, 
      // but for now, we'll use the fetched set
      const redos = logData.filter(l => l.redo_reason).length
      const completed = logData.filter(l => l.new_stage === 'Completed').length
      setStats({ redos, completed })
    }

    // 2. Fetch Jobs waiting in Casting
    const { data: castingData } = await supabase
      .from('orders')
      .select('*')
      .eq('current_stage', 'At Casting')
      .order('created_at', { ascending: true })
    
    if (castingData) setCastingJobs(castingData)

    setLoading(false)
  }

  const approveCasting = async (job) => {
    const { error } = await supabase
      .from('orders')
      .update({ current_stage: 'Goldsmithing' })
      .eq('id', job.id)

    if (!error) {
      await supabase.from('production_logs').insert([{
        order_id: job.id,
        staff_name: 'ADMIN',
        previous_stage: 'At Casting',
        new_stage: 'Goldsmithing'
      }])
      setCastingJobs(castingJobs.filter(j => j.id !== job.id))
      fetchAdminData()
    }
  }

  // LOGIC: Filter the logs locally for fast searching
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.orders?.vtiger_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.staff_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStaff = staffFilter === 'All' || log.staff_name === staffFilter
    return matchesSearch && matchesStaff
  })

  // Get unique staff list for the filter dropdown
  const uniqueStaff = ['All', ...new Set(logs.map(l => l.staff_name))]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-black text-white p-2 rounded-lg"><BarChart3 size={24} /></div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Shop Admin</h1>
      </div>

      {/* CASTING QUEUE */}
      <div className="bg-blue-50 border-4 border-blue-600 p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(37,99,235,1)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-blue-700">
            <Factory size={24} />
            <h2 className="font-black uppercase text-xl">Casting Arrivals</h2>
          </div>
        </div>

        {castingJobs.length === 0 ? (
          <p className="text-center py-4 text-blue-300 font-black uppercase text-xs">Queue Empty</p>
        ) : (
          <div className="grid gap-3">
            {castingJobs.map(job => (
              <div key={job.id} className="bg-white p-4 rounded-2xl border-2 border-blue-200 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-lg">{job.vtiger_id}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{job.client_name}</p>
                </div>
                <button onClick={() => approveCasting(job)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Approve <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEARCH & LOGS SECTION */}
      <div className="bg-white border-4 border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-gray-100 pb-6">
          <div className="flex items-center gap-2">
            <History size={20} className="text-gray-400"/>
            <h2 className="font-black uppercase text-lg">Activity Log</h2>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
              <input 
                type="text" 
                placeholder="Search ID or Staff..." 
                className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 text-gray-400" size={16}/>
              <select 
                className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold appearance-none bg-white outline-none focus:border-black"
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
              >
                {uniqueStaff.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <p className="text-center font-bold text-gray-300 py-10">LOADING...</p>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-black text-gray-300 uppercase italic">No matches found</p>
              <button onClick={() => {setSearchTerm(''); setStaffFilter('All')}} className="text-blue-500 text-[10px] font-black uppercase mt-2 underline">Clear Filters</button>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-4 group text-sm border-b border-gray-50 pb-4 last:border-0">
                <div className="flex-1">
                  <p className="font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase mr-2 text-white ${log.staff_name === 'ADMIN' ? 'bg-blue-600' : 'bg-black'}`}>
                      {log.staff_name}
                    </span>
                    updated <span className="font-black text-blue-600">{log.orders?.vtiger_id || 'UNKNOWN ID'}</span>
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mt-1 uppercase">
                    <span>{log.previous_stage}</span>
                    <ArrowRight size={10} />
                    <span className={log.redo_reason ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                      {log.new_stage}
                    </span>
                  </div>
                  {log.redo_reason && (
                    <p className="text-[10px] font-black text-red-500 mt-1 uppercase bg-red-50 inline-block px-2 rounded">
                      ⚠️ {log.redo_reason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-300 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-200 uppercase">
                    {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
            ))
          )}
          <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest pt-4">
            Showing last 20 entries
          </p>
        </div>
      </div>

    </div>
  )
}