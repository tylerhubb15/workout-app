import { loadWorkouts, addWorkout, updateWorkout, deleteWorkout } from './storage.js';

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

  // Hide bottom nav on sub-views
  const hideNav = view === 'exercise' || view === 'workout' || view === 'day';
  document.getElementById('bottom-nav').style.display = hideNav ? 'none' : '';

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'home')     renderHome();
  if (view === 'workout')  renderWorkout();
  if (view === 'day')      renderDay();
  if (view === 'calendar') renderCalendar();
  if (view === 'history')  renderHistory();
  if (view === 'exercise') renderExerciseForm();

  window.scrollTo(0, 0);
}

// ── Home ──────────────────────────────────────────────────
function renderHome() {
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  renderStats();

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

function renderStats() {
  const workouts = loadWorkouts();
  const totalEx  = workouts.reduce((n, w) => n + w.exercises.length, 0);
  const totalSets = workouts.reduce((n, w) =>
    n + w.exercises.reduce((m, ex) => m + ex.sets.length, 0), 0);
  document.getElementById('stat-total').textContent     = workouts.length;
  document.getElementById('stat-exercises').textContent = totalEx;
  document.getElementById('stat-sets').textContent      = totalSets;
}

function workoutCardHTML(w) {
  const exCount  = w.exercises.length;
  const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  const exerciseRows = w.exercises.map(ex => {
    const setRows = ex.sets.map((s, i) => `
      <tr>
        <td class="set-num">${i + 1}</td>
        <td>${s.reps} reps</td>
        <td>${s.weight ? s.weight + ' lbs' : '—'}</td>
      </tr>`).join('');
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
  // Deep copy so edits don't mutate the stored version until explicitly saved
  state.dayWorkout = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), date: iso, name: '', exercises: [] };
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
// Used by both the active workout view and the day view
function exerciseCardHTML(ex, ei, ctx) {
  const setRows = ex.sets.map((s, si) => `
    <tr>
      <td class="set-num-cell">${si + 1}</td>
      <td><input class="set-input" type="number" min="0" inputmode="numeric"
           value="${s.reps || ''}" placeholder="0"
           onchange="handleSetChange('${ctx}',${ei},${si},'reps',this.value)" /></td>
      <td><input class="set-input" type="number" min="0" step="2.5" inputmode="decimal"
           value="${s.weight || ''}" placeholder="0"
           onchange="handleSetChange('${ctx}',${ei},${si},'weight',this.value)" /></td>
      <td><button class="btn-remove-set" onclick="handleRemoveSet('${ctx}',${ei},${si})">×</button></td>
    </tr>`).join('');

  return `
    <div class="active-exercise-card">
      <div class="active-exercise-header">
        <div class="active-exercise-name">${escHtml(ex.name)}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="handleEditExercise('${ctx}',${ei})">Edit</button>
          <button class="btn btn-icon btn-secondary" onclick="handleRemoveExercise('${ctx}',${ei})" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>
      <table class="sets-editor">
        <thead><tr><th>Set</th><th>Reps</th><th>Weight (lbs)</th><th></th></tr></thead>
        <tbody>${setRows}</tbody>
      </table>
      <button class="btn btn-ghost btn-sm mt-8" onclick="handleAddSet('${ctx}',${ei})">+ Add Set</button>
    </div>`;
}

function workoutFor(ctx) {
  return ctx === 'day' ? state.dayWorkout : state.activeWorkout;
}

function rerenderFor(ctx) {
  if (ctx === 'day') { persistDay(); renderDay(); }
  else               { renderWorkout(); }
}

window.handleSetChange = function(ctx, ei, si, field, val) {
  workoutFor(ctx).exercises[ei].sets[si][field] = parseFloat(val) || 0;
  if (ctx === 'day') persistDay();
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
  renderSetRows();
}

function renderSetRows() {
  document.getElementById('sets-form-body').innerHTML = state.formSets.map((s, i) => `
    <tr>
      <td class="set-num-cell">${i + 1}</td>
      <td><input class="set-input" type="number" min="0" inputmode="numeric"
           value="${s.reps || ''}" placeholder="0"
           onchange="formSetChange(${i},'reps',this.value)" /></td>
      <td><input class="set-input" type="number" min="0" step="2.5" inputmode="decimal"
           value="${s.weight || ''}" placeholder="0"
           onchange="formSetChange(${i},'weight',this.value)" /></td>
      <td><button class="btn-remove-set" onclick="formRemoveSet(${i})">×</button></td>
    </tr>`).join('');
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
  document.querySelectorAll('#sets-form-body input').forEach(input => {
    const row   = input.closest('tr');
    const idx   = [...row.parentElement.children].indexOf(row);
    const field = input.step === '2.5' ? 'weight' : 'reps';
    state.formSets[idx][field] = parseFloat(input.value) || 0;
  });

  const exercise = { name, sets: state.formSets.filter(s => s.reps > 0 || s.weight > 0) };
  if (exercise.sets.length === 0) exercise.sets = [{ reps: 0, weight: 0 }];

  const target = workoutFor(state.exerciseContext);
  if (state.editingExIndex !== null) target.exercises[state.editingExIndex] = exercise;
  else                               target.exercises.push(exercise);

  if (state.exerciseContext === 'day') persistDay();

  state.editingExIndex = null;
  navigate(state.exerciseContext);
}

// ── Calendar ──────────────────────────────────────────────
function renderCalendar() {
  const { year, month } = state.calendar;
  const today    = todayISO();
  const workoutDates = new Set(loadWorkouts().map(w => w.date));

  document.getElementById('cal-month-label').textContent =
    new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const DOW         = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = DOW.map(d => `<div class="cal-header-cell">${d}</div>`).join('');
  for (let i = 0; i < firstDow; i++) html += `<div class="cal-day cal-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday   = iso === today;
    const hasLog    = workoutDates.has(iso);

    const cls = ['cal-day', isToday ? 'today' : ''].filter(Boolean).join(' ');
    const dot = hasLog ? `<span class="dot dot-workout"></span>` : '';

    html += `
      <div class="${cls}" onclick="selectDay('${iso}')">
        <span class="cal-day-num">${d}</span>
        ${dot}
      </div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
}

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
    const setRows = ex.sets.map((s, i) => `
      <tr>
        <td class="set-num">${i + 1}</td>
        <td>${s.reps} reps</td>
        <td>${s.weight ? s.weight + ' lbs' : '—'}</td>
      </tr>`).join('');
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
          <button class="btn btn-danger" onclick="confirmDelete('${w.id}',event)">Delete Workout</button>
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

// ── Service Worker ────────────────────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ── Event Listeners ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();

  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // Home
  document.getElementById('btn-start-workout').addEventListener('click', startWorkout);

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

  // Exercise form
  document.getElementById('btn-exercise-back').addEventListener('click', () => {
    state.editingExIndex = null;
    navigate(state.exerciseContext);
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

  navigate('home');
});
