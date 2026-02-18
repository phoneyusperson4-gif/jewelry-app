'use client'
import { Suspense } from 'react'
import { useWorkshopState } from './hooks/useWorkshopState'
import { ScanMessage }      from './components/ScanMessage'
import { TabBar }           from './components/TabBar'
import { StaffSelector }    from './components/StaffSelector'
import { ScannerModeToggle, ManualScanner, CameraScanner } from './components/Scanner'
import { JobList }          from './components/JobList'
import { ActiveOrderCard }  from './components/ActiveOrderCard/index'
import { printQRCode }      from './utils/printQRCode'

/**
 * Workshop page — production floor scanning and job management interface.
 *
 * This component is intentionally thin: it owns no business logic of its own.
 * All state and handlers come from `useWorkshopState`, which is the single
 * source of truth for this feature.
 *
 * Wrapped in a `<Suspense>` boundary by the default export below, as required
 * by Next.js App Router when using `'use client'` with dynamic imports.
 */
function WorkshopContent() {
  const {
    // UI
    activeTab,     switchTab,
    searchId,      setSearchId,
    scanMode,      setScanMode,
    staffName,     setStaffName,
    loading,
    scanMessage,

    // Order
    activeOrder,   setActiveOrder,
    showRejectMenu, setShowRejectMenu,
    isExternal,    setIsExternal,
    manualStage,   setManualStage,
    lastRedoReason,
    isTimerRunning,

    // Jobs
    activeJobs,
    jobsLoading,
    rushJobs,
    visibleJobs,

    // Shared refs
    cooldownsRef,

    // Handlers
    handleScan,
    handleDecodedText,
    handleTimerStart,
    handleTimerStop,
    handleManualMove,
    handleToggleStone,
    closeOrder,
  } = useWorkshopState()

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">

      <ScanMessage message={scanMessage} />

      <TabBar
        activeTab={activeTab}
        onTabChange={switchTab}
        totalJobs={activeJobs.length}
        rushCount={rushJobs.length}
      />

      <StaffSelector value={staffName} onChange={setStaffName} />

      {!activeOrder ? (
        <div className="animate-in fade-in duration-500">
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              <ScannerModeToggle mode={scanMode} onModeChange={setScanMode} />
              {scanMode === 'manual' ? (
                <ManualScanner
                  searchId={searchId}
                  onSearchIdChange={setSearchId}
                  onScan={handleScan}
                  loading={loading}
                  disabled={loading}
                />
              ) : (
                <CameraScanner
                  containerId="qr-reader"
                  onScan={handleDecodedText}
                  onStop={() => setScanMode('manual')}
                />
              )}
            </div>
          )}

          {(activeTab === 'overview' || activeTab === 'rush') && (
            <JobList
              jobs={visibleJobs}
              loading={jobsLoading}
              onSelectJob={setActiveOrder}
              cooldownsRef={cooldownsRef}
            />
          )}
        </div>
      ) : (
        <ActiveOrderCard
          order={activeOrder}
          loading={loading}
          cooldownsRef={cooldownsRef}
          isExternal={isExternal}
          setIsExternal={setIsExternal}
          manualStage={manualStage}
          setManualStage={setManualStage}
          lastRedoReason={lastRedoReason}
          showRejectMenu={showRejectMenu}
          setShowRejectMenu={setShowRejectMenu}
          isTimerRunning={isTimerRunning}
          onTimerStart={handleTimerStart}
          onTimerStop={handleTimerStop}
          onClose={closeOrder}
          onToggleStone={handleToggleStone}
          onMove={handleManualMove}
          onPrint={() => printQRCode(activeOrder.vtiger_id, activeOrder.article_code)}
        />
      )}
    </div>
  )
}

export default function WorkshopPage() {
  return (
    <Suspense fallback={
      <div className="p-20 text-center font-black animate-pulse">SYNCING WORKSHOP…</div>
    }>
      <WorkshopContent />
    </Suspense>
  )
}
