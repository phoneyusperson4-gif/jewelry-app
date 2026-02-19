import { useState, useMemo } from "react"

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ORDER = {
  id: "ord_001",
  vtiger_id: "SO-2024-0847",
  article_code: "RG-OVAL-18K",
  current_stage: "Completed",
  is_rush: true,
  created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
}

const MOCK_LOGS = [
  { id: 1, action: "STARTED",   previous_stage: null,          new_stage: "Goldsmithing", staff_name: "Goldsmith 1", duration_seconds: 0,     created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 3600 * 1000).toISOString() },
  { id: 2, action: "COMPLETED", previous_stage: "Goldsmithing", new_stage: "Setting",      staff_name: "Goldsmith 1", duration_seconds: 9240,  created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 3600 * 1000).toISOString() },
  { id: 3, action: "STARTED",   previous_stage: null,          new_stage: "Setting",       staff_name: "Setter 1",    duration_seconds: 0,     created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString() },
  { id: 4, action: "REJECTED",  previous_stage: "Setting",     new_stage: "Goldsmithing",  staff_name: "QC",          duration_seconds: 5400,  created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 3.5 * 3600 * 1000).toISOString() },
  { id: 5, action: "STARTED",   previous_stage: null,          new_stage: "Goldsmithing",  staff_name: "Goldsmith 2", duration_seconds: 0,     created_at: new Date(Date.now() - 1.5 * 24 * 3600 * 1000).toISOString() },
  { id: 6, action: "COMPLETED", previous_stage: "Goldsmithing", new_stage: "Setting",      staff_name: "Goldsmith 2", duration_seconds: 6300,  created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
  { id: 7, action: "STARTED",   previous_stage: null,          new_stage: "Setting",       staff_name: "Setter 2",    duration_seconds: 0,     created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString() },
  { id: 8, action: "COMPLETED", previous_stage: "Setting",     new_stage: "Polishing",     staff_name: "Setter 2",    duration_seconds: 4200,  created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
  { id: 9, action: "COMPLETED", previous_stage: "Polishing",   new_stage: "QC",            staff_name: "Polisher 1",  duration_seconds: 2700,  created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString() },
  { id: 10, action: "COMPLETED", previous_stage: "QC",          new_stage: "Completed",    staff_name: "QC",          duration_seconds: 1800,  created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
]

// ── Utilities ────────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0m"
  if (seconds < 60) return "<1m"
  const days = Math.floor(seconds / 86400)
  const hrs  = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hrs  > 0) parts.push(`${hrs}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`)
  return parts.join(" ")
}

function fmt(date) {
  return date.toLocaleTimeString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

// ── Stage config ─────────────────────────────────────────────────────────────
const STAGE_CONFIG = {
  "Goldsmithing": { color: "#f97316", bg: "#fff7ed", label: "GS" },
  "Setting":      { color: "#9333ea", bg: "#faf5ff", label: "ST" },
  "Polishing":    { color: "#10b981", bg: "#ecfdf5", label: "PL" },
  "QC":           { color: "#3b82f6", bg: "#eff6ff", label: "QC" },
  "Waiting":      { color: "#94a3b8", bg: "#f8fafc", label: "··" },
}

function stageColor(name, isRedo) {
  if (isRedo) return { color: "#ef4444", bg: "#fef2f2", label: "✗" }
  return STAGE_CONFIG[name] || { color: "#6366f1", bg: "#eef2ff", label: "??" }
}

// ── Timeline builder ─────────────────────────────────────────────────────────
function buildTimeline(logs, order) {
  const startTime = new Date(order.created_at).getTime()
  const endTime   = order.current_stage === "Completed"
    ? new Date(order.updated_at).getTime()
    : Date.now()
  const totalSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000))

  const timeline = []
  let prevEnd = startTime

  for (const log of logs) {
    const logTime    = new Date(log.created_at).getTime()
    const stageSecs  = log.duration_seconds || 0
    const stageStart = logTime - stageSecs * 1000
    const stageName  = (log.previous_stage || log.new_stage || "Unknown").trim()

    const waitSecs = Math.max(0, Math.floor((stageStart - prevEnd) / 1000))
    if (waitSecs > 60) {
      timeline.push({ type: "wait", name: "Waiting", seconds: waitSecs, from: new Date(prevEnd), to: new Date(stageStart), isRedo: false })
    }
    if (stageSecs > 0) {
      timeline.push({ type: "stage", name: stageName, seconds: stageSecs, from: new Date(stageStart), to: new Date(logTime), staff: log.staff_name, isRedo: log.action === "REJECTED" })
    }
    prevEnd = logTime
  }

  const activeSeconds  = timeline.filter(t => t.type === "stage").reduce((s, t) => s + t.seconds, 0)
  const waitingSeconds = timeline.filter(t => t.type === "wait").reduce((s, t)  => s + t.seconds, 0)

  const summary = logs.reduce((acc, log) => {
    const stage = (log.previous_stage || log.new_stage || "Unknown").trim()
    acc[stage] = (acc[stage] || 0) + (log.duration_seconds || 0)
    return acc
  }, {})

  return { timeline, totalSeconds, activeSeconds, waitingSeconds, summary }
}

