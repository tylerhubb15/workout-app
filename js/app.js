import { loadWorkouts, addWorkout, deleteWorkout, loadPlans, savePlan, deletePlan } from './storage.js';

// ── State ─────────────────────────────────────────────────
const state = {
  view: 'home',
  activeWorkout: null,
  editingExIndex: null,
  formSets: [],
  calendar: {
    year:  new Date().getFullYear(),
    month: new Date().getMonth(),
    selectedDay: new Date().toISOString().slice(0, 10),
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
    month: 'short', day: 'numeric', year: 'numeric'
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

  const nav = document.getElementById('bottom-nav');
  nav.style.display = (view === 'exercise') ? 'none' : '';

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'home')     renderHome();
  if (view === 'workout')  renderWorkout();
  if (view === 'history')  renderHistory();
  if (view === 'calendar') renderCalendar();
  if (view === 'exercise') renderExerciseForm();

  window.scrollTo(0, 0);
}

// ── Home ──────────────────────────────────────────────────
function renderHome() {
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  renderStats();

  const container = document.getElementById('home-workout-list');
  const workouts  = loadWorkouts().slice(0, 5);

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <p>No workouts yet.<br>Tap <strong>Start Workout</strong> to log your first session.</p>
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

window.toggleCard = function(el) {
  el.classList.toggle('expanded');
};

// ── Active Workout ────────────────────────────────────────
function startWorkout(prefillName = '', prefillDate = '') {
  state.activeWorkout = {
    id: uid(),
    name: prefillName,
    date: prefillDate || todayISO(),
    exercises: [],
  };
  navigate('workout');
}

function renderWorkout() {
  const w = state.activeWorkout;
  if (!w) return;

  document.getElementById('workout-name').value = w.name;
  document.getElementById('workout-date').value = w.date;

  const container = document.getElementById('active-exercises');

  if (w.exercises.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <div class="empty-icon" style="font-size:32px">➕</div>
        <p>Tap <strong>Add Exercise</strong> below.</p>
      </div>`;
    return;
  }

  container.innerHTML = w.exercises.map((ex, ei) => activeExerciseCardHTML(ex, ei)).join('');
}

function activeExerciseCardHTML(ex, ei) {
  const setRows = ex.sets.map((s, si) => `
    <tr>
      <td class="set-num-cell">${si + 1}</td>
      <td><input class="set-input" type="number" min="0" inputmode="numeric"
           value="${s.reps || ''}" placeholder="0"
           onchange="updateSet(${ei},${si},'reps',this.value)" /></td>
      <td><input class="set-input" type="number" min="0" step="2.5" inputmode="decimal"
           value="${s.weight || ''}" placeholder="0"
           onchange="updateSet(${ei},${si},'weight',this.value)" /></td>
      <td><button class="btn-remove-set" onclick="removeSet(${ei},${si})">×</button></td>
    </tr>`).join('');

  return `
    <div class="active-exercise-card">
      <div class="active-exercise-header">
        <div class="active-exercise-name">${escHtml(ex.name)}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="editExercise(${ei})">Edit</button>
          <button class="btn btn-icon btn-secondary" onclick="removeExercise(${ei})" title="Delete">🗑</button>
        </div>
      </div>
      <table class="sets-editor">
        <thead><tr><th>Set</th><th>Reps</th><th>Weight (lbs)</th><th></th></tr></thead>
        <tbody>${setRows}</tbody>
      </table>
      <button class="btn btn-ghost btn-sm mt-8" onclick="addSetInline(${ei})">+ Add Set</button>
    </div>`;
}

window.updateSet = function(ei, si, field, val) {
  state.activeWorkout.exercises[ei].sets[si][field] = parseFloat(val) || 0;
};

window.removeSet = function(ei, si) {
  state.activeWorkout.exercises[ei].sets.splice(si, 1);
  renderWorkout();
};

window.addSetInline = function(ei) {
  const last = state.activeWorkout.exercises[ei].sets.slice(-1)[0];
  state.activeWorkout.exercises[ei].sets.push({
    reps: last ? last.reps : 0,
    weight: last ? last.weight : 0,
  });
  renderWorkout();
};

window.editExercise = function(ei) {
  state.editingExIndex = ei;
  navigate('exercise');
};

window.removeExercise = function(ei) {
  state.activeWorkout.exercises.splice(ei, 1);
  renderWorkout();
};

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

// ── Exercise Form ─────────────────────────────────────────
function openExerciseForm() {
  state.editingExIndex = null;
  navigate('exercise');
}

function renderExerciseForm() {
  const editing = state.editingExIndex !== null;
  document.getElementById('exercise-view-title').textContent = editing ? 'Edit Exercise' : 'Add Exercise';

  if (editing) {
    const ex = state.activeWorkout.exercises[state.editingExIndex];
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

  if (state.editingExIndex !== null) {
    state.activeWorkout.exercises[state.editingExIndex] = exercise;
  } else {
    state.activeWorkout.exercises.push(exercise);
  }

  state.editingExIndex = null;
  navigate('workout');
}

// ── History ───────────────────────────────────────────────
function renderHistory() {
  const container = document.getElementById('history-list');
  const workouts  = loadWorkouts();

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Your completed workouts will appear here.</p>
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

// ── Calendar ──────────────────────────────────────────────
function renderCalendar() {
  const { year, month, selectedDay } = state.calendar;
  const today    = todayISO();
  const workouts = loadWorkouts();
  const plans    = loadPlans();

  // Month/year label
  document.getElementById('cal-month-label').textContent =
    new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build set of dates that have logged workouts
  const workoutDates = new Set(workouts.map(w => w.date));

  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = DOW.map(d => `<div class="cal-header-cell">${d}</div>`).join('');

  // Empty cells before first day
  for (let i = 0; i < firstDow; i++) html += `<div class="cal-day cal-empty"></div>`;

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cls = [
      'cal-day',
      iso === today        ? 'today'    : '',
      iso === selectedDay  ? 'selected' : '',
    ].filter(Boolean).join(' ');

    const dots = [
      workoutDates.has(iso) ? `<span class="dot dot-workout"></span>` : '',
      plans[iso]            ? `<span class="dot dot-plan"></span>`    : '',
    ].join('');

    html += `
      <div class="${cls}" onclick="selectDay('${iso}')">
        <span class="cal-day-num">${d}</span>
        ${dots ? `<div class="cal-dots">${dots}</div>` : ''}
      </div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
  renderDayDetail();
}

function renderDayDetail() {
  const { selectedDay } = state.calendar;
  const container = document.getElementById('day-detail');
  if (!selectedDay) { container.innerHTML = ''; return; }

  const today    = todayISO();
  const plans    = loadPlans();
  const plan     = plans[selectedDay];
  const logged   = loadWorkouts().filter(w => w.date === selectedDay);
  const isPast   = selectedDay <= today;

  const [y, m, d] = selectedDay.split('-');
  const dateLabel = new Date(+y, +m - 1, +d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  let html = `<div class="day-detail-date">${dateLabel}</div>`;

  // ── Plan section ──
  if (plan) {
    html += `
      <div class="day-plan-card">
        <div class="day-plan-tag">Planned</div>
        <div class="day-plan-name">${escHtml(plan)}</div>
        <div class="day-plan-actions">
          ${isPast ? `<button class="btn btn-primary btn-sm" onclick="startFromPlan()">Start Workout</button>` : ''}
          <button class="btn btn-danger" onclick="removePlanForDay('${selectedDay}')">Remove</button>
        </div>
      </div>`;
  } else {
    html += `
      <button class="btn btn-secondary btn-sm" onclick="showPlanForm()">+ Plan this day</button>
      <div class="plan-form" id="plan-form" style="display:none">
        <div class="field-label">Workout Name</div>
        <input type="text" id="plan-name-input" placeholder="e.g. Push Day, Cardio..." autocomplete="off" />
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="savePlanForDay('${selectedDay}')">Save Plan</button>
          <button class="btn btn-secondary btn-sm" onclick="hidePlanForm()">Cancel</button>
        </div>
      </div>`;
  }

  // ── Logged workouts ──
  if (logged.length > 0) {
    html += `<div class="day-section-label">Logged</div>`;
    html += logged.map(w => workoutCardHTML(w)).join('');
  }

  // ── Quick-start for today / past days with no log ──
  if (isPast && logged.length === 0 && !plan) {
    html += `
      <button class="btn btn-primary btn-full mt-12"
        onclick="startWorkout('', '${selectedDay}')">
        ${selectedDay === today ? "Start Today's Workout" : "Log Workout for This Day"}
      </button>`;
  }

  container.innerHTML = html;
}

window.selectDay = function(iso) {
  state.calendar.selectedDay = iso;
  renderCalendar();
};

window.showPlanForm = function() {
  document.getElementById('plan-form').style.display = 'flex';
  document.getElementById('plan-name-input').focus();
};

window.hidePlanForm = function() {
  document.getElementById('plan-form').style.display = 'none';
};

window.savePlanForDay = function(date) {
  const name = document.getElementById('plan-name-input').value.trim();
  if (!name) { document.getElementById('plan-name-input').focus(); return; }
  savePlan(date, name);
  renderCalendar();
};

window.removePlanForDay = function(date) {
  deletePlan(date);
  renderCalendar();
};

window.startFromPlan = function() {
  const { selectedDay } = state.calendar;
  const plan = loadPlans()[selectedDay];
  startWorkout(plan || '', selectedDay);
};

// ── Service Worker ────────────────────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

// ── Event Listeners ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  document.getElementById('btn-start-workout').addEventListener('click', startWorkout);

  document.getElementById('btn-workout-back').addEventListener('click', () => {
    if (confirm('Discard this workout?')) {
      state.activeWorkout = null;
      navigate('home');
    }
  });
  document.getElementById('btn-add-exercise').addEventListener('click', openExerciseForm);
  document.getElementById('btn-finish-workout').addEventListener('click', finishWorkout);
  document.getElementById('workout-name').addEventListener('input', syncWorkoutFields);
  document.getElementById('workout-date').addEventListener('change', syncWorkoutFields);

  document.getElementById('btn-exercise-back').addEventListener('click', () => {
    state.editingExIndex = null;
    navigate('workout');
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
