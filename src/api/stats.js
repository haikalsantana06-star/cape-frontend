const STATS_URL = import.meta.env.VITE_STATS_URL || "/stats";

// ── Available dates ──────────────────────────────────────────────────────────
export async function fetchAvailableDates(person = null, yearMonth = null) {
  const params = new URLSearchParams();
  if (person) params.set("person", person);
  if (yearMonth) params.set("year_month", yearMonth);
  const res = await fetch(`${STATS_URL}/available-dates?${params}`);
  if (!res.ok) throw new Error("Failed to fetch available dates");
  return res.json();
}

// ── Daily stats ──────────────────────────────────────────────────────────────
export async function fetchDailyStats(person, date) {
  const res = await fetch(`${STATS_URL}/daily/${person}?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch daily stats");
  return res.json();
}

// ── Aggregate stats ──────────────────────────────────────────────────────────
export async function fetchAggregateStats(scope, period, person = null) {
  const params = new URLSearchParams({ scope, period });
  if (person) params.set("person", person);
  const res = await fetch(`${STATS_URL}/aggregate?${params}`);
  if (!res.ok) throw new Error("Failed to fetch aggregate stats");
  return res.json();
}

// ── Trend series ─────────────────────────────────────────────────────────────
export async function fetchTrendSeries(scope, period, person = null) {
  const params = new URLSearchParams({ scope, period });
  if (person) params.set("person", person);
  const res = await fetch(`${STATS_URL}/trend?${params}`);
  if (!res.ok) throw new Error("Failed to fetch trend series");
  return res.json();
}

// ── Person comparison ─────────────────────────────────────────────────────────
export async function fetchPersonComparison(scope, period) {
  const params = new URLSearchParams({ scope, period });
  const res = await fetch(`${STATS_URL}/comparison?${params}`);
  if (!res.ok) throw new Error("Failed to fetch comparison");
  return res.json();
}

// ── Legacy fallback (for dev / old backend) ─────────────────────────────────
export async function fetchLegacyStats(person, date) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const res = await fetch(`${STATS_URL}/${person}?${params}`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}