// ── Bar chart segment ─────────────────────────────────────────────────────────
function BarSegment({ item, totalSeconds, isFirst, isLast }) {
  const pct = Math.max(1, (item.seconds / totalSeconds) * 100)
  const cfg = item.type === "wait" ? STAGE_CONFIG["Waiting"] : stageColor(item.name, item.isRedo)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative h-full flex items-center justify-center cursor-default transition-all duration-150"
      style={{
        width: `${pct}%`,
        backgroundColor: hovered ? cfg.color : cfg.bg,
        borderLeft: isFirst ? "none" : `2px solid #000`,
        borderRadius: isFirst ? "8px 0 0 8px" : isLast ? "0 8px 8px 0" : "0",
        minWidth: item.seconds > 600 ? "28px" : "4px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${item.name}: ${formatDuration(item.seconds)}`}
    >
      {item.seconds > 3600 && (
        <span
          className="text-[8px] font-black uppercase tracking-wider select-none pointer-events-none"
          style={{ color: hovered ? "#fff" : cfg.color }}
        >
          {cfg.label}
        </span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TimeBreakdown() {
  const order = MOCK_ORDER
  const logs  = MOCK_LOGS
  const [activeRow, setActiveRow] = useState(null)

  const { timeline, totalSeconds, activeSeconds, waitingSeconds, summary } = useMemo(
    () => buildTimeline(logs, order),
    [logs]
  )

  const stageList = Object.entries(summary)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])

  const efficiency = totalSeconds > 0 ? Math.round((activeSeconds / totalSeconds) * 100) : 0

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#f5f0e8", fontFamily: "'DM Mono', 'Courier New', monospace" }}
    >
      <div
        className="w-full max-w-2xl"
        style={{
          background: "#fff",
          border: "4px solid #000",
          borderRadius: "4px",
          boxShadow: "8px 8px 0 #000",
        }}
      >
        {/* ── Header ── */}
        <div style={{ borderBottom: "4px solid #000", padding: "20px 24px", background: "#000" }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: "#666", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
                Production Timeline
              </p>
              <h2 style={{ color: "#fff", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {order.vtiger_id}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {order.is_rush && (
                <span style={{ background: "#ef4444", color: "#fff", padding: "4px 10px", fontSize: "9px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  RUSH
                </span>
              )}
              <span style={{ background: "#1a1a1a", color: "#aaa", padding: "4px 10px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {order.article_code}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px" }}>

          {/* ── KPI row ── */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Time",   value: formatDuration(totalSeconds),   accent: "#000" },
              { label: "Active Work",  value: formatDuration(activeSeconds),   accent: "#000" },
              { label: "Queue Wait",   value: formatDuration(waitingSeconds),  accent: "#94a3b8" },
              { label: "Efficiency",   value: `${efficiency}%`,               accent: efficiency > 60 ? "#10b981" : efficiency > 35 ? "#f97316" : "#ef4444" },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                style={{ border: "2px solid #000", padding: "12px", background: "#fafafa" }}
              >
                <p style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#999", marginBottom: 6 }}>
                  {label}
                </p>
                <p style={{ fontSize: "18px", fontWeight: 900, color: accent, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Gantt bar ── */}
          <div className="mb-2">
            <p style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>
              Stage Breakdown
            </p>
            <div
              style={{
                height: "40px",
                display: "flex",
                border: "2px solid #000",
                borderRadius: "10px",
                overflow: "hidden",
                background: "#f8fafc",
              }}
            >
              {timeline.map((item, i) => (
                <BarSegment
                  key={i}
                  item={item}
                  totalSeconds={totalSeconds}
                  isFirst={i === 0}
                  isLast={i === timeline.length - 1}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {Object.entries(STAGE_CONFIG).filter(([k]) => k !== "Waiting").map(([name, cfg]) => (
                <div key={name} className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, background: cfg.color, display: "inline-block", borderRadius: 2 }} />
                  <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#666" }}>{name}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <span style={{ width: 8, height: 8, background: "#ef4444", display: "inline-block", borderRadius: 2 }} />
                <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#666" }}>QC Fail / Redo</span>
              </div>
              <div className="flex items-center gap-1">
                <span style={{ width: 8, height: 8, background: "#cbd5e1", display: "inline-block", borderRadius: 2 }} />
                <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#666" }}>Queue</span>
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ borderTop: "2px solid #000", margin: "20px 0" }} />

          {/* ── Stage totals ── */}
          <div className="mb-5">
            <p style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#999", marginBottom: 10 }}>
              Per-Stage Active Time
            </p>
            <div className="space-y-2">
              {stageList.map(([stage, secs]) => {
                const cfg = stageColor(stage, false)
                const pct = totalSeconds > 0 ? (secs / totalSeconds) * 100 : 0
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div style={{ width: 28, textAlign: "center" }}>
                      <span style={{ fontSize: "7px", fontWeight: 900, color: cfg.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ flex: 1, height: "8px", background: "#f1f5f9", border: "1.5px solid #000", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: cfg.color, transition: "width 0.6s ease" }} />
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", width: 40, textAlign: "right" }}>
                      {formatDuration(secs)}
                    </span>
                    <span style={{ fontSize: "8px", color: "#aaa", width: 28, textAlign: "right" }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ borderTop: "2px solid #000", margin: "20px 0" }} />

          {/* ── Detailed timeline ── */}
          <div>
            <p style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#999", marginBottom: 10 }}>
              Detailed Timeline
            </p>
            <div style={{ maxHeight: 280, overflowY: "auto", marginRight: -4, paddingRight: 4 }}>
              {timeline.map((item, i) => {
                const cfg = item.type === "wait"
                  ? STAGE_CONFIG["Waiting"]
                  : stageColor(item.name, item.isRedo)
                const isActive = activeRow === i

                return (
                  <div
                    key={i}
                    onMouseEnter={() => setActiveRow(i)}
                    onMouseLeave={() => setActiveRow(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      marginBottom: 2,
                      cursor: "default",
                      background: isActive ? cfg.bg : "transparent",
                      border: isActive ? `1.5px solid ${cfg.color}` : "1.5px solid transparent",
                      borderRadius: 4,
                      transition: "all 0.1s",
                      opacity: item.type === "wait" ? 0.65 : 1,
                    }}
                  >
                    {/* Dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: cfg.color,
                      flexShrink: 0,
                      border: `1.5px solid #000`,
                    }} />

                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: item.isRedo ? "#ef4444" : "#000",
                      }}>
                        {item.isRedo && <span style={{ color: "#ef4444" }}>REDO · </span>}
                        {item.name}
                      </span>
                      {item.staff && (
                        <span style={{ fontSize: "8px", color: "#999", marginLeft: 6 }}>
                          {item.staff}
                        </span>
                      )}
                    </div>

                    {/* Time range */}
                    <span style={{ fontSize: "8px", color: "#aaa", whiteSpace: "nowrap" }}>
                      {fmt(item.from)} → {fmt(item.to)}
                    </span>

                    {/* Duration pill */}
                    <span style={{
                      fontSize: "9px",
                      fontWeight: 900,
                      padding: "2px 8px",
                      background: isActive ? cfg.color : "#f1f5f9",
                      color: isActive ? "#fff" : cfg.color,
                      border: `1.5px solid ${cfg.color}`,
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                      minWidth: 40,
                      textAlign: "center",
                      transition: "all 0.1s",
                    }}>
                      {formatDuration(item.seconds)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: "4px solid #000", padding: "10px 24px", background: "#000", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "8px", color: "#555", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Started {new Date(order.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <span style={{ fontSize: "8px", color: "#555", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Completed {new Date(order.updated_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  )
}
