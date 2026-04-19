// ── Date helpers ──────────────────────────────────────────
// Pure date utilities used throughout the app. Extracted from app.js as
// the first step of incrementally splitting the monolith — these have
// no dependencies on state, DOM, or storage, so they were the safest
// pieces to pull out first.
//
// All "iso" strings here are local-calendar `YYYY-MM-DD` (not UTC-Z).

// Format a Date object as a local YYYY-MM-DD string. Avoids toISOString()
// on purpose, since toISOString shifts to UTC and can land on the wrong
// calendar date near midnight in non-UTC timezones.
export function localISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function todayISO() {
  return localISO(new Date());
}

// "Apr 18, 2026" — medium, used in history / picker rows.
export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// "Saturday, April 18" — long, used in day header / modal titles.
export function formatDateLong(iso) {
  const [y, m, d] = iso.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
