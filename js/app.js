import { loadWorkouts, addWorkout, updateWorkout, deleteWorkout } from './storage.js';

// ── State ─────────────────────────────────────────────────
const state = {
  view: 'home',           // 'home' | 'workout' | 'exercise' | 'history'
  activeWorkout: null,    // workout object being built
  editingExIndex: null,   // index of exercise being edited (null = new)
  formSets: [],           // sets in the exercise form
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

function summaryText(workout) {
  const count = workout.exercises.length;
  const sets  = workout.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  return `${count} exercise${count !== 1 ? 's' : ''} · ${sets} set${sets !== 1 ? 's' : ''}`;
}

// ── Navigation ────────────────────────────────────────────
function navigate(view) {
  state.view = view;

  // show/hide views
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  // show/hide bottom nav (hide on exercise form)
  const nav = document.getElementById('bottom-nav');
  nav.style.display = (view === 'exercise') ? 'none' : '';

  // highlight active nav button
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // render new view
  if (view === 'home')    renderHome();
  if (view === 'workout') renderWorkout();
  if (view === 'history') renderHistory();
  if (view === 'exercise') renderExerciseForm();

  window.scrollTo(0, 0);
}

// ── Home ──────────────────────────────────────────────────
function renderHome() {
  // date display
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

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

function workoutCardHTML(w) {
  const exerciseRows = w.exercises.map(ex => {
    const setRows = ex.sets.map((s, i) =>
      `<tr>
        <td class="set-num">${i + 1}</td>
        <td>${s.reps} reps</td>
        <td>${s.weight ? s.weight + ' lbs' : '—'}</td>
      </tr>`
    ).join('');
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
        <div class="workout-card-date">${formatDate(w.date)}</div>
      </div>
      <div class="workout-card-meta">${summaryText(w)}</div>
      <div class="workout-card-exercises">${exerciseRows}</div>
    </div>`;
}

window.toggleCard = function(el) {
  el.classList.toggle('expanded');
};

// ── Active Workout ────────────────────────────────────────
function startWorkout() {
  state.activeWorkout = {
    id: uid(),
    name: '',
    date: todayISO(),
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
      <div class="empty-state" style="padding: 24px 0;">
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
      <td class="set-num">${si + 1}</td>
      <td><input class="set-input" type="number" min="0" inputmode="numeric"
           value="${s.reps}" placeholder="0"
           onchange="updateSet(${ei}, ${si}, 'reps', this.value)" /></td>
      <td><input class="set-input" type="number" min="0" step="2.5" inputmode="decimal"
           value="${s.weight}" placeholder="0"
           onchange="updateSet(${ei}, ${si}, 'weight', this.value)" /></td>
      <td><button class="btn-remove-set" onclick="removeSet(${ei}, ${si})">×</button></td>
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
        <thead>
          <tr><th>Set</th><th>Reps</th><th>Weight (lbs)</th><th></th></tr>
        </thead>
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
  const lastSet = state.activeWorkout.exercises[ei].sets.slice(-1)[0];
  state.activeWorkout.exercises[ei].sets.push({
    reps: lastSet ? lastSet.reps : 0,
    weight: lastSet ? lastSet.weight : 0,
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
  const tbody = document.getElementById('sets-form-body');
  tbody.innerHTML = state.formSets.map((s, i) => `
    <tr>
      <td class="set-num">${i + 1}</td>
      <td><input class="set-input" type="number" min="0" inputmode="numeric"
           value="${s.reps || ''}" placeholder="0"
           onchange="formSetChange(${i}, 'reps', this.value)" /></td>
      <td><input class="set-input" type="number" min="0" step="2.5" inputmode="decimal"
           value="${s.weight || ''}" placeholder="0"
           onchange="formSetChange(${i}, 'weight', this.value)" /></td>
      <td><button class="btn-remove-set" onclick="formRemoveSet(${i})">×</button></td>
    </tr>`).join('');
}

window.formSetChange = function(i, field, val) {
  state.formSets[i][field] = parseFloat(val) || 0;
};

window.formRemoveSet = function(i) {
  if (state.formSets.length === 1) return; // keep at least one row
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
  if (!name) {
    document.getElementById('exercise-name').focus();
    return;
  }

  // Flush any pending input values (in case onchange hasn't fired)
  document.querySelectorAll('#sets-form-body input').forEach(input => {
    const row   = input.closest('tr');
    const idx   = [...row.parentElement.children].indexOf(row);
    const field = input.type === 'number' && input.step === '2.5' ? 'weight' : 'reps';
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
  const exerciseRows = w.exercises.map(ex => {
    const setRows = ex.sets.map((s, i) =>
      `<tr>
        <td class="set-num">${i + 1}</td>
        <td>${s.reps} reps</td>
        <td>${s.weight ? s.weight + ' lbs' : '—'}</td>
      </tr>`
    ).join('');
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
        <div class="workout-card-date">${formatDate(w.date)}</div>
      </div>
      <div class="workout-card-meta">${summaryText(w)}</div>
      <div class="workout-card-exercises">
        ${exerciseRows}
        <div class="history-card-footer">
          <button class="btn btn-danger" onclick="confirmDelete('${w.id}', event)">Delete Workout</button>
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

// ── Security ──────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Service Worker ────────────────────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

// ── Event Listeners ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();

  // Nav buttons
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
  document.getElementById('btn-add-exercise').addEventListener('click', openExerciseForm);
  document.getElementById('btn-finish-workout').addEventListener('click', finishWorkout);

  // Sync name/date fields as user types
  document.getElementById('workout-name').addEventListener('input', syncWorkoutFields);
  document.getElementById('workout-date').addEventListener('change', syncWorkoutFields);

  // Exercise form
  document.getElementById('btn-exercise-back').addEventListener('click', () => {
    state.editingExIndex = null;
    navigate('workout');
  });
  document.getElementById('btn-add-set').addEventListener('click', addFormSet);
  document.getElementById('btn-save-exercise').addEventListener('click', saveExercise);

  // Initial render
  navigate('home');
});
