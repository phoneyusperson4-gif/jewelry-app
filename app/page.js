'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react' 
import { Printer, Loader2 } from 'lucide-react'

export default function OrderEntry() {
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState(null)
  const [formData, setFormData] = useState({
    vtiger_id: '',
    client_name: '',
    ring_size: '',
    metal_type: '18k Yellow Gold',
  })
  const [file, setFile] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    let imagePath = null
    if (file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${formData.vtiger_id}-${Date.now()}.${fileExt}`
      
      const { data, error: uploadError } = await supabase.storage
        .from('cad-renders')
        .upload(fileName, file)
      
      if (data) {
        const { data: urlData } = supabase.storage
        .from('cad-renders')
        .getPublicUrl(fileName)
        imagePath = urlData.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        vtiger_id: formData.vtiger_id,
        client_name: formData.client_name,
        ring_size: formData.ring_size,
        metal_type: formData.metal_type,
        cad_url: imagePath
        current_stage: 'At Casting'
      }])
      .select()

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setOrder(data[0])
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-xl mx-auto p-8 bg-white min-h-screen font-sans text-gray-900">
      
      {!order && (
        <form onSubmit={handleSubmit} className="space-y-6 border p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">New Production Order</h2>
          
          <div>
            <label className="block text-sm font-bold mb-1">vTiger Order ID</label>
            <input 
              required
              type="text" 
              placeholder="e.g. SO-2024-001"
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.vtiger_id}
              onChange={e => setFormData({...formData, vtiger_id: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Client Name</label>
            <input 
              required
              type="text" 
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.client_name}
              onChange={e => setFormData({...formData, client_name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Ring Size</label>
              <input 
                type="text" 
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.ring_size}
                onChange={e => setFormData({...formData, ring_size: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Metal</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.metal_type}
                onChange={e => setFormData({...formData, metal_type: e.target.value})}
              >
                <option>18k Yellow Gold</option>
                <option>18k White Gold</option>
                <option>18k Rose Gold</option>
                <option>Platinum</option>
                <option>Silver 925</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">CAD Render (Image)</label>
            <input 
              type="file" 
              accept="image/*"
              className="w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={e => setFile(e.target.files[0])}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 font-bold flex justify-center items-center transition-colors"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Create Job Ticket'}
          </button>
        </form>
      )}

      {order && (
        <div className="text-center">
          <div className="bg-green-50 p-4 rounded-lg mb-8 border border-green-200 print:hidden">
            <h3 className="text-green-800 font-bold text-lg">Order Saved Successfully!</h3>
            <button 
              onClick={handlePrint}
              className="mt-3 bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 w-full hover:bg-green-700 transition-colors shadow-lg"
            >
              <Printer size={20} /> Print Job Ticket
            </button>
          </div>

          {/* THE PRINTABLE TICKET */}
          <div className="border-4 border-black p-6 rounded-xl bg-white max-w-lg mx-auto print:border-2 print:shadow-none shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="text-left">
                <h1 className="text-4xl font-extrabold tracking-tighter">{order.vtiger_id}</h1>
                <p className="text-gray-500 font-semibold mt-1 uppercase tracking-wide">{order.client_name}</p>
              </div>
              <div className="border-2 border-black p-1">
                <QRCodeCanvas value={order.vtiger_id} size={100} />
              </div>
            </div>

            <hr className="border-black border-t-2 my-4"/>

            <div className="grid grid-cols-2 gap-6 text-left font-mono my-6">
              <div className="bg-gray-100 p-3 rounded">
                <span className="block text-xs text-gray-500 uppercase font-bold">Metal Type</span>
                <span className="font-bold text-xl block leading-tight">{order.metal_type}</span>
              </div>
              <div className="bg-gray-100 p-3 rounded">
                <span className="block text-xs text-gray-500 uppercase font-bold">Ring Size</span>
                <span className="font-bold text-xl block leading-tight">{order.ring_size}</span>
              </div>
            </div>

            {order.cad_url && (
              <div className="mt-6 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.cad_url} alt="CAD" className="w-full h-64 object-contain mx-auto" />
              </div>
            )}
            
            <div className="mt-8 pt-4 border-t border-dashed border-gray-300">
               <p className="text-xs text-center text-gray-400 font-mono uppercase">Internal Production Ticket • Atelier Use Only</p>
            </div>
          </div>
          
          <button 
            onClick={() => {setOrder(null); setFile(null);}} 
            className="mt-12 text-gray-400 hover:text-gray-600 underline print:hidden"
          >
            ← Enter Another Order
          </button>
        </div>
      )}
    </div>
  )
}