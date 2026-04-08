import { loadWorkouts, addWorkout, updateWorkout, deleteWorkout, loadPlans, upsertPlan, deletePlan, loadActivePlanId, saveActivePlanId } from './storage.js';

// ── Exercise Library ──────────────────────────────────────
const EXERCISES = {
  'Barbell': [
    'Barbell Bench Press', 'Barbell Incline Bench Press',
    'Barbell Deadlift', 'Barbell Bent-Over Row', 'T-Bar Row',
    'Barbell Overhead Press', 'Upright Row',
    'Barbell Curl', 'EZ-Bar Curl', 'Preacher Curl', 'Spider Curl',
    'Close-Grip Bench Press', 'Skull Crusher',
    'Barbell Back Squat', 'Barbell Front Squat', 'Barbell Walking Lunge',
    'Romanian Deadlift', 'Stiff-Leg Deadlift', 'Good Morning',
    'Hip Thrust', 'Sumo Deadlift',
    'Landmine Rotation',
    'Barbell Power Clean', 'Barbell Snatch', 'Trap Bar Deadlift', 'Barbell Thruster',
  ],
  'Dumbbell': [
    'Dumbbell Bench Press', 'Dumbbell Incline Bench Press', 'Dumbbell Decline Bench Press', 'Dumbbell Chest Fly',
    'Dumbbell Single-Arm Row',
    'Dumbbell Overhead Press', 'Dumbbell Lateral Raise', 'Dumbbell Front Raise', 'Arnold Press',
    'Dumbbell Curl', 'Incline Dumbbell Curl', 'Hammer Curl', 'Concentration Curl',
    'Dumbbell Skull Crusher', 'Overhead Tricep Extension', 'Tricep Kickback',
    'Dumbbell Front Squat', 'Bulgarian Split Squat', 'Goblet Squat',
    'Dumbbell Lunge', 'Dumbbell Walking Lunge', 'Step-Up',
    'Single-Leg Romanian Deadlift', 'Sumo Squat',
    'Russian Twist', 'Dumbbell Side Bend',
    "Farmer's Carry", 'Dumbbell Clean and Press',
  ],
  'Cable': [
    'Cable Chest Fly',
    'Lat Pulldown', 'Seated Cable Row', 'Face Pull', 'Straight-Arm Pulldown',
    'Cable Lateral Raise', 'Cable Rear Delt Fly',
    'Cable Curl',
    'Tricep Pushdown', 'Cable Overhead Tricep Extension', 'Single-Arm Pushdown',
    'Cable Pull-Through', 'Cable Kickback', 'Donkey Kick',
    'Cable Crunch', 'Pallof Press', 'Cable Woodchop',
  ],
  'Machine': [
    'Pec Deck Fly', 'Chest-Supported Row',
    'Reverse Pec Deck', 'Machine Shoulder Press',
    'Machine Curl',
    'Machine Tricep Press',
    'Leg Press', 'Hack Squat', 'Leg Extension',
    'Lying Leg Curl', 'Seated Leg Curl', 'Glute-Ham Raise',
    'Abductor Machine', 'Reverse Hyperextension',
    'Standing Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise', 'Donkey Calf Raise',
  ],
  'Bodyweight': [
    'Push-Up', 'Diamond Push-Up', 'Chest Dip', 'Dips Chest Focused', 'Tricep Dip',
    'Pull-Up',
    'Nordic Hamstring Curl', 'Glute Bridge',
    'Single-Leg Calf Raise',
    'Ab Wheel Rollout', 'Decline Sit-Up', 'Hanging Leg Raise', 'Plank',
    'Sled Push', 'Battle Ropes',
  ],
  'Kettlebell': [
    'Kettlebell Swing',
  ],
};

// ── Exercise metadata helpers ─────────────────────────────
const MUSCLE_MAP = {
  'Chest':      ['Barbell Bench Press','Barbell Incline Bench Press','Dumbbell Bench Press','Dumbbell Incline Bench Press','Dumbbell Decline Bench Press','Cable Chest Fly','Dumbbell Chest Fly','Pec Deck Fly','Push-Up','Chest Dip','Dips Chest Focused'],
  'Back':       ['Barbell Deadlift','Pull-Up','Lat Pulldown','Seated Cable Row','Barbell Bent-Over Row','Dumbbell Single-Arm Row','T-Bar Row','Face Pull','Straight-Arm Pulldown','Chest-Supported Row','Trap Bar Deadlift'],
  'Shoulders':  ['Barbell Overhead Press','Dumbbell Overhead Press','Dumbbell Lateral Raise','Cable Lateral Raise','Dumbbell Front Raise','Reverse Pec Deck','Arnold Press','Upright Row','Machine Shoulder Press','Cable Rear Delt Fly'],
  'Biceps':     ['Barbell Curl','Dumbbell Curl','Incline Dumbbell Curl','Hammer Curl','Concentration Curl','Cable Curl','EZ-Bar Curl','Preacher Curl','Spider Curl','Machine Curl'],
  'Triceps':    ['Close-Grip Bench Press','Skull Crusher','Dumbbell Skull Crusher','Tricep Pushdown','Overhead Tricep Extension','Tricep Kickback','Diamond Push-Up','Tricep Dip','Cable Overhead Tricep Extension','Machine Tricep Press','Single-Arm Pushdown'],
  'Quads':      ['Barbell Back Squat','Barbell Front Squat','Dumbbell Front Squat','Leg Press','Hack Squat','Bulgarian Split Squat','Leg Extension','Goblet Squat','Dumbbell Lunge','Barbell Walking Lunge','Dumbbell Walking Lunge','Step-Up'],
  'Hamstrings': ['Romanian Deadlift','Lying Leg Curl','Seated Leg Curl','Nordic Hamstring Curl','Stiff-Leg Deadlift','Good Morning','Glute-Ham Raise','Single-Leg Romanian Deadlift','Cable Pull-Through'],
  'Glutes':     ['Hip Thrust','Glute Bridge','Cable Kickback','Sumo Deadlift','Sumo Squat','Abductor Machine','Reverse Hyperextension','Donkey Kick'],
  'Calves':     ['Standing Calf Raise','Seated Calf Raise','Leg Press Calf Raise','Single-Leg Calf Raise','Donkey Calf Raise'],
  'Core':       ['Cable Crunch','Ab Wheel Rollout','Decline Sit-Up','Hanging Leg Raise','Plank','Russian Twist','Landmine Rotation','Pallof Press','Cable Woodchop','Dumbbell Side Bend'],
  'Full Body':  ['Barbell Power Clean','Barbell Snatch','Kettlebell Swing',"Farmer's Carry",'Dumbbell Clean and Press','Barbell Thruster','Sled Push','Battle Ropes'],
};

function getMuscleGroup(name) {
  for (const [group, names] of Object.entries(MUSCLE_MAP)) {
    if (names.includes(name)) return group;
  }
  return '';
}

function getEquipment(name) {
  for (const [equip, list] of Object.entries(EXERCISES)) {
    if (list.includes(name)) return equip;
  }
  return '';
}

// ── State ─────────────────────────────────────────────────
const state = {
  view: 'home',
  activeWorkout: null,       // workout in progress (Start Workout flow)
  dayWorkout: null,          // workout being edited from the calendar day view
  editingExIndex: null,
  formSets: [],
  exerciseContext: 'workout', // 'workout' | 'day' — which view the exercise form serves
  calendar: {
    year:  new Date().getFullYear(),
    month: new Date().getMonth(),
  },
  planDays: new Set(), // DOW indices selected in plan form
  editingPlan: null,   // plan whose days are being edited
  editingPlanDow: null,// day-of-week being edited in plan template
  editingPlanMuscleCounts: {}, // { 'Chest': 2, 'Back': 3 } — stepper values for current day
  editingPlanMuscleGroup: null,// which muscle group picker is open
  exMuscleFilter: null,  // active muscle group string or null
  exEquipFilter:  null,  // active equipment group string or null
};

