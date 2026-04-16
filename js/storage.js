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
  if (_workouts) _workouts.unshift(workout);
  setDoc(doc(window._db, `users/${uid()}/workouts/${workout.id}`), workout);
}

export function updateWorkout(workout) {
  if (_workouts) {
    const i = _workouts.findIndex((w) => w.id === workout.id);
    if (i !== -1) _workouts[i] = workout;
  }
  setDoc(doc(window._db, `users/${uid()}/workouts/${workout.id}`), workout);
}

export function deleteWorkout(id) {
  if (_workouts) _workouts = _workouts.filter((w) => w.id !== id);
  deleteDoc(doc(window._db, `users/${uid()}/workouts/${id}`));
}

// ── Plans ─────────────────────────────────────────────────
export function loadPlans() {
  return _plans || [];
}

export function upsertPlan(plan) {
  if (_plans) {
    const i = _plans.findIndex((p) => p.id === plan.id);
    if (i !== -1) _plans[i] = plan;
    else _plans.unshift(plan);
  }
  setDoc(doc(window._db, `users/${uid()}/plans/${plan.id}`), plan);
}

export function deletePlan(id) {
  if (_plans) _plans = _plans.filter((p) => p.id !== id);
  deleteDoc(doc(window._db, `users/${uid()}/plans/${id}`));
}

// ── Active Plan ───────────────────────────────────────────
// Kept in localStorage for synchronous access; synced to Firestore on each write.
export function loadActivePlanId() {
  return localStorage.getItem("wt_active_plan") || null;
}

export function saveActivePlanId(id) {
  if (id) localStorage.setItem("wt_active_plan", id);
  else localStorage.removeItem("wt_active_plan");
  return setDoc(
    doc(window._db, `users/${uid()}/profile`),
    { activePlanId: id || null },
    { merge: true },
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
  setDoc(doc(window._db, `users/${uid()}/bodyweights/${date}`), {
    date,
    weight,
  });
}

export function deleteBodyWeight(date) {
  if (_bodyWeights) _bodyWeights = _bodyWeights.filter((e) => e.date !== date);
  deleteDoc(doc(window._db, `users/${uid()}/bodyweights/${date}`));
}

// ── Unit Preference ───────────────────────────────────────
// Read from localStorage (sync); writes also sync to Firestore profile.
export function loadUnitPref() {
  return localStorage.getItem("wt_unit_pref") || "lbs";
}

export function saveUnitPref(unit) {
  localStorage.setItem("wt_unit_pref", unit);
  setDoc(
    doc(window._db, `users/${uid()}/profile`),
    { unitPref: unit },
    { merge: true },
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
      setDoc(doc(db, `users/${u}/workouts/${w.id}`), w),
    ),
    ...rawPlans.map((p) => setDoc(doc(db, `users/${u}/plans/${p.id}`), p)),
    ...rawBodyWeights.map((e) =>
      setDoc(doc(db, `users/${u}/bodyweights/${e.date}`), e),
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
