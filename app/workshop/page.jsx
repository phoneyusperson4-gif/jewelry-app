'use client'
import { Suspense, useState, useEffect } from 'react' // Added useState, useEffect
import { useWorkshopState } from './hooks/useWorkshopState'
import { ScanMessage }      from './components/ScanMessage'
import { TabBar }           from './components/TabBar'
import { StaffSelector }    from './components/StaffSelector'
import { ScannerModeToggle, ManualScanner, CameraScanner } from './components/Scanner'
import { JobList }          from './components/JobList'
import { ActiveOrderCard }  from './components/ActiveOrderCard/index'
import { printQRCode }      from './utils/printQRCode'

function WorkshopContent() {
  // 1. PREVENTION: Avoid hydration mismatch/client exceptions
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    activeTab, switchTab, searchId, setSearchId,
    scanMode, setScanMode, staffName, setStaffName,
    loading, scanMessage, activeOrder, setActiveOrder,
    showRejectMenu, setShowRejectMenu, isExternal, setIsExternal,
    manualStage, setManualStage, lastRedoReason, isTimerRunning,
    activeJobs, jobsLoading, rushJobs, visibleJobs,
    cooldownsRef, handleScan, handleDecodedText, handleTimerStart,
    handleTimerStop, handleManualMove, handleToggleStone, closeOrder,
  } = useWorkshopState()

  // Don't render until mounted to prevent the "Client-side exception" error
  if (!mounted) return null;

  return (
    /* 2. FIX: Added 'text-slate-900' to force dark text on light background.
       3. FIX: Added style={{ colorScheme: 'light' }} to tell Chrome NOT to invert these colors.
    */
    <div 
      className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20 text-slate-900" 
      style={{ colorScheme: 'light' }}
    >
      <ScanMessage message={scanMessage} />

      <TabBar
        activeTab={activeTab}
        onTabChange={switchTab}
        totalJobs={activeJobs.length}
        rushCount={rushJobs.length}
      />

      {/* Ensure internal components also have explicit text colors */}
      <div className="text-slate-900">
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
    </div>
  )
}

export default function WorkshopPage() {
  return (
    <Suspense fallback={
      <div className="p-20 text-center font-black animate-pulse text-slate-900">
        SYNCING WORKSHOP…
      </div>
    }>
      <WorkshopContent />
    </Suspense>
  )
}