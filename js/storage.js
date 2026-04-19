import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Auth helper ───────────────────────────────────────────
function uid() {
  const user = window._auth && window._auth.currentUser;
  if (!user) throw new Error("Not signed in");
  return user.uid;
}

// ── In-memory caches (populated on login, kept in sync on writes) ──
let _workouts = null;
let _plans = null;
let _bodyWeights = null;

function sanitizeFirestoreData(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreData(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, sanitizeFirestoreData(nested)]),
    );
  }
  return value;
}

// ── Save status tracker ────────────────────────────────────
// Tracks in-flight Firestore writes so the UI can surface Saving / Saved /
// Offline / Error state. `state` is one of: "idle" | "saving" | "saved"
// | "offline" | "error". Every write funnels through trackWrite() so
// callers can still `await` the returned promise and handle errors locally.
const _saveStatus = {
  state: "idle",
  pending: 0,
  lastError: null,
  // last time we transitioned to "saved" — used to auto-fade the indicator
  savedAt: 0,
};
const _saveSubs = new Set();

function notifySaveSubs() {
  for (const cb of _saveSubs) {
    try {
      cb({ ..._saveStatus });
    } catch (err) {
      console.error("saveStatus subscriber threw:", err);
    }
  }
}

function setSaveState(next) {
  if (_saveStatus.state === next) return;
  _saveStatus.state = next;
  if (next === "saved") _saveStatus.savedAt = Date.now();
  notifySaveSubs();
}

function trackWrite(promise, label = "write") {
  _saveStatus.pending += 1;
  if (_saveStatus.state !== "offline") setSaveState("saving");
  // Note: we return the original promise, so callers can still await/catch.
  // The .then/.catch below is a sibling handler purely for status tracking.
  promise
    .then(() => {
      _saveStatus.lastError = null;
    })
    .catch((err) => {
      _saveStatus.lastError = { at: Date.now(), label, message: err?.message || String(err) };
      // If the browser knows we're offline, show offline instead of error —
      // Firestore's IndexedDB persistence will replay the write when back online.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setSaveState("offline");
      } else {
        setSaveState("error");
        console.warn(`Firestore ${label} failed:`, err);
      }
    })
    .finally(() => {
      _saveStatus.pending = Math.max(0, _saveStatus.pending - 1);
      if (_saveStatus.pending === 0 && _saveStatus.state === "saving") {
        setSaveState("saved");
      }
    });
  return promise;
}

export function subscribeSaveStatus(cb) {
  _saveSubs.add(cb);
  // Fire immediately with current state so new subscribers can sync the UI.
  try {
    cb({ ..._saveStatus });
  } catch (err) {
    console.error("saveStatus subscriber threw:", err);
  }
  return () => _saveSubs.delete(cb);
}

export function getSaveStatus() {
  return { ..._saveStatus };
}

// Hook browser online/offline events so the indicator reflects connectivity
// even when no writes are pending.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (_saveStatus.state === "offline") {
      setSaveState(_saveStatus.pending > 0 ? "saving" : "idle");
    }
  });
  window.addEventListener("offline", () => setSaveState("offline"));
  // Initial state check — if the app boots offline, surface it.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    _saveStatus.state = "offline";
  }
}

// ── Hydrate: load all data from Firestore into caches ─────
// Call this once after login before navigating to the app.
export async function hydrateFromFirestore() {
  const u = uid();
  const db = window._db;

  const [workSnap, planSnap, bwSnap, profileSnap] = await Promise.all([
    getDocs(collection(db, `users/${u}/workouts`)),
    getDocs(collection(db, `users/${u}/plans`)),
    getDocs(collection(db, `users/${u}/bodyweights`)),
    getDoc(doc(db, `users/${u}`)),
  ]);

  _workouts = workSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.date.localeCompare(a.date));
  _plans = planSnap.docs.map((d) => d.data());
  _bodyWeights = bwSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.date.localeCompare(a.date));

  // Sync preferences and plan id from cloud profile to localStorage
  if (profileSnap.exists()) {
    const data = profileSnap.data();
    if (data.activePlanId !== undefined) {
      if (data.activePlanId)
        localStorage.setItem("wt_active_plan", data.activePlanId);
      else localStorage.removeItem("wt_active_plan");
    }
    if (data.displayName)
      localStorage.setItem("wt_display_name", data.displayName);
    if (data.unitPref) localStorage.setItem("wt_unit_pref", data.unitPref);
    if (data.theme) localStorage.setItem("wt_theme", data.theme);
    if (data.themePalette)
      localStorage.setItem("wt_theme_palette", data.themePalette);
  }
}

// Clear caches on logout
export function clearCaches() {
  _workouts = null;
  _plans = null;
  _bodyWeights = null;
}

// ── Workouts ──────────────────────────────────────────────
export function loadWorkouts() {
  return _workouts || [];
}

export function addWorkout(workout) {
  const payload = sanitizeFirestoreData(workout);
  if (_workouts) _workouts.unshift(payload);
  return trackWrite(
    setDoc(doc(window._db, `users/${uid()}/workouts/${workout.id}`), payload),
    "addWorkout",
  );
}

