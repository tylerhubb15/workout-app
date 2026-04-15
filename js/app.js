import { loadWorkouts, addWorkout, updateWorkout, deleteWorkout, loadPlans, upsertPlan, deletePlan, loadActivePlanId, saveActivePlanId, loadBodyWeights, logBodyWeight, deleteBodyWeight, loadUnitPref, saveUnitPref } from './storage.js';

// ── Exercise Library ──────────────────────────────────────
const EXERCISES = {
  'Barbell': [
    // Chest
    'Barbell Bench Press', 'Barbell Incline Bench Press', 'Barbell Decline Bench Press',
    'Close-Grip Bench Press', 'JM Press', 'Floor Press', 'Paused Bench Press', 'Spoto Press',
    // Back
    'Barbell Deadlift', 'Trap Bar Deadlift', 'Rack Pull', 'Deficit Deadlift',
    'Barbell Bent-Over Row', 'Pendlay Row', 'T-Bar Row', 'Barbell Shrug',
    'Yates Row', 'Seal Row', 'Barbell Meadows Row',
    // Shoulders
    'Barbell Overhead Press', 'Upright Row', 'Barbell Push Press',
    'Behind-the-Neck Press', 'Barbell Bradford Press',
    // Arms
    'Barbell Curl', 'EZ-Bar Curl', 'Preacher Curl', 'Spider Curl',
    'Incline Barbell Curl', 'Barbell Reverse Curl', 'Barbell Drag Curl',
    'Skull Crusher',
    // Legs
    'Barbell Back Squat', 'Barbell Front Squat', 'Zercher Squat', 'Safety Bar Squat',
    'Box Squat', 'Pause Squat', 'Barbell Hack Squat',
    'Romanian Deadlift', 'Stiff-Leg Deadlift', 'Good Morning',
    'Barbell Walking Lunge', 'Barbell Reverse Lunge', 'Barbell Step-Up', 'Barbell Split Squat',
    'Hip Thrust', 'Barbell Glute Bridge', 'Sumo Deadlift',
    'Barbell Calf Raise',
    // Core / Full Body
    'Landmine Rotation', 'Landmine Press', 'Ab Wheel Rollout', 'Barbell Rollout',
    'Barbell Power Clean', 'Barbell Snatch', 'Barbell Thruster',
  ],
  'Dumbbell': [
    // Chest
    'Dumbbell Bench Press', 'Dumbbell Incline Bench Press', 'Dumbbell Decline Bench Press',
    'Dumbbell Chest Fly', 'Incline Dumbbell Fly', 'Dumbbell Pullover',
    'Neutral Grip Dumbbell Press', 'Dumbbell Floor Press', 'Dumbbell Squeeze Press',
    // Back
    'Dumbbell Single-Arm Row', 'Dumbbell Chest-Supported Row', 'Dumbbell Shrug',
    'Dumbbell Romanian Deadlift', 'Dumbbell Seal Row', 'Dumbbell Kroc Row',
    // Shoulders
    'Dumbbell Overhead Press', 'Arnold Press', 'Seated Dumbbell Press',
    'Dumbbell Lateral Raise', 'Dumbbell Front Raise', 'Dumbbell Rear Delt Fly',
    'Dumbbell Y-Raise', 'Dumbbell Bent-Over Lateral Raise',
    // Arms
    'Dumbbell Curl', 'Incline Dumbbell Curl', 'Hammer Curl', 'Concentration Curl',
    'Cross-Body Hammer Curl', 'Dumbbell Spider Curl', 'Dumbbell Reverse Curl',
    'Zottman Curl', 'Dumbbell Preacher Curl',
    'Dumbbell Skull Crusher', 'Overhead Tricep Extension', 'Tricep Kickback',
    'Dumbbell JM Press',
    // Legs
    'Bulgarian Split Squat', 'Goblet Squat', 'Dumbbell Front Squat',
    'Dumbbell Lunge', 'Dumbbell Walking Lunge', 'Dumbbell Reverse Lunge',
    'Dumbbell Lateral Lunge', 'Dumbbell Step-Up',
    'Single-Leg Romanian Deadlift', 'Sumo Squat', 'Dumbbell Sumo Deadlift',
    'Dumbbell Hip Thrust', 'Dumbbell Glute Bridge',
    'Dumbbell Calf Raise',
    // Core / Full Body
    'Russian Twist', 'Dumbbell Side Bend', 'Dumbbell Woodchop',
    "Farmer's Carry", 'Dumbbell Clean and Press',
  ],
  'Cable': [
    // Chest
    'Cable Chest Fly', 'Low Cable Chest Fly', 'High Cable Chest Fly',
    'Cable Incline Fly', 'Cable Decline Fly', 'Cable Chest Press',
    // Back
    'Lat Pulldown', 'Close-Grip Lat Pulldown', 'Wide-Grip Lat Pulldown',
    'Single-Arm Cable Row', 'Seated Cable Row', 'Wide-Grip Cable Row', 'Cable High Row',
    'Straight-Arm Pulldown', 'Cable Pullover', 'Cable Shrug',
    // Shoulders
    'Face Pull', 'Cable Lateral Raise', 'Cable Rear Delt Fly',
    'Cable Front Raise', 'Cable Upright Row', 'Cable Y-Raise', 'Single-Arm Cable Lateral Raise',
    // Arms
    'Cable Curl', 'Cable Rope Curl', 'Cable Reverse Curl',
    'Cable Hammer Curl', 'Cable Concentration Curl', 'Cable Incline Curl',
    'Tricep Pushdown', 'Rope Pushdown', 'Cable Overhead Tricep Extension',
    'Single-Arm Pushdown', 'Cable Tricep Kickback',
    // Legs / Glutes
    'Cable Pull-Through', 'Cable Kickback', 'Cable Hip Extension',
    'Cable Hip Abduction', 'Cable Hip Adduction', 'Donkey Kick', 'Cable Romanian Deadlift',
    'Cable Squat',
    // Core
    'Cable Crunch', 'Kneeling Cable Crunch', 'Pallof Press', 'Cable Woodchop',
    'Cable Oblique Crunch', 'Half-Kneeling Cable Chop',
  ],
  'Machine': [
    // Chest
    'Machine Chest Press', 'Pec Deck Fly', 'Machine Fly', 'Smith Machine Bench Press',
    'Smith Machine Incline Press', 'Smith Machine Decline Press', 'Machine Pullover',
    // Back
    'Chest-Supported Row', 'Machine High Row', 'Machine Low Row',
    'T-Bar Row Machine', 'Smith Machine Row',
    // Shoulders
    'Machine Shoulder Press', 'Smith Machine Shoulder Press', 'Machine Lateral Raise',
    'Reverse Pec Deck', 'Machine Rear Delt Fly',
    // Arms
    'Machine Curl', 'Machine Preacher Curl',
    'Machine Tricep Press', 'Machine Tricep Extension',
    // Legs
    'Leg Press', 'Hack Squat', 'Pendulum Squat', 'Belt Squat',
    'Leg Extension', 'Smith Machine Squat',
    'Lying Leg Curl', 'Seated Leg Curl', 'Standing Leg Curl', 'Glute-Ham Raise',
    'Machine Hip Thrust', 'Smith Machine Hip Thrust', 'Smith Machine Romanian Deadlift',
    'Abductor Machine', 'Adductor Machine',
    'Reverse Hyperextension', 'Machine Back Extension',
    // Calves
    'Standing Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise', 'Donkey Calf Raise',
    'Smith Machine Calf Raise',
  ],
  'Bodyweight': [
    // Chest / Push
    'Push-Up', 'Wide Push-Up', 'Close Push-Up', 'Decline Push-Up', 'Incline Push-Up',
    'Diamond Push-Up', 'Pike Push-Up', 'Archer Push-Up', 'Hindu Push-Up',
    'Plyometric Push-Up', 'One-Arm Push-Up',
    'Chest Dip', 'Parallel Dip', 'Tricep Dip',
    // Back / Pull
    'Pull-Up', 'Chin-Up', 'Wide-Grip Pull-Up', 'Neutral Grip Pull-Up', 'Close-Grip Chin-Up',
    'Inverted Row', 'Australian Pull-Up', 'Ring Row', 'Muscle-Up',
    'Typewriter Pull-Up', 'L-Sit Pull-Up',
    // Legs
    'Jump Squat', 'Box Jump', 'Wall Sit', 'Lunge', 'Reverse Lunge',
    'Pistol Squat', 'Cossack Squat', 'Step-Up',
    'Nordic Hamstring Curl', 'Glute Bridge', 'Hip Thrust Bodyweight',
    'Single-Leg Squat', 'Single-Leg Calf Raise',
    // Core
    'Ab Wheel Rollout', 'Decline Sit-Up', 'Hanging Leg Raise', 'Leg Raise',
    'Toes-to-Bar', 'L-Sit', 'Dragon Flag',
    'Plank', 'Side Plank', 'Hollow Hold',
    'Bicycle Crunch', 'V-Up', 'Dead Bug', 'Bird Dog', 'Superman',
    'Reverse Crunch', 'Flutter Kicks', 'Windshield Wiper',
    'Mountain Climber', 'Sit-Up', 'Crunch',
    // Cardio / Full Body
    'Burpee', 'Sled Push', 'Battle Ropes',
  ],
  'Kettlebell': [
    'Kettlebell Swing', 'Kettlebell Single-Arm Swing', 'Kettlebell Snatch', 'Kettlebell Clean',
    'Kettlebell Goblet Squat', 'Kettlebell Front Rack Squat',
    'Kettlebell Overhead Squat', 'Kettlebell Sumo Deadlift',
    'Kettlebell Lunge', 'Kettlebell Lateral Lunge', 'Kettlebell Step-Up',
    'Kettlebell Romanian Deadlift',
    'Kettlebell Press', 'Kettlebell Row', 'Kettlebell Floor Press',
    'Kettlebell Thruster', 'Kettlebell Around the World',
    'Kettlebell Turkish Get-Up', 'Kettlebell Halo', 'Kettlebell Windmill',
    'Kettlebell Hip Thrust', 'Kettlebell Deadlift',
  ],
};

