'use client'
import { Archive, PlayCircle } from 'lucide-react'
import { useAdminState }  from '@/app/admin/hooks/useAdminState'
import { KANBAN_COLUMNS } from '@/app/admin/constants'
import { KanbanColumn }   from '@/app/admin/components/KanbanColumn'
import { ActivityLog }    from '@/app/admin/components/ActivityLog'
import { ArchiveTable }   from '@/app/admin/components/ArchiveTable'
import { OrderModal }     from '@/app/admin/components/OrderModal'

/**
 * Atelier OS — admin dashboard.
 *
 * This component is intentionally a thin render layer; it owns no business logic.
 * All state, fetching, and derived data come from `useAdminState`.
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
    <div className="max-w-[90rem] mx-auto p-6 space-y-8 pb-20 relative font-sans">

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={handleCloseModal} />
      )}

      {/* Header & tab switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-8 border-black pb-6 gap-4">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Atelier OS</h1>
        <div className="flex bg-black p-1.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          {[
            { id: 'live',      label: 'Live Board', icon: <PlayCircle size={18} /> },
            { id: 'completed', label: 'Archive',    icon: <Archive    size={18} /> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase transition-all ${
                activeTab === id ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-4 border-red-500 text-red-700 p-4 rounded-2xl font-black">
          {error}
        </div>
      )}

      {activeTab === 'live' ? (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {KANBAN_COLUMNS.map(col => (
              <KanbanColumn
                key={col.key}
                title={col.title}
                icon={col.icon}
                jobs={stagesMap[col.key] ?? []}
                color={col.color}
                onSelectJob={handleSelectJob}
              />
            ))}
          </div>
          <ActivityLog
            logs={filteredLogs}
            onSearchChange={onLogSearchChange}
          />
        </div>
      ) : (
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
