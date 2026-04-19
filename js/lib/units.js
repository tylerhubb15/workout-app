// ── Unit helpers ──────────────────────────────────────────
// Extracted from app.js as part of the module-split scaffold. Weights
// are stored in lbs in Firestore regardless of the user's display
// preference; these helpers convert at the UI boundary.
//
// `weightUnit()` reads the preference lazily each call so a unit
// switch (saveUnitPref) takes effect without requiring callers to
// pass the unit explicitly.

import { loadUnitPref } from "../storage.js";

export const LBS_TO_KG = 0.453592;
export const KG_TO_LBS = 2.20462;

export function weightUnit() {
  return loadUnitPref();
}

// Convert a stored lbs value to the user's display unit. Returns "" for
// null/empty so the value can be used directly as an <input> value.
export function toDisplayWeight(lbs) {
  if (lbs == null || lbs === "") return "";
  const v = parseFloat(lbs) || 0;
  return weightUnit() === "kg" ? +(v * LBS_TO_KG).toFixed(2) : v;
}

// Convert a value the user typed (in their preferred unit) back to lbs
// for storage. Rounds to two decimals on the kg→lbs path to avoid the
// long float tails that would otherwise end up in Firestore.
export function fromDisplayWeight(displayVal) {
  const v = parseFloat(displayVal) || 0;
  return weightUnit() === "kg" ? Math.round(v * KG_TO_LBS * 100) / 100 : v;
}

// Format a stored lbs value as "X lbs" or "X kg" for display.
export function fmtWeight(lbs) {
  if (!lbs) return "";
  return `${toDisplayWeight(lbs)} ${weightUnit()}`;
}