// ── Exercise metadata helpers ─────────────────────────────
const MUSCLE_MAP = {
  'Chest': [
    'Barbell Bench Press','Barbell Incline Bench Press','Barbell Decline Bench Press',
    'Close-Grip Bench Press','JM Press','Floor Press','Paused Bench Press','Spoto Press',
    'Dumbbell Bench Press','Dumbbell Incline Bench Press','Dumbbell Decline Bench Press',
    'Dumbbell Chest Fly','Incline Dumbbell Fly','Dumbbell Pullover','Neutral Grip Dumbbell Press',
    'Dumbbell Floor Press','Dumbbell Squeeze Press',
    'Cable Chest Fly','Low Cable Chest Fly','High Cable Chest Fly',
    'Cable Incline Fly','Cable Decline Fly','Cable Chest Press',
    'Machine Chest Press','Pec Deck Fly','Machine Fly','Smith Machine Bench Press',
    'Smith Machine Incline Press','Smith Machine Decline Press','Machine Pullover',
    'Push-Up','Wide Push-Up','Close Push-Up','Decline Push-Up','Incline Push-Up',
    'Diamond Push-Up','Archer Push-Up','Plyometric Push-Up','One-Arm Push-Up',
    'Chest Dip','Parallel Dip',
    'Kettlebell Floor Press',
  ],
  'Back': [
    'Barbell Deadlift','Trap Bar Deadlift','Rack Pull','Deficit Deadlift',
    'Barbell Bent-Over Row','Pendlay Row','T-Bar Row','Barbell Shrug',
    'Yates Row','Seal Row','Barbell Meadows Row',
    'Dumbbell Single-Arm Row','Dumbbell Chest-Supported Row','Dumbbell Shrug',
    'Dumbbell Romanian Deadlift','Dumbbell Seal Row','Dumbbell Kroc Row',
    'Lat Pulldown','Close-Grip Lat Pulldown','Wide-Grip Lat Pulldown',
    'Single-Arm Cable Row','Seated Cable Row','Wide-Grip Cable Row','Cable High Row',
    'Straight-Arm Pulldown','Cable Pullover','Cable Shrug',
    'Chest-Supported Row','Machine High Row','Machine Low Row','T-Bar Row Machine','Smith Machine Row',
    'Pull-Up','Chin-Up','Wide-Grip Pull-Up','Neutral Grip Pull-Up','Close-Grip Chin-Up',
    'Inverted Row','Australian Pull-Up','Ring Row','Muscle-Up','Typewriter Pull-Up','L-Sit Pull-Up',
    'Kettlebell Row',
  ],
  'Shoulders': [
    'Barbell Overhead Press','Upright Row','Barbell Push Press',
    'Behind-the-Neck Press','Barbell Bradford Press',
    'Dumbbell Overhead Press','Arnold Press','Seated Dumbbell Press',
    'Dumbbell Lateral Raise','Dumbbell Front Raise','Dumbbell Rear Delt Fly',
    'Dumbbell Y-Raise','Dumbbell Bent-Over Lateral Raise',
    'Face Pull','Cable Lateral Raise','Cable Rear Delt Fly',
    'Cable Front Raise','Cable Upright Row','Cable Y-Raise','Single-Arm Cable Lateral Raise',
    'Machine Shoulder Press','Smith Machine Shoulder Press','Machine Lateral Raise',
    'Reverse Pec Deck','Machine Rear Delt Fly',
    'Pike Push-Up','Hindu Push-Up',
    'Kettlebell Press','Kettlebell Halo',
  ],
  'Biceps': [
    'Barbell Curl','EZ-Bar Curl','Preacher Curl','Spider Curl',
    'Incline Barbell Curl','Barbell Reverse Curl','Barbell Drag Curl',
    'Dumbbell Curl','Incline Dumbbell Curl','Hammer Curl','Concentration Curl',
    'Cross-Body Hammer Curl','Dumbbell Spider Curl','Dumbbell Reverse Curl',
    'Zottman Curl','Dumbbell Preacher Curl',
    'Cable Curl','Cable Rope Curl','Cable Reverse Curl',
    'Cable Hammer Curl','Cable Concentration Curl','Cable Incline Curl',
    'Machine Curl','Machine Preacher Curl',
    'Close-Grip Chin-Up','Chin-Up',
  ],
  'Triceps': [
    'Close-Grip Bench Press','JM Press','Skull Crusher','Floor Press',
    'Dumbbell Skull Crusher','Overhead Tricep Extension','Tricep Kickback','Dumbbell JM Press',
    'Tricep Pushdown','Rope Pushdown','Cable Overhead Tricep Extension',
    'Single-Arm Pushdown','Cable Tricep Kickback',
    'Machine Tricep Press','Machine Tricep Extension',
    'Diamond Push-Up','Close Push-Up','Tricep Dip','Parallel Dip',
    'Landmine Press',
  ],
  'Quads': [
    'Barbell Back Squat','Barbell Front Squat','Zercher Squat','Safety Bar Squat',
    'Box Squat','Pause Squat','Barbell Hack Squat',
    'Dumbbell Front Squat','Goblet Squat','Sumo Squat',
    'Leg Press','Hack Squat','Pendulum Squat','Belt Squat','Leg Extension','Smith Machine Squat',
    'Bulgarian Split Squat','Barbell Split Squat',
    'Barbell Walking Lunge','Barbell Reverse Lunge',
    'Dumbbell Lunge','Dumbbell Walking Lunge','Dumbbell Reverse Lunge','Dumbbell Lateral Lunge',
    'Dumbbell Step-Up','Barbell Step-Up','Lunge','Reverse Lunge',
    'Jump Squat','Box Jump','Wall Sit',
    'Pistol Squat','Cossack Squat','Single-Leg Squat','Step-Up',
    'Cable Squat',
    'Kettlebell Goblet Squat','Kettlebell Front Rack Squat','Kettlebell Overhead Squat',
    'Kettlebell Lunge','Kettlebell Lateral Lunge','Kettlebell Step-Up',
  ],
  'Hamstrings': [
    'Romanian Deadlift','Stiff-Leg Deadlift','Good Morning',
    'Dumbbell Romanian Deadlift','Single-Leg Romanian Deadlift','Dumbbell Sumo Deadlift',
    'Cable Romanian Deadlift','Smith Machine Romanian Deadlift',
    'Lying Leg Curl','Seated Leg Curl','Standing Leg Curl','Glute-Ham Raise',
    'Nordic Hamstring Curl','Cable Pull-Through',
    'Rack Pull','Deficit Deadlift',
    'Kettlebell Romanian Deadlift','Kettlebell Sumo Deadlift','Kettlebell Deadlift',
  ],
  'Glutes': [
    'Hip Thrust','Barbell Glute Bridge','Sumo Deadlift',
    'Dumbbell Hip Thrust','Dumbbell Glute Bridge',
    'Machine Hip Thrust','Smith Machine Hip Thrust','Kettlebell Hip Thrust',
    'Cable Kickback','Cable Hip Extension','Cable Hip Abduction','Cable Hip Adduction',
    'Abductor Machine','Adductor Machine','Reverse Hyperextension',
    'Donkey Kick','Sumo Squat','Dumbbell Sumo Deadlift',
    'Glute Bridge','Hip Thrust Bodyweight',
    'Bird Dog','Cossack Squat',
    'Kettlebell Sumo Deadlift','Kettlebell Swing','Kettlebell Single-Arm Swing',
  ],
  'Calves': [
    'Standing Calf Raise','Seated Calf Raise','Leg Press Calf Raise',
    'Single-Leg Calf Raise','Donkey Calf Raise',
    'Barbell Calf Raise','Dumbbell Calf Raise',
    'Smith Machine Calf Raise',
  ],
  'Core': [
    'Cable Crunch','Kneeling Cable Crunch','Pallof Press',
    'Cable Woodchop','Cable Oblique Crunch','Half-Kneeling Cable Chop',
    'Ab Wheel Rollout','Barbell Rollout',
    'Decline Sit-Up','Sit-Up','Crunch','Reverse Crunch',
    'Hanging Leg Raise','Leg Raise','Toes-to-Bar',
    'L-Sit','Dragon Flag','Windshield Wiper','Flutter Kicks',
    'Plank','Side Plank','Hollow Hold',
    'Bicycle Crunch','V-Up','Dead Bug','Bird Dog','Superman',
    'Russian Twist','Dumbbell Side Bend','Dumbbell Woodchop',
    'Landmine Rotation','Mountain Climber',
    'Kettlebell Windmill',
  ],
  'Full Body': [
    'Barbell Power Clean','Barbell Snatch','Barbell Thruster',
    'Kettlebell Swing','Kettlebell Single-Arm Swing','Kettlebell Snatch','Kettlebell Clean',
    'Kettlebell Turkish Get-Up','Kettlebell Thruster','Kettlebell Around the World',
    "Farmer's Carry",'Dumbbell Clean and Press',
    'Sled Push','Battle Ropes','Burpee','Box Jump',
    'Machine Back Extension','Hindu Push-Up','Muscle-Up',
  ],
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
  dayIsReadOnly: false,      // true when viewing a previously completed workout
  editingExIndex: null,
  formSets: [],
  formRepMode: 'target',     // 'target' | 'rir' | 'er' — rep mode for the exercise form
  customExMuscleGroup: null, // muscle group set via the custom exercise modal
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
  exMuscleFilter: null,     // active muscle group string or null
  exEquipFilter:  null,     // active equipment group string or null
  exMusclePickerFrom: null, // 'exercise-muscle' when entering via picker; null in edit mode
  exHistoryName:   null, // exercise name for exercise-history view
  exHistoryBackTo: 'home',
  _sessionPRs: {}, // max weight logged per exercise in the current active workout session
  _pendingTemplateDayTemplates: null, // day templates from a pre-made plan, applied on first save
};

// ── Unit Helpers ──────────────────────────────────────────
const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;

function weightUnit() { return loadUnitPref(); }

// Convert stored lbs value to the user's display unit (returns a number)
function toDisplayWeight(lbs) {
  if (lbs == null || lbs === '') return '';
  const v = parseFloat(lbs) || 0;
  return weightUnit() === 'kg' ? +(v * LBS_TO_KG).toFixed(2) : v;
}

// Convert a value the user typed (in their preferred unit) back to lbs for storage
function fromDisplayWeight(displayVal) {
  const v = parseFloat(displayVal) || 0;
  return weightUnit() === 'kg' ? Math.round(v * KG_TO_LBS * 100) / 100 : v;
}

// Format a stored lbs value as "X lbs" or "X kg" for display
function fmtWeight(lbs) {
  if (!lbs) return '';
  return `${toDisplayWeight(lbs)} ${weightUnit()}`;
}

window.toggleWeightUnit = function(ctx) {
  saveUnitPref(weightUnit() === 'lbs' ? 'kg' : 'lbs');
  renderBwHomeWidget();
  // Re-render whichever exercise view is active
  if (ctx === 'day' || state.dayWorkout)        renderDay();
  if (ctx === 'workout' || state.activeWorkout) renderWorkout();
  // Update bw view toggle label if it's visible
  const btn = document.getElementById('btn-unit-toggle');
  if (btn) btn.textContent = weightUnit().toUpperCase();
};

// ── RIR Helpers ───────────────────────────────────────────
function getRirContext(plan, iso) {
  if (!plan.rir) return null;
  const msLen      = plan.mesocycleLength || 4;
  const cycleLen   = msLen + 1; // mesocycle weeks + 1 deload week
  const start      = new Date(plan.start + 'T00:00:00');
  const date       = new Date(iso + 'T00:00:00');
  const weekNum    = Math.floor(Math.round((date - start) / 86400000) / 7); // 0-indexed
  const weekInCycle = weekNum % cycleLen;
  const isDeloadWeek = weekInCycle === msLen;
  const blockNum   = Math.floor(weekNum / cycleLen);
  // RIR resets each block (3→0), deload week gets RIR 3 (light)
  const targetRIR  = isDeloadWeek ? 3 : Math.min(3, Math.max(0, (msLen - 1) - weekInCycle));
  return { weekNum, weekInCycle, targetRIR, blockNum, msLen, isDeloadWeek };
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
function localISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function todayISO() {
  return localISO(new Date());
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

// ── Modal ─────────────────────────────────────────────────
function showModal({ title, msg, onConfirm, confirmText = 'OK', confirmClass = 'btn-primary', cancelText = null, onCancel = null } = {}) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = title || '';
  document.getElementById('modal-msg').innerHTML = msg || '';
  const actions = document.getElementById('modal-actions');
  actions.innerHTML = '';

  if (cancelText) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = cancelText;
    btn.onclick = () => { overlay.hidden = true; if (onCancel) onCancel(); };
    actions.appendChild(btn);
  }

  const confirmBtn = document.createElement('button');
  confirmBtn.className = `btn ${confirmClass}`;
  confirmBtn.textContent = confirmText;
  confirmBtn.onclick = () => {
    if (onConfirm) {
      const result = onConfirm();
      if (result !== false) overlay.hidden = true;
    } else {
      overlay.hidden = true;
    }
  };
  actions.appendChild(confirmBtn);

  overlay.hidden = false;
  // Focus confirm button for keyboard/accessibility
  setTimeout(() => confirmBtn.focus(), 50);
}

// Convenience wrappers
function showAlert(title, msg) {
  showModal({ title, msg, confirmText: 'OK' });
}

window.showTrainingMethodInfo = function(method) {
  if (method === 'rir') {
    showAlert('Reps in Reserve (RIR)', `
      <p style="margin:0 0 10px">RIR measures how close you are to failure. <strong>RIR 3</strong> means you could do 3 more reps; <strong>RIR 0</strong> means you hit true failure.</p>
      <p style="margin:0 0 10px">Each week of your mesocycle the target RIR drops by 1 — so the load progressively intensifies:</p>
      <p style="margin:0;font-family:monospace;font-size:13px">Wk 1 → RIR 3 &nbsp;|&nbsp; Wk 2 → RIR 2<br>Wk 3 → RIR 1 &nbsp;|&nbsp; Wk 4 → RIR 0</p>
      <p style="margin:10px 0 0;color:var(--text2);font-size:13px">Log the reps you actually completed. The app uses that to auto-calculate next week's target.</p>
    `);
  } else if (method === 'er') {
    showAlert('Effective Reps (ER)', `
      <p style="margin:0 0 10px">ER training accumulates reps close to failure using rest-pause technique.</p>
      <p style="margin:0 0 10px"><strong>How it works:</strong></p>
      <ol style="margin:0 0 10px;padding-left:18px">
        <li>Do your <strong>ignition set</strong> to near-failure (e.g. 12 reps)</li>
        <li>Rest 10–15 seconds</li>
        <li>Keep going in short bursts until you hit the <strong>ER target</strong> total</li>
      </ol>
      <p style="margin:0;color:var(--text2);font-size:13px">Only the reps near failure count as "effective." This method maximises stimulus in less time.</p>
    `);
  }
};

function showPRToast(exerciseName, weight) {
  const toast = document.getElementById('pr-toast');
  if (!toast) return;
  toast.querySelector('.pr-toast-ex').textContent = exerciseName;
  toast.querySelector('.pr-toast-weight').textContent = fmtWeight(weight);
  toast.hidden = false;
  toast.classList.remove('pr-toast-out');
  // Force reflow so the transition fires from the hidden position
  void toast.offsetWidth;
  toast.classList.add('pr-toast-in');
  clearTimeout(toast._prTimeout);
  toast._prTimeout = setTimeout(() => {
    toast.classList.remove('pr-toast-in');
    toast.classList.add('pr-toast-out');
    setTimeout(() => { toast.hidden = true; toast.classList.remove('pr-toast-out'); }, 350);
  }, 2500);
}

// ── Rest Timer ────────────────────────────────────────────
let _restInterval = null;

function startRestTimer(seconds) {
  clearInterval(_restInterval);
  let remaining = seconds;
  const urgentAt = Math.min(10, Math.floor(seconds / 3));
  const chip     = document.getElementById('rest-timer');
  const countEl  = document.getElementById('rest-timer-count');
  chip.hidden = false;
  chip.classList.remove('urgent');
  countEl.textContent = remaining;

  _restInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(_restInterval);
      navigator.vibrate && navigator.vibrate([200, 100, 200]);
      chip.hidden = true;
      return;
    }
    countEl.textContent = remaining;
    if (remaining <= urgentAt) chip.classList.add('urgent');
  }, 1000);
}

window.setRestTimer    = (s) => startRestTimer(s);
window.dismissRestTimer = () => {
  clearInterval(_restInterval);
  document.getElementById('rest-timer').hidden = true;
};

// ── PR Detection ──────────────────────────────────────────
function buildPRMap() {
  const workouts = loadWorkouts();
  const prMap = {}; // exName → maxWeight
  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        const w2 = s.weight || 0;
        if (w2 > (prMap[ex.name] || 0)) prMap[ex.name] = w2;
      }
    }
  }
  return prMap;
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

  if (view === 'home')             renderHome();
  if (view === 'workout')          renderWorkout();
  if (view === 'day')              renderDay();
  if (view === 'calendar')         renderCalendar();
  if (view === 'history')          renderHistory();
  if (view === 'exercise')         renderExerciseForm();
  if (view === 'bodyweight')       renderBodyWeight();
  if (view === 'exercise-history') renderExerciseHistory();
  if (view === 'plan')              renderPlan();
  if (view === 'plan-editor')       renderPlanEditor();
  if (view === 'plan-day-muscles')  renderPlanDayMuscles();
  if (view === 'plan-muscle-picker') renderMuscleGroupPicker();
  if (view === 'volume')             renderVolumeTracker();
  if (view === 'exercise-muscle')    renderExMusclePickerView();

  window.scrollTo(0, 0);
}
window.navigate = navigate;

// ── Home ──────────────────────────────────────────────────

function renderHome() {
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  renderStats();
  renderBwHomeWidget();
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
      const iso = localISO(d);
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
    ? rirCtx.isDeloadWeek
      ? `<span class="today-plan-rir today-plan-rir-deload">Deload Week</span>`
      : `<span class="today-plan-rir">Wk&nbsp;${rirCtx.weekInCycle + 1}/${rirCtx.msLen} · RIR&nbsp;${rirCtx.targetRIR}</span>`
    : '';

  el.innerHTML = `
    <div class="today-plan-card">
      <div class="today-plan-next-label">Next Workout</div>
      <div class="today-plan-card-top">
        <div>
          <div class="today-plan-label">${label} — ${escHtml(plan.name)} ${rirBadge}</div>
          <div class="today-plan-exercises">${exList}</div>
        </div>
        <button class="today-plan-start-btn" onclick="startNextWorkout('${targetIso}','${label}')">Start ›</button>
      </div>
    </div>`;
}

