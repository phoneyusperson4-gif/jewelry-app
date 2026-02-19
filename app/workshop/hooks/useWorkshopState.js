import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { STAGES, STAFF_MEMBERS, COOLDOWN_MS } from '../constants'

/**
 * Central state and business logic for the Workshop page.
 *
 * Encapsulates:
 * - Active jobs list (fetched from Supabase)
 * - The currently selected order and its timer state
 * - Scan / cooldown processing
 * - Stage transitions and QC rejections
 * - Stone toggle updates
 *
 * All Supabase mutations are fire-and-forget at the UI level — optimistic updates
 * keep the UI snappy while the DB catches up.
 *
 * @returns {object} All state values and action handlers consumed by WorkshopContent.
 */
export function useWorkshopState() {
  // ── UI State ──────────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState('scanner')
  const [searchId,       setSearchId]       = useState('')
  const [scanMode,       setScanMode]       = useState('manual')
  const [staffName,      setStaffName]      = useState(STAFF_MEMBERS[0])
  const [loading,        setLoading]        = useState(false)
  const [scanMessage,    setScanMessage]    = useState(null)

  // ── Order State ───────────────────────────────────────────────────────────
  const [activeOrder,    setActiveOrder]    = useState(null)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [isExternal,     setIsExternal]     = useState(false)
  const [manualStage,    setManualStage]    = useState('')
  const [lastRedoReason, setLastRedoReason] = useState(null)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // ── Jobs List State ───────────────────────────────────────────────────────
  const [activeJobs,  setActiveJobs]  = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)

  // ── Refs (stable values accessible inside callbacks without stale closures) ─
  const cooldownsRef   = useRef({})  // { [orderId]: expiryTimestamp }
  const processingRef  = useRef(false)
  const activeOrderRef = useRef(null)
  const staffNameRef   = useRef(staffName)

  useEffect(() => { activeOrderRef.current = activeOrder }, [activeOrder])
  useEffect(() => { staffNameRef.current   = staffName   }, [staffName])

  // ── Derived ───────────────────────────────────────────────────────────────
  const rushJobs    = useMemo(() => activeJobs.filter((j) => j.is_rush), [activeJobs])
  const visibleJobs = activeTab === 'rush' ? rushJobs : activeJobs

  // ── Scan message auto-dismiss ─────────────────────────────────────────────
  useEffect(() => {
    if (!scanMessage) return
    const t = setTimeout(() => setScanMessage(null), 4000)
    return () => clearTimeout(t)
  }, [scanMessage])

  // ── Sync derived state when selected order changes ────────────────────────
  useEffect(() => {
    if (!activeOrder) {
      setLastRedoReason(null)
      return
    }

    setManualStage(activeOrder.current_stage)
    setIsExternal(activeOrder.is_external || false)
    setIsTimerRunning(!!activeOrder.timer_started_at)

    // Fetch the most recent QC fail reason for this order (shown in Goldsmithing stage)
    supabase
      .from('production_logs')
      .select('redo_reason')
      .eq('order_id', activeOrder.id)
      .not('redo_reason', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setLastRedoReason(data[0].redo_reason)
      })
  }, [activeOrder])

  // ── Cooldown helpers ──────────────────────────────────────────────────────

  const isOrderInCooldown = useCallback((orderId) => {
    const expiry = cooldownsRef.current[orderId]
    return !!expiry && Date.now() < expiry
  }, [])

  const setOrderCooldown = useCallback((orderId) => {
    cooldownsRef.current[orderId] = Date.now() + COOLDOWN_MS
    setTimeout(() => { delete cooldownsRef.current[orderId] }, COOLDOWN_MS)
  }, [])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchActiveJobs = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .neq('current_stage', 'Completed')
      .order('created_at', { ascending: false })

    if (data) setActiveJobs(data)
    setJobsLoading(false)
  }, [])

  useEffect(() => { fetchActiveJobs() }, [fetchActiveJobs])

  // ── Core DB helper ────────────────────────────────────────────────────────
  /**
   * Writes a stage transition to both `orders` and `production_logs` in parallel.
   *
   * @param {object}  params
   * @param {object}  params.order              - The order being transitioned.
   * @param {string}  params.nextStage          - Target stage name.
   * @param {string}  params.action             - Log action: 'STARTED' | 'COMPLETED' | 'REJECTED'.
   * @param {string}  [params.redoReason]       - Populated only for REJECTED actions.
   * @param {number}  [params.durationSeconds]  - Time spent in the current stage (seconds).
   * @param {boolean} [params.isExternalOverride] - Overrides `order.is_external` if provided.
   */
  const writeStageChange = useCallback(async ({
    order,
    nextStage,
    action,
    redoReason        = null,
    durationSeconds   = 0,
    isExternalOverride,
  }) => {
    const isExt = isExternalOverride ?? order.is_external

    await Promise.all([
      supabase.from('orders').update({
        current_stage:     nextStage,
        is_external:       isExt,
        timer_started_at:  null,
        timer_accumulated: 0,
        updated_at:        new Date().toISOString(),
      }).eq('id', order.id),

      supabase.from('production_logs').insert([{
        order_id:         order.id,
        staff_name:       staffNameRef.current,
        action,
        previous_stage:   order.current_stage,
        new_stage:        nextStage,
        redo_reason:      redoReason,
        duration_seconds: durationSeconds,
      }]),
    ])
  }, [])

  // ── Timer: START ──────────────────────────────────────────────────────────

  const handleTimerStart = useCallback(async () => {
    const order = activeOrderRef.current
    if (!order || isTimerRunning) return

    const now = new Date().toISOString()

    // Optimistic update so elapsed calc is correct on stop
    setActiveOrder((prev) => prev ? { ...prev, timer_started_at: now } : prev)
    setIsTimerRunning(true)

    await Promise.all([
      supabase.from('orders').update({ timer_started_at: now }).eq('id', order.id),
      supabase.from('production_logs').insert([{
        order_id:   order.id,
        staff_name: staffNameRef.current,
        action:     'STARTED',
        new_stage:  order.current_stage,
      }]),
    ])
  }, [isTimerRunning])

  // ── Timer: STOP → advances to next stage ─────────────────────────────────

  const handleTimerStop = useCallback(async () => {
    const order = activeOrderRef.current
    if (!order || !isTimerRunning) return

    const elapsed = (order.timer_accumulated || 0) + (
      order.timer_started_at
        ? Math.floor((Date.now() - new Date(order.timer_started_at).getTime()) / 1000)
        : 0
    )

    const currentIdx = STAGES.indexOf(order.current_stage)
    const nextStage  =
      currentIdx >= 0 && currentIdx < STAGES.length - 1
        ? STAGES[currentIdx + 1]
        : 'Completed'

    await writeStageChange({ order, nextStage, action: 'COMPLETED', durationSeconds: elapsed })

    setIsTimerRunning(false)
    setActiveOrder(null)
    setOrderCooldown(order.id)
    setScanMessage({ type: 'success', text: `✅ Completed ${order.vtiger_id}. Moved to ${nextStage}` })
    fetchActiveJobs()
  }, [isTimerRunning, writeStageChange, setOrderCooldown, fetchActiveJobs])

  // ── Barcode scan handler (start on 1st scan, complete on 2nd) ────────────

  const processOrderId = useCallback(async (cleanId) => {
    if (!cleanId || processingRef.current) return
    processingRef.current = true
    setLoading(true)

    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('vtiger_id', cleanId)
        .single()

      if (!order || error) {
        setScanMessage({ type: 'error', text: `Order ${cleanId} not found!` })
        setSearchId('')
        return
      }

      if (isOrderInCooldown(order.id)) {
        const remaining = Math.ceil((cooldownsRef.current[order.id] - Date.now()) / 1000)
        setScanMessage({
          type: 'error',
          text: `Order ${cleanId} is in cooldown (${remaining}s remaining)`,
        })
        return
      }

      if (!order.timer_started_at) {
        // First scan → start timer
        const now = new Date().toISOString()
        await Promise.all([
          supabase.from('orders').update({ timer_started_at: now }).eq('id', order.id),
          supabase.from('production_logs').insert([{
            order_id:   order.id,
            staff_name: staffNameRef.current,
            action:     'STARTED',
            new_stage:  order.current_stage,
          }]),
        ])
        setScanMessage({ type: 'start', text: `▶️ STARTED: ${order.vtiger_id} at ${order.current_stage}` })
      } else {
        // Second scan → complete stage
        const elapsed = Math.floor(
          (Date.now() - new Date(order.timer_started_at).getTime()) / 1000
        ) + (order.timer_accumulated || 0)

        const nextStage = STAGES[STAGES.indexOf(order.current_stage) + 1] || 'Completed'
        await writeStageChange({ order, nextStage, action: 'COMPLETED', durationSeconds: elapsed })
        setScanMessage({ type: 'success', text: `✅ COMPLETED: ${order.vtiger_id}. Moved to ${nextStage}` })
        fetchActiveJobs()
      }

      setOrderCooldown(order.id)
      setSearchId('')
    } catch (err) {
      console.error('[processOrderId]', err)
      setScanMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
      processingRef.current = false
    }
  }, [isOrderInCooldown, writeStageChange, setOrderCooldown, fetchActiveJobs])

  const handleScan = useCallback(() =>
    processOrderId(searchId.toUpperCase().trim()),
  [searchId, processOrderId])

  const handleDecodedText = useCallback((text) => {
    processOrderId(text.trim().toUpperCase())
    navigator.vibrate?.(200)
  }, [processOrderId])

  // ── Manual stage override / QC reject ────────────────────────────────────

  const handleManualMove = useCallback(async (isRejection = false, reason = null) => {
    const order = activeOrderRef.current
    if (!order) return
    setLoading(true)

    const nextStage = isRejection ? 'Goldsmithing' : manualStage
    const elapsed   = (order.timer_accumulated || 0) + (
      order.timer_started_at
        ? Math.floor((Date.now() - new Date(order.timer_started_at).getTime()) / 1000)
        : 0
    )

    await writeStageChange({
      order,
      nextStage,
      action:             isRejection ? 'REJECTED' : 'COMPLETED',
      redoReason:         reason,
      durationSeconds:    elapsed,
      isExternalOverride: isExternal,
    })

    // Optimistic list update; fetchActiveJobs will reconcile with the server
    setActiveJobs((prev) =>
      prev
        .map((j) => j.id === order.id ? { ...j, current_stage: nextStage } : j)
        .filter((j) => j.current_stage !== 'Completed')
    )
    fetchActiveJobs()
    setOrderCooldown(order.id)
    setActiveOrder(null)
    setShowRejectMenu(false)
    setScanMessage({ type: 'success', text: `✅ Moved to ${nextStage}` })
    setLoading(false)
  }, [manualStage, isExternal, writeStageChange, setOrderCooldown, fetchActiveJobs])

  // ── Stone received toggle ─────────────────────────────────────────────────

  const handleToggleStone = useCallback(async (field, currentValue) => {
    const order = activeOrderRef.current
    if (!order) return
    const newValue = !currentValue
    setActiveOrder((prev) => prev ? { ...prev, [field]: newValue } : prev)
    await supabase.from('orders').update({ [field]: newValue }).eq('id', order.id)
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────────

  const closeOrder = useCallback(() => {
    setActiveOrder(null)
    setShowRejectMenu(false)
  }, [])

  const switchTab = useCallback((tab) => {
    setActiveTab(tab)
    closeOrder()
  }, [closeOrder])

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // UI state
    activeTab,     switchTab,
    searchId,      setSearchId,
    scanMode,      setScanMode,
    staffName,     setStaffName,
    loading,
    scanMessage,

    // Order state
    activeOrder,   setActiveOrder,
    showRejectMenu, setShowRejectMenu,
    isExternal,    setIsExternal,
    manualStage,   setManualStage,
    lastRedoReason,
    isTimerRunning,

    // Jobs list
    activeJobs,
    jobsLoading,
    rushJobs,
    visibleJobs,

    // Shared refs (passed to components that need live cooldown data)
    cooldownsRef,

    // Handlers
    handleScan,
    handleDecodedText,
    handleTimerStart,
    handleTimerStop,
    handleManualMove,
    handleToggleStone,
    closeOrder,
  }
}
