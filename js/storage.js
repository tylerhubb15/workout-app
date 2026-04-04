const STORAGE_KEY = 'wt_workouts';
const PLANS_KEY   = 'wt_plans';

// ── Workouts ──────────────────────────────────────────────
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

// ── Plans (keyed by ISO date string "YYYY-MM-DD") ─────────
export function loadPlans() {
  try {
    return JSON.parse(localStorage.getItem(PLANS_KEY)) || {};
  } catch {
    return {};
  }
}

export function savePlan(date, name) {
  const plans = loadPlans();
  plans[date] = name;
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function deletePlan(date) {
  const plans = loadPlans();
  delete plans[date];
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}