window.startNextWorkout = function(targetIso, label) {
  const today = todayISO();
  if (targetIso === today) {
    selectDay(targetIso, 'home');
    return;
  }
  showModal({
    title: 'Start early?',
    msg: `This workout is scheduled for ${label}. Start it now, or open today to log a different workout?`,
    confirmText: 'Start scheduled',
    cancelText: 'Open today',
    onConfirm: () => selectDay(targetIso, 'home'),
    onCancel:  () => selectDay(today, 'home'),
  });
};

// ── Volume Tracker ────────────────────────────────────────

function getWeekVolumeByMuscle() {
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const workouts = loadWorkouts().filter(w => {
    if ((w.status ?? 'completed') !== 'completed') return false;
    const d = new Date(w.date + 'T00:00:00');
    return d >= monday && d <= sunday;
  });

  const sets = {};
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      const muscle = ex.muscleGroup || getMuscleGroup(ex.name);
      if (!muscle || muscle === 'Full Body') return;
      sets[muscle] = (sets[muscle] || 0) + ex.sets.length;
    });
  });
  return { sets, monday, sunday };
}

function renderVolumeTracker() {
  const MUSCLES = Object.keys(MUSCLE_MAP).filter(m => m !== 'Full Body');
  const REC_MIN = 10;
  const REC_MAX = 20;
  const BAR_MAX = 24;

  const { sets, monday, sunday } = getWeekVolumeByMuscle();

  const weekStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' – '
    + sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const rows = MUSCLES.map(muscle => {
    const count = sets[muscle] || 0;
    const pct   = Math.min(100, (count / BAR_MAX) * 100);
    const barCls = count === 0       ? 'vol-bar-empty'
                 : count < REC_MIN   ? 'vol-bar-low'
                 : count <= REC_MAX  ? 'vol-bar-ok'
                 : 'vol-bar-high';
    const minPct = (REC_MIN / BAR_MAX) * 100;
    const maxPct = (REC_MAX / BAR_MAX) * 100;
    return `
      <div class="vol-row">
        <div class="vol-row-top">
          <span class="vol-muscle">${muscle}</span>
          <span class="vol-count${count === 0 ? ' vol-count-zero' : ''}">${count} set${count !== 1 ? 's' : ''}</span>
        </div>
        <div class="vol-bar-bg">
          <div class="vol-bar-fill ${barCls}" style="width:${pct}%"></div>
          <div class="vol-bar-marker" style="left:${minPct}%"></div>
          <div class="vol-bar-marker" style="left:${maxPct}%"></div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('volume-content').innerHTML = `
    <div class="vol-week-range">${weekStr}</div>
    <div class="vol-legend">
      <span class="vol-legend-dot vol-bar-low"></span><span class="vol-legend-label">Under 10</span>
      <span class="vol-legend-dot vol-bar-ok"></span><span class="vol-legend-label">10–20 ✓</span>
      <span class="vol-legend-dot vol-bar-high"></span><span class="vol-legend-label">Over 20</span>
    </div>
    <div class="vol-list">${rows}</div>
    <div class="vol-note">Vertical markers show the 10–20 set target range. Aim for each muscle to land between them for hypertrophy.</div>`;
}

function renderStats() {
  const workouts = loadWorkouts();
  const today = todayISO();

  const completedWorkouts = workouts.filter(w => (w.status ?? 'completed') === 'completed');
  const plannedWorkouts   = workouts.filter(w => (w.status ?? 'completed') === 'planned');

  const completedDates = new Set(completedWorkouts.map(w => w.date));
  const plannedDates   = new Set(plannedWorkouts.map(w => w.date));

  renderWeekStrip(completedDates, plannedDates, today);
}

function renderWeekStrip(completedDates, plannedDates, today) {
  const el = document.getElementById('week-strip');
  if (!el) return;

  // Monday of the current week
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  el.innerHTML = DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = localISO(d);
    const isToday   = iso === today;
    const completed = completedDates.has(iso);
    const planned   = !completed && plannedDates.has(iso);
    const isFuture  = iso > today;

    const dotClass = ['week-dot',
      completed ? 'week-dot-logged'  : '',
      planned   ? 'week-dot-planned' : '',
      isToday   ? 'week-dot-today'   : '',
      isFuture  ? 'week-dot-future'  : '',
    ].filter(Boolean).join(' ');

    const labelClass = 'week-day-label' + (isToday ? ' week-day-label-today' : '');
    const isPastMissed = !completed && !planned && !isToday && !isFuture;
    const inner = completed    ? '<span class="week-dot-check">✓</span>'
                : planned      ? '<span class="week-dot-plan-dot"></span>'
                : isPastMissed ? '<span class="week-dot-miss">✕</span>'
                : '';

    return `
      <div class="week-day" onclick="selectDay('${iso}','home')" style="cursor:pointer">
        <div class="${dotClass}">${inner}</div>
        <div class="${labelClass}">${label}</div>
      </div>`;
  }).join('');
}

// ── Body Weight ───────────────────────────────────────────
function makeSvgLineChart(data, { w = 300, h = 90 } = {}) {
  if (data.length < 2) return '';
  const pad = { t: 8, b: 22, l: 38, r: 8 };
  const iW = w - pad.l - pad.r;
  const iH = h - pad.t - pad.b;
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;
  const xS = i => pad.l + (i / (data.length - 1)) * iW;
  const yS = v => pad.t + iH - ((v - minV) / rangeV) * iH;
  const pts = data.map((d, i) => `${xS(i).toFixed(1)},${yS(d.value).toFixed(1)}`).join(' ');
  const dots = data.map((d, i) =>
    `<circle cx="${xS(i).toFixed(1)}" cy="${yS(d.value).toFixed(1)}" r="3" fill="var(--accent)"/>`
  ).join('');
  const yLabels = [minV, maxV].map(v =>
    `<text x="${pad.l - 5}" y="${yS(v) + 4}" text-anchor="end" font-size="9" fill="var(--text3)">${v}</text>`
  ).join('');
  const fmtDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const xLabels = `
    <text x="${pad.l}" y="${h - 3}" text-anchor="start" font-size="9" fill="var(--text3)">${fmtDate(data[0].date)}</text>
    <text x="${w - pad.r}" y="${h - 3}" text-anchor="end" font-size="9" fill="var(--text3)">${fmtDate(data[data.length - 1].date)}</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block;overflow:visible">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.8"/>
    ${dots}${yLabels}${xLabels}
  </svg>`;
}

function renderSparkline(entries) {
  if (entries.length < 2) return '';
  const vals = entries.map(e => e.weight);
  const minV = Math.min(...vals), maxV = Math.max(...vals), rng = maxV - minV || 1;
  const sw = 60, sh = 24;
  const xS = i => (i / (entries.length - 1)) * sw;
  const yS = v => sh - 2 - ((v - minV) / rng) * (sh - 4);
  const pts = entries.map((e, i) => `${xS(i).toFixed(1)},${yS(e.weight).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${sw} ${sh}" width="${sw}" height="${sh}" style="display:block">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function renderBwHomeWidget() {
  const entries = loadBodyWeights();
  const valEl   = document.getElementById('bw-home-value');
  const sparkEl = document.getElementById('bw-home-sparkline');
  if (!valEl) return;
  if (entries.length === 0) { valEl.textContent = `— ${weightUnit()}`; sparkEl.innerHTML = ''; return; }
  valEl.textContent = `${toDisplayWeight(entries[0].weight)} ${weightUnit()}`;
  sparkEl.innerHTML = renderSparkline([...entries].slice(0, 14).reverse());
}

function renderBodyWeight() {
  const entries = loadBodyWeights();
  const unit = weightUnit();
  document.getElementById('bw-date').value  = todayISO();
  const todayEntry = entries.find(e => e.date === todayISO());
  document.getElementById('bw-input').value       = todayEntry ? toDisplayWeight(todayEntry.weight) : '';
  document.getElementById('bw-input').placeholder = unit;
  const toggleBtn = document.getElementById('btn-unit-toggle');
  if (toggleBtn) toggleBtn.textContent = unit.toUpperCase();

  const graphEl = document.getElementById('bw-graph-section');
  if (entries.length >= 2) {
    const chartData = [...entries].reverse().map(e => ({ date: e.date, value: toDisplayWeight(e.weight) || 0 }));
    graphEl.innerHTML = `<div class="bw-graph-wrap">${makeSvgLineChart(chartData, { w: 320, h: 100 })}</div>`;
  } else {
    graphEl.innerHTML = entries.length === 0
      ? '<div class="bw-empty">No entries yet — log your first weight above.</div>' : '';
  }

  const listEl = document.getElementById('bw-list');
  if (entries.length === 0) { listEl.innerHTML = ''; return; }
  listEl.innerHTML = `
    <div class="section-title" style="padding: 16px 0 8px">History</div>
    ${entries.map(e => `
      <div class="bw-list-row">
        <span class="bw-list-date">${formatDate(e.date)}</span>
        <span class="bw-list-weight">${toDisplayWeight(e.weight)} ${unit}</span>
        <button class="btn btn-ghost btn-sm" onclick="deleteBwEntry('${e.date}')">Remove</button>
      </div>`).join('')}`;
}

window.deleteBwEntry = function(date) {
  deleteBodyWeight(date);
  renderBodyWeight();
  renderBwHomeWidget();
};

// ── Exercise History ──────────────────────────────────────
window.showExerciseHistory = function(name, event) {
  event.stopPropagation();
  state.exHistoryName   = name;
  state.exHistoryBackTo = state.view;
  navigate('exercise-history');
};

// Called from exercise card — resolves name by index to avoid encoding issues
window.openExerciseHistory = function(ctx, ei, event) {
  event.stopPropagation();
  const ex = workoutFor(ctx)?.exercises[ei];
  if (!ex) return;
  state.exHistoryName   = ex.name;
  state.exHistoryBackTo = state.view;
  navigate('exercise-history');
};

function renderExerciseHistory() {
  const name = state.exHistoryName;
  document.getElementById('ex-history-title').textContent = name || 'Exercise';

  const workouts = loadWorkouts();
  const sessions = workouts
    .filter(w => w.exercises.some(e => e.name === name))
    .sort((a, b) => a.date.localeCompare(b.date));

  const content = document.getElementById('ex-history-content');
  if (sessions.length === 0) {
    content.innerHTML = '<div class="ex-history-empty">No history logged for this exercise yet.</div>';
    return;
  }

  // Graph: max weight per session
  const graphData = sessions.map(w => {
    const ex  = w.exercises.find(e => e.name === name);
    const max = Math.max(...ex.sets.map(s => s.weight || 0));
    return { date: w.date, value: toDisplayWeight(max) || 0 };
  });

  const sessionsHtml = [...sessions].reverse().map(w => {
    const ex = w.exercises.find(e => e.name === name);
    const setRows = ex.sets.map((s, i) => {
      const hit = s.actualReps != null ? ` · hit ${s.actualReps}` : '';
      return `<div class="ex-history-set-row">
        <span class="ex-history-set-num">Set ${i + 1}</span>
        <span class="ex-history-set-val">${s.reps} reps × ${s.weight ? fmtWeight(s.weight) : `0 ${weightUnit()}`}${hit}</span>
      </div>`;
    }).join('');
    return `<div class="ex-history-session">
      <div class="ex-history-session-header">${formatDate(w.date)} <span class="ex-history-session-name">· ${escHtml(w.name)}</span></div>
      ${setRows}
    </div>`;
  }).join('');

  content.innerHTML = `
    <div class="ex-history-graph-wrap">${makeSvgLineChart(graphData, { w: 320, h: 100 })}</div>
    <div class="ex-history-subtitle">Max weight per session</div>
    <div class="ex-history-sessions">${sessionsHtml}</div>`;
}

function setRowHTML(s, i, prWeight) {
  const repsDisplay = (s.actualReps != null && s.actualReps > 0)
    ? `${s.actualReps}<span style="color:var(--text3);font-size:11px"> / ${s.reps}</span>`
    : `${s.reps}`;
  const rirDisplay = s.rir != null
    ? `<span class="set-rir-history">RIR ${s.rir}</span>`
    : '';
  const prBadge = prWeight && s.weight && s.weight >= prWeight
    ? `<span class="pr-badge">PR</span>`
    : '';
  return `
    <tr>
      <td class="set-num">${i + 1}</td>
      <td>${repsDisplay} reps ${rirDisplay}</td>
      <td>${s.weight ? fmtWeight(s.weight) : '—'}${prBadge}</td>
    </tr>`;
}

function calcVolume(w) {
  const volLbs = w.exercises.reduce((t, ex) =>
    t + ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0);
  if (!volLbs) return null;
  const vol  = weightUnit() === 'kg' ? Math.round(volLbs * LBS_TO_KG) : volLbs;
  const unit = weightUnit();
  return vol >= 1000 ? `${(vol / 1000).toFixed(1)}k ${unit}` : `${vol} ${unit}`;
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
        ${vol ? `<span class="meta-pill vol-pill">${vol}</span>` : ''}
      </div>
      <div class="workout-card-exercises">${exerciseRows}</div>
    </div>`;
}

window.toggleCard = function(el) { el.classList.toggle('expanded'); };

// ── Active Workout (Start Workout flow) ───────────────────
function startWorkout() {
  state.activeWorkout = { id: uid(), name: '', date: todayISO(), exercises: [] };
  state._sessionPRs = {};
  state.exerciseContext = 'workout';
  navigate('workout');
}

function renderWorkout() {
  const w = state.activeWorkout;
  if (!w) return;
  document.getElementById('workout-name').value  = w.name;
  document.getElementById('workout-date').value  = w.date;
  document.getElementById('workout-notes').value = w.notes || '';

  const container = document.getElementById('active-exercises');
  if (w.exercises.length === 0) {
    container.innerHTML = emptyExerciseState();
    return;
  }
  const prMap = buildPRMap();
  container.innerHTML = buildExerciseListHtml(w.exercises, 'workout', prMap);
}

function syncWorkoutFields() {
  const w = state.activeWorkout;
  if (!w) return;
  w.name  = document.getElementById('workout-name').value.trim();
  w.date  = document.getElementById('workout-date').value;
  w.notes = document.getElementById('workout-notes').value.trim() || undefined;
}

// ── Progressive Overload ──────────────────────────────────

function getOverloadSuggestions(workout) {
  const allWorkouts = loadWorkouts();
  const suggestions = [];

  workout.exercises.forEach(ex => {
    const curDoneSets = ex.sets.filter(s => s.done && s.weight > 0);
    if (curDoneSets.length === 0) return;

    // Find most recent prior completed session with this exercise
    const prev = allWorkouts
      .filter(w => w.date < workout.date
               && (w.status ?? 'completed') === 'completed'
               && w.exercises.some(e => e.name === ex.name))
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!prev) return; // first time logging this exercise — no suggestion yet

    const curMax   = Math.max(...curDoneSets.map(s => s.weight));
    const allDone  = ex.sets.every(s => s.done);
    const hitReps  = curDoneSets.every(s => (s.actualReps ?? s.reps) >= (s.reps || 1));
    // Use unit-appropriate increments; threshold in lbs (220 lbs ≈ 100 kg)
    const isKg = weightUnit() === 'kg';
    const niceInc    = isKg ? (curMax >= 220 ? 2.5 * KG_TO_LBS : 1.25 * KG_TO_LBS)
                             : (curMax >= 100 ? 5 : 2.5);
    const dispInc    = isKg ? (curMax >= 220 ? 2.5 : 1.25) : (curMax >= 100 ? 5 : 2.5);
    const unit       = weightUnit();

    if (allDone && hitReps) {
      suggestions.push({ name: ex.name, msg: `${toDisplayWeight(curMax)} → ${toDisplayWeight(curMax + niceInc)} ${unit} (+${dispInc})` });
    } else if (allDone && !hitReps) {
      suggestions.push({ name: ex.name, msg: `${toDisplayWeight(curMax)} ${unit} — repeat weight, hit all reps first` });
    }
  });

  return suggestions;
}

function showOverloadModal(suggestions) {
  if (suggestions.length === 0) return;
  const rows = suggestions.map(s =>
    `<div class="overload-row">
      <span class="overload-name">${escHtml(s.name)}</span>
      <span class="overload-msg">${escHtml(s.msg)}</span>
    </div>`
  ).join('');
  showModal({
    title: 'Next Session',
    msg: `<div class="overload-intro">Suggested weights based on today:</div><div class="overload-list">${rows}</div>`,
    confirmText: 'Got it',
  });
}

function finishWorkout() {
  syncWorkoutFields();
  const w = state.activeWorkout;
  if (!w.name) w.name = 'Workout – ' + formatDate(w.date);
  if (w.exercises.length === 0) {
    showAlert('No exercises', 'Add at least one exercise before finishing.');
    return;
  }

  const doFinish = () => {
    const suggestions = getOverloadSuggestions(w);
    addWorkout(w);
    state.activeWorkout = null;
    navigate('home');
    if (suggestions.length > 0) setTimeout(() => showOverloadModal(suggestions), 300);
  };

  const allDone = w.exercises.every(ex => ex.sets.every(s => s.done));
  if (allDone) {
    doFinish();
  } else {
    showModal({
      title: 'Not all sets checked',
      msg: 'Some sets haven\'t been marked done. Finish the workout anyway?',
      confirmText: 'Finish Workout',
      confirmClass: 'btn-danger-solid',
      cancelText: 'Keep Going',
      onConfirm: doFinish,
    });
  }
}

// ── Day View (calendar drill-down) ────────────────────────
window.selectDay = function(iso, from) {
  const workouts = loadWorkouts();
  const existing = workouts.find(w => w.date === iso);
  state.dayWorkout = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), date: iso, name: '', exercises: [] };
  state.dayIsReadOnly = !!(existing && (existing.status ?? 'completed') === 'completed');

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
  state.dayReturnView = from || 'calendar';
  navigate('day');
};

function renderDay() {
  const w = state.dayWorkout;
  if (!w) return;

  const notesEl = document.getElementById('day-notes');
  if (notesEl) notesEl.value = w.notes || '';
  document.getElementById('day-view-title').textContent = formatDateLong(w.date);
  let daySubtitle = w.exercises.length > 0
    ? `${w.exercises.length} exercise${w.exercises.length !== 1 ? 's' : ''}`
    : 'No exercises yet';
  if (w._rirCtx) {
    const { weekInCycle, targetRIR, msLen, isDeloadWeek } = w._rirCtx;
    daySubtitle += isDeloadWeek
      ? ` · Deload Week`
      : ` · Wk ${weekInCycle + 1}/${msLen} · RIR ${targetRIR}`;
  }
  document.getElementById('day-view-subtitle').textContent = daySubtitle;

  const deloadBanner = document.getElementById('day-deload-banner');
  if (deloadBanner) {
    deloadBanner.hidden = !(w._rirCtx && w._rirCtx.isDeloadWeek);
  }

  const readOnlyBanner = document.getElementById('day-readonly-banner');
  const addBtn = document.getElementById('btn-day-add-exercise');
  const finishBtn = document.getElementById('btn-day-finish-workout');
  const notesWrap = document.querySelector('#view-day .notes-action-wrap');

  if (state.dayIsReadOnly) {
    if (readOnlyBanner) readOnlyBanner.hidden = false;
    if (addBtn) addBtn.hidden = true;
    if (finishBtn) finishBtn.hidden = true;
    if (notesWrap) notesWrap.hidden = true;
  } else {
    if (readOnlyBanner) readOnlyBanner.hidden = true;
    if (addBtn) addBtn.hidden = false;
    if (finishBtn) finishBtn.hidden = false;
    if (notesWrap) notesWrap.hidden = false;
  }

  const container = document.getElementById('day-exercises');
  if (w.exercises.length === 0) {
    container.innerHTML = emptyExerciseState();
    if (!state.dayIsReadOnly) {
      document.getElementById('btn-day-finish-workout').disabled = true;
    }
    return;
  }
  container.innerHTML = buildExerciseListHtml(w.exercises, 'day');
  if (!state.dayIsReadOnly) {
    document.getElementById('btn-day-finish-workout').disabled = false;
  }
}

// Save or update the day's workout in localStorage
function persistDay() {
  const w = state.dayWorkout;
  if (!w) return;
  // Sync notes from textarea
  const notesEl = document.getElementById('day-notes');
  if (notesEl) w.notes = notesEl.value.trim() || undefined;

  const workouts = loadWorkouts();
  const exists   = workouts.some(x => x.id === w.id);

  if (w.exercises.length === 0) {
    if (exists) deleteWorkout(w.id);
    return;
  }

  if (!w.name) w.name = formatDate(w.date) + ' Workout';
  if (!w.status) w.status = 'planned';
  if (exists) updateWorkout(w);
  else        addWorkout(w);
}

// ── Shared Exercise Card ──────────────────────────────────
// Used by active workout, day view, and plan template

// Renders a list of exercise cards, inserting SS connector bars between supersetted pairs
function buildExerciseListHtml(exercises, ctx, prMap) {
  let html = '';
  for (let ei = 0; ei < exercises.length; ei++) {
    const prev = exercises[ei - 1];
    const next = exercises[ei + 1];
    const ex   = exercises[ei];
    const connectedAbove = !!(ex.supersetId && prev && prev.supersetId === ex.supersetId);
    const connectedBelow = !!(ex.supersetId && next && next.supersetId === ex.supersetId);
    html += exerciseCardHTML(ex, ei, ctx, exercises.length, prMap, { connectedAbove, connectedBelow });
    if (connectedBelow) {
      html += `<div class="ss-connector-bar"><span class="ss-connector-label">SUPERSET</span></div>`;
    }
  }
  return html;
}

function exerciseCardHTML(ex, ei, ctx, totalCount, prMap, ssInfo = {}) {
  const { connectedAbove = false, connectedBelow = false } = ssInfo;
  const readOnly = ctx === 'day' && state.dayIsReadOnly;
  const canLog   = ctx !== 'planTemplate' && !readOnly;
  const planRIR  = ctx === 'planTemplate' && state.editingPlan && state.editingPlan.rir;
  const muscle   = ex.muscleGroup || getMuscleGroup(ex.name);
  const muscleClass = muscle ? ` muscle-${muscle.toLowerCase().replace(/\s+/g, '-')}` : '';
  const canReorder = ctx !== 'planTemplate' && totalCount > 1 && !readOnly;
  const equip    = getEquipment(ex.name);
  const historicalPR = prMap ? (prMap[ex.name] || 0) : 0;

  const setRows = ex.sets.map((s, si) => {
    const done = s.done || false;
    const isPR = done && s.weight > 0 && s.weight > historicalPR;
    const prBadge = isPR ? `<span class="pr-badge">PR</span>` : '';
    return `
    <tr class="set-row${done ? ' set-row-done' : ''}">
      <td class="set-num-cell">${si + 1}</td>
      <td><input class="set-pill" type="number" min="0" step="${weightUnit() === 'kg' ? '1.25' : '2.5'}" inputmode="decimal"
           value="${s.weight ? toDisplayWeight(s.weight) : ''}" placeholder="–"
           onchange="handleSetChange('${ctx}',${ei},${si},'weight',this.value)" ${readOnly ? 'disabled' : ''}/>
        ${prBadge}</td>
      ${planRIR ? '' : `<td><input class="set-pill" type="number" min="0" inputmode="numeric"
           value="${s.reps || ''}" placeholder="${(s.rir != null || s.erTarget != null) ? 'Log reps' : '–'}"
           onchange="handleSetChange('${ctx}',${ei},${si},'reps',this.value)" ${readOnly ? 'disabled' : ''}/>
        ${(canLog && s.rir != null) ? `<span class="set-rir-label set-rir-label-tap" onclick="showTrainingMethodInfo('rir')">@RIR&nbsp;${s.rir}</span>` : ''}
        ${(canLog && s.erTarget != null) ? `<span class="set-rir-label set-rir-label-tap" onclick="showTrainingMethodInfo('er')">ER&nbsp;${s.erTarget}</span>` : ''}</td>`}
      ${canLog ? `<td class="set-log-cell">
        <label class="set-check-wrap">
          <input type="checkbox" ${done ? 'checked' : ''}
            onchange="handleSetDone('${ctx}',${ei},${si},this.checked)" />
          <span class="set-check-box"></span>
        </label>
      </td>` : (readOnly && done ? `<td class="set-log-cell"><span style="color:var(--green);font-size:14px">✓</span></td>` : `<td></td>`)}
      <td><button class="btn-remove-set" onclick="handleRemoveSet('${ctx}',${ei},${si})">×</button></td>
    </tr>`;
  }).join('');

  const muscleTag = muscle
    ? `<div class="ex-muscle-tag ex-muscle-${muscle.toLowerCase().replace(/\s+/g,'-')}">${muscle.toUpperCase()}</div>`
    : '';

  const ssCardClass = connectedAbove && connectedBelow ? ' ss-card-mid'
                    : connectedAbove                  ? ' ss-card-end'
                    : connectedBelow                  ? ' ss-card-start'
                    : '';

  return `
    <div class="active-exercise-card${muscleClass}${ssCardClass}">
      ${muscleTag}
      <div class="active-exercise-header">
        <div class="active-exercise-name-row">
          ${canReorder ? `<div class="reorder-btns">
            <button class="reorder-btn${ei === 0 ? ' disabled' : ''}" onclick="handleMoveExercise('${ctx}',${ei},'up')" ${ei === 0 ? 'disabled' : ''}>▲</button>
            <button class="reorder-btn${ei === totalCount - 1 ? ' disabled' : ''}" onclick="handleMoveExercise('${ctx}',${ei},'down')" ${ei === totalCount - 1 ? 'disabled' : ''}>▼</button>
          </div>` : ''}
          <div class="active-exercise-info">
            <div class="active-exercise-name active-exercise-name-tap" onclick="openExerciseHistory('${ctx}',${ei},event)">${escHtml(ex.name)}</div>
            ${equip ? `<div class="active-exercise-equip">${equip}</div>` : ''}
          </div>
        </div>
        <div class="active-exercise-actions">
          ${!readOnly ? `<button class="btn btn-secondary btn-sm" onclick="handleSwapExercise('${ctx}',${ei})" title="Swap exercise">⇄ Swap</button>` : ''}
          ${canLog ? `<button class="btn btn-sm ${ex.supersetId ? 'btn-ss-active' : 'btn-secondary'}" onclick="handleLinkSuperset('${ctx}',${ei})" title="Superset">SS</button>` : ''}
          ${!readOnly ? `<button class="btn btn-secondary btn-sm" onclick="handleEditExercise('${ctx}',${ei})">Edit</button>` : ''}
          ${!readOnly ? `<button class="btn btn-icon btn-secondary" onclick="handleRemoveExercise('${ctx}',${ei})" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>` : ''}
        </div>
      </div>
      <table class="sets-editor">
        <thead>
          <tr>
            <th class="set-num-head">#</th>
            <th style="cursor:pointer;user-select:none" onclick="toggleWeightUnit('${ctx}')" title="Tap to switch units">Weight (${weightUnit()}) ↕</th>
            ${planRIR ? '' : `<th>Reps</th>`}
            ${canLog ? '<th class="set-log-head">Log</th>' : ''}
            <th></th>
          </tr>
        </thead>
        <tbody>${setRows}</tbody>
      </table>
      ${!readOnly ? `<button class="btn btn-ghost btn-sm mt-8" onclick="handleAddSet('${ctx}',${ei})">+ Add Set</button>` : ''}
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
  workoutFor(ctx).exercises[ei].sets[si][field] = field === 'weight' ? fromDisplayWeight(val) : (parseFloat(val) || 0);
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
  const ex  = workoutFor(ctx).exercises[ei];
  const set = ex.sets[si];
  set.done = checked;
  if (checked) {
    if (set.rir != null) set.actualReps = set.reps;
    navigator.vibrate && navigator.vibrate(30);
    startRestTimer(ex.repMode === 'er' ? 15 : 90);
    // PR detection (active workout only)
    if (ctx === 'workout' && set.weight > 0) {
      const historical = buildPRMap();
      const historicalMax = historical[ex.name] || 0;
      const sessionMax   = state._sessionPRs[ex.name] || 0;
      if (set.weight > Math.max(historicalMax, sessionMax)) {
        state._sessionPRs[ex.name] = set.weight;
        showPRToast(ex.name, set.weight);
      } else if (set.weight > sessionMax) {
        state._sessionPRs[ex.name] = set.weight;
      }
    }
  } else {
    // un-checking a set — stop the timer if it's from that set
    clearInterval(_restInterval);
    document.getElementById('rest-timer').hidden = true;
  }
  rerenderFor(ctx);
};

window.handleEditExercise = function(ctx, ei) {
  state.exerciseContext    = ctx;
  state.editingExIndex     = ei;
  state.exMusclePickerFrom = null;
  navigate('exercise');
};

window.handleRemoveExercise = function(ctx, ei) {
  workoutFor(ctx).exercises.splice(ei, 1);
  rerenderFor(ctx);
};

// ── Superset ──────────────────────────────────────────────

window.handleLinkSuperset = function(ctx, ei) {
  const exercises = workoutFor(ctx).exercises;
  const ex = exercises[ei];

  if (ex.supersetId) {
    showModal({
      title: 'Remove Superset',
      msg: `Unlink <strong>${escHtml(ex.name)}</strong> from its superset partner?`,
      confirmText: 'Unlink',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger-solid',
      onConfirm: () => {
        const id = ex.supersetId;
        exercises.forEach(e => { if (e.supersetId === id) delete e.supersetId; });
        rerenderFor(ctx);
      },
    });
    return;
  }

  const available = exercises
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => i !== ei && !e.supersetId);

  if (available.length === 0) {
    showAlert('No available exercises', 'Add another exercise first, or unlink existing supersets.');
    return;
  }

  state._ssCtx     = ctx;
  state._ssEi      = ei;
  state._ssOptions = available;

  const listHtml = available.map(({ e }, idx) =>
    `<div class="swap-option" onclick="confirmSuperset(${idx})">${escHtml(e.name)}</div>`
  ).join('');

  showModal({
    title: 'Link as Superset',
    msg: `<div class="swap-prompt">Alternate <strong>${escHtml(ex.name)}</strong> with:</div><div class="swap-list">${listHtml}</div>`,
    confirmText: 'Cancel',
    confirmClass: 'btn-secondary',
  });
};

window.confirmSuperset = function(optionIdx) {
  document.getElementById('modal-overlay').hidden = true;
  const { _ssCtx: ctx, _ssEi: ei, _ssOptions: opts } = state;
  const exercises = workoutFor(ctx).exercises;
  const ssId = 'ss-' + uid();
  exercises[ei].supersetId              = ssId;
  exercises[opts[optionIdx].i].supersetId = ssId;
  rerenderFor(ctx);
};

// ── Exercise Swap ─────────────────────────────────────────

window.handleSwapExercise = function(ctx, ei) {
  const ex     = workoutFor(ctx).exercises[ei];
  const muscle = ex.muscleGroup || getMuscleGroup(ex.name);
  if (!muscle) {
    showAlert('No muscle group', 'Assign a muscle group to this exercise before swapping.');
    return;
  }
  const options = (MUSCLE_MAP[muscle] || []).filter(n => n !== ex.name);
  if (options.length === 0) {
    showAlert('No alternatives', `No other exercises found for ${muscle}.`);
    return;
  }
  state._swapCtx     = ctx;
  state._swapEi      = ei;
  state._swapOptions = options;

  const listHtml = options.map((n, i) =>
    `<div class="swap-option" onclick="confirmSwap(${i})">${escHtml(n)}</div>`
  ).join('');

  showModal({
    title: `Swap — ${muscle}`,
    msg: `<div class="swap-prompt">Replacing: <strong>${escHtml(ex.name)}</strong></div><div class="swap-list">${listHtml}</div>`,
    confirmText: 'Cancel',
    confirmClass: 'btn-secondary',
  });
};

window.confirmSwap = function(optionIdx) {
  document.getElementById('modal-overlay').hidden = true;
  const { _swapCtx: ctx, _swapEi: ei, _swapOptions: options } = state;
  const ex  = workoutFor(ctx).exercises[ei];
  ex.name   = options[optionIdx];
  ex.muscleGroup = getMuscleGroup(ex.name) || ex.muscleGroup;
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

// ── Exercise Muscle Picker ────────────────────────────────
function renderExMusclePickerView() {
  const muscles = Object.keys(MUSCLE_MAP);
  document.getElementById('ex-muscle-picker-grid').innerHTML =
    [...muscles, 'All'].map(m => {
      const cssKey = m.toLowerCase().replace(/\s+/g, '-');
      return `<button class="ex-muscle-card ex-muscle-${cssKey}" onclick="selectExMuscle('${m}')">
        <span class="ex-muscle-card-name">${m}</span>
      </button>`;
    }).join('');
}

window.selectExMuscle = function(muscle) {
  state.exMuscleFilter     = muscle === 'All' ? null : muscle;
  state.exEquipFilter      = null;
  state.exMusclePickerFrom = 'exercise-muscle';
  state.editingExIndex     = null;
  navigate('exercise');
};

// ── Exercise Form ─────────────────────────────────────────
function renderExerciseForm() {
  const editing = state.editingExIndex !== null;
  document.getElementById('exercise-view-title').textContent = editing ? 'Edit Exercise' : 'Add Exercise';

  // Show selected muscle in subtitle when arriving from the muscle picker
  const subtitleEl = document.getElementById('exercise-view-subtitle');
  if (!editing && state.exMusclePickerFrom === 'exercise-muscle') {
    subtitleEl.textContent = state.exMuscleFilter || 'All Muscles';
    subtitleEl.hidden = false;
  } else {
    subtitleEl.hidden = true;
  }

  if (editing) {
    const ex = workoutFor(state.exerciseContext).exercises[state.editingExIndex];
    document.getElementById('exercise-name').value = ex.name;
    state.formSets = ex.sets.map(s => ({ ...s }));
    state.formRepMode = ex.repMode || 'target';
    state.customExMuscleGroup = ex.muscleGroup || null;
    updateSelectedExerciseName(ex.name);
    state.exMuscleFilter = null; // edit mode: show all
    state.exEquipFilter  = null;
  } else {
    document.getElementById('exercise-name').value = '';
    state.formSets = [{ reps: 0, weight: 0 }];
    state.formRepMode = 'target';
    state.customExMuscleGroup = null;
    updateSelectedExerciseName('');
    // exMuscleFilter was set by selectExMuscle — preserve it
    state.exEquipFilter = null;
  }

  // Populate chips and filter
  const filterInput = document.getElementById('ex-filter');
  filterInput.value = '';
  document.getElementById('ex-search-clear').hidden = true;
  renderExFilterTabs();
  renderExChips('');
  filterInput.oninput = () => {
    document.getElementById('ex-search-clear').hidden = !filterInput.value;
    refreshChips();
  };

  renderSetRows();
}

function renderExFilterTabs() {
  const equips = Object.keys(EXERCISES);
  const ef = state.exEquipFilter;

  const equipBtns = equips.map(e => {
    const active = ef === e ? ' active' : '';
    return `<button class="ex-filter-btn${active}" onclick="setEquipFilter('${e}')">${e}</button>`;
  }).join('');

  document.getElementById('ex-filter-tabs').innerHTML = `
    <div class="ex-filter-section">
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
  state.customExMuscleGroup = null;
  document.getElementById('exercise-name').value = name;
  updateSelectedExerciseName(name);
};

function updateSelectedExerciseName(name) {
  const el = document.getElementById('selected-exercise-name');
  if (!el) return;
  if (name) {
    const muscle = getMuscleGroup(name) || state.customExMuscleGroup || '';
    const muscleClass = muscle ? ` ex-muscle-${muscle.toLowerCase().replace(/\s+/g, '-')}` : '';
    const muscleTag = muscle
      ? ` <span class="ex-muscle-tag${muscleClass}" style="font-size:10px;padding:2px 8px;vertical-align:middle;margin-left:6px">${muscle.toUpperCase()}</span>`
      : '';
    el.innerHTML = `<span class="selected-ex-label">Selected:</span> <span class="selected-ex-name">${escHtml(name)}</span>${muscleTag}`;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

window.clearExSearch = function() {
  const input = document.getElementById('ex-filter');
  input.value = '';
  document.getElementById('ex-search-clear').hidden = true;
  input.focus();
  refreshChips();
};

window.openCustomExModal = function() {
  const muscles = Object.keys(MUSCLE_MAP);
  state._pendingCustomMuscle = state.customExMuscleGroup || null;
  showModal({
    title: 'Custom Exercise',
    msg: `
      <div class="field-label" style="margin-top:4px;margin-bottom:8px">1. Select Muscle Group</div>
      <div class="custom-ex-muscle-grid" id="custom-ex-muscle-grid">
        ${muscles.map(m => `<button class="custom-ex-muscle-btn${state._pendingCustomMuscle === m ? ' active' : ''}" data-muscle="${escHtml(m)}" onclick="selectCustomExMuscle('${escHtml(m)}')">${escHtml(m)}</button>`).join('')}
      </div>
      <div class="field-label" style="margin-top:14px">2. Exercise Name</div>
      <input type="text" id="modal-custom-ex-name" autocomplete="off"
        style="margin-top:6px;width:100%;background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;color:var(--text);font-size:15px;outline:none"
        placeholder="e.g. Banded Pull-Apart" />
      <div id="modal-custom-ex-error" style="color:var(--red);font-size:13px;font-weight:600;margin-top:8px;min-height:18px"></div>`,
    confirmText: 'Add',
    cancelText: 'Cancel',
    onConfirm: () => {
      const nameEl  = document.getElementById('modal-custom-ex-name');
      const errEl   = document.getElementById('modal-custom-ex-error');
      const name    = nameEl ? nameEl.value.trim() : '';
      if (!state._pendingCustomMuscle) {
        if (errEl) errEl.textContent = 'Please select a muscle group first.';
        return false; // keep modal open
      }
      if (!name) {
        if (errEl) errEl.textContent = 'Please enter a name for the exercise.';
        if (nameEl) nameEl.focus();
        return false; // keep modal open
      }
      state.customExMuscleGroup = state._pendingCustomMuscle;
      state._pendingCustomMuscle = null;
      document.getElementById('exercise-name').value = name;
      updateSelectedExerciseName(name);
    },
    onCancel: () => { state._pendingCustomMuscle = null; },
  });
  setTimeout(() => {
    // Don't auto-focus name — user should select muscle first
  }, 80);
};

window.selectCustomExMuscle = function(muscle) {
  state._pendingCustomMuscle = muscle;
  document.querySelectorAll('.custom-ex-muscle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.muscle === muscle);
  });
};

function renderSetRows() {
  const inRirTemplate = state.exerciseContext === 'planTemplate'
    && state.editingPlan && state.editingPlan.rir;

  // In an RIR plan template, default mode is planRir UNLESS user toggled this exercise to ER
  const mode = inRirTemplate
    ? (state.formRepMode === 'er' ? 'er' : 'planRir')
    : state.formRepMode;

  // In an RIR template: show a compact ER toggle so individual exercises can opt into ER
  const modeToggle = inRirTemplate
    ? `<div class="rep-mode-toggle" style="margin-bottom:4px">
        <button class="rep-mode-btn${mode !== 'er' ? ' active' : ''}" onclick="setFormRepMode('planRir')">RIR (auto)</button>
        <button class="rep-mode-btn${mode === 'er' ? ' active' : ''}" onclick="setFormRepMode('er')">ER (explosive)</button>
      </div>`
    : `<div class="rep-mode-toggle">
        <button class="rep-mode-btn${mode === 'target' ? ' active' : ''}" onclick="setFormRepMode('target')">Target Reps</button>
        <button class="rep-mode-btn${mode === 'rir' ? ' active' : ''}" onclick="setFormRepMode('rir')">RIR</button>
        <button class="rep-mode-btn${mode === 'er' ? ' active' : ''}" onclick="setFormRepMode('er')">ER</button>
      </div>`;

  document.getElementById('sets-form-body').innerHTML = modeToggle + state.formSets.map((s, i) => {
    let repFields = '';
    if (mode === 'target') {
      repFields = `<div class="set-field">
          <span class="set-field-label">Target Reps</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.reps || ''}" placeholder="0"
            onchange="formSetChange(${i},'reps',this.value)" />
        </div>`;
    } else if (mode === 'rir') {
      repFields = `<div class="set-field">
          <span class="set-field-label">RIR Target</span>
          <input class="set-input" type="number" min="0" max="10" inputmode="numeric"
            value="${s.rir != null ? s.rir : ''}" placeholder="e.g. 2"
            onchange="formSetChange(${i},'rir',this.value)" />
        </div>`;
    } else if (mode === 'er') {
      repFields = `<div class="set-field">
          <span class="set-field-label">Ignition Reps</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.reps || ''}" placeholder="e.g. 12"
            onchange="formSetChange(${i},'reps',this.value)" />
        </div>
        <div class="set-field">
          <span class="set-field-label">ER Target (total)</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.erTarget || ''}" placeholder="e.g. 20"
            onchange="formSetChange(${i},'erTarget',this.value)" />
        </div>`;
    }

    return `
    <div class="set-block">
      <div class="set-block-header">
        <span class="set-block-num">Set ${i + 1}</span>
        <button class="btn-remove-set" onclick="formRemoveSet(${i})">×</button>
      </div>
      <div class="set-block-inputs">
        <div class="set-field">
          <span class="set-field-label">Starting Weight (${weightUnit()})</span>
          <input class="set-input" type="number" min="0" step="${weightUnit() === 'kg' ? '1.25' : '2.5'}" inputmode="decimal"
            value="${s.weight ? toDisplayWeight(s.weight) : ''}" placeholder="0"
            onchange="formSetChange(${i},'weight',this.value)" />
        </div>
        ${repFields}
      </div>
    </div>`;
  }).join('');
}

window.setFormRepMode = function(mode) {
  state.formRepMode = mode;
  renderSetRows();
};

window.formSetChange = function(i, field, val) {
  state.formSets[i][field] = field === 'weight' ? fromDisplayWeight(val) : (parseFloat(val) || 0);
};

window.formRemoveSet = function(i) {
  if (state.formSets.length === 1) return;
  state.formSets.splice(i, 1);
  renderSetRows();
};

function addFormSet() {
  const last = state.formSets.slice(-1)[0];
  const newSet = { reps: last ? last.reps : 0, weight: last ? last.weight : 0 };
  if (last?.rir != null) newSet.rir = last.rir;
  if (last?.erTarget != null) newSet.erTarget = last.erTarget;
  state.formSets.push(newSet);
  renderSetRows();
}

function saveExercise() {
  const name = document.getElementById('exercise-name').value.trim();
  if (!name) { showAlert('No exercise selected', 'Select an exercise from the list or tap + Add Custom Exercise.'); return; }

  // Flush any uncommitted input values
  const inRirTemplate = state.exerciseContext === 'planTemplate'
    && state.editingPlan && state.editingPlan.rir;
  const mode = inRirTemplate ? 'planRir' : state.formRepMode;
  document.querySelectorAll('#sets-form-body .set-block').forEach((block, idx) => {
    const inputs = block.querySelectorAll('input');
    state.formSets[idx].weight = fromDisplayWeight(inputs[0].value);
    if (mode === 'target') {
      if (inputs[1]) state.formSets[idx].reps = parseFloat(inputs[1].value) || 0;
    } else if (mode === 'rir') {
      if (inputs[1]) state.formSets[idx].rir = parseFloat(inputs[1].value) || 0;
    } else if (mode === 'er') {
      if (inputs[1]) state.formSets[idx].reps = parseFloat(inputs[1].value) || 0;
      if (inputs[2]) state.formSets[idx].erTarget = parseFloat(inputs[2].value) || 0;
    }
  });

  // Strip fields that don't belong to the current mode (prevents stale RIR/ER badges)
  state.formSets.forEach(s => {
    if (mode === 'target' || mode === 'planRir') { delete s.rir; delete s.erTarget; }
    else if (mode === 'rir')                     { delete s.erTarget; }
    else if (mode === 'er')                      { delete s.rir; }
  });

  // For RIR templates: store repMode only when exercise is ER (marks it as ad-hoc ER)
  const resolvedMuscle = state.customExMuscleGroup || getMuscleGroup(name) || undefined;
  const exercise = {
    name,
    repMode: inRirTemplate ? (mode === 'er' ? 'er' : undefined) : state.formRepMode,
    muscleGroup: resolvedMuscle,
    sets: inRirTemplate
      ? state.formSets
      : state.formSets.filter(s => s.reps > 0 || s.weight > 0 || s.erTarget > 0),
  };
  if (exercise.sets.length === 0) exercise.sets = [{ reps: 0, weight: 0 }];
  state.customExMuscleGroup = null;

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
        dates.add(localISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } catch (e) { /* don't let a bad plan kill the calendar */ }
  return dates;
}

function calcStreak(workouts) {
  const dates = new Set(
    workouts.filter(w => (w.status ?? 'completed') === 'completed').map(w => w.date)
  );
  let streak = 0;
  const d = new Date();
  if (!dates.has(localISO(d))) d.setDate(d.getDate() - 1); // allow today not yet logged
  while (dates.has(localISO(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function advanceMonth(delta) {
  const c = state.calendar;
  c.month += delta;
  if (c.month > 11) { c.year++; c.month = 0; }
  if (c.month < 0)  { c.year--; c.month = 11; }
  renderCalendar();
}

window.jumpCalendarToToday = function() {
  const now = new Date();
  state.calendar.year  = now.getFullYear();
  state.calendar.month = now.getMonth();
  renderCalendar();
};

function renderCalendar() {
  const { year, month } = state.calendar;
  const today = todayISO();
  const now   = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // Jump-to-today button
  const jumpBtn = document.getElementById('cal-jump-today');
  if (jumpBtn) jumpBtn.hidden = isCurrentMonth;

  document.getElementById('cal-month-label').textContent =
    new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const allWorkouts = loadWorkouts();
  const workoutDates = new Set(
    allWorkouts.filter(w => (w.status ?? 'completed') === 'completed').map(w => w.date)
  );
  const savedPlannedDates = new Set(
    allWorkouts.filter(w => (w.status ?? 'completed') === 'planned').map(w => w.date)
  );
  const plan         = getActivePlan();
  const plannedDates = planDatesSet();

  // ── Mesocycle week banner ──
  const weekBannerEl = document.getElementById('cal-week-banner');
  if (weekBannerEl) {
    const rir = plan ? getRirContext(plan, today) : null;
    if (rir) {
      const label = rir.isDeloadWeek
        ? `Deload Week  ·  RIR 3 (easy)`
        : `Block ${rir.blockNum + 1}  ·  Week ${rir.weekInCycle + 1} / ${rir.msLen}  ·  RIR ${rir.targetRIR}`;
      weekBannerEl.textContent = label;
      weekBannerEl.className = `cal-week-banner${rir.isDeloadWeek ? ' cal-week-banner-deload' : ''}`;
      weekBannerEl.hidden = false;
    } else {
      weekBannerEl.hidden = true;
    }
  }

  // ── Month stats (streak + completion) ──
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr    = `${year}-${String(month + 1).padStart(2, '0')}`;
  let plannedInMonth = 0, loggedInMonth = 0;
  for (const iso of plannedDates) {
    if (!iso.startsWith(monthStr) || iso > today) continue;
    plannedInMonth++;
    if (workoutDates.has(iso)) loggedInMonth++;
  }
  const streak     = calcStreak(allWorkouts);
  const statsEl    = document.getElementById('cal-month-stats');
  if (statsEl) {
    const parts = [];
    if (streak > 0) parts.push(`🔥 ${streak}-day streak`);
    if (plannedInMonth > 0) parts.push(`${loggedInMonth} / ${plannedInMonth} workouts logged`);
    statsEl.innerHTML = parts.map(p => `<span class="cal-stat-chip">${p}</span>`).join('');
    statsEl.hidden = parts.length === 0;
  }

  // ── Build grid cells ──
  const DOW      = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDow = new Date(year, month, 1).getDay();

  // Pad to full weeks
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  let html = `<div class="cal-header-row">${DOW.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}</div>`;

  for (let w = 0; w < cells.length / 7; w++) {
    const week      = cells.slice(w * 7, w * 7 + 7);
    const firstIso  = week.find(c => c !== null);
    let   weekClass = 'cal-week-row';
    if (plan && firstIso) {
      const rir = getRirContext(plan, firstIso);
      if (rir && rir.isDeloadWeek) weekClass += ' deload-week';
    }

    html += `<div class="${weekClass}">`;
    for (const iso of week) {
      if (!iso) { html += `<div class="cal-day cal-empty"></div>`; continue; }

      const d          = parseInt(iso.split('-')[2], 10);
      const isToday    = iso === today;
      const isPast     = iso < today;
      const hasLog     = workoutDates.has(iso);
      const hasSvdPlan = savedPlannedDates.has(iso);
      const hasPlan    = plannedDates.has(iso);
      const isPlanned  = hasPlan || hasSvdPlan;
      const isMissed   = isPast && isPlanned && !hasLog;

      // Muscle group label from plan template
      let dayLabel = '';
      if (plan && hasPlan && plan.dayTemplates) {
        const dow = new Date(iso + 'T00:00:00').getDay();
        const exs = plan.dayTemplates[dow] || [];
        if (exs.length > 0) {
          const muscles = [...new Set(exs.map(e => e.muscleGroup || getMuscleGroup(e.name)).filter(Boolean))];
          dayLabel = muscles.slice(0, 2).map(m => m.slice(0, 4)).join('/');
        }
      }

      const cls = ['cal-day', isToday ? 'today' : '', isMissed ? 'missed' : '', hasLog ? 'logged' : '']
        .filter(Boolean).join(' ');

      const dots = (hasLog     ? `<span class="dot dot-workout"></span>` : '') +
                   (!hasLog && isPlanned && !isMissed ? `<span class="dot dot-plan"></span>` : '') +
                   (isMissed   ? `<span class="dot dot-missed"></span>` : '');

      html += `
        <div class="${cls}" onclick="selectDay('${iso}')"
             ontouchstart="calDayTouchStart(event,'${iso}')"
             ontouchend="calDayTouchEnd(event)"
             ontouchmove="calDayTouchMove(event)">
          <span class="cal-day-num">${d}</span>
          ${dayLabel ? `<span class="cal-day-label">${dayLabel}</span>` : ''}
          ${dots ? `<div class="cal-dots">${dots}</div>` : ''}
        </div>`;
    }
    html += `</div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
  setupCalendarSwipe();
}

