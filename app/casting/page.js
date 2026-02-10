'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Truck, CheckCircle, PackageSearch } from 'lucide-react'

export default function CastingGate() {
  const [searchId, setSearchId] = useState('')
  const [loading, setLoading] = useState(false)

  const checkInCasting = async () => {
    setLoading(true)
    
    // 1. Move from 'At Casting' to 'Goldsmithing'
    const { data, error } = await supabase
      .from('orders')
      .update({ current_stage: 'Goldsmithing' })
      .eq('vtiger_id', searchId.toUpperCase())
      .select()

    if (data && data.length > 0) {
      // 2. Log the arrival
      await supabase.from('production_logs').insert([{
        order_id: data[0].id,
        staff_name: 'Inventory/Office',
        previous_stage: 'At Casting',
        new_stage: 'Goldsmithing'
      }])
      
      alert(`Order ${searchId} is now at the Bench!`)
      setSearchId('')
    } else {
      alert("Order not found or not currently 'At Casting'")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto p-10 min-h-screen bg-amber-50">
      <div className="text-center mb-10">
        <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-200">
            <Truck className="text-amber-600" size={40} />
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter">Casting Arrival</h1>
        <p className="text-amber-700 font-bold uppercase text-xs tracking-widest mt-2">Scan incoming metal to unlock for workshop</p>
      </div>

      <div className="bg-white border-4 border-black p-8 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <label className="block text-xs font-black uppercase mb-2">Scan vTiger ID on Bag</label>
        <div className="flex gap-4">
            <input 
                type="text" 
                autoFocus
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkInCasting()}
                className="flex-1 p-4 border-4 border-black rounded-xl text-2xl font-bold uppercase focus:outline-none"
                placeholder="SO-XXXX"
            />
            <button 
                onClick={checkInCasting}
                className="bg-black text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
                {loading ? '...' : <CheckCircle />}
            </button>
        </div>
      </div>

      <div className="mt-12 text-center text-amber-900/40">
        <PackageSearch size={48} className="mx-auto mb-2 opacity-20" />
        <p className="text-sm font-bold uppercase italic">Ready to receive batch shipment</p>
      </div>
    </div>
  )
}