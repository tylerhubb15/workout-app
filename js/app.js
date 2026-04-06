import { loadWorkouts, addWorkout, updateWorkout, deleteWorkout, loadPlans, upsertPlan, deletePlan } from './storage.js';

// ── Exercise Library ──────────────────────────────────────
const EXERCISES = {
  'Dumbbell': [
    'Dumbbell Bench Press', 'Dumbbell Incline Press', 'Chest Fly',
    'Dumbbell Row', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly',
    'Bicep Curl', 'Hammer Curl', 'Concentration Curl', 'Tricep Kickback', 'Overhead Tricep Extension',
    'Romanian Deadlift', 'Goblet Squat', 'Lunges', 'Step-Up', 'Calf Raise',
  ],
  'Barbell': [
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
    'Deadlift', 'Squat', 'Overhead Press', 'Barbell Row', 'Romanian Deadlift',
    'Hip Thrust', 'Skull Crusher', 'Preacher Curl',
  ],
  'Bodyweight': [
    'Dip', 'Pull-Up', 'Chin-Up', 'Push-Up', 'Pike Push-Up', 'Diamond Push-Up',
    'Plank', 'Crunch', 'Leg Raise', 'Russian Twist', 'Glute Bridge', 'Burpee',
  ],
  'Cable': [
    'Cable Fly', 'Lat Pulldown', 'Seated Cable Row', 'Tricep Pushdown',
    'Face Pull', 'Cable Curl', 'Cable Crunch', 'Cable Lateral Raise', 'T-Bar Row',
  ],
  'Machine': [
    'Leg Press', 'Leg Curl', 'Leg Extension', 'Chest Press Machine',
    'Pec Deck', 'Hack Squat', 'Seated Calf Raise',
  ],
};

// ── Exercise metadata helpers ─────────────────────────────
const MUSCLE_MAP = {
  'Chest':     ['Bench Press','Incline Bench Press','Decline Bench Press','Dumbbell Bench Press','Dumbbell Incline Press','Chest Fly','Cable Fly','Push-Up','Pike Push-Up','Diamond Push-Up','Pec Deck','Chest Press Machine'],
  'Back':      ['Barbell Row','Dumbbell Row','Lat Pulldown','Seated Cable Row','T-Bar Row','Pull-Up','Chin-Up','Deadlift','Romanian Deadlift'],
  'Shoulders': ['Overhead Press','Dumbbell Shoulder Press','Lateral Raise','Front Raise','Rear Delt Fly','Face Pull','Cable Lateral Raise'],
  'Biceps':    ['Bicep Curl','Hammer Curl','Concentration Curl','Preacher Curl','Cable Curl'],
  'Triceps':   ['Skull Crusher','Tricep Kickback','Overhead Tricep Extension','Tricep Pushdown','Dip'],
  'Legs':      ['Squat','Leg Press','Leg Curl','Leg Extension','Hack Squat','Goblet Squat','Lunges','Step-Up','Calf Raise','Seated Calf Raise','Hip Thrust','Glute Bridge'],
  'Core':      ['Plank','Crunch','Leg Raise','Russian Twist','Cable Crunch','Burpee'],
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
};

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
  if (view === 'plan')         renderPlan();
  if (view === 'plan-editor')  renderPlanEditor();

  window.scrollTo(0, 0);
}