// ── Calendar swipe & long-press ───────────────────────────
let _calSwipeX = 0;
let _calSwipeMoved = false;
let _calLongPressTimer = null;
let _calLongPressIso   = null;

function setupCalendarSwipe() {
  const section = document.getElementById('view-calendar');
  if (!section || section._swipeReady) return;
  section._swipeReady = true;
  let sx = 0, moved = false;
  section.addEventListener('touchstart', e => {
    // only track swipes that start outside the popup
    if (document.getElementById('cal-day-popup') && !document.getElementById('cal-day-popup').hidden) return;
    sx = e.touches[0].clientX; moved = false;
  }, { passive: true });
  section.addEventListener('touchmove', () => { moved = true; }, { passive: true });
  section.addEventListener('touchend', e => {
    if (moved) {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 55) advanceMonth(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
}

window.calDayTouchStart = function(e, iso) {
  _calLongPressIso = iso;
  _calSwipeX = e.touches[0].clientX;
  _calSwipeMoved = false;
  clearTimeout(_calLongPressTimer);
  _calLongPressTimer = setTimeout(() => {
    if (!_calSwipeMoved) openCalDayPopup(_calLongPressIso);
  }, 450);
};
window.calDayTouchMove = function() {
  _calSwipeMoved = true;
  clearTimeout(_calLongPressTimer);
};
window.calDayTouchEnd = function() {
  clearTimeout(_calLongPressTimer);
};

window.openCalDayPopup = function(iso) {
  const popup   = document.getElementById('cal-day-popup');
  const dateEl  = document.getElementById('cal-popup-date');
  const bodyEl  = document.getElementById('cal-popup-body');
  const openBtn = document.getElementById('cal-popup-open');
  if (!popup) return;

  dateEl.textContent = formatDateLong(iso);

  const allWorkouts = loadWorkouts();
  const logged = allWorkouts.find(w => w.date === iso && (w.status ?? 'completed') === 'completed');
  const plan   = getActivePlan();
  const dow    = new Date(iso + 'T00:00:00').getDay();
  const tplExs = plan && plan.dayTemplates ? (plan.dayTemplates[dow] || []) : [];

  let html = '';
  if (logged && logged.exercises.length > 0) {
    html = `<div class="popup-section-label">Logged</div>` +
      logged.exercises.map(ex =>
        `<div class="popup-ex-row"><span class="popup-ex-name">${escHtml(ex.name)}</span>
         <span class="popup-ex-meta">${ex.sets.length} set${ex.sets.length !== 1 ? 's' : ''}</span></div>`
      ).join('');
  } else if (tplExs.length > 0) {
    html = `<div class="popup-section-label">Planned</div>` +
      tplExs.map(ex =>
        `<div class="popup-ex-row"><span class="popup-ex-name">${escHtml(ex.name)}</span>
         <span class="popup-ex-meta">${ex.sets.length} set${ex.sets.length !== 1 ? 's' : ''}</span></div>`
      ).join('');
  } else {
    html = `<div class="popup-empty">No exercises planned.</div>`;
  }
  bodyEl.innerHTML = html;
  openBtn.onclick = () => { closeCalDayPopup(); selectDay(iso); };
  popup.hidden = false;
};

window.closeCalDayPopup = function() {
  const popup = document.getElementById('cal-day-popup');
  if (popup) popup.hidden = true;
};

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

    // Summary line for the header
    let summary = '';
    if (exercises.length > 0) {
      const muscles = [...new Set(exercises.map(e => e.muscleGroup || getMuscleGroup(e.name)).filter(Boolean))];
      summary = `<div class="plan-day-card-summary">${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}${muscles.length ? ' · ' + muscles.join(', ') : ''}</div>`;
    }

    // Exercise rows with edit + remove buttons
    const exRows = exercises.length === 0
      ? `<div class="plan-day-empty">No exercises yet — add one below.</div>`
      : exercises.map((ex, ei) => {
          const modeBadge = ex.repMode === 'er'
            ? `<span class="er-badge">ER</span>`
            : (plan.rir ? `<span class="rir-badge">RIR</span>` : '');
          return `
          <div class="plan-day-ex-row">
            <div class="plan-day-ex-info">
              <div class="plan-day-ex-name">${escHtml(ex.name)}${modeBadge}</div>
              <div class="plan-day-ex-meta">${ex.sets.length} set${ex.sets.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="plan-day-ex-actions">
              <button class="btn btn-secondary btn-sm" onclick="planTemplateEditEx(${dow},${ei})">Edit</button>
              <button class="btn btn-icon btn-secondary" onclick="planTemplateRemoveEx(${dow},${ei})" title="Remove">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>`;
        }).join('');

    return `
      <div class="plan-day-card">
        <div class="plan-day-card-header">
          <div>
            <div class="plan-day-card-title">${DOW_NAMES[dow]}</div>
            ${summary}
          </div>
        </div>
        <div class="plan-day-card-body">
          ${exRows}
          <button class="btn btn-ghost btn-sm plan-day-add-btn" onclick="planTemplateAddEx(${dow})">+ Add Exercise</button>
        </div>
      </div>`;
  }).join('');
}