// ── RIR Helpers ───────────────────────────────────────────
function getRirContext(plan, iso) {
  if (!plan.rir) return null;
  const msLen      = plan.mesocycleLength || 4;
  const start      = new Date(plan.start + 'T00:00:00');
  const date       = new Date(iso + 'T00:00:00');
  const weekNum    = Math.floor(Math.round((date - start) / 86400000) / 7); // 0-indexed
  const weekInCycle = weekNum % msLen;
  const targetRIR  = Math.max(0, (msLen - 1) - weekNum); // clamp at 0 — never resets after hitting zero
  const blockNum   = Math.floor(weekNum / msLen);
  return { weekNum, weekInCycle, targetRIR, blockNum, msLen };
}

function findLastLoggedSet(workouts, planName, exName, dow, beforeIso) {
  const sorted = workouts
    .filter(w => w.date < beforeIso && w.name === planName)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const w of sorted) {
    if (new Date(w.date + 'T00:00:00').getDay() !== dow) continue;
    const ex = w.exercises.find(e => e.name === exName);
    if (!ex) continue;
    const set = ex.sets.find(s => s.actualReps != null && s.rir != null);
    if (set) return set;
  }
  return null;
}

function computeAdjustedReps(templateReps, lastSet, targetRIR) {
  if (!lastSet) return 0; // Week 1: no target — lifter logs what they hit at RIR
  const estimatedMax = lastSet.actualReps + lastSet.rir;
  return Math.max(1, estimatedMax - targetRIR);
}

// ── Helpers ───────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateLong(iso) {
  const [y, m, d] = iso.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Navigation ────────────────────────────────────────────
function navigate(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  document.getElementById('bottom-nav').style.display = '';

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'home')     renderHome();
  if (view === 'workout')  renderWorkout();
  if (view === 'day')      renderDay();
  if (view === 'calendar') renderCalendar();
  if (view === 'history')  renderHistory();
  if (view === 'exercise') renderExerciseForm();
  if (view === 'plan')              renderPlan();
  if (view === 'plan-editor')       renderPlanEditor();
  if (view === 'plan-day-muscles')  renderPlanDayMuscles();
  if (view === 'plan-muscle-picker') renderMuscleGroupPicker();

  window.scrollTo(0, 0);
}

// ── Home ──────────────────────────────────────────────────
function renderHome() {
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  renderStats();
  renderTodayPlan();
}

function renderTodayPlan() {
  const el = document.getElementById('home-today-plan');
  if (!el) return;

  const plan = getActivePlan();
  if (!plan || !Array.isArray(plan.workoutDays)) { el.innerHTML = ''; return; }

  const todayIso = todayISO();
  const todayDow = new Date().getDay();
  const logged   = loadWorkouts().find(w => w.date === todayIso);

  // Decide which workout day to surface:
  // — today, if it's an unlogged workout day within the plan window
  // — otherwise, the next upcoming workout day within the plan window
  let targetIso = null;
  let targetDow = null;
  let label     = null;

  const todayIsWorkoutDay = plan.workoutDays.includes(todayDow)
    && todayIso >= plan.start && todayIso <= plan.end;

  if (todayIsWorkoutDay && !logged) {
    targetIso = todayIso;
    targetDow = todayDow;
    label = 'Today';
  } else {
    // Scan up to 14 days ahead for the next workout day in range
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      if (iso > plan.end) break;
      if (iso < plan.start) continue;
      if (plan.workoutDays.includes(dow)) {
        targetIso = iso;
        targetDow = dow;
        label = i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' });
        break;
      }
    }
  }

  if (!targetIso) { el.innerHTML = ''; return; }

  const exList = plan.dayTemplates && plan.dayTemplates[targetDow] && plan.dayTemplates[targetDow].length > 0
    ? plan.dayTemplates[targetDow].map(e => escHtml(e.name)).join(' · ')
    : 'Workout day';

  const rirCtx = getRirContext(plan, targetIso);
  const rirBadge = rirCtx
    ? `<span class="today-plan-rir">Wk&nbsp;${rirCtx.weekInCycle + 1}/${rirCtx.msLen} · RIR&nbsp;${rirCtx.targetRIR}</span>`
    : '';

  el.innerHTML = `
    <div class="today-plan-card">
      <div class="today-plan-card-top">
        <div>
          <div class="today-plan-label">${label} — ${escHtml(plan.name)} ${rirBadge}</div>
          <div class="today-plan-exercises">${exList}</div>
        </div>
        <button class="today-plan-start-btn" onclick="selectDay('${targetIso}')">Start ›</button>
      </div>
    </div>`;
}

function renderStats() {
  const workouts = loadWorkouts();
  const totalEx  = workouts.reduce((n, w) => n + w.exercises.length, 0);
  const totalSets = workouts.reduce((n, w) =>
    n + w.exercises.reduce((m, ex) => m + ex.sets.length, 0), 0);
  document.getElementById('stat-total').textContent     = workouts.length;
  document.getElementById('stat-exercises').textContent = totalEx;
  document.getElementById('stat-sets').textContent      = totalSets;
}

function setRowHTML(s, i) {
  const repsDisplay = (s.actualReps != null && s.actualReps > 0)
    ? `${s.actualReps}<span style="color:var(--text3);font-size:11px"> / ${s.reps}</span>`
    : `${s.reps}`;
  const rirDisplay = s.rir != null
    ? `<span class="set-rir-history">RIR ${s.rir}</span>`
    : '';
  return `
    <tr>
      <td class="set-num">${i + 1}</td>
      <td>${repsDisplay} reps ${rirDisplay}</td>
      <td>${s.weight ? s.weight + ' lbs' : '—'}</td>
    </tr>`;
}

function calcVolume(w) {
  const vol = w.exercises.reduce((t, ex) =>
    t + ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0);
  if (!vol) return null;
  return vol >= 1000 ? (vol / 1000).toFixed(1) + 'k' : String(vol);
}

function workoutCardHTML(w) {
  const exCount  = w.exercises.length;
  const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const vol      = calcVolume(w);

  const exerciseRows = w.exercises.map(ex => {
    const setRows = ex.sets.map((s, i) => setRowHTML(s, i)).join('');
    return `
      <div class="exercise-row">
        <div class="exercise-row-name">${escHtml(ex.name)}</div>
        <table class="sets-table">
          <thead><tr><th></th><th>Reps</th><th>Weight</th></tr></thead>
          <tbody>${setRows}</tbody>
        </table>
      </div>`;
  }).join('');

  return `
    <div class="workout-card" data-id="${w.id}" onclick="toggleCard(this)">
      <div class="workout-card-header">
        <div class="workout-card-name">${escHtml(w.name)}</div>
        <div class="workout-card-right">
          <div class="workout-card-date">${formatDate(w.date)}</div>
          <div class="workout-card-chevron">▾</div>
        </div>
      </div>
      <div class="workout-card-meta">
        <span class="meta-pill">${exCount} exercise${exCount !== 1 ? 's' : ''}</span>
        <span class="meta-pill">${setCount} set${setCount !== 1 ? 's' : ''}</span>
        ${vol ? `<span class="meta-pill vol-pill">${vol} lbs</span>` : ''}
      </div>
      <div class="workout-card-exercises">${exerciseRows}</div>
    </div>`;
}

