'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { PlusCircle, Printer, CheckCircle2, PackagePlus, Gem, Layers } from 'lucide-react'

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://atelier-os.vercel.app'

export default function OrderEntry() {
  const [loading, setLoading] = useState(false)
  const [savedOrder, setSavedOrder] = useState(null)
  const [formData, setFormData] = useState({
    vtiger_id: '',
    client_name: '',
    description: '',
    current_stage: 'At Casting',
    is_rush: false,
    center_stone_received: false, // NEW
    side_stones_received: false   // NEW
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await supabase.from('orders').insert([formData]).select().single()

    if (error) {
      alert("Error: " + error.message)
    } else {
      setSavedOrder(data)
      setFormData({ 
        vtiger_id: '', client_name: '', description: '', current_stage: 'At Casting', is_rush: false,
        center_stone_received: false, side_stones_received: false 
      })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-10">
      
      {/* FORM SECTION */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-black text-white p-2 rounded-lg"><PackagePlus size={24} /></div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">New Job Entry</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-black mb-1">Job ID (vTiger)</label>
              <input required type="text" placeholder="SO-1234" className="p-4 border-4 border-black rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50" 
                value={formData.vtiger_id} onChange={e => setFormData({...formData, vtiger_id: e.target.value.toUpperCase()})} />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-black mb-1">Priority</label>
              <button type="button" onClick={() => setFormData({...formData, is_rush: !formData.is_rush})} 
                className={`h-full border-4 border-black rounded-xl font-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${formData.is_rush ? 'bg-red-500 text-white translate-y-1 shadow-none' : 'bg-white text-black'}`}>
                {formData.is_rush ? '🔥 RUSH' : 'STANDARD'}
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-black mb-1">Client Name</label>
            <input required type="text" className="p-4 border-4 border-black rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none" 
              value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} />
          </div>

          {/* NEW STONE CHECKLIST */}
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setFormData({...formData, center_stone_received: !formData.center_stone_received})}
              className={`p-4 border-4 border-black rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${formData.center_stone_received ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Gem size={16} /> {formData.center_stone_received ? 'Center: Received' : 'Center: Missing'}
            </button>
            <button type="button" onClick={() => setFormData({...formData, side_stones_received: !formData.side_stones_received})}
              className={`p-4 border-4 border-black rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${formData.side_stones_received ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Layers size={16} /> {formData.side_stones_received ? 'Sides: Received' : 'Sides: Missing'}
            </button>
          </div>

          <div className="flex flex-col">
             <label className="text-[10px] font-black uppercase text-black mb-1">Details</label>
             <textarea rows="2" className="p-4 border-4 border-black rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none" 
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white p-5 border-4 border-black rounded-2xl font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all">
            {loading ? 'SAVING...' : 'CREATE JOB'}
          </button>
        </form>
      </div>

      {/* LABEL PREVIEW SECTION */}
      <div className="flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] p-10 bg-white">
        {savedOrder ? (
          <div className="animate-in zoom-in duration-300 flex flex-col items-center">
            <div className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-[10px] font-black uppercase mb-6 flex items-center gap-1">
              <CheckCircle2 size={12}/> Successfully Saved
            </div>
            
            <div className="bg-white border-4 border-black p-6 w-64 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
              <h2 className="text-3xl font-black mb-1 leading-none">{savedOrder.vtiger_id}</h2>
              <p className="text-[10px] font-black uppercase text-black mb-4">{savedOrder.client_name}</p>
              <div className="bg-white p-2 border-2 border-black rounded-lg mb-4">
                <QRCodeCanvas value={`${SITE_URL}/workshop?search=${savedOrder.vtiger_id}`} size={140} level={"H"} />
              </div>
              
              {/* Stone Indicators on Printed Label */}
              <div className="flex gap-1 w-full mt-2">
                <span className={`flex-1 py-1 text-[8px] font-black uppercase border border-black rounded ${savedOrder.center_stone_received ? 'bg-black text-white' : 'bg-white text-gray-300 line-through'}`}>C-Stone</span>
                <span className={`flex-1 py-1 text-[8px] font-black uppercase border border-black rounded ${savedOrder.side_stones_received ? 'bg-black text-white' : 'bg-white text-gray-300 line-through'}`}>S-Stones</span>
              </div>
            </div>

            <button onClick={() => window.print()} className="mt-8 flex items-center gap-2 font-black uppercase text-sm border-b-2 border-black pb-1 hover:text-blue-600">
              <Printer size={16}/> Print Job Label
            </button>
            <button onClick={() => setSavedOrder(null)} className="mt-4 text-xs font-bold text-black">Create another?</button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-black w-24 h-24 rounded-full flex items-center justify-center mx-auto">
              <PlusCircle className="text-black" size={48} />
            </div>
            <p className="font-black text-black uppercase text-xs tracking-widest">Label Preview</p>
          </div>
        )}
      </div>
    </div>
  )
}