window.planTemplateAddEx = function(dow) {
  state.editingPlan.dayTemplates[dow] = state.editingPlan.dayTemplates[dow] || [];
  state.editingPlanDow     = dow;
  state.exerciseContext    = 'planTemplate';
  state.editingExIndex     = null;
  state.exMusclePickerFrom = null;
  navigate('exercise-muscle');
};

window.planTemplateEditEx = function(dow, ei) {
  state.editingPlanDow     = dow;
  state.exerciseContext    = 'planTemplate';
  state.editingExIndex     = ei;
  state.exMusclePickerFrom = null;
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

// ── Plan Templates Library ────────────────────────────────
const PLAN_TEMPLATES = [
  {
    id: 'tpl-ppl',
    name: 'Push / Pull / Legs',
    description: '6-day split. Chest, shoulders & triceps → Back & biceps → Legs & glutes, repeated twice per week.',
    tags: ['Intermediate', 'Hypertrophy'],
    workoutDays: [1, 2, 3, 5, 6, 0], // Mon–Sat + Sun
    defaultWeeks: 8,
    dayLabels: { 1: 'Push A', 2: 'Pull A', 3: 'Legs A', 5: 'Push B', 6: 'Pull B', 0: 'Legs B' },
    dayTemplates: {
      1: [ // Push A
        { name: 'Barbell Bench Press',     muscleGroup: 'Chest',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Incline Bench Press', muscleGroup: 'Chest', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Chest Fly',          muscleGroup: 'Chest',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Overhead Press',   muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Lateral Raise',   muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Tricep Pushdown',          muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Skull Crusher',            muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      2: [ // Pull A
        { name: 'Barbell Bent-Over Row',    muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Lat Pulldown',             muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Cable Row',         muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Face Pull',                muscleGroup: 'Shoulders',sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Curl',             muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hammer Curl',              muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      3: [ // Legs A
        { name: 'Barbell Back Squat',       muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Leg Press',                muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Romanian Deadlift',        muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Lying Leg Curl',           muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hip Thrust',               muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Standing Calf Raise',      muscleGroup: 'Calves',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      5: [ // Push B — same muscles, different exercises
        { name: 'Dumbbell Bench Press',     muscleGroup: 'Chest',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Chest Press',        muscleGroup: 'Chest',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Machine Chest Press',      muscleGroup: 'Chest',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Arnold Press',             muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Lateral Raise',      muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Rope Pushdown',            muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Overhead Tricep Extension',muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      6: [ // Pull B
        { name: 'Pull-Up',                  muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Single-Arm Row',  muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Straight-Arm Pulldown',    muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Rear Delt Fly',      muscleGroup: 'Shoulders',sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'EZ-Bar Curl',              muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Concentration Curl',       muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      0: [ // Legs B
        { name: 'Hack Squat',               muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Bulgarian Split Squat',    muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Leg Curl',          muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Good Morning',             muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Kickback',           muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Calf Raise',        muscleGroup: 'Calves',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
    },
  },
  {
    id: 'tpl-ul',
    name: 'Upper / Lower',
    description: '4-day split. Upper body strength & hypertrophy alternating with lower body. Great for beginners and intermediates.',
    tags: ['Beginner', 'Intermediate', 'Hypertrophy'],
    workoutDays: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
    defaultWeeks: 8,
    dayTemplates: {
      1: [ // Upper A
        { name: 'Barbell Bench Press',     muscleGroup: 'Chest',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Bent-Over Row',   muscleGroup: 'Back',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Overhead Press',  muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Lat Pulldown',            muscleGroup: 'Back',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Curl',            muscleGroup: 'Biceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Skull Crusher',           muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      2: [ // Lower A
        { name: 'Barbell Back Squat',      muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Romanian Deadlift',       muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Leg Press',               muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Lying Leg Curl',          muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hip Thrust',              muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Standing Calf Raise',     muscleGroup: 'Calves',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      4: [ // Upper B
        { name: 'Dumbbell Incline Bench Press', muscleGroup: 'Chest', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Pull-Up',                 muscleGroup: 'Back',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Lateral Raise',  muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Cable Row',        muscleGroup: 'Back',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hammer Curl',             muscleGroup: 'Biceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Tricep Pushdown',         muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      5: [ // Lower B
        { name: 'Barbell Deadlift',        muscleGroup: 'Back',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hack Squat',              muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Bulgarian Split Squat',   muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Leg Curl',         muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Hip Abduction',     muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Calf Raise',       muscleGroup: 'Calves',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
    },
  },
  {
    id: 'tpl-fb',
    name: 'Full Body (3×/wk)',
    description: '3-day full body. Every session trains all major muscle groups. Great for beginners or time-crunched athletes.',
    tags: ['Beginner', 'Strength', 'Time-Efficient'],
    workoutDays: [1, 3, 5], // Mon, Wed, Fri
    defaultWeeks: 6,
    dayTemplates: {
      1: [ // Day A
        { name: 'Barbell Back Squat',      muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Bench Press',     muscleGroup: 'Chest',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Bent-Over Row',   muscleGroup: 'Back',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Overhead Press',  muscleGroup: 'Shoulders',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Curl',            muscleGroup: 'Biceps',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Tricep Pushdown',         muscleGroup: 'Triceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      3: [ // Day B
        { name: 'Romanian Deadlift',       muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Incline Bench Press', muscleGroup: 'Chest', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Pull-Up',                 muscleGroup: 'Back',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Arnold Press',            muscleGroup: 'Shoulders',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hammer Curl',             muscleGroup: 'Biceps',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Skull Crusher',           muscleGroup: 'Triceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      5: [ // Day C
        { name: 'Leg Press',               muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Chest Fly',         muscleGroup: 'Chest',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Cable Row',        muscleGroup: 'Back',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Lateral Raise',  muscleGroup: 'Shoulders',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hip Thrust',              muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Plank',                   muscleGroup: 'Core',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
    },
  },
  {
    id: 'tpl-glutes',
    name: 'Glutes & Legs Focus',
    description: '4-day lower-body priority. Two dedicated glute/leg days plus upper body maintenance. Perfect for glute and leg development.',
    tags: ['Intermediate', 'Hypertrophy', 'Glutes'],
    workoutDays: [1, 2, 4, 5],
    defaultWeeks: 8,
    dayTemplates: {
      1: [ // Glutes & Hamstrings
        { name: 'Hip Thrust',              muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Romanian Deadlift',       muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Kickback',          muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Lying Leg Curl',          muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Abductor Machine',        muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Calf Raise',       muscleGroup: 'Calves',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      2: [ // Upper
        { name: 'Barbell Bench Press',     muscleGroup: 'Chest',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Lat Pulldown',            muscleGroup: 'Back',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Overhead Press',  muscleGroup: 'Shoulders',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Cable Row',        muscleGroup: 'Back',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Curl',           muscleGroup: 'Biceps',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Tricep Pushdown',         muscleGroup: 'Triceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      4: [ // Quads & Glutes
        { name: 'Barbell Back Squat',      muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Bulgarian Split Squat',   muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Leg Extension',           muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Hip Abduction',     muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Hip Extension',     muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Standing Calf Raise',     muscleGroup: 'Calves',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      5: [ // Upper B
        { name: 'Dumbbell Incline Bench Press', muscleGroup: 'Chest', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Pull-Up',                 muscleGroup: 'Back',       sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Face Pull',               muscleGroup: 'Shoulders',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Lateral Raise',  muscleGroup: 'Shoulders',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hammer Curl',             muscleGroup: 'Biceps',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Rope Pushdown',           muscleGroup: 'Triceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
    },
  },
  {
    id: 'tpl-arms',
    name: 'Arms & Chest Specialization',
    description: '4-day plan with extra arm and chest volume. Great for building a bigger upper body when arms and chest are your priority.',
    tags: ['Intermediate', 'Hypertrophy', 'Arms'],
    workoutDays: [1, 2, 4, 5],
    defaultWeeks: 6,
    dayTemplates: {
      1: [ // Chest & Triceps
        { name: 'Barbell Bench Press',     muscleGroup: 'Chest',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Incline Bench Press', muscleGroup: 'Chest', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Chest Fly',         muscleGroup: 'Chest',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Pec Deck Fly',            muscleGroup: 'Chest',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Skull Crusher',           muscleGroup: 'Triceps', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Rope Pushdown',           muscleGroup: 'Triceps', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Overhead Tricep Extension',muscleGroup: 'Triceps', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      2: [ // Back & Biceps
        { name: 'Barbell Deadlift',        muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Pull-Up',                 muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Seated Cable Row',        muscleGroup: 'Back',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Barbell Curl',            muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Incline Dumbbell Curl',   muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hammer Curl',             muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Curl',              muscleGroup: 'Biceps',  sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      4: [ // Shoulders & Arms
        { name: 'Barbell Overhead Press',  muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Dumbbell Lateral Raise',  muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Face Pull',               muscleGroup: 'Shoulders', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'EZ-Bar Curl',             muscleGroup: 'Biceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Tricep Pushdown',         muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Cable Reverse Curl',      muscleGroup: 'Biceps',    sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Single-Arm Pushdown',     muscleGroup: 'Triceps',   sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
      5: [ // Legs
        { name: 'Barbell Back Squat',      muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Romanian Deadlift',       muscleGroup: 'Hamstrings', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Leg Press',               muscleGroup: 'Quads',      sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Hip Thrust',              muscleGroup: 'Glutes',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
        { name: 'Standing Calf Raise',     muscleGroup: 'Calves',     sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      ],
    },
  },
];

function renderPlanTemplates() {
  const container = document.getElementById('plan-templates-list');
  if (!container) return;
  container.innerHTML = PLAN_TEMPLATES.map(tpl => {
    const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const pips = dayLabels.map((lbl, i) =>
      `<div class="plan-day-pip ${tpl.workoutDays.includes(i) ? 'on' : 'off'}">${lbl}</div>`
    ).join('');
    const tags = tpl.tags.map(t => `<span class="tpl-tag">${t}</span>`).join('');
    return `
      <div class="plan-template-card">
        <div class="plan-template-name">${escHtml(tpl.name)}</div>
        <div class="plan-template-tags">${tags}</div>
        <div class="plan-template-desc">${escHtml(tpl.description)}</div>
        <div class="plan-card-days" style="margin:10px 0 6px">${pips}</div>
        <button class="btn btn-primary btn-sm" onclick="usePlanTemplate('${tpl.id}')">Use This Plan</button>
      </div>`;
  }).join('');
}

window.usePlanTemplate = function(tplId) {
  const tpl = PLAN_TEMPLATES.find(t => t.id === tplId);
  if (!tpl) return;
  // Pre-fill the plan form with this template's defaults and open it
  resetPlanForm();
  document.getElementById('plan-name').value  = tpl.name;
  document.getElementById('plan-weeks').value = tpl.defaultWeeks;
  document.getElementById('plan-start').value = todayISO();
  tpl.workoutDays.forEach(dow => state.planDays.add(dow));
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('active', state.planDays.has(Number(btn.dataset.dow)));
  });
  // Store template day templates for after save
  state._pendingTemplateDayTemplates = JSON.parse(JSON.stringify(tpl.dayTemplates));
  updatePlanDatePreview();
  setPlanFormOpen(true);
  // Scroll to form
  document.getElementById('plan-form-wrap').scrollIntoView({ behavior: 'smooth' });
};

// ── Plan ──────────────────────────────────────────────────
function resetPlanForm() {
  document.getElementById('plan-name').value  = '';
  delete document.getElementById('plan-name').dataset.editId;
  document.getElementById('plan-start').value = '';
  document.getElementById('plan-weeks').value = '8';
  document.getElementById('plan-end').value   = '';
  document.getElementById('plan-date-preview').hidden = true;
  document.getElementById('plan-rir-toggle').checked = false;
  document.getElementById('plan-rir-options').style.display = 'none';
  document.getElementById('plan-mesocycle-length').value = '4';
  state.planDays = new Set();
  document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-save-plan').textContent = 'Save Plan';
  document.getElementById('plan-form-edit-banner').hidden = true;
  state._pendingTemplateDayTemplates = null;
}

function setPlanFormOpen(open) {
  document.getElementById('plan-form-wrap').hidden = !open;
  const btn = document.getElementById('btn-new-plan');
  if (btn) btn.textContent = open ? '✕ Cancel' : '+ New Plan';
}

function renderPlan() {
  // Close and reset the form
  resetPlanForm();
  setPlanFormOpen(false);

  // Render saved plans
  const plans = loadPlans();
  const list  = document.getElementById('plan-list');
  const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  renderPlanTemplates();

  if (plans.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-label">No plans yet.</div><p>Use a template above or create one with the + New Plan button.</p></div>`;
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
          <div class="plan-card-primary-actions">
            ${activeBtn}
            <button class="btn btn-primary btn-sm" onclick="openPlanEditor('${p.id}')">Edit Days</button>
            <button class="btn btn-secondary btn-sm plan-card-more-btn" onclick="togglePlanMenu('${p.id}')" title="More options">···</button>
          </div>
          <div class="plan-card-secondary-actions" id="plan-menu-${p.id}" hidden>
            <button class="btn btn-secondary btn-sm" onclick="loadPlanIntoForm('${p.id}')">Edit Details</button>
            <button class="btn btn-secondary btn-sm" onclick="copyPlan('${p.id}')">Copy</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeletePlan('${p.id}')">Delete</button>
          </div>
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

function clearPlanErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  const errEl = document.getElementById('plan-error');
  if (errEl) errEl.remove();
}

function computePlanEnd(start, weeks) {
  // end = last day of the final week (start + weeks*7 - 1 day)
  const d = new Date(start + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7 - 1);
  return localISO(d);
}

function updatePlanDatePreview() {
  const start    = document.getElementById('plan-start').value;
  const weeksVal = parseInt(document.getElementById('plan-weeks').value, 10);
  const preview  = document.getElementById('plan-date-preview');
  const endEl    = document.getElementById('plan-end');
  if (!start || !weeksVal || weeksVal < 1) {
    preview.hidden = true;
    endEl.value = '';
    return;
  }
  const isRir  = document.getElementById('plan-rir-toggle').checked;
  const msLen  = parseInt(document.getElementById('plan-mesocycle-length').value, 10) || 4;
  const end    = computePlanEnd(start, weeksVal);
  endEl.value  = end;
  const deloadNote = isRir ? ` · deload every ${msLen} wks` : '';
  preview.textContent = `${weeksVal} weeks${deloadNote} → ends ${formatDate(end)}`;
  preview.hidden = false;
}

function savePlan() {
  clearPlanErrors();
  const nameEl  = document.getElementById('plan-name');
  const startEl = document.getElementById('plan-start');
  const weeksEl = document.getElementById('plan-weeks');
  const name  = nameEl.value.trim();
  const start = startEl.value;
  const weeks = parseInt(weeksEl.value, 10);

  if (!name)        { nameEl.classList.add('input-error'); setPlanError('Enter a plan name.'); nameEl.focus(); return; }
  if (!start)       { startEl.classList.add('input-error'); setPlanError('Set a start date.'); return; }
  if (!weeks || weeks < 1) { weeksEl.classList.add('input-error'); setPlanError('Enter the number of training weeks (at least 1).'); return; }
  if (state.planDays.size === 0) { setPlanError('Select at least one workout day.'); return; }

  const isRir = document.getElementById('plan-rir-toggle').checked;
  const msLen = parseInt(document.getElementById('plan-mesocycle-length').value, 10) || 4;
  const end = computePlanEnd(start, weeks);

  const editId = nameEl.dataset.editId;
  const existing = editId ? loadPlans().find(p => p.id === editId) : null;
  // Apply pre-made template day templates on first save (not on edit)
  const pendingTemplates = state._pendingTemplateDayTemplates;
  state._pendingTemplateDayTemplates = null;
  const plan = {
    id: editId || uid(),
    name,
    start,
    end,
    weeks,
    workoutDays: [...state.planDays].sort(),
    dayTemplates: existing ? (existing.dayTemplates || {}) : (pendingTemplates || {}),
    rir: isRir,
    mesocycleLength: msLen,
  };
  delete nameEl.dataset.editId;
  clearPlanErrors();
  upsertPlan(plan);
  renderPlan();
}

window.togglePlanMenu = function(id) {
  const el = document.getElementById(`plan-menu-${id}`);
  if (el) el.hidden = !el.hidden;
};

window.loadPlanIntoForm = function(id) {
  const plan = loadPlans().find(p => p.id === id);
  if (!plan) return;
  document.getElementById('plan-name').value  = plan.name;
  document.getElementById('plan-name').dataset.editId = plan.id;
  document.getElementById('plan-start').value = plan.start;
  // Derive weeks from stored value or from start/end dates for older plans
  let weeks = plan.weeks || 0;
  if (!weeks && plan.start && plan.end) {
    const ms = new Date(plan.end + 'T00:00:00') - new Date(plan.start + 'T00:00:00');
    weeks = Math.max(1, Math.round(ms / (7 * 86400000)));
  }
  document.getElementById('plan-weeks').value = weeks || 8;
  document.getElementById('plan-end').value   = plan.end;
  document.getElementById('plan-rir-toggle').checked = !!plan.rir;
  document.getElementById('plan-rir-options').style.display = plan.rir ? '' : 'none';
  document.getElementById('plan-mesocycle-length').value = plan.mesocycleLength || 4;
  state.planDays = new Set(plan.workoutDays);
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('active', state.planDays.has(Number(btn.dataset.dow)));
  });
  updatePlanDatePreview();
  document.getElementById('btn-save-plan').textContent = 'Update Plan';
  document.getElementById('plan-form-edit-label').textContent = `Editing: ${plan.name}`;
  document.getElementById('plan-form-edit-banner').hidden = false;
  setPlanFormOpen(true);
  window.scrollTo(0, 0);
};

window.setActivePlan = function(id) {
  saveActivePlanId(id);
  renderPlan();
};

window.confirmDeletePlan = function(id) {
  showModal({
    title: 'Delete Plan?',
    msg: 'This will permanently remove the plan and all its exercises.',
    confirmText: 'Delete',
    confirmClass: 'btn-danger-solid',
    cancelText: 'Cancel',
    onConfirm: () => {
      const wasActive = loadActivePlanId() === id;
      deletePlan(id);
      if (wasActive) saveActivePlanId(null);
      renderPlan();
      if (wasActive) renderTodayPlan();
    },
  });
};

window.copyPlan = function(id) {
  const plan = loadPlans().find(p => p.id === id);
  if (!plan) return;
  const planDays = Math.round((new Date(plan.end + 'T00:00:00') - new Date(plan.start + 'T00:00:00')) / 86400000);
  const todayStr = todayISO();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + planDays);
  const endStr = localISO(endDate);
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
    document.getElementById('progress-graph-section').innerHTML = '';
    return;
  }

  const prMap = buildPRMap();
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = sorted.map(w => historyCardHTML(w, prMap)).join('');
  document.getElementById('progress-graph-section').innerHTML = renderProgressGraph(workouts);
}

function historyCardHTML(w, prMap) {
  const exCount  = w.exercises.length;
  const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const vol      = calcVolume(w);

  const exerciseRows = w.exercises.map(ex => {
    const exPR = prMap ? prMap[ex.name] : null;
    const setRows = ex.sets.map((s, i) => setRowHTML(s, i, exPR)).join('');
    return `
      <div class="exercise-row">
        <div class="exercise-row-name ex-history-link" onclick="showExerciseHistory('${escHtml(ex.name)}',event)">${escHtml(ex.name)} <span class="ex-history-link-hint">›</span></div>
        <table class="sets-table">
          <thead><tr><th></th><th>Reps</th><th>Weight</th></tr></thead>
          <tbody>${setRows}</tbody>
        </table>
      </div>`;
  }).join('');

  const notesHtml = w.notes
    ? `<div class="workout-card-notes">"${escHtml(w.notes)}"</div>`
    : '';

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
        ${vol ? `<span class="meta-pill vol-pill">${vol}</span>` : ''}
      </div>
      ${notesHtml}
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
  showModal({
    title: 'Delete Workout?',
    msg: 'This cannot be undone.',
    confirmText: 'Delete',
    confirmClass: 'btn-danger-solid',
    cancelText: 'Cancel',
    onConfirm: () => { deleteWorkout(id); renderHistory(); },
  });
};

window.copyWorkoutToDay = function(id, event) {
  event.stopPropagation();
  const source = loadWorkouts().find(w => w.id === id);
  if (!source) return;

  showModal({
    title: 'Copy to Day',
    msg: `<div class="field-label" style="margin-top:4px">Target Date</div>
          <input type="date" id="modal-date-input" value="${todayISO()}" style="margin-top:6px;width:100%;background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;color:var(--text);font-size:15px;outline:none" />`,
    confirmText: 'Copy',
    cancelText: 'Cancel',
    onConfirm: () => {
      const dateStr = document.getElementById('modal-date-input').value;
      if (!dateStr) return;
      const workouts = loadWorkouts();
      const existing = workouts.find(w => w.date === dateStr);
      const exercises = JSON.parse(JSON.stringify(source.exercises));
      if (existing) {
        const exCount = existing.exercises.length;
        const existingLabel = `${escHtml(existing.name || formatDate(dateStr) + ' Workout')} (${exCount} exercise${exCount !== 1 ? 's' : ''})`;
        showModal({
          title: 'Replace Workout?',
          msg: `This will replace <strong>${existingLabel}</strong> on ${formatDate(dateStr)} with <strong>${escHtml(source.name)}</strong>. This cannot be undone.`,
          confirmText: 'Replace',
          confirmClass: 'btn-danger-solid',
          cancelText: 'Cancel',
          onConfirm: () => { updateWorkout({ ...existing, exercises }); selectDay(dateStr); },
        });
      } else {
        addWorkout({ id: uid(), date: dateStr, name: source.name, exercises });
        selectDay(dateStr);
      }
    },
  });
};

window.exportToCSV = function() {
  const workouts = loadWorkouts();
  if (workouts.length === 0) { showAlert('No Data', 'No workouts to export yet.'); return; }
  const rows = [['Date','Workout','Notes','Exercise','Set','Weight (lbs)','Reps','Done','RIR']];
  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        const s = ex.sets[i];
        rows.push([
          w.date, w.name, w.notes || '', ex.name, i + 1,
          s.weight || 0,
          s.actualReps != null ? s.actualReps : (s.reps || 0),
          s.done ? 'Yes' : 'No',
          s.rir != null ? s.rir : '',
        ]);
      }
    }
  }
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `workouts-${todayISO()}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

function renderProgressGraph(workouts) {
  const weeklyCount = {};
  for (const w of workouts) {
    const d = new Date(w.date + 'T00:00:00');
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay() + 1); // Monday
    const key = localISO(ws);
    weeklyCount[key] = (weeklyCount[key] || 0) + 1;
  }
  const keys = Object.keys(weeklyCount).sort().slice(-10);
  if (keys.length === 0) return '';

  const maxV = Math.max(...keys.map(k => weeklyCount[k]));
  const bw = 32, gap = 10, h = 64, pad = 16, labelH = 28;
  const svgW = keys.length * (bw + gap) - gap + pad * 2;
  const svgH = h + labelH;

  const bars = keys.map((k, i) => {
    const count = weeklyCount[k];
    const barH  = maxV > 0 ? Math.max(6, Math.round((count / maxV) * h)) : 6;
    const x     = pad + i * (bw + gap);
    const barY  = h - barH;
    const lbl   = new Date(k + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `
      <rect x="${x}" y="${barY}" width="${bw}" height="${barH}" rx="4" fill="var(--accent)" opacity="0.8"/>
      <text x="${x + bw / 2}" y="${barY - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--accent)">${count}</text>
      <text x="${x + bw / 2}" y="${h + 14}" text-anchor="middle" font-size="8" fill="var(--text3)">${lbl}</text>`;
  }).join('');

  return `<div class="progress-graph">
    <div class="progress-graph-header">
      <span class="progress-graph-title">Workouts per week</span>
    </div>
    <div class="progress-graph-scroll">
      <svg viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="display:block;overflow:visible">${bars}</svg>
    </div>
  </div>`;
}

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

window.toggleErGuide = function() {
  const body   = document.getElementById('er-guide-body');
  const toggle = document.getElementById('er-guide-toggle');
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
  document.getElementById('bw-home-strip').addEventListener('click', () => navigate('bodyweight'));

  // Active workout
  document.getElementById('btn-workout-back').addEventListener('click', () => {
    showModal({
      title: 'Discard Workout?',
      msg: 'Your unsaved changes will be lost.',
      confirmText: 'Discard',
      confirmClass: 'btn-danger-solid',
      cancelText: 'Keep Editing',
      onConfirm: () => { state.activeWorkout = null; navigate('home'); },
    });
  });
  document.getElementById('btn-add-exercise').addEventListener('click', () => {
    state.exerciseContext    = 'workout';
    state.editingExIndex     = null;
    state.exMusclePickerFrom = null;
    navigate('exercise-muscle');
  });
  document.getElementById('btn-finish-workout').addEventListener('click', finishWorkout);
  document.getElementById('workout-name').addEventListener('input', syncWorkoutFields);
  document.getElementById('workout-date').addEventListener('change', syncWorkoutFields);
  document.getElementById('workout-notes').addEventListener('input', syncWorkoutFields);

  // Day view
  document.getElementById('btn-day-back').addEventListener('click', () => navigate(state.dayReturnView || 'calendar'));
  document.getElementById('btn-day-add-exercise').addEventListener('click', () => {
    state.exerciseContext    = 'day';
    state.editingExIndex     = null;
    state.exMusclePickerFrom = null;
    navigate('exercise-muscle');
  });
  document.getElementById('btn-day-finish-workout').addEventListener('click', () => {
    const w = state.dayWorkout;
    if (!w) return;

    const doFinish = () => {
      w.status = 'completed';
      const suggestions = getOverloadSuggestions(w);
      persistDay();
      state.dayWorkout = null;
      navigate(state.dayReturnView || 'calendar');
      if (suggestions.length > 0) setTimeout(() => showOverloadModal(suggestions), 300);
    };

    const allDone = w.exercises.length > 0 && w.exercises.every(ex => ex.sets.every(s => s.done));
    if (allDone) {
      doFinish();
    } else {
      showModal({
        title: 'Not all sets checked',
        msg: 'Some sets haven\'t been marked done. Complete the workout anyway?',
        confirmText: 'Complete Workout',
        confirmClass: 'btn-danger-solid',
        cancelText: 'Keep Going',
        onConfirm: doFinish,
      });
    }
  });

  // Muscle picker (exercise flow)
  document.getElementById('btn-ex-muscle-back').addEventListener('click', () => {
    const dest = state.exerciseContext === 'planTemplate' ? 'plan-editor' : state.exerciseContext;
    navigate(dest);
  });

  // Exercise form
  document.getElementById('btn-exercise-back').addEventListener('click', () => {
    const editing = state.editingExIndex !== null;
    const fromMuscle = state.exMusclePickerFrom === 'exercise-muscle';
    const contextDest = state.exerciseContext === 'planTemplate' ? 'plan-editor' : state.exerciseContext;
    const backDest = editing || !fromMuscle ? contextDest : 'exercise-muscle';
    const hasName = document.getElementById('exercise-name').value.trim() !== '';
    if (!editing && hasName) {
      showModal({
        title: 'Discard exercise?',
        msg: 'You have an unsaved exercise. Go back without saving it?',
        confirmText: 'Discard',
        confirmClass: 'btn-danger-solid',
        cancelText: 'Keep Editing',
        onConfirm: () => { state.editingExIndex = null; navigate(backDest); },
      });
    } else {
      state.editingExIndex = null;
      navigate(backDest);
    }
  });
  document.getElementById('btn-add-set').addEventListener('click', addFormSet);
  document.getElementById('btn-save-exercise').addEventListener('click', saveExercise);

  // Calendar month navigation
  document.getElementById('cal-prev').addEventListener('click', () => advanceMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => advanceMonth(1));

  // Plan
  document.getElementById('btn-plan-back').addEventListener('click', () => navigate('home'));
  document.getElementById('btn-new-plan').addEventListener('click', () => {
    const wrap = document.getElementById('plan-form-wrap');
    const opening = wrap.hidden;
    if (opening) resetPlanForm();
    setPlanFormOpen(opening);
    if (opening) window.scrollTo(0, 0);
  });

  // Plan editor
  document.getElementById('btn-plan-editor-back').addEventListener('click', () => navigate('plan'));
  document.getElementById('btn-plan-editor-done').addEventListener('click', () => navigate('plan'));

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
    updatePlanDatePreview();
  });
  document.getElementById('plan-mesocycle-length').addEventListener('change', updatePlanDatePreview);
  document.getElementById('plan-start').addEventListener('change', updatePlanDatePreview);
  document.getElementById('plan-weeks').addEventListener('input', updatePlanDatePreview);

  // Body weight view
  document.getElementById('btn-bw-back').addEventListener('click', () => navigate('home'));
  document.getElementById('btn-unit-toggle').addEventListener('click', () => {
    window.toggleWeightUnit(null);
    renderBodyWeight();
  });
  document.getElementById('btn-bw-save').addEventListener('click', () => {
    const rawVal = parseFloat(document.getElementById('bw-input').value);
    const date   = document.getElementById('bw-date').value || todayISO();
    const maxDisplay = weightUnit() === 'kg' ? 454 : 999;
    if (!rawVal || rawVal <= 0 || rawVal > maxDisplay) {
      showAlert('Invalid weight', `Enter a weight between 1 and ${maxDisplay} ${weightUnit()}.`);
      return;
    }
    logBodyWeight(date, fromDisplayWeight(rawVal));
    renderBodyWeight();
    renderBwHomeWidget();
  });

  // Exercise history view
  document.getElementById('btn-ex-history-back').addEventListener('click', () => {
    navigate(state.exHistoryBackTo || 'history');
  });

  // Volume tracker view
  document.getElementById('btn-volume-back').addEventListener('click', () => {
    navigate('home');
  });

  navigate('home');
});