window.toggleCard = function(el) { el.classList.toggle('expanded'); };

// ── Active Workout (Start Workout flow) ───────────────────
function startWorkout() {
  state.activeWorkout = { id: uid(), name: '', date: todayISO(), exercises: [] };
  state.exerciseContext = 'workout';
  navigate('workout');
}

function renderWorkout() {
  const w = state.activeWorkout;
  if (!w) return;
  document.getElementById('workout-name').value = w.name;
  document.getElementById('workout-date').value = w.date;

  const container = document.getElementById('active-exercises');
  if (w.exercises.length === 0) {
    container.innerHTML = emptyExerciseState();
    return;
  }
  container.innerHTML = w.exercises.map((ex, ei) => exerciseCardHTML(ex, ei, 'workout', w.exercises.length)).join('');
}

function syncWorkoutFields() {
  const w = state.activeWorkout;
  if (!w) return;
  w.name = document.getElementById('workout-name').value.trim();
  w.date = document.getElementById('workout-date').value;
}

function finishWorkout() {
  syncWorkoutFields();
  const w = state.activeWorkout;
  if (!w.name) w.name = 'Workout – ' + formatDate(w.date);
  if (w.exercises.length === 0) {
    alert('Add at least one exercise before finishing.');
    return;
  }
  addWorkout(w);
  state.activeWorkout = null;
  navigate('home');
}

// ── Day View (calendar drill-down) ────────────────────────
window.selectDay = function(iso) {
  const workouts = loadWorkouts();
  const existing = workouts.find(w => w.date === iso);
  state.dayWorkout = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), date: iso, name: '', exercises: [] };

  // If the day has no exercises, pre-load from the active plan
  if (state.dayWorkout.exercises.length === 0) {
    const dow = new Date(iso + 'T00:00:00').getDay();
    const plan = getActivePlan();
    if (plan && iso >= plan.start && iso <= plan.end &&
        plan.workoutDays.includes(dow) &&
        plan.dayTemplates && plan.dayTemplates[dow] && plan.dayTemplates[dow].length > 0) {
      state.dayWorkout.exercises = JSON.parse(JSON.stringify(plan.dayTemplates[dow]));
      if (!state.dayWorkout.name) state.dayWorkout.name = plan.name;

      // RIR: adjust target reps based on last week's logged performance
      const rirCtx = getRirContext(plan, iso);
      if (rirCtx) {
        const allWorkouts = loadWorkouts();
        state.dayWorkout.exercises = state.dayWorkout.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => {
            const lastSet = findLastLoggedSet(allWorkouts, plan.name, ex.name, dow, iso);
            const adjReps = computeAdjustedReps(s.reps, lastSet, rirCtx.targetRIR);
            return { ...s, reps: adjReps, rir: rirCtx.targetRIR };
          }),
        }));
        state.dayWorkout._rirCtx = rirCtx;
      }
    }
  }

  state.exerciseContext = 'day';
  navigate('day');
};

function renderDay() {
  const w = state.dayWorkout;
  if (!w) return;

  document.getElementById('day-view-title').textContent = formatDateLong(w.date);
  let daySubtitle = w.exercises.length > 0
    ? `${w.exercises.length} exercise${w.exercises.length !== 1 ? 's' : ''}`
    : 'No exercises yet';
  if (w._rirCtx) {
    const { weekInCycle, targetRIR, msLen } = w._rirCtx;
    daySubtitle += ` · Wk ${weekInCycle + 1}/${msLen} · RIR ${targetRIR}`;
  }
  document.getElementById('day-view-subtitle').textContent = daySubtitle;

  const container = document.getElementById('day-exercises');
  if (w.exercises.length === 0) {
    container.innerHTML = emptyExerciseState();
    document.getElementById('btn-day-finish-workout').disabled = true;
    return;
  }
  container.innerHTML = w.exercises.map((ex, ei) => exerciseCardHTML(ex, ei, 'day', w.exercises.length)).join('');
  const allDone = w.exercises.every(ex => ex.sets.every(s => s.done));
  document.getElementById('btn-day-finish-workout').disabled = !allDone;
}

// Save or update the day's workout in localStorage
function persistDay() {
  const w = state.dayWorkout;
  if (!w) return;

  const workouts = loadWorkouts();
  const exists   = workouts.some(x => x.id === w.id);

  if (w.exercises.length === 0) {
    if (exists) deleteWorkout(w.id);
    return;
  }

  if (!w.name) w.name = formatDate(w.date) + ' Workout';
  if (exists) updateWorkout(w);
  else        addWorkout(w);
}