export function updateWorkout(workout) {
  const payload = sanitizeFirestoreData(workout);
  if (_workouts) {
    const i = _workouts.findIndex((w) => w.id === workout.id);
    if (i !== -1) _workouts[i] = payload;
  }
  return trackWrite(
    setDoc(doc(window._db, `users/${uid()}/workouts/${workout.id}`), payload),
    "updateWorkout",
  );
}

export function deleteWorkout(id) {
  if (_workouts) _workouts = _workouts.filter((w) => w.id !== id);
  return trackWrite(
    deleteDoc(doc(window._db, `users/${uid()}/workouts/${id}`)),
    "deleteWorkout",
  );
}

// ── Plans ─────────────────────────────────────────────────
export function loadPlans() {
  return _plans || [];
}

export function upsertPlan(plan) {
  const payload = sanitizeFirestoreData(plan);
  if (_plans) {
    const i = _plans.findIndex((p) => p.id === plan.id);
    if (i !== -1) _plans[i] = payload;
    else _plans.unshift(payload);
  }
  return trackWrite(
    setDoc(doc(window._db, `users/${uid()}/plans/${plan.id}`), payload),
    "upsertPlan",
  );
}

export function deletePlan(id) {
  if (_plans) _plans = _plans.filter((p) => p.id !== id);
  return trackWrite(
    deleteDoc(doc(window._db, `users/${uid()}/plans/${id}`)),
    "deletePlan",
  );
}

// ── Active Plan ───────────────────────────────────────────
// Kept in localStorage for synchronous access; synced to Firestore on each write.
export function loadActivePlanId() {
  return localStorage.getItem("wt_active_plan") || null;
}

export function saveActivePlanId(id) {
  if (id) localStorage.setItem("wt_active_plan", id);
  else localStorage.removeItem("wt_active_plan");
  // Profile fields live on the user document (users/{uid}), matching
  // hydrateFromFirestore() and migrateLocalStorageIfNeeded(). The previous
  // 3-segment path users/{uid}/profile is a subcollection reference and
  // caused doc() to throw, so this write was silently failing.
  return trackWrite(
    setDoc(
      doc(window._db, `users/${uid()}`),
      { activePlanId: id || null },
      { merge: true },
    ),
    "saveActivePlanId",
  );
}

// ── Body Weight Log ───────────────────────────────────────
export function loadBodyWeights() {
  return _bodyWeights || [];
}

export function logBodyWeight(date, weight) {
  if (_bodyWeights) {
    const i = _bodyWeights.findIndex((e) => e.date === date);
    if (i !== -1) _bodyWeights[i].weight = weight;
    else {
      _bodyWeights.push({ date, weight });
      _bodyWeights.sort((a, b) => b.date.localeCompare(a.date));
    }
  }
  return trackWrite(
    setDoc(
      doc(window._db, `users/${uid()}/bodyweights/${date}`),
      sanitizeFirestoreData({
        date,
        weight,
      }),
    ),
    "logBodyWeight",
  );
}

export function deleteBodyWeight(date) {
  if (_bodyWeights) _bodyWeights = _bodyWeights.filter((e) => e.date !== date);
  return trackWrite(
    deleteDoc(doc(window._db, `users/${uid()}/bodyweights/${date}`)),
    "deleteBodyWeight",
  );
}

// ── Unit Preference ───────────────────────────────────────
// Read from localStorage (sync); writes also sync to Firestore profile.
export function loadUnitPref() {
  return localStorage.getItem("wt_unit_pref") || "lbs";
}

export function saveUnitPref(unit) {
  localStorage.setItem("wt_unit_pref", unit);
  return trackWrite(
    setDoc(
      doc(window._db, `users/${uid()}`),
      { unitPref: unit },
      { merge: true },
    ),
    "saveUnitPref",
  );
}

// ── One-time localStorage → Firestore migration ───────────
// Runs after first login. Copies existing local data to Firestore,
// then sets migrated:true on the profile doc so it never runs again.
export async function migrateLocalStorageIfNeeded() {
  const u = uid();
  const db = window._db;

  const profileSnap = await getDoc(doc(db, `users/${u}`));
  if (profileSnap.exists() && profileSnap.data().migrated) return;

  const rawWorkouts = JSON.parse(localStorage.getItem("wt_workouts") || "[]");
  const rawPlans = JSON.parse(localStorage.getItem("wt_plans") || "[]");
  const rawBodyWeights = JSON.parse(
    localStorage.getItem("wt_bodyweights") || "[]",
  );

  await Promise.all([
    ...rawWorkouts.map((w) =>
      setDoc(doc(db, `users/${u}/workouts/${w.id}`), sanitizeFirestoreData(w)),
    ),
    ...rawPlans.map((p) =>
      setDoc(doc(db, `users/${u}/plans/${p.id}`), sanitizeFirestoreData(p)),
    ),
    ...rawBodyWeights.map((e) =>
      setDoc(
        doc(db, `users/${u}/bodyweights/${e.date}`),
        sanitizeFirestoreData(e),
      ),
    ),
  ]);

  await setDoc(
    doc(db, `users/${u}`),
    {
      activePlanId: localStorage.getItem("wt_active_plan") || null,
      unitPref: localStorage.getItem("wt_unit_pref") || "lbs",
      theme: localStorage.getItem("wt_theme") || "dark",
      themePalette: localStorage.getItem("wt_theme_palette") || "classic",
      migrated: true,
    },
    { merge: true },
  );
}
