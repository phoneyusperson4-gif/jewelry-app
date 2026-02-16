'use client'
import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { QRCodeCanvas } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Search, User, X, CheckCircle, Flame,
  Loader2, Gem, Layers, List, ScanLine, Package, Printer, Camera, Keyboard, Clock
} from 'lucide-react'

const STAGES = ['At Casting', 'Goldsmithing', 'Setting', 'Polishing', 'QC', 'Completed']
const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'Polisher 1', 'QC']
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']
const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

// --- Helper: format time (mm:ss or hh:mm:ss) ---
const formatTime = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = Math.floor(totalSeconds % 60)
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// --- Helper: print QR label ---
const printQRCode = (vtigerId, articleCode) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Label - ${vtigerId}</title>
        <style>
          body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
          .label { border: 2px solid black; padding: 20px; text-align: center; width: 250px; }
          h2 { margin: 0; font-size: 28px; font-weight: 900; }
          p { margin: 5px 0; font-weight: bold; text-transform: uppercase; font-size: 12px; }
          .qr-box { margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="label">
          <h2>${vtigerId}</h2>
          <p>${articleCode || 'Stock'}</p>
          <div id="qr" class="qr-box"></div>
          <p style="font-size: 8px;">Scan to Start/Finish Stage</p>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
        <script>
          QRCode.toCanvas(document.getElementById('qr'), '${vtigerId}', { width: 180 }, function() {
            window.print();
            window.close();
          })
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

// --- Custom Hook: useCameraScanner ---
function useCameraScanner(containerId) {
  const scannerRef = useRef(null)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState(null)

  const start = useCallback(async (onScan) => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(containerId)
    }
    const config = { fps: 10, qrbox: { width: 250, height: 250 } }
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        onScan,
        undefined
      )
      setInitialized(true)
      setError(null)
    } catch (err) {
      console.error('Camera start error', err)
      setError('Could not access camera. Please check permissions.')
      setInitialized(false)
    }
  }, [containerId])

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping camera', err)
      }
      scannerRef.current = null
      setInitialized(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error)
        scannerRef.current.clear()
      }
    }
  }, [])

  return { initialized, error, start, stop }
}

function WorkshopContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('scanner')
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [loading, setLoading] = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [activeJobs, setActiveJobs] = useState([])
  const [scanMessage, setScanMessage] = useState(null)
  // Cooldown state
  const [cooldownUntil, setCooldownUntil] = useState(null)

  // Camera scanner state
  const [scanMode, setScanMode] = useState('manual')
  const scannerContainerId = 'qr-reader'
  const { initialized: cameraInitialized, error: cameraError, start: startCamera, stop: stopCamera } = useCameraScanner(scannerContainerId)

  // Auto‑clear scanMessage after 4 seconds
  useEffect(() => {
    if (!scanMessage) return
    const timer = setTimeout(() => setScanMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [scanMessage])

  // Cooldown timer: update remaining every second and auto‑clear when reached
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0)
      return
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((cooldownUntil - Date.now()) / 1000))
      setCooldownRemaining(remaining)
      if (remaining === 0) {
        setCooldownUntil(null)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownUntil])

  useEffect(() => {
    fetchActiveJobs()
  }, [])

  // Start/stop camera based on mode, tab, and cooldown
  useEffect(() => {
    const shouldRunCamera = activeTab === 'scanner' && scanMode === 'camera' && cooldownRemaining === 0
    if (shouldRunCamera) {
      startCamera((decodedText) => {
        processOrderId(decodedText.trim().toUpperCase())
        if (navigator.vibrate) navigator.vibrate(200)
      })
    } else {
      stopCamera()
    }
  }, [activeTab, scanMode, cooldownRemaining, startCamera, stopCamera])

  const fetchActiveJobs = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .neq('current_stage', 'Completed')
      .order('created_at', { ascending: false })
    if (data) setActiveJobs(data)
  }

  // --- Consolidated order stage update ---
  const updateOrderStage = useCallback(async ({ order, nextStage, action, redoReason = null, durationSeconds = 0 }) => {
    const now = new Date()
    await supabase
      .from('orders')
      .update({
        current_stage: nextStage,
        timer_started_at: null,
        timer_accumulated: 0,
        updated_at: now.toISOString()
      })
      .eq('id', order.id)

    await supabase.from('production_logs').insert([{
      order_id: order.id,
      staff_name: staffName,
      action,
      previous_stage: order.current_stage,
      new_stage: nextStage,
      redo_reason: redoReason,
      duration_seconds: durationSeconds
    }])

    fetchActiveJobs()
  }, [staffName])

  // --- Process scanned/typed ID ---
  const processOrderId = async (cleanId) => {
    if (!cleanId) return
    if (cooldownRemaining > 0) {
      setScanMessage({ type: 'error', text: `Please wait ${cooldownRemaining}s before next scan` })
      return
    }
    setLoading(true)

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('vtiger_id', cleanId)
      .single()

    if (!order || error) {
      setScanMessage({ type: 'error', text: `Order ${cleanId} not found!` })
      setSearchId('')
      setLoading(false)
      return
    }

    const now = new Date()

    if (!order.timer_started_at) {
      // START
      await supabase
        .from('orders')
        .update({ timer_started_at: now.toISOString() })
        .eq('id', order.id)

      await supabase.from('production_logs').insert([{
        order_id: order.id,
        staff_name: staffName,
        action: 'STARTED',
        new_stage: order.current_stage
      }])

      setScanMessage({
        type: 'start',
        text: `▶️ STARTED: ${order.vtiger_id} at ${order.current_stage}`
      })
    } else {
      // COMPLETE
      const start = new Date(order.timer_started_at)
      const durationSeconds = Math.floor((now - start) / 1000) + (order.timer_accumulated || 0)

      const currentIndex = STAGES.indexOf(order.current_stage)
      const nextStage = STAGES[currentIndex + 1] || 'Completed'

      await updateOrderStage({
        order,
        nextStage,
        action: 'COMPLETED',
        durationSeconds
      })

      setScanMessage({
        type: 'success',
        text: `✅ COMPLETED: ${order.vtiger_id}. Moved to ${nextStage}`
      })
    }

    // Set cooldown after successful scan
    setCooldownUntil(Date.now() + COOLDOWN_MS)

    setSearchId('')
    setLoading(false)
  }

  const handleScan = () => {
    processOrderId(searchId.toUpperCase().trim())
  }

  const handleManualMove = async (isRejection = false, reason = null) => {
    if (!activeOrder) return
    setLoading(true)

    const currentIndex = STAGES.indexOf(activeOrder.current_stage)
    if (currentIndex === -1) {
      setScanMessage({ type: 'error', text: `Unknown stage: ${activeOrder.current_stage}` })
      setLoading(false)
      return
    }

    let durationSeconds = activeOrder.timer_accumulated || 0
    if (activeOrder.timer_started_at) {
      durationSeconds += Math.floor((new Date() - new Date(activeOrder.timer_started_at)) / 1000)
    }

    const nextStage = isRejection ? 'Goldsmithing' : STAGES[currentIndex + 1] || 'Completed'
    const action = isRejection ? 'REJECTED' : 'COMPLETED'

    await updateOrderStage({
      order: activeOrder,
      nextStage,
      action,
      redoReason: reason,
      durationSeconds
    })

    setActiveOrder(null)
    setShowRejectMenu(false)
    setScanMessage({ type: 'success', text: `✅ Moved to ${nextStage}` })
    setLoading(false)
  }

  const toggleStone = async (field, currentValue) => {
    if (!activeOrder) return
    const newValue = !currentValue
    setActiveOrder({ ...activeOrder, [field]: newValue })
    await supabase.from('orders').update({ [field]: newValue }).eq('id', activeOrder.id)
  }

  const closeOrder = () => {
    setActiveOrder(null)
    setShowRejectMenu(false)
  }

  const handlePrintQR = () => {
    if (activeOrder) printQRCode(activeOrder.vtiger_id, activeOrder.article_code)
  }

  const getJobCurrentTime = (job) => {
    let acc = job.timer_accumulated || 0
    if (job.timer_started_at) {
      const start = new Date(job.timer_started_at)
      acc += (Date.now() - start.getTime()) / 1000
    }
    return acc
  }

  // Memoize filtered list
  const rushJobs = useMemo(() => activeJobs.filter(j => j.is_rush), [activeJobs])

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      {/* Global message display */}
      {scanMessage && (
        <div className={`mb-4 p-4 rounded-xl border-2 font-black text-sm text-center uppercase animate-in slide-in-from-top-2 ${
          scanMessage.type === 'start'
            ? 'bg-blue-100 border-blue-600 text-blue-800'
            : scanMessage.type === 'success'
            ? 'bg-green-100 border-green-600 text-green-800'
            : 'bg-red-100 border-red-600 text-red-800'
        }`}>
          {scanMessage.text}
        </div>
      )}

      {/* Cooldown indicator */}
      {cooldownRemaining > 0 && (
        <div className="mb-4 p-3 bg-yellow-100 border-2 border-yellow-600 rounded-xl font-black text-xs text-yellow-800 flex items-center justify-center gap-2">
          <Clock size={16} className="animate-pulse" />
          COOLDOWN: {formatTime(cooldownRemaining)} until next scan
        </div>
      )}

      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl gap-1">
        <button
          onClick={() => { setActiveTab('scanner'); closeOrder(); }}
          className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-lg font-black text-[10px] md:text-xs transition-all ${
            activeTab === 'scanner' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <ScanLine size={14} /> SCANNER
        </button>
        <button
          onClick={() => { setActiveTab('overview'); closeOrder(); }}
          className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-lg font-black text-[10px] md:text-xs transition-all ${
            activeTab === 'overview' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <List size={14} /> ACTIVE ({activeJobs.length})
        </button>
        <button
          onClick={() => { setActiveTab('rush'); closeOrder(); }}
          className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-lg font-black text-[10px] md:text-xs transition-all ${
            activeTab === 'rush' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-400'
          }`}
        >
          <Flame size={14} className={activeTab === 'rush' ? 'animate-pulse' : ''} /> RUSH ({rushJobs.length})
        </button>
      </div>

      <div className="mb-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1 mb-1">
          <User size={12} /> Technician
        </label>
        <select
          className="w-full font-bold text-base bg-transparent outline-none cursor-pointer"
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
        >
          {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!activeOrder ? (
        <div className="animate-in fade-in duration-500">
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setScanMode('manual')}
                  className={`flex-1 py-2 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1 ${
                    scanMode === 'manual'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-400 border-gray-300'
                  }`}
                  disabled={cooldownRemaining > 0} // optional: disable toggle during cooldown
                >
                  <Keyboard size={14} /> MANUAL
                </button>
                <button
                  onClick={() => setScanMode('camera')}
                  className={`flex-1 py-2 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1 ${
                    scanMode === 'camera'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-400 border-gray-300'
                  }`}
                  disabled={cooldownRemaining > 0}
                >
                  <Camera size={14} /> CAMERA
                </button>
              </div>

              {scanMode === 'manual' && (
                <>
                  <div className="flex gap-2 relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="SCAN JOB BARCODE..."
                      className="w-full p-6 border-4 border-black rounded-2xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-blue-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                      disabled={cooldownRemaining > 0 || loading}
                    />
                    <button
                      onClick={handleScan}
                      disabled={cooldownRemaining > 0 || loading}
                      className="bg-black text-white px-8 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Search />}
                    </button>
                  </div>
                  <div className="text-center mt-8">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Scan 1x to Start Stage <br /> Scan 2x to Complete Stage
                    </p>
                  </div>
                </>
              )}

              {scanMode === 'camera' && (
                <div className="space-y-4">
                  <div
                    id={scannerContainerId}
                    className="w-full aspect-video bg-black rounded-2xl overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  />
                  {cameraError && (
                    <div className="p-4 bg-red-100 border-2 border-red-600 rounded-xl font-black text-xs text-red-800">
                      {cameraError}
                    </div>
                  )}
                  {!cameraError && !cameraInitialized && cooldownRemaining === 0 && (
                    <div className="text-center p-4 bg-yellow-100 border-2 border-yellow-600 rounded-xl font-black text-xs">
                      Initializing camera...
                    </div>
                  )}
                  {cameraInitialized && cooldownRemaining === 0 && (
                    <div className="text-center text-[10px] font-black text-green-600">
                      Camera active – point at a QR code
                    </div>
                  )}
                  {cooldownRemaining > 0 && (
                    <div className="text-center p-4 bg-yellow-100 border-2 border-yellow-600 rounded-xl font-black text-xs">
                      Camera paused – cooldown active
                    </div>
                  )}
                  <button
                    onClick={() => {
                      stopCamera()
                      setScanMode('manual')
                    }}
                    className="w-full bg-gray-200 p-3 rounded-xl font-black text-xs border-2 border-black"
                    disabled={cooldownRemaining > 0}
                  >
                    STOP CAMERA
                  </button>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'overview' || activeTab === 'rush') && (
            <div className="grid gap-3">
              {(activeTab === 'rush' ? rushJobs : activeJobs).length === 0 && (
                <div className="text-center p-10 text-gray-400 font-black uppercase text-xs">
                  No jobs found in this view.
                </div>
              )}
              {(activeTab === 'rush' ? rushJobs : activeJobs).map(job => {
                const currentTime = getJobCurrentTime(job)
                return (
                  <div
                    key={job.id}
                    onClick={() => setActiveOrder(job)}
                    className={`bg-white p-4 rounded-2xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex justify-between items-center group active:scale-95 transition-transform ${
                      job.is_rush ? 'border-red-500' : 'border-black'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-xl group-hover:text-blue-600">{job.vtiger_id}</p>
                        {job.is_rush && <Flame size={16} className="text-red-500 fill-red-500" />}
                      </div>
                      <p className="text-[10px] text-blue-600 font-black uppercase flex items-center gap-1">
                        <Package size={10} /> {job.article_code || 'Stock'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black uppercase text-gray-400">{job.current_stage}</p>
                      {currentTime > 0 && (
                        <p className="text-[10px] font-bold text-gray-500">{formatTime(currentTime)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border-4 border-black p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-5xl font-black tracking-tighter leading-none">{activeOrder.vtiger_id}</h2>
                {activeOrder.is_rush && <Flame size={24} className="text-red-500 fill-red-500" />}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  {activeOrder.article_code || 'NO CODE'}
                </span>
                <span className="text-gray-400 font-black text-[10px] uppercase italic">
                  Stage: {activeOrder.current_stage}
                </span>
              </div>
            </div>
            <button onClick={closeOrder} className="text-gray-300 hover:text-black">
              <X size={32} />
            </button>
          </div>

          <div className="relative flex flex-col items-center bg-gray-50 border-2 border-black rounded-3xl p-4 mb-6">
            <div className="bg-white p-2 border border-black rounded-lg shadow-sm">
              <QRCodeCanvas
                value={activeOrder.vtiger_id}
                size={120}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-[9px] font-black uppercase mt-2 text-gray-400 tracking-widest">
              Digital Job Token
            </p>
            <button
              onClick={handlePrintQR}
              className="absolute top-2 right-2 bg-black text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
              title="Print QR Label"
            >
              <Printer size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => toggleStone('center_stone_received', activeOrder.center_stone_received)}
              className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 transition-all ${
                activeOrder.center_stone_received
                  ? 'bg-green-500 text-white shadow-inner'
                  : 'bg-gray-50 text-gray-400 border-dashed'
              }`}
            >
              <Gem size={24} />
              <span className="text-[10px] font-black uppercase">
                {activeOrder.center_stone_received ? 'Center: Ready' : 'Center: Needed'}
              </span>
            </button>
            <button
              onClick={() => toggleStone('side_stones_received', activeOrder.side_stones_received)}
              className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 transition-all ${
                activeOrder.side_stones_received
                  ? 'bg-green-500 text-white shadow-inner'
                  : 'bg-gray-50 text-gray-400 border-dashed'
              }`}
            >
              <Layers size={24} />
              <span className="text-[10px] font-black uppercase">
                {activeOrder.side_stones_received ? 'Sides: Ready' : 'Sides: Needed'}
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <button
              disabled={loading}
              onClick={() => handleManualMove(false)}
              className="w-full bg-black text-white p-6 border-4 border-black rounded-3xl font-black text-2xl flex items-center justify-center gap-3 hover:bg-gray-800 active:scale-95 transition-all shadow-[0px_6px_0px_0px_rgba(0,0,0,0.5)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={28} /> MANUAL COMPLETE</>}
            </button>

            <button
              onClick={() => setShowRejectMenu(!showRejectMenu)}
              className="w-full bg-red-50 text-red-600 p-4 border-2 border-red-600 border-dashed rounded-2xl font-black text-xs uppercase hover:bg-red-100"
            >
              Fail QC / Send back to Goldsmithing
            </button>

            {showRejectMenu && (
              <div className="bg-red-100 p-4 rounded-2xl border-2 border-red-600 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase mb-3 text-red-700">Reason for Redo:</p>
                <div className="grid grid-cols-1 gap-2">
                  {REDO_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => handleManualMove(true, reason)}
                      className="bg-white p-3 border-2 border-black rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-colors text-left"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkshopPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse">SYNCING WORKSHOP...</div>}>
      <WorkshopContent />
    </Suspense>
  )
}