// ── Shared Exercise Card ──────────────────────────────────
// Used by active workout, day view, and plan template
function exerciseCardHTML(ex, ei, ctx, totalCount) {
  const canLog   = ctx !== 'planTemplate';
  const planRIR  = ctx === 'planTemplate' && state.editingPlan && state.editingPlan.rir;
  const muscle   = ex.muscleGroup || getMuscleGroup(ex.name);
  const canReorder = ctx !== 'planTemplate' && totalCount > 1;
  const equip    = getEquipment(ex.name);

  const setRows = ex.sets.map((s, si) => {
    const done = s.done || false;
    return `
    <tr class="set-row${done ? ' set-row-done' : ''}">
      <td class="set-num-cell">${si + 1}</td>
      <td><input class="set-pill" type="number" min="0" step="2.5" inputmode="decimal"
           value="${s.weight || ''}" placeholder="–"
           onchange="handleSetChange('${ctx}',${ei},${si},'weight',this.value)" /></td>
      ${planRIR ? '' : `<td><input class="set-pill" type="number" min="0" inputmode="numeric"
           value="${s.reps || ''}" placeholder="${s.rir != null ? 'Log reps' : '–'}"
           onchange="handleSetChange('${ctx}',${ei},${si},'reps',this.value)" />
        ${(canLog && s.rir != null) ? `<span class="set-rir-label">@RIR ${s.rir}</span>` : ''}</td>`}
      ${canLog ? `<td class="set-log-cell">
        <label class="set-check-wrap">
          <input type="checkbox" ${done ? 'checked' : ''}
            onchange="handleSetDone('${ctx}',${ei},${si},this.checked)" />
          <span class="set-check-box"></span>
        </label>
      </td>` : ''}
      <td><button class="btn-remove-set" onclick="handleRemoveSet('${ctx}',${ei},${si})">×</button></td>
    </tr>`;
  }).join('');

  const muscleTag = muscle
    ? `<div class="ex-muscle-tag ex-muscle-${muscle.toLowerCase().replace(/\s+/g,'-')}">${muscle.toUpperCase()}</div>`
    : '';

  return `
    <div class="active-exercise-card">
      ${muscleTag}
      <div class="active-exercise-header">
        <div class="active-exercise-info">
          <div class="active-exercise-name">${escHtml(ex.name)}</div>
          ${equip ? `<div class="active-exercise-equip">${equip}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          ${canReorder ? `<button class="reorder-btn${ei === 0 ? ' disabled' : ''}" onclick="handleMoveExercise('${ctx}',${ei},'up')" ${ei === 0 ? 'disabled' : ''}>▲</button>
          <button class="reorder-btn${ei === totalCount - 1 ? ' disabled' : ''}" onclick="handleMoveExercise('${ctx}',${ei},'down')" ${ei === totalCount - 1 ? 'disabled' : ''}>▼</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="handleEditExercise('${ctx}',${ei})">Edit</button>
          <button class="btn btn-icon btn-secondary" onclick="handleRemoveExercise('${ctx}',${ei})" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>
      <table class="sets-editor">
        <thead>
          <tr>
            <th class="set-num-head">#</th>
            <th>Weight</th>
            ${planRIR ? '' : `<th>Reps</th>`}
            ${canLog ? '<th class="set-log-head">Log</th>' : ''}
            <th></th>
          </tr>
        </thead>
        <tbody>${setRows}</tbody>
      </table>
      <button class="btn btn-ghost btn-sm mt-8" onclick="handleAddSet('${ctx}',${ei})">+ Add Set</button>
    </div>`;
}

function workoutFor(ctx) {
  if (ctx === 'day') return state.dayWorkout;
  if (ctx === 'planTemplate') {
    const dow = state.editingPlanDow;
    if (!state.editingPlan.dayTemplates[dow]) state.editingPlan.dayTemplates[dow] = [];
    // Return a proxy-like object whose .exercises points at the template array
    return { exercises: state.editingPlan.dayTemplates[dow] };
  }
  return state.activeWorkout;
}

function rerenderFor(ctx) {
  if (ctx === 'day')          { persistDay(); renderDay(); }
  else if (ctx === 'planTemplate') { upsertPlan(state.editingPlan); renderPlanEditor(); }
  else                        { renderWorkout(); }
}

window.handleSetChange = function(ctx, ei, si, field, val) {
  workoutFor(ctx).exercises[ei].sets[si][field] = parseFloat(val) || 0;
  if (ctx === 'day') persistDay();
  if (ctx === 'planTemplate') upsertPlan(state.editingPlan);
};

window.handleRemoveSet = function(ctx, ei, si) {
  workoutFor(ctx).exercises[ei].sets.splice(si, 1);
  rerenderFor(ctx);
};

window.handleAddSet = function(ctx, ei) {
  const sets = workoutFor(ctx).exercises[ei].sets;
  const last = sets.slice(-1)[0];
  sets.push({ reps: last ? last.reps : 0, weight: last ? last.weight : 0, ...(last?.rir != null ? { rir: last.rir } : {}) });
  rerenderFor(ctx);
};

window.handleSetDone = function(ctx, ei, si, checked) {
  const set = workoutFor(ctx).exercises[ei].sets[si];
  set.done = checked;
  if (checked && set.rir != null) {
    set.actualReps = set.reps; // user edits reps field before ticking LOG
  }
  rerenderFor(ctx);
};

window.handleEditExercise = function(ctx, ei) {
  state.exerciseContext  = ctx;
  state.editingExIndex   = ei;
  navigate('exercise');
};

window.handleRemoveExercise = function(ctx, ei) {
  workoutFor(ctx).exercises.splice(ei, 1);
  rerenderFor(ctx);
};

window.handleMoveExercise = function(ctx, ei, direction) {
  const exercises = workoutFor(ctx).exercises;
  const swapIdx = direction === 'up' ? ei - 1 : ei + 1;
  if (swapIdx < 0 || swapIdx >= exercises.length) return;
  [exercises[ei], exercises[swapIdx]] = [exercises[swapIdx], exercises[ei]];
  rerenderFor(ctx);
};

function emptyExerciseState() {
  return `
    <div class="empty-state" style="padding:24px 0">
      <div class="empty-label">No exercises added.</div>
      <p>Tap <strong>Add Exercise</strong> below.</p>
    </div>`;
}

// ── Exercise Form ─────────────────────────────────────────
function renderExerciseForm() {
  const editing = state.editingExIndex !== null;
  document.getElementById('exercise-view-title').textContent = editing ? 'Edit Exercise' : 'Add Exercise';

  if (editing) {
    const ex = workoutFor(state.exerciseContext).exercises[state.editingExIndex];
    document.getElementById('exercise-name').value = ex.name;
    state.formSets = ex.sets.map(s => ({ ...s }));
  } else {
    document.getElementById('exercise-name').value = '';
    state.formSets = [{ reps: 0, weight: 0 }];
  }

  // Populate chips and filter
  state.exMuscleFilter = null;
  state.exEquipFilter  = null;
  const filterInput = document.getElementById('ex-filter');
  filterInput.value = '';
  renderExFilterTabs();
  renderExChips('');
  filterInput.oninput = refreshChips;

  renderSetRows();
}

function renderExFilterTabs() {
  const muscles = Object.keys(MUSCLE_MAP);
  const equips  = Object.keys(EXERCISES);
  const mf = state.exMuscleFilter;
  const ef = state.exEquipFilter;

  const muscleBtns = muscles.map(m => {
    const active = mf === m ? ' active' : '';
    return `<button class="ex-filter-btn${active}" onclick="setMuscleFilter('${m}')">${m}</button>`;
  }).join('');

  const equipBtns = equips.map(e => {
    const active = ef === e ? ' active' : '';
    return `<button class="ex-filter-btn${active}" onclick="setEquipFilter('${e}')">${e}</button>`;
  }).join('');

  document.getElementById('ex-filter-tabs').innerHTML = `
    <div class="ex-filter-section">
      <div class="ex-filter-label">Muscle Group</div>
      <div class="ex-filter-row">${muscleBtns}</div>
      <div class="ex-filter-divider"></div>
      <div class="ex-filter-label">Equipment</div>
      <div class="ex-filter-row">${equipBtns}</div>
    </div>`;
}

function refreshChips() {
  renderExChips(document.getElementById('ex-filter').value.trim().toLowerCase());
}

window.setMuscleFilter = function(muscle) {
  state.exMuscleFilter = state.exMuscleFilter === muscle ? null : muscle;
  renderExFilterTabs();
  refreshChips();
};

window.setEquipFilter = function(equip) {
  state.exEquipFilter = state.exEquipFilter === equip ? null : equip;
  renderExFilterTabs();
  refreshChips();
};

function renderExChips(filter) {
  const builtInAll = Object.values(EXERCISES).flat();
  const used   = [...new Set(loadWorkouts().flatMap(w => w.exercises.map(e => e.name)))];
  const custom = used.filter(n => !builtInAll.includes(n));

  const groups = { ...EXERCISES };
  if (custom.length) groups['Custom'] = custom.sort();

  const mf = state.exMuscleFilter;
  const ef = state.exEquipFilter;
  const muscleAllowed = mf ? new Set(MUSCLE_MAP[mf] || []) : null;

  let html = '';
  for (const [group, names] of Object.entries(groups)) {
    // Equipment filter: skip groups that don't match
    if (ef && group !== ef && group !== 'Custom') continue;

    let filtered = names;
    // Muscle filter: only keep exercises in that muscle group
    if (muscleAllowed) filtered = filtered.filter(n => muscleAllowed.has(n));
    // Text filter
    if (filter) filtered = filtered.filter(n => n.toLowerCase().includes(filter));
    if (!filtered.length) continue;

    // Show group label only when multiple equipment groups could be visible
    if (!ef) html += `<div class="ex-group-label">${group}</div>`;
    html += `<div class="ex-chips-row">`;
    html += filtered.map(n =>
      `<button class="ex-chip" data-name="${escHtml(n)}" onclick="selectExChip(this.dataset.name)">${escHtml(n)}</button>`
    ).join('');
    html += `</div>`;
  }

  if (!html) html = `<div class="ex-filter-empty">No exercises match these filters</div>`;
  document.getElementById('ex-chips').innerHTML = html;
}

window.selectExChip = function(name) {
  document.getElementById('exercise-name').value = name;
};

function renderSetRows() {
  const inRirTemplate = state.exerciseContext === 'planTemplate'
    && state.editingPlan && state.editingPlan.rir;

  document.getElementById('sets-form-body').innerHTML = state.formSets.map((s, i) => `
    <div class="set-block">
      <div class="set-block-header">
        <span class="set-block-num">Set ${i + 1}</span>
        <button class="btn-remove-set" onclick="formRemoveSet(${i})">×</button>
      </div>
      <div class="set-block-inputs">
        <div class="set-field">
          <span class="set-field-label">Starting Weight (lbs)</span>
          <input class="set-input" type="number" min="0" step="2.5" inputmode="decimal"
            value="${s.weight || ''}" placeholder="0"
            onchange="formSetChange(${i},'weight',this.value)" />
        </div>
        ${inRirTemplate ? '' : `<div class="set-field">
          <span class="set-field-label">Target Reps</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.reps || ''}" placeholder="0"
            onchange="formSetChange(${i},'reps',this.value)" />
        </div>`}
      </div>
    </div>`).join('');
}

