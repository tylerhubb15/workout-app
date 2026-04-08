const STORAGE_KEY = 'wt_workouts';

export function loadWorkouts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveWorkouts(workouts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export function addWorkout(workout) {
  const workouts = loadWorkouts();
  workouts.unshift(workout);
  saveWorkouts(workouts);
}

export function updateWorkout(workout) {
  const workouts = loadWorkouts();
  const i = workouts.findIndex(w => w.id === workout.id);
  if (i !== -1) workouts[i] = workout;
  saveWorkouts(workouts);
}

export function deleteWorkout(id) {
  saveWorkouts(loadWorkouts().filter(w => w.id !== id));
}

// ── Plans ─────────────────────────────────────────────────
const PLANS_KEY = 'wt_plans';

export function loadPlans() {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY)) || []; } catch { return []; }
}

export function savePlans(plans) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function upsertPlan(plan) {
  const plans = loadPlans();
  const i = plans.findIndex(p => p.id === plan.id);
  if (i !== -1) plans[i] = plan; else plans.unshift(plan);
  savePlans(plans);
}

export function deletePlan(id) {
  savePlans(loadPlans().filter(p => p.id !== id));
}

// ── Active Plan ───────────────────────────────────────────
const ACTIVE_PLAN_KEY = 'wt_active_plan';

export function loadActivePlanId() {
  return localStorage.getItem(ACTIVE_PLAN_KEY) || null;
}

export function saveActivePlanId(id) {
  if (id) localStorage.setItem(ACTIVE_PLAN_KEY, id);
  else localStorage.removeItem(ACTIVE_PLAN_KEY);
}

// ── Body Weight Log ───────────────────────────────────────
const BW_KEY = 'wt_bodyweights';

export function loadBodyWeights() {
  try { return JSON.parse(localStorage.getItem(BW_KEY)) || []; } catch { return []; }
}

export function saveBodyWeights(entries) {
  localStorage.setItem(BW_KEY, JSON.stringify(entries));
}

export function logBodyWeight(date, weight) {
  const entries = loadBodyWeights();
  const i = entries.findIndex(e => e.date === date);
  if (i !== -1) entries[i].weight = weight;
  else entries.push({ date, weight });
  entries.sort((a, b) => b.date.localeCompare(a.date));
  saveBodyWeights(entries);
}

export function deleteBodyWeight(date) {
  saveBodyWeights(loadBodyWeights().filter(e => e.date !== date));
}
