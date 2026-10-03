import { useState, useEffect, useRef } from "react";
import {
  fetchAvailableDates,
  fetchDailyStats,
  fetchAggregateStats,
  fetchTrendSeries,
  fetchPersonComparison,
  fetchLegacyStats,
} from "./api/stats";

const PERSON_OPTIONS = [
  { value: "Asep",   label: "Asep"   },
  { value: "Budi",   label: "Budi"   },
  { value: "Saep",   label: "Saep"   },
  { value: "naisya", label: "Naisya" },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatMinutesToHours(minutes) {
  if (minutes == null || minutes === 0) return "0h 0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(timeStr) {
  if (!timeStr || timeStr === "N/A" || timeStr === "-") return "—";
  return timeStr;
}

function formatWeekLabel(weekStr) {
  if (!weekStr) return "";
  const [year, week] = weekStr.split("-W");
  return `Minggu ke-${parseInt(week, 10)}, ${year}`;
}

function formatMonthLabel(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return `${d.toLocaleDateString("id-ID", { month: "long" })} ${year}`;
}

// ── Status Badge (3-state) ────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    no_data:  "bg-slate-100 text-slate-600",
    absent:   "bg-amber-100 text-amber-700",
    present:  "bg-emerald-100 text-emerald-700",
  };
  const labels = {
    no_data:  "Tidak Ada Data",
    absent:   "Tidak Hadir",
    present:  "Hadir",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.no_data}`}>
      {labels[status] || labels.no_data}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ icon, label, value, unit, subValue, colorClass }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {unit && <p className="text-sm text-slate-400 mt-0.5">{unit}</p>}
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

// ── Loading / Error / Empty ──────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg className="w-10 h-10 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p className="mt-4 text-slate-500">Memuat data...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p className="mt-4 text-slate-600 font-medium">Gagal memuat data</p>
      <p className="text-sm text-slate-400 mt-1">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
      >
        Coba Lagi
      </button>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="mt-4 text-slate-500 font-medium">{message}</p>
    </div>
  );
}

// ── Simple Bar Chart (pure CSS/SVG, no lib) ──────────────────────────────────

function SimpleBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">Tidak ada data tren</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div
              className={`w-full rounded-t transition-all ${d.color}`}
              style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
              title={`${d.label}: ${d.value}m`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-xs text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-3 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Hadir
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Tidak Hadir
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block" /> Tidak Ada Data
        </span>
      </div>
    </div>
  );
}

// ── Comparison Table ──────────────────────────────────────────────────────────

function ComparisonTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <EmptyState message="Tidak ada data perbandingan" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Orang</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-700">Tingkat Kehadiran</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-700">Rata-rata Lama Bekerja</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-700">Rata-rata Ketepatan</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-700">On-Time Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800 capitalize">{row.person}</td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  row.attendance_rate >= 80 ? "bg-emerald-100 text-emerald-700"
                  : row.attendance_rate >= 50 ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
                }`}>
                  {row.attendance_rate ?? 0}%
                </span>
              </td>
              <td className="px-4 py-3 text-center text-slate-600">{formatMinutesToHours(row.avg_work_minutes)}</td>
              <td className="px-4 py-3 text-center text-slate-600">{formatTime(row.avg_arrival_time)}</td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  row.on_time_rate >= 80 ? "bg-emerald-100 text-emerald-700"
                  : row.on_time_rate >= 50 ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
                }`}>
                  {row.on_time_rate ?? 0}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Period selector options ──────────────────────────────────────────────────

function getDateOptions(availableDates, periodType) {
  if (!availableDates || availableDates.length === 0) return [];

  if (periodType === "daily") {
    return availableDates.slice().sort().reverse().map((d) => ({
      value: d,
      label: formatDate(d),
    }));
  }

  if (periodType === "weekly") {
    // Group by YYYY-Www
    const seen = new Set();
    const weeks = [];
    for (const d of availableDates.slice().sort().reverse()) {
      const date = new Date(d);
      const year = date.getFullYear();
      const weekNum = getWeekNumber(date);
      const key = `${year}-W${String(weekNum).padStart(2, "0")}`;
      if (!seen.has(key)) {
        seen.add(key);
        weeks.push({ value: key, label: formatWeekLabel(key) });
      }
    }
    return weeks;
  }

  if (periodType === "monthly") {
    const seen = new Set();
    const months = [];
    for (const d of availableDates.slice().sort().reverse()) {
      const [year, month] = d.substring(0, 7).split("-");
      const key = `${year}-${month}`;
      if (!seen.has(key)) {
        seen.add(key);
        months.push({ value: key, label: formatMonthLabel(key) });
      }
    }
    return months;
  }

  return [];
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function StatsDashboard() {
  const [filters, setFilters] = useState({
    person:      null,      // null = semua orang
    periodType:  "daily",   // "daily" | "weekly" | "monthly"
    periodValue: null,       // date / week / month string
  });

  const [availableDates, setAvailableDates] = useState([]);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const abortRef = useRef(null);
  const initRef  = useRef({ person: undefined, periodType: undefined }); // track init per filter combo

  // ── Fetch available dates whenever filters change ──────────────────────
  // eslint-disable-next-line react-set-state-in-effect
  useEffect(() => {
    const person = filters.person;
    const yearMonth = filters.periodType === "monthly" ? filters.periodValue : null;

    fetchAvailableDates(person, yearMonth)
      .then(({ dates }) => {
        const d = dates || [];
        setAvailableDates(d);
        // Only auto-set default if this person+periodType combo hasn't been init yet
        const key = `${person ?? "all"}|${filters.periodType}`;
        if (d.length > 0 && !initRef.current[key] && !filters.periodValue) {
          const opts = getDateOptions(d, filters.periodType);
          setFilters((f) => ({ ...f, periodValue: opts[0]?.value ?? null }));
          initRef.current[key] = true;
        }
      })
      .catch(() => {
        setAvailableDates([]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit periodValue to avoid re-fetch on auto-update
  }, [filters.person, filters.periodType]);

  // ── Fetch stats whenever filter changes ────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // periodValue intentionally omitted — data fetch is triggered by filter event handlers
  useEffect(() => {
    if (!filters.periodValue) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setData(null);

    const { person, periodType, periodValue } = filters;

    const load = async () => {
      try {
        // ── Semua orang ─────────────────────────────────────────────────
        if (!person) {
          const [comparison, trend] = await Promise.all([
            fetchPersonComparison(periodType, periodValue),
            fetchTrendSeries(periodType, periodValue, null),
          ]);
          setData({ type: "comparison", comparison, trend, periodType, periodValue });
        }
        // ── Individual person ───────────────────────────────────────────
        else if (periodType === "daily") {
          try {
            const [daily, trend] = await Promise.all([
              fetchDailyStats(person, periodValue),
              fetchTrendSeries("daily", periodValue, person),
            ]);
            setData({ type: "daily", stats: daily, trend, person, date: periodValue });
          } catch {
            // Fallback to legacy endpoint
            const stats = await fetchLegacyStats(person, periodValue);
            setData({ type: "daily", stats, trend: [], person, date: periodValue });
          }
        } else {
          const [aggregate, trend] = await Promise.all([
            fetchAggregateStats(periodType, periodValue, person),
            fetchTrendSeries(periodType, periodValue, person),
          ]);
          setData({ type: "aggregate", stats: aggregate, trend, person, periodType, periodValue });
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Gagal memuat data");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [filters]);

  // ── Filter helpers ──────────────────────────────────────────────────────
  const periodOptions = getDateOptions(availableDates, filters.periodType);

  function handlePersonChange(value) {
    setFilters((f) => ({
      ...f,
      person:      value === "all" ? null : value,
      periodValue: null,
    }));
    setData(null);
  }

  function handlePeriodTypeChange(type) {
    const opts = getDateOptions(availableDates, type);
    setFilters((f) => ({
      ...f,
      periodType:  type,
      periodValue: opts[0]?.value ?? null,
    }));
    setData(null);
  }

  function handlePeriodValueChange(val) {
    setFilters((f) => ({ ...f, periodValue: val }));
    setData(null);
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  const periodLabel = {
    daily:   formatDate(filters.periodValue),
    weekly:  formatWeekLabel(filters.periodValue),
    monthly: formatMonthLabel(filters.periodValue),
  }[filters.periodType];

  // ── Loading / Error ────────────────────────────────────────────────────
  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} onRetry={() => setFilters((f) => ({ ...f }))} />;
  if (!filters.periodValue) return <EmptyState message="Pilih periode untuk melihat statistik" />;

  // ── Semua orang view ───────────────────────────────────────────────────
  if (!filters.person) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard Statistik Kehadiran</h1>
          <p className="text-sm text-slate-500">Perbandingan Semua Orang</p>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          periodOptions={periodOptions}
          onPersonChange={handlePersonChange}
          onPeriodTypeChange={handlePeriodTypeChange}
          onPeriodValueChange={handlePeriodValueChange}
        />

        {/* Period summary */}
        {periodLabel && (
          <p className="text-sm text-slate-500 text-center font-medium">{periodLabel}</p>
        )}

        {/* Comparison table */}
        {data?.type === "comparison" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <ComparisonTable rows={data.comparison} />
          </div>
        )}

        {/* Group trend chart */}
        {data?.type === "comparison" && data.trend?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Tren Kehadiran</h3>
            <SimpleBarChart data={data.trend} />
          </div>
        )}

        {/* No data */}
        {data?.type === "comparison" && (!data.comparison || data.comparison.length === 0) && (
          <EmptyState message="Tidak ada data kehadiran untuk periode ini" />
        )}
      </div>
    );
  }

  // ── Individual person view ─────────────────────────────────────────────
  const stats = data?.stats;
  const trend = data?.trend || [];
  const status = stats?.status || "no_data";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard Statistik Kehadiran</h1>
        <p className="text-sm text-slate-500">5 Indikator Manajemen Kehadiran</p>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        periodOptions={periodOptions}
        onPersonChange={handlePersonChange}
        onPeriodTypeChange={handlePeriodTypeChange}
        onPeriodValueChange={handlePeriodValueChange}
      />

      {/* Date display */}
      {periodLabel && (
        <p className="text-sm text-slate-500 text-center font-medium">{periodLabel}</p>
      )}

      {/* Person info bar */}
      <div className="bg-slate-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-800 capitalize">{filters.person}</p>
            {stats?.work_hours && (
              <p className="text-sm text-slate-500 mt-0.5">
                Jam kerja: {stats.work_hours.start} - {stats.work_hours.end}
              </p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* No data state */}
      {status === "no_data" && (
        <div className="text-center py-8 space-y-3">
          <StatusBadge status="no_data" />
          <p className="text-slate-500">Tidak ada data untuk periode ini</p>
        </div>
      )}

      {/* KPI Cards — daily */}
      {data?.type === "daily" && status !== "no_data" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Ketepatan Datang"
            value={formatTime(stats?.first_seen)}
            colorClass="bg-blue-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
            label="Lama Bekerja"
            value={formatMinutesToHours(stats?.work_minutes)}
            unit={stats?.work_hours ? `Target: ${formatMinutesToHours(stats.work_hours.total_minutes)}` : ""}
            colorClass="bg-emerald-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Waktu Produktif"
            value={formatMinutesToHours(stats?.productive_minutes)}
            colorClass="bg-teal-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            label="Waktu Tidak Produktif"
            value={formatMinutesToHours(stats?.idle_minutes)}
            colorClass="bg-orange-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="Tingkat Kehadiran"
            value={status === "present" ? "Hadir" : "Tidak Hadir"}
            colorClass="bg-purple-100"
          />
        </div>
      )}

      {/* KPI Cards — aggregate (weekly/monthly) */}
      {data?.type === "aggregate" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="Tingkat Kehadiran"
            value={stats?.present_days != null ? `${stats.present_days}/${stats.total_days ?? "?"} (${stats.attendance_rate ?? 0}%)` : "—"}
            colorClass="bg-purple-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
            label="Rata-rata Lama Bekerja"
            value={formatMinutesToHours(stats?.avg_work_minutes)}
            colorClass="bg-emerald-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Rata-rata Waktu Produktif"
            value={formatMinutesToHours(stats?.avg_productive_minutes)}
            colorClass="bg-teal-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Ketepatan Datang"
            value={formatTime(stats?.avg_arrival_time)}
            subValue={stats?.on_time_days != null ? `${stats.on_time_days}/${stats.total_days ?? "?"} (${stats.on_time_rate ?? 0}%)` : ""}
            colorClass="bg-blue-100"
          />
          <KPICard
            icon={<svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            label="Rata-rata Waktu Tidak Produktif"
            value={formatMinutesToHours(stats?.avg_idle_minutes)}
            colorClass="bg-orange-100"
          />
        </div>
      )}

      {/* Trend chart */}
      {trend.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Tren {filters.periodType === "weekly" ? "Mingguan" : "Harian"}
          </h3>
          <SimpleBarChart data={trend} />
        </div>
      )}
    </div>
  );
}

// ── Filter Bar (shared) ───────────────────────────────────────────────────────

function FilterBar({ filters, periodOptions, onPersonChange, onPeriodTypeChange, onPeriodValueChange }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Period type */}
        <div className="flex items-center gap-2">
          {["daily", "weekly", "monthly"].map((type) => (
            <button
              key={type}
              onClick={() => onPeriodTypeChange(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filters.periodType === type
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {{ daily: "Harian", weekly: "Mingguan", monthly: "Bulanan" }[type]}
            </button>
          ))}
        </div>

        {/* Person selector */}
        <select
          value={filters.person ?? "all"}
          onChange={(e) => onPersonChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          <option value="all">Semua orang</option>
          {PERSON_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {/* Date/Week/Month selector */}
        <select
          value={filters.periodValue ?? ""}
          onChange={(e) => onPeriodValueChange(e.target.value)}
          disabled={periodOptions.length === 0}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {periodOptions.length === 0 ? (
            <option value="">Tidak ada data</option>
          ) : (
            periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