window.formSetChange = function(i, field, val) {
  state.formSets[i][field] = parseFloat(val) || 0;
};

window.formRemoveSet = function(i) {
  if (state.formSets.length === 1) return;
  state.formSets.splice(i, 1);
  renderSetRows();
};

function addFormSet() {
  const last = state.formSets.slice(-1)[0];
  state.formSets.push({ reps: last ? last.reps : 0, weight: last ? last.weight : 0 });
  renderSetRows();
}

function saveExercise() {
  const name = document.getElementById('exercise-name').value.trim();
  if (!name) { document.getElementById('exercise-name').focus(); return; }

  // Flush any uncommitted input values
  const inRirTemplate = state.exerciseContext === 'planTemplate'
    && state.editingPlan && state.editingPlan.rir;
  document.querySelectorAll('#sets-form-body .set-block').forEach((block, idx) => {
    const inputs = block.querySelectorAll('input');
    state.formSets[idx].weight = parseFloat(inputs[0].value) || 0;
    if (!inRirTemplate && inputs[1]) {
      state.formSets[idx].reps = parseFloat(inputs[1].value) || 0;
    }
  });

  // For RIR templates only weight matters; keep all sets regardless of reps
  const exercise = {
    name,
    sets: inRirTemplate
      ? state.formSets
      : state.formSets.filter(s => s.reps > 0 || s.weight > 0),
  };
  if (exercise.sets.length === 0) exercise.sets = [{ reps: 0, weight: 0 }];

  const target = workoutFor(state.exerciseContext);
  if (state.editingExIndex !== null) target.exercises[state.editingExIndex] = exercise;
  else                               target.exercises.push(exercise);

  if (state.exerciseContext === 'day') persistDay();
  if (state.exerciseContext === 'planTemplate') upsertPlan(state.editingPlan);

  state.editingExIndex = null;
  const dest = state.exerciseContext === 'planTemplate' ? 'plan-editor' : state.exerciseContext;
  navigate(dest);
}

// ── Calendar ──────────────────────────────────────────────
function getActivePlan() {
  const id = loadActivePlanId();
  if (!id) return null;
  return loadPlans().find(p => p.id === id) || null;
}