// ── Home ──────────────────────────────────────────────────
function renderHome() {
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  renderStats();
  renderTodayPlan();

  const container = document.getElementById('home-workout-list');
  const workouts  = loadWorkouts().slice(0, 5);

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-label">No sessions logged yet.</div>
        <p>Tap <strong>Start Workout</strong> to begin.</p>
      </div>`;
    return;
  }
  container.innerHTML = workouts.map(w => workoutCardHTML(w)).join('');
}

function renderTodayPlan() {
  const el = document.getElementById('home-today-plan');
  if (!el) return;
  const iso = todayISO();
  const dow = new Date().getDay();

  // Already logged today — don't show anything, Recent Workouts covers it
  const logged = loadWorkouts().find(w => w.date === iso);
  if (logged) { el.innerHTML = ''; return; }

  // Check for a plan covering today
  for (const plan of loadPlans()) {
    if (iso >= plan.start && iso <= plan.end && Array.isArray(plan.workoutDays)) {
      if (plan.workoutDays.includes(dow)) {
        const exList = plan.dayTemplates && plan.dayTemplates[dow] && plan.dayTemplates[dow].length > 0
          ? plan.dayTemplates[dow].map(e => escHtml(e.name)).join(' · ')
          : 'Workout day';
        el.innerHTML = `
          <div class="today-plan-card">
            <div class="today-plan-label">Today — ${escHtml(plan.name)}</div>
            <div class="today-plan-exercises">${exList}</div>
          </div>`;
        return;
      } else if (iso >= plan.start && iso <= plan.end) {
        el.innerHTML = `<div class="today-plan-rest">Rest day · ${escHtml(plan.name)}</div>`;
        return;
      }
    }
  }

  el.innerHTML = ''; // no active plan
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
  return `
    <tr>
      <td class="set-num">${i + 1}</td>
      <td>${repsDisplay} reps</td>
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
  container.innerHTML = w.exercises.map((ex, ei) => exerciseCardHTML(ex, ei, 'workout')).join('');
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

  // If the day has no exercises, check for a plan template and pre-load it
  if (state.dayWorkout.exercises.length === 0) {
    const dow = new Date(iso + 'T00:00:00').getDay();
    for (const plan of loadPlans()) {
      if (iso >= plan.start && iso <= plan.end &&
          plan.workoutDays.includes(dow) &&
          plan.dayTemplates && plan.dayTemplates[dow] && plan.dayTemplates[dow].length > 0) {
        state.dayWorkout.exercises = JSON.parse(JSON.stringify(plan.dayTemplates[dow]));
        if (!state.dayWorkout.name) state.dayWorkout.name = plan.name;
        break;
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
  document.getElementById('day-view-subtitle').textContent =
    w.exercises.length > 0
      ? `${w.exercises.length} exercise${w.exercises.length !== 1 ? 's' : ''}`
      : 'No exercises yet';

  const container = document.getElementById('day-exercises');
  if (w.exercises.length === 0) {
    container.innerHTML = emptyExerciseState();
    return;
  }
  container.innerHTML = w.exercises.map((ex, ei) => exerciseCardHTML(ex, ei, 'day')).join('');
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
function exerciseCardHTML(ex, ei, ctx) {
  const canLog = ctx !== 'planTemplate';
  const muscle = getMuscleGroup(ex.name);
  const equip  = getEquipment(ex.name);

  const setRows = ex.sets.map((s, si) => {
    const done = s.done || false;
    return `
    <tr class="set-row${done ? ' set-row-done' : ''}">
      <td class="set-num-cell">${si + 1}</td>
      <td><input class="set-pill" type="number" min="0" step="2.5" inputmode="decimal"
           value="${s.weight || ''}" placeholder="–"
           onchange="handleSetChange('${ctx}',${ei},${si},'weight',this.value)" /></td>
      <td><input class="set-pill" type="number" min="0" inputmode="numeric"
           value="${s.reps || ''}" placeholder="–"
           onchange="handleSetChange('${ctx}',${ei},${si},'reps',this.value)" /></td>
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
    ? `<div class="ex-muscle-tag ex-muscle-${muscle.toLowerCase()}">${muscle.toUpperCase()}</div>`
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
            <th>Reps</th>
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
  sets.push({ reps: last ? last.reps : 0, weight: last ? last.weight : 0 });
  rerenderFor(ctx);
};

window.handleSetDone = function(ctx, ei, si, checked) {
  workoutFor(ctx).exercises[ei].sets[si].done = checked;
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
  const filterInput = document.getElementById('ex-filter');
  filterInput.value = '';
  renderExChips('');
  filterInput.oninput = () => renderExChips(filterInput.value.trim().toLowerCase());

  renderSetRows();
}

function renderExChips(filter) {
  const builtInAll = Object.values(EXERCISES).flat();
  const used = [...new Set(loadWorkouts().flatMap(w => w.exercises.map(e => e.name)))];
  const custom = used.filter(n => !builtInAll.includes(n));

  const groups = { ...EXERCISES };
  if (custom.length) groups['Custom'] = custom.sort();

  let html = '';
  for (const [group, names] of Object.entries(groups)) {
    const filtered = filter ? names.filter(n => n.toLowerCase().includes(filter)) : names;
    if (!filtered.length) continue;
    html += `<div class="ex-group-label">${group}</div><div class="ex-chips-row">`;
    html += filtered.map(n => `<button class="ex-chip" onclick="selectExChip('${escHtml(n)}')">${escHtml(n)}</button>`).join('');
    html += `</div>`;
  }

  document.getElementById('ex-chips').innerHTML = html;
}

window.selectExChip = function(name) {
  document.getElementById('exercise-name').value = name;
};

function renderSetRows() {
  document.getElementById('sets-form-body').innerHTML = state.formSets.map((s, i) => `
    <div class="set-block">
      <div class="set-block-header">
        <span class="set-block-num">Set ${i + 1}</span>
        <button class="btn-remove-set" onclick="formRemoveSet(${i})">×</button>
      </div>
      <div class="set-block-inputs">
        <div class="set-field">
          <span class="set-field-label">Weight (lbs)</span>
          <input class="set-input" type="number" min="0" step="2.5" inputmode="decimal"
            value="${s.weight || ''}" placeholder="0"
            onchange="formSetChange(${i},'weight',this.value)" />
        </div>
        <div class="set-field">
          <span class="set-field-label">Target Reps</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.reps || ''}" placeholder="0"
            onchange="formSetChange(${i},'reps',this.value)" />
        </div>
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
  document.querySelectorAll('#sets-form-body .set-block').forEach((block, idx) => {
    const [weightInput, repsInput] = block.querySelectorAll('input');
    state.formSets[idx].weight = parseFloat(weightInput.value) || 0;
    state.formSets[idx].reps   = parseFloat(repsInput.value)   || 0;
    // actualReps not present in the plan form — preserve existing value
  });

  const exercise = { name, sets: state.formSets.filter(s => s.reps > 0 || s.weight > 0) };
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
function planDatesSet() {
  const dates = new Set();
  try {
    for (const plan of loadPlans()) {
      if (!plan.start || !plan.end || !Array.isArray(plan.workoutDays)) continue;
      let cur = new Date(plan.start + 'T00:00:00');
      const end = new Date(plan.end + 'T00:00:00');
      while (cur <= end) {
        if (plan.workoutDays.includes(cur.getDay()))
          dates.add(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
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
      : exercises.map((ex, ei) => {
          const setMeta = ex.sets.map(s => `${s.weight}lbs×${s.reps}`).join(', ');
          return `
            <div class="plan-day-ex-row">
              <div>
                <div class="plan-day-ex-name">${escHtml(ex.name)}</div>
                <div class="plan-day-ex-meta">${setMeta || 'No sets'}</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" onclick="planTemplateEditEx(${dow},${ei})">Edit</button>
                <button class="btn btn-icon btn-secondary" onclick="planTemplateRemoveEx(${dow},${ei})">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
              </div>
            </div>`;
        }).join('');

    return `
      <div class="plan-day-card">
        <div class="plan-day-card-header">
          <span class="plan-day-card-title">${DOW_NAMES[dow]}</span>
          <button class="btn btn-secondary btn-sm" onclick="planTemplateAddEx(${dow})">+ Add Exercise</button>
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

// ── Plan ──────────────────────────────────────────────────
function renderPlan() {
  // Reset form
  document.getElementById('plan-name').value  = '';
  document.getElementById('plan-start').value = '';
  document.getElementById('plan-end').value   = '';
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

  list.innerHTML = plans.map(p => {
    const pips = DOW_LABELS.map((lbl, i) => `
      <div class="plan-day-pip ${p.workoutDays.includes(i) ? 'on' : 'off'}">${lbl}</div>
    `).join('');
    return `
      <div class="plan-card">
        <div class="plan-card-name">${escHtml(p.name)}</div>
        <div class="plan-card-meta">${formatDate(p.start)} — ${formatDate(p.end)}</div>
        <div class="plan-card-days">${pips}</div>
        <div class="plan-card-actions">
          <button class="btn btn-primary btn-sm" onclick="openPlanEditor('${p.id}')">Edit Days</button>
          <button class="btn btn-secondary btn-sm" onclick="loadPlanIntoForm('${p.id}')">Edit</button>
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
  state.planDays = new Set(plan.workoutDays);
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('active', state.planDays.has(Number(btn.dataset.dow)));
  });
  window.scrollTo(0, 0);
};

window.confirmDeletePlan = function(id) {
  if (confirm('Delete this plan?')) {
    deletePlan(id);
    renderPlan();
  }
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

// ── Service Worker ────────────────────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ── Event Listeners ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();

  // Splash screen — show once, then never again
  const splash = document.getElementById('splash');
  if (localStorage.getItem('wt_seen')) {
    splash.classList.add('hidden');
  }
  document.getElementById('btn-splash-dismiss').addEventListener('click', () => {
    localStorage.setItem('wt_seen', '1');
    splash.classList.add('hidden');
  });

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
  document.getElementById('btn-day-start-workout').addEventListener('click', () => {
    const w = state.dayWorkout;
    if (!w) return;
    // Move day's planned exercises into the active workout flow
    state.activeWorkout = {
      id: w.id,
      date: w.date,
      name: w.name || '',
      exercises: JSON.parse(JSON.stringify(w.exercises)),
    };
    // Remove the draft so finishing the workout doesn't create a duplicate
    const workouts = loadWorkouts();
    if (workouts.some(x => x.id === w.id)) deleteWorkout(w.id);
    state.dayWorkout = null;
    state.exerciseContext = 'workout';
    navigate('workout');
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

  // Plan — day toggles + save
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dow = Number(btn.dataset.dow);
      if (state.planDays.has(dow)) { state.planDays.delete(dow); btn.classList.remove('active'); }
      else                         { state.planDays.add(dow);    btn.classList.add('active'); }
    });
  });
  document.getElementById('btn-save-plan').addEventListener('click', savePlan);

  navigate('home');
});
