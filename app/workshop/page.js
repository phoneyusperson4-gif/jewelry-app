'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, Search, Package, MapPin, User } from 'lucide-react'

// You can edit this list later to match your actual staff names
const STAFF_MEMBERS = [
  'Goldsmith - Station 1',
  'Goldsmith - Station 2',
  'Setter - Station 1',
  'Setter - Station 2',
  'Polishing / QC',
  'Office / Admin'
]

export default function WorkshopDashboard() {
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0]) // Default to first person

  const findOrder = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('vtiger_id', searchId.toUpperCase()) // Auto-uppercase to match format
      .single()
    if (data && data.current_stage === 'At Casting') {
    alert("🛑 HOLD ON: This casting hasn't been checked in yet! Go to the Casting Arrival page first.");
    setLoading(false);
    return;
  }
    if (data) {
      setActiveOrder(data)
    } else {
      alert("Order not found! Check the ID.")
    }
    setLoading(false)
  }

  const completeStage = async () => {
    if (!activeOrder) return

    // 1. Determine Next Stage Logic
    const current = activeOrder.current_stage
    let nextStage = 'Completed'
    
    // Simple Logic Flow: Goldsmith -> Setting -> QC -> Completed
    if (current === 'Goldsmithing') nextStage = 'Setting'
    if (current === 'Setting') nextStage = 'QC'
    if (current === 'QC') nextStage = 'Completed'

    setLoading(true)

    // 2. Save to History Log (The "Black Box")
    const { error: logError } = await supabase
      .from('production_logs')
      .insert([{
        order_id: activeOrder.id,
        staff_name: staffName,
        previous_stage: current,
        new_stage: nextStage
      }])

    // 3. Update the Actual Order Status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ current_stage: nextStage })
      .eq('id', activeOrder.id)

    if (!updateError) {
      alert(`Success! Moved to ${nextStage}`)
      setActiveOrder(null)
      setSearchId('')
    } else {
      alert("Error updating order. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER & STAFF SELECTOR */}
      <header className="mb-8 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">WORKSHOP FLOOR</h1>
          <p className="text-gray-500 font-medium">Scan ticket to update status</p>
        </div>
        
        {/* STAFF DROPDOWN */}
        <div className="bg-white p-4 rounded-xl border-2 border-gray-200 flex items-center gap-3 shadow-sm">
          <User className="text-blue-600" />
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase">Current User</label>
            <select 
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full font-bold text-lg bg-transparent outline-none cursor-pointer"
            >
              {STAFF_MEMBERS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* SEARCH/SCAN INPUT */}
      {!activeOrder && (
        <div className="relative mb-10">
          <input 
            type="text" 
            placeholder="SCAN QR CODE HERE..."
            className="w-full p-6 pl-14 border-4 border-black rounded-2xl text-2xl font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findOrder()}
            autoFocus
          />
          <Search className="absolute left-5 top-7 text-gray-400" size={30} />
        </div>
      )}

      {/* ACTIVE JOB CARD */}
      {activeOrder && (
        <div className="bg-white border-4 border-black p-8 rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-200">
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="text-xs font-black uppercase bg-blue-600 text-white px-3 py-1 rounded-md">Active Job</span>
              <h2 className="text-5xl font-black mt-2">{activeOrder.vtiger_id}</h2>
              <p className="text-xl text-gray-600 font-bold uppercase mt-1">{activeOrder.client_name}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm mb-1">
                <MapPin size={16} /> Current Station
              </div>
              <div className="text-2xl font-black bg-yellow-300 border-2 border-black px-4 py-2 rounded-xl">
                {activeOrder.current_stage}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-gray-100 p-6 rounded-2xl mb-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metal Type</p>
              <p className="text-xl font-black">{activeOrder.metal_type}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ring Size</p>
              <p className="text-xl font-black text-right">{activeOrder.ring_size}</p>
            </div>
          </div>

          <button 
            onClick={completeStage}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white border-4 border-black p-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:mt-1 transition-all disabled:opacity-50"
          >
            {loading ? 'SAVING...' : (
              <>
                <CheckCircle size={32} />
                FINISH & SEND TO {activeOrder.current_stage === 'Goldsmithing' ? 'SETTER' : 'QC'}
              </>
            )}
          </button>

          <button 
            onClick={() => setActiveOrder(null)}
            className="w-full mt-6 text-gray-400 font-bold hover:text-gray-600"
          >
            Cancel / Go Back
          </button>
        </div>
      )}
    </div>
  )
}