function planDatesSet() {
  const dates = new Set();
  try {
    const plan = getActivePlan();
    if (!plan || !plan.start || !plan.end || !Array.isArray(plan.workoutDays)) return dates;
    let cur = new Date(plan.start + 'T00:00:00');
    const end = new Date(plan.end + 'T00:00:00');
    while (cur <= end) {
      if (plan.workoutDays.includes(cur.getDay()))
        dates.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  } catch (e) { /* don't let a bad plan kill the calendar */ }
  return dates;
}

function renderCalendar() {
  const { year, month } = state.calendar;
  const today    = todayISO();

  document.getElementById('cal-month-label').textContent =
    new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const workoutDates = new Set(loadWorkouts().map(w => w.date));
  const plannedDates = planDatesSet();

  const DOW         = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = DOW.map(d => `<div class="cal-header-cell">${d}</div>`).join('');
  for (let i = 0; i < firstDow; i++) html += `<div class="cal-day cal-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday  = iso === today;
    const hasLog   = workoutDates.has(iso);
    const hasPlan  = plannedDates.has(iso);

    const cls = ['cal-day', isToday ? 'today' : ''].filter(Boolean).join(' ');
    const dots = (hasLog ? `<span class="dot dot-workout"></span>` : '') +
                 (hasPlan && !hasLog ? `<span class="dot dot-plan"></span>` : '');

    html += `
      <div class="${cls}" onclick="selectDay('${iso}')">
        <span class="cal-day-num">${d}</span>
        ${dots ? `<div class="cal-dots">${dots}</div>` : ''}
      </div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
}

// ── Plan Day Editor ───────────────────────────────────────
const DOW_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

window.openPlanEditor = function(id) {
  const plan = loadPlans().find(p => p.id === id);
  if (!plan) return;
  if (!plan.dayTemplates) plan.dayTemplates = {};
  state.editingPlan = JSON.parse(JSON.stringify(plan));
  navigate('plan-editor');
};

function renderPlanEditor() {
  const plan = state.editingPlan;
  if (!plan) return;
  document.getElementById('plan-editor-title').textContent = plan.name;

  const body = document.getElementById('plan-editor-body');
  body.innerHTML = plan.workoutDays.map(dow => {
    const exercises = (plan.dayTemplates[dow] || []);
    const exRows = exercises.length === 0
      ? `<div class="empty-state" style="padding:12px 0 4px"><div class="empty-label">No exercises set.</div></div>`
      : exercises.map(ex => `
            <div class="plan-day-ex-row">
              <div class="plan-day-ex-name">${escHtml(ex.name)}</div>
              <div class="plan-day-ex-meta">${ex.sets.length} set${ex.sets.length !== 1 ? 's' : ''}</div>
            </div>`).join('');

    return `
      <div class="plan-day-card">
        <div class="plan-day-card-header">
          <span class="plan-day-card-title">${DOW_NAMES[dow]}</span>
          <button class="btn btn-primary btn-sm" onclick="openPlanDayMuscles(${dow})">Configure Day</button>
        </div>
        <div class="plan-day-card-body">${exRows}</div>
      </div>`;
  }).join('');
}

window.planTemplateAddEx = function(dow) {
  state.editingPlan.dayTemplates[dow] = state.editingPlan.dayTemplates[dow] || [];
  state.editingPlanDow  = dow;
  state.exerciseContext = 'planTemplate';
  state.editingExIndex  = null;
  navigate('exercise');
};

window.planTemplateEditEx = function(dow, ei) {
  state.editingPlanDow  = dow;
  state.exerciseContext = 'planTemplate';
  state.editingExIndex  = ei;
  navigate('exercise');
};

window.planTemplateRemoveEx = function(dow, ei) {
  state.editingPlan.dayTemplates[dow].splice(ei, 1);
  upsertPlan(state.editingPlan);
  renderPlanEditor();
};

// ── Plan Day Muscle Count Flow ────────────────────────────
window.openPlanDayMuscles = function(dow) {
  state.editingPlanDow = dow;
  // Derive current counts from existing exercises in this day's template
  const existing = state.editingPlan.dayTemplates[dow] || [];
  const counts = {};
  for (const ex of existing) {
    const g = ex.muscleGroup || getMuscleGroup(ex.name) || 'Other';
    counts[g] = (counts[g] || 0) + 1;
  }
  state.editingPlanMuscleCounts = counts;
  navigate('plan-day-muscles');
};

function renderPlanDayMuscles() {
  const plan = state.editingPlan;
  if (!plan) return;
  const dow = state.editingPlanDow;
  document.getElementById('plan-day-muscles-title').textContent = DOW_NAMES[dow];

  const template = plan.dayTemplates[dow] || [];
  const counts = state.editingPlanMuscleCounts;

  const rows = Object.keys(MUSCLE_MAP).map(group => {
    const count = counts[group] || 0;
    const selected = template.filter(e => (e.muscleGroup || getMuscleGroup(e.name)) === group).length;
    const done = selected === count && count > 0;
    const metaColor = done ? 'var(--green)' : 'var(--accent)';

    const drillBtn = count > 0 ? `
      <button class="muscle-drill-btn" onclick="openMuscleGroupPicker('${group}')">
        ${selected}/${count} chosen — Select exercises ›
      </button>` : '';

    return `
      <div class="muscle-count-row">
        <div class="muscle-count-label-wrap">
          <div class="muscle-count-label">${group}</div>
          <div style="color:${metaColor}">${drillBtn}</div>
        </div>
        <div class="muscle-count-stepper">
          <button class="stepper-btn" onclick="adjustMuscleCount('${group}',-1)">−</button>
          <span class="stepper-val">${count}</span>
          <button class="stepper-btn" onclick="adjustMuscleCount('${group}',1)">+</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('plan-day-muscles-body').innerHTML = rows;
}

window.adjustMuscleCount = function(group, delta) {
  const current = state.editingPlanMuscleCounts[group] || 0;
  const newCount = Math.max(0, current + delta);
  state.editingPlanMuscleCounts[group] = newCount;

  // If count decreased, trim excess exercises from that group
  const dow = state.editingPlanDow;
  if (!state.editingPlan.dayTemplates[dow]) state.editingPlan.dayTemplates[dow] = [];
  const exercises = state.editingPlan.dayTemplates[dow];
  const groupExercises = exercises.filter(e => (e.muscleGroup || getMuscleGroup(e.name)) === group);
  if (groupExercises.length > newCount) {
    const toRemove = groupExercises.length - newCount;
    for (let i = 0; i < toRemove; i++) {
      // Find the last occurrence of this group and remove it
      for (let j = exercises.length - 1; j >= 0; j--) {
        if ((exercises[j].muscleGroup || getMuscleGroup(exercises[j].name)) === group) {
          exercises.splice(j, 1);
          break;
        }
      }
    }
  }
  renderPlanDayMuscles();
};

window.openMuscleGroupPicker = function(group) {
  state.editingPlanMuscleGroup = group;
  navigate('plan-muscle-picker');
};

function renderMuscleGroupPicker() {
  const group = state.editingPlanMuscleGroup;
  const dow = state.editingPlanDow;
  const limit = state.editingPlanMuscleCounts[group] || 0;
  const template = state.editingPlan.dayTemplates[dow] || [];
  // Selected exercises for this group, in their current order
  const selectedExs = template.filter(e => (e.muscleGroup || getMuscleGroup(e.name)) === group);
  const selectedNames = selectedExs.map(e => e.name);
  const selectedCount = selectedExs.length;
  const atLimit = selectedCount >= limit;

  document.getElementById('plan-muscle-picker-title').textContent = group;
  const subtitleEl = document.getElementById('plan-muscle-picker-subtitle');
  subtitleEl.textContent = `${selectedCount} of ${limit} selected`;
  subtitleEl.style.color = selectedCount === limit ? 'var(--green)' : 'var(--text2)';

  // ── Selected section (reorderable) ──
  const checkSvg = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg>`;
  const selectedRows = selectedExs.map((ex, i) => {
    const isFirst = i === 0;
    const isLast  = i === selectedExs.length - 1;
    return `
      <div class="ex-pick-row selected">
        <div class="ex-pick-check">${checkSvg}</div>
        <div class="ex-pick-name">${escHtml(ex.name)}</div>
        <div class="ex-pick-reorder" onclick="event.stopPropagation()">
          <button class="reorder-btn${isFirst ? ' disabled' : ''}" onclick="reorderMuscleExercise('${escHtml(ex.name)}','up')" ${isFirst ? 'disabled' : ''}>▲</button>
          <button class="reorder-btn${isLast ? ' disabled' : ''}" onclick="reorderMuscleExercise('${escHtml(ex.name)}','down')" ${isLast ? 'disabled' : ''}>▼</button>
        </div>
        <div class="ex-pick-sets" onclick="event.stopPropagation()">
          <span class="ex-pick-sets-label">Sets</span>
          <button class="stepper-btn" style="width:26px;height:26px;font-size:15px" onclick="adjustExSetCount('${escHtml(ex.name)}',-1)">−</button>
          <span class="stepper-val" style="font-size:14px;min-width:18px">${ex.sets.length}</span>
          <button class="stepper-btn" style="width:26px;height:26px;font-size:15px" onclick="adjustExSetCount('${escHtml(ex.name)}',1)">+</button>
        </div>
        <button class="ex-pick-remove" onclick="toggleMuscleExercise('${escHtml(ex.name)}')" title="Remove">×</button>
      </div>`;
  }).join('');

  // ── Custom exercise input ──
  const customInput = !atLimit ? `
    <div class="custom-ex-row">
      <input type="text" id="custom-ex-input" class="input" placeholder="Custom exercise name…" autocomplete="off" style="flex:1;height:38px;font-size:13px" />
      <button class="btn btn-primary btn-sm" onclick="addCustomMuscleExercise()">+ Add</button>
    </div>` : '';

  // ── Available exercises ──
  const available = (MUSCLE_MAP[group] || []).filter(n => !selectedNames.includes(n));
  const availableRows = available.map(name => `
    <div class="ex-pick-row${atLimit ? ' at-limit' : ''}" onclick="${atLimit ? '' : `toggleMuscleExercise('${escHtml(name)}')`}">
      <div class="ex-pick-check"></div>
      <div class="ex-pick-name">${escHtml(name)}</div>
    </div>`).join('');

  const selectedSection = selectedRows
    ? `<div class="picker-section-label">Selected</div>${selectedRows}<div class="picker-section-divider"></div>`
    : '';
  const availableSection = `<div class="picker-section-label">Available</div>${availableRows || '<div class="empty-state" style="padding:12px 0"><div class="empty-label">All exercises selected.</div></div>'}`;

  document.getElementById('plan-muscle-picker-body').innerHTML =
    `${selectedSection}${customInput}${availableSection}`;
}

window.toggleMuscleExercise = function(name) {
  const dow = state.editingPlanDow;
  const group = state.editingPlanMuscleGroup;
  const limit = state.editingPlanMuscleCounts[group] || 0;
  if (!state.editingPlan.dayTemplates[dow]) state.editingPlan.dayTemplates[dow] = [];
  const exercises = state.editingPlan.dayTemplates[dow];
  const idx = exercises.findIndex(e => e.name === name && (e.muscleGroup || getMuscleGroup(e.name)) === group);
  if (idx >= 0) {
    exercises.splice(idx, 1);
  } else {
    const selected = exercises.filter(e => (e.muscleGroup || getMuscleGroup(e.name)) === group).length;
    if (selected >= limit) return; // at limit, ignore
    exercises.push({
      name,
      muscleGroup: group,
      sets: Array.from({ length: 3 }, () => ({ weight: 0, reps: 0 })),
    });
  }
  renderMuscleGroupPicker();
};

window.adjustExSetCount = function(name, delta) {
  const dow = state.editingPlanDow;
  const exercises = state.editingPlan.dayTemplates[dow] || [];
  const ex = exercises.find(e => e.name === name);
  if (!ex) return;
  if (delta > 0) {
    ex.sets.push({ weight: 0, reps: 0 });
  } else if (ex.sets.length > 1) {
    ex.sets.pop();
  }
  renderMuscleGroupPicker();
};

window.reorderMuscleExercise = function(name, direction) {
  const dow = state.editingPlanDow;
  const group = state.editingPlanMuscleGroup;
  const exercises = state.editingPlan.dayTemplates[dow] || [];
  // Find all indices of exercises in this group
  const groupIndices = exercises
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (e.muscleGroup || getMuscleGroup(e.name)) === group)
    .map(({ i }) => i);
  const posInGroup = groupIndices.findIndex(i => exercises[i].name === name);
  if (posInGroup < 0) return;

  if (direction === 'up' && posInGroup > 0) {
    const a = groupIndices[posInGroup];
    const b = groupIndices[posInGroup - 1];
    [exercises[a], exercises[b]] = [exercises[b], exercises[a]];
  } else if (direction === 'down' && posInGroup < groupIndices.length - 1) {
    const a = groupIndices[posInGroup];
    const b = groupIndices[posInGroup + 1];
    [exercises[a], exercises[b]] = [exercises[b], exercises[a]];
  }
  renderMuscleGroupPicker();
};

window.addCustomMuscleExercise = function() {
  const input = document.getElementById('custom-ex-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  const dow = state.editingPlanDow;
  const group = state.editingPlanMuscleGroup;
  const limit = state.editingPlanMuscleCounts[group] || 0;
  if (!state.editingPlan.dayTemplates[dow]) state.editingPlan.dayTemplates[dow] = [];
  const exercises = state.editingPlan.dayTemplates[dow];
  const selected = exercises.filter(e => (e.muscleGroup || getMuscleGroup(e.name)) === group).length;
  if (selected >= limit) return;
  // Don't add duplicates
  if (exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) return;
  exercises.push({
    name,
    muscleGroup: group,
    sets: Array.from({ length: 3 }, () => ({ weight: 0, reps: 0 })),
  });
  input.value = '';
  renderMuscleGroupPicker();
};

window.savePlanDay = function() {
  upsertPlan(state.editingPlan);
  navigate('plan-editor');
};

// ── Plan ──────────────────────────────────────────────────
function renderPlan() {
  // Reset form
  document.getElementById('plan-name').value  = '';
  document.getElementById('plan-start').value = '';
  document.getElementById('plan-end').value   = '';
  document.getElementById('plan-rir-toggle').checked = false;
  document.getElementById('plan-rir-options').style.display = 'none';
  document.getElementById('plan-mesocycle-length').value = '4';
  state.planDays = new Set();
  document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));

  // Render saved plans
  const plans = loadPlans();
  const list  = document.getElementById('plan-list');
  const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  if (plans.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-label">No plans yet.</div><p>Fill in the form above and tap Save Plan.</p></div>`;
    return;
  }

  const activePlanId = loadActivePlanId();
  list.innerHTML = plans.map(p => {
    const isActive = p.id === activePlanId;
    const pips = DOW_LABELS.map((lbl, i) => `
      <div class="plan-day-pip ${p.workoutDays.includes(i) ? 'on' : 'off'}">${lbl}</div>
    `).join('');
    const activeBtn = isActive
      ? `<span class="plan-active-badge">● Active</span>`
      : `<button class="btn btn-secondary btn-sm" onclick="setActivePlan('${p.id}')">Set Active</button>`;
    return `
      <div class="plan-card${isActive ? ' plan-card-active' : ''}">
        <div class="plan-card-name">${escHtml(p.name)}${p.rir ? '<span class="rir-badge">RIR</span>' : ''}</div>
        <div class="plan-card-meta">${formatDate(p.start)} — ${formatDate(p.end)}</div>
        <div class="plan-card-days">${pips}</div>
        <div class="plan-card-actions">
          ${activeBtn}
          <button class="btn btn-primary btn-sm" onclick="openPlanEditor('${p.id}')">Edit Days</button>
          <button class="btn btn-secondary btn-sm" onclick="loadPlanIntoForm('${p.id}')">Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="copyPlan('${p.id}')">Copy</button>
          <button class="btn btn-danger" onclick="confirmDeletePlan('${p.id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function setPlanError(msg) {
  let el = document.getElementById('plan-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'plan-error';
    el.style.cssText = 'color:var(--red);font-size:13px;font-weight:600;margin-top:-10px';
    document.getElementById('btn-save-plan').before(el);
  }
  el.textContent = msg;
}

function savePlan() {
  const name  = document.getElementById('plan-name').value.trim();
  const start = document.getElementById('plan-start').value;
  const end   = document.getElementById('plan-end').value;

  if (!name)               { setPlanError('Enter a plan name.'); document.getElementById('plan-name').focus(); return; }
  if (!start)              { setPlanError('Set a start date.'); return; }
  if (!end)                { setPlanError('Set an end date.'); return; }
  if (end < start)         { setPlanError('End date must be after start date.'); return; }
  if (state.planDays.size === 0) { setPlanError('Select at least one workout day.'); return; }

  const editId = document.getElementById('plan-name').dataset.editId;
  // Preserve existing dayTemplates if editing
  const existing = editId ? loadPlans().find(p => p.id === editId) : null;
  const plan = {
    id: editId || uid(),
    name,
    start,
    end,
    workoutDays: [...state.planDays].sort(),
    dayTemplates: existing ? (existing.dayTemplates || {}) : {},
    rir: document.getElementById('plan-rir-toggle').checked,
    mesocycleLength: parseInt(document.getElementById('plan-mesocycle-length').value, 10),
  };
  delete document.getElementById('plan-name').dataset.editId;
  const errEl = document.getElementById('plan-error');
  if (errEl) errEl.remove();
  upsertPlan(plan);
  renderPlan();
}

window.loadPlanIntoForm = function(id) {
  const plan = loadPlans().find(p => p.id === id);
  if (!plan) return;
  document.getElementById('plan-name').value  = plan.name;
  document.getElementById('plan-name').dataset.editId = plan.id;
  document.getElementById('plan-start').value = plan.start;
  document.getElementById('plan-end').value   = plan.end;
  document.getElementById('plan-rir-toggle').checked = !!plan.rir;
  document.getElementById('plan-rir-options').style.display = plan.rir ? '' : 'none';
  document.getElementById('plan-mesocycle-length').value = plan.mesocycleLength || 4;
  state.planDays = new Set(plan.workoutDays);
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('active', state.planDays.has(Number(btn.dataset.dow)));
  });
  window.scrollTo(0, 0);
};

window.setActivePlan = function(id) {
  saveActivePlanId(id);
  renderPlan();
};

window.confirmDeletePlan = function(id) {
  if (confirm('Delete this plan?')) {
    deletePlan(id);
    if (loadActivePlanId() === id) saveActivePlanId(null);
    renderPlan();
  }
};

window.copyPlan = function(id) {
  const plan = loadPlans().find(p => p.id === id);
  if (!plan) return;
  const dur = new Date(plan.end) - new Date(plan.start);
  const todayStr = todayISO();
  const endStr = new Date(new Date(todayStr).getTime() + dur).toISOString().slice(0, 10);
  upsertPlan({
    id: uid(),
    name: plan.name + ' (Copy)',
    start: todayStr,
    end: endStr,
    workoutDays: [...plan.workoutDays],
    dayTemplates: JSON.parse(JSON.stringify(plan.dayTemplates || {})),
    rir: plan.rir,
    mesocycleLength: plan.mesocycleLength,
  });
  renderPlan();
};

// ── History ───────────────────────────────────────────────
function renderHistory() {
  const container = document.getElementById('history-list');
  const workouts  = loadWorkouts();

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-label">No history yet.</div>
        <p>Completed workouts will appear here.</p>
      </div>`;
    return;
  }
  container.innerHTML = workouts.map(w => historyCardHTML(w)).join('');
}

function historyCardHTML(w) {
  const exCount  = w.exercises.length;
  const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  const exerciseRows = w.exercises.map(ex => {
    const setRows = ex.sets.map((s, i) => setRowHTML(s, i)).join('');
    return `
      <div class="exercise-row">
        <div class="exercise-row-name">${escHtml(ex.name)}</div>
        <table class="sets-table">
          <thead><tr><th></th><th>Reps</th><th>Weight</th></tr></thead>
          <tbody>${setRows}</tbody>
        </table>
      </div>`;
  }).join('');

  return `
    <div class="workout-card" data-id="${w.id}" onclick="toggleCard(this)">
      <div class="workout-card-header">
        <div class="workout-card-name">${escHtml(w.name)}</div>
        <div class="workout-card-right">
          <div class="workout-card-date">${formatDate(w.date)}</div>
          <div class="workout-card-chevron">▾</div>
        </div>
      </div>
      <div class="workout-card-meta">
        <span class="meta-pill">${exCount} exercise${exCount !== 1 ? 's' : ''}</span>
        <span class="meta-pill">${setCount} set${setCount !== 1 ? 's' : ''}</span>
      </div>
      <div class="workout-card-exercises">
        ${exerciseRows}
        <div class="history-card-footer">
          <button class="btn btn-ghost btn-sm" onclick="copyWorkoutToDay('${w.id}',event)">Copy to Day</button>
          <button class="btn btn-danger" onclick="confirmDelete('${w.id}',event)">Delete</button>
        </div>
      </div>
    </div>`;
}

window.confirmDelete = function(id, event) {
  event.stopPropagation();
  if (confirm('Delete this workout? This cannot be undone.')) {
    deleteWorkout(id);
    renderHistory();
  }
};

window.copyWorkoutToDay = function(id, event) {
  event.stopPropagation();
  const source = loadWorkouts().find(w => w.id === id);
  if (!source) return;
  const dateStr = prompt('Copy to date (YYYY-MM-DD):', todayISO());
  if (!dateStr) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { alert('Use format YYYY-MM-DD (e.g. 2026-04-10)'); return; }

  const workouts = loadWorkouts();
  const existing = workouts.find(w => w.date === dateStr);
  const exercises = JSON.parse(JSON.stringify(source.exercises));

  if (existing) {
    if (!confirm(`A workout exists on ${formatDate(dateStr)}. Replace its exercises?`)) return;
    updateWorkout({ ...existing, exercises });
  } else {
    addWorkout({ id: uid(), date: dateStr, name: source.name, exercises });
  }
  // Navigate to that day so user can see/edit the copy
  selectDay(dateStr);
};

// ── Theme Toggle ─────────────────────────────────────────
function updateThemeBtn() {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;
  const isLight = document.body.classList.contains('light');
  // Show moon when dark (tap to go light), sun when light (tap to go dark)
  btn.innerHTML = isLight
    ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
}

window.toggleRirGuide = function() {
  const body   = document.getElementById('rir-guide-body');
  const toggle = document.getElementById('rir-guide-toggle');
  const open   = body.hasAttribute('hidden');
  body.toggleAttribute('hidden', !open);
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  toggle.classList.toggle('open', open);
};

window.toggleTheme = function() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('wt_theme', isLight ? 'light' : 'dark');
  document.querySelector('meta[name="theme-color"]')
    .setAttribute('content', isLight ? '#f2f2f8' : '#0c0c10');
  updateThemeBtn();
};

// ── Service Worker ────────────────────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ── Event Listeners ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  updateThemeBtn();

  // Splash screen — show once on first visit; re-openable via info icon
  const splash = document.getElementById('splash');
  if (localStorage.getItem('wt_seen')) {
    splash.classList.add('hidden');
  }
  document.getElementById('btn-splash-dismiss').addEventListener('click', () => {
    localStorage.setItem('wt_seen', '1');
    splash.classList.add('hidden');
    splash.style.display = '';
    document.body.classList.add('seen');
  });

  window.showSplash = function() {
    splash.classList.remove('hidden');
    splash.style.display = 'flex';
  };

  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // Home
  document.getElementById('btn-start-workout').addEventListener('click', startWorkout);
  document.getElementById('btn-go-plan').addEventListener('click', () => navigate('plan'));

  // Active workout
  document.getElementById('btn-workout-back').addEventListener('click', () => {
    if (confirm('Discard this workout?')) {
      state.activeWorkout = null;
      navigate('home');
    }
  });
  document.getElementById('btn-add-exercise').addEventListener('click', () => {
    state.exerciseContext = 'workout';
    state.editingExIndex  = null;
    navigate('exercise');
  });
  document.getElementById('btn-finish-workout').addEventListener('click', finishWorkout);
  document.getElementById('workout-name').addEventListener('input', syncWorkoutFields);
  document.getElementById('workout-date').addEventListener('change', syncWorkoutFields);

  // Day view
  document.getElementById('btn-day-back').addEventListener('click', () => navigate('calendar'));
  document.getElementById('btn-day-add-exercise').addEventListener('click', () => {
    state.exerciseContext = 'day';
    state.editingExIndex  = null;
    navigate('exercise');
  });
  document.getElementById('btn-day-finish-workout').addEventListener('click', () => {
    const w = state.dayWorkout;
    if (!w) return;
    persistDay();
    state.dayWorkout = null;
    navigate('calendar');
  });

  // Exercise form
  document.getElementById('btn-exercise-back').addEventListener('click', () => {
    state.editingExIndex = null;
    const dest = state.exerciseContext === 'planTemplate' ? 'plan-editor' : state.exerciseContext;
    navigate(dest);
  });
  document.getElementById('btn-add-set').addEventListener('click', addFormSet);
  document.getElementById('btn-save-exercise').addEventListener('click', saveExercise);

  // Calendar month navigation
  document.getElementById('cal-prev').addEventListener('click', () => {
    const c = state.calendar;
    if (c.month === 0) { c.year--; c.month = 11; }
    else               { c.month--; }
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    const c = state.calendar;
    if (c.month === 11) { c.year++; c.month = 0; }
    else                { c.month++; }
    renderCalendar();
  });

  // Plan
  document.getElementById('btn-plan-back').addEventListener('click', () => navigate('home'));

  // Plan editor
  document.getElementById('btn-plan-editor-back').addEventListener('click', () => navigate('plan'));

  // Plan day muscle count + picker
  document.getElementById('btn-plan-day-muscles-back').addEventListener('click', () => navigate('plan-editor'));
  document.getElementById('btn-plan-day-muscles-done').addEventListener('click', savePlanDay);
  document.getElementById('btn-plan-muscle-picker-back').addEventListener('click', () => navigate('plan-day-muscles'));

  // Plan — day toggles + save
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dow = Number(btn.dataset.dow);
      if (state.planDays.has(dow)) { state.planDays.delete(dow); btn.classList.remove('active'); }
      else                         { state.planDays.add(dow);    btn.classList.add('active'); }
    });
  });
  document.getElementById('btn-save-plan').addEventListener('click', savePlan);
  document.getElementById('plan-rir-toggle').addEventListener('change', e => {
    document.getElementById('plan-rir-options').style.display = e.target.checked ? '' : 'none';
  });

  navigate('home');
});
