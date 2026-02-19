'use client'
import { Archive, PlayCircle, RefreshCw } from 'lucide-react'
import { useAdminState }  from '@/app/admin/hooks/useAdminState'
import { KANBAN_COLUMNS } from '@/app/admin/constants'
import { KanbanColumn }   from '@/app/admin/components/KanbanColumn'
import { ActivityLog }    from '@/app/admin/components/ActivityLog'
import { ArchiveTable }   from '@/app/admin/components/ArchiveTable'
import { OrderModal }     from '@/app/admin/components/OrderModal'

/**
 * Atelier OS — admin dashboard.
 *
 * Two views:
 * - Live Board: Kanban columns per stage + recent audit log
 * - Archive:    Searchable table of completed jobs with stage durations
 */
export default function AdminPage() {
  const {
    activeTab, setActiveTab,
    wipJobs, 
    completedJobs, filteredArchive, stageDurations,
    filteredLogs,
    stagesMap,
    loading, isRefreshing, error,
    selectedOrder,
    onSearchChange, onLogSearchChange,
    fetchData,
    handleSelectJob,
    handleCloseModal,
  } = useAdminState()

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-6 space-y-6 pb-20 relative font-sans">

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={handleCloseModal} />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 border-b-4 sm:border-b-8 border-black pb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
            Atelier OS
          </h1>

          {/* Refresh button — visible on mobile, subtle */}
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="p-2 rounded-xl hover:bg-black hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tab switcher — full width on mobile */}
        <div className="flex bg-black p-1 rounded-2xl w-full sm:w-fit">
          {[
            { id: 'live',      label: 'Live Board', icon: <PlayCircle size={16} /> },
            { id: 'completed', label: 'Archive',    icon: <Archive    size={16} /> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-2 flex-1 sm:flex-none sm:px-8 px-4 py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide transition-all ${
                activeTab === id
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-red-100 border-4 border-red-500 text-red-700 p-4 rounded-2xl font-bold text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && !isRefreshing && (
        <div className="flex items-center justify-center py-20 text-gray-400 font-bold text-sm uppercase tracking-widest">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
        </div>
      )}

      {/* ── Live board ── */}
      {!loading && activeTab === 'live' && (
        <div className="space-y-10 animate-in fade-in duration-300">

          {/* Kanban — horizontal scroll on mobile, grid on larger screens */}
          <div className="
            flex gap-4 overflow-x-auto pb-3
            sm:grid sm:grid-cols-2
            lg:grid lg:grid-cols-4
            sm:overflow-visible sm:pb-0
          ">
            {KANBAN_COLUMNS.map(col => (
              <div key={col.key} className="min-w-[80vw] sm:min-w-0">
                <KanbanColumn
                  title={col.title}
                  icon={col.icon}
                  jobs={stagesMap[col.key] ?? []}
                  color={col.color}
                  onSelectJob={handleSelectJob}
                />
              </div>
            ))}
          </div>

          <ActivityLog
            logs={filteredLogs}
            onSearchChange={onLogSearchChange}
          />
        </div>
      )}

      {/* ── Archive ── */}
      {!loading && activeTab === 'completed' && (
        <ArchiveTable
          jobs={filteredArchive}
          totalCount={completedJobs.length}
          stageDurations={stageDurations}
          loading={loading}
          isRefreshing={isRefreshing}
          onSearchChange={onSearchChange}
          onRefresh={fetchData}
          onSelectJob={handleSelectJob}
        />
      )}
    </div>
  )
}
