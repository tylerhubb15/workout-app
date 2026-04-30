import {
  loadWorkouts,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  loadPlans,
  upsertPlan,
  deletePlan,
  loadActivePlanId,
  saveActivePlanId,
  loadBodyWeights,
  logBodyWeight,
  deleteBodyWeight,
  loadUnitPref,
  saveUnitPref,
  hydrateFromFirestore,
  clearCaches,
  migrateLocalStorageIfNeeded,
  subscribeSaveStatus,
  getWorkoutsGeneration,
} from "./storage.js";
import { APP_RELEASE } from "./release-notes.js";
// First pieces of the incremental app.js split. Pure, dependency-light
// helpers live in js/lib/ so they can be unit-tested and reused without
// loading the 6k-line monolith.
import { localISO, todayISO, formatDate, formatDateLong } from "./lib/dates.js";
import {
  LBS_TO_KG,
  KG_TO_LBS,
  weightUnit,
  toDisplayWeight,
  fromDisplayWeight,
  fmtWeight,
} from "./lib/units.js";

const RELEASE_NOTES_STORAGE_KEY = "wt_release_notes_seen";
const RELEASE_RELOAD_PREFIX = "wt_release_reload_";

const THEME_PALETTES = [
  { id: "classic", label: "Classic" },
  { id: "metro", label: "Metro" },
  { id: "pulse", label: "Pulse" },
  { id: "arcade", label: "Arcade" },
  { id: "alloy", label: "Alloy" },
  { id: "ember", label: "Ember" },
  { id: "neon", label: "Neon" },
  { id: "stealth", label: "Stealth" },
  { id: "forest", label: "Forest" },
  { id: "violet", label: "Violet" },
  { id: "rose", label: "Rose" },
  { id: "ice", label: "Ice" },
  { id: "solar", label: "Solar" },
  { id: "midnight", label: "Midnight" },
  { id: "operator", label: "Operator" },
  { id: "obsidian", label: "Obsidian" },
  { id: "venom", label: "Venom" },
  { id: "titanium", label: "Titanium" },
];

const ACTIVE_WORKOUT_DRAFT_KEY = "wt_draft_active_workout";
const DAY_WORKOUT_DRAFT_KEY = "wt_draft_day_workout";
const HINT_STORAGE_PREFIX = "wt_hint_";

// ── Exercise Library ──────────────────────────────────────
const EXERCISES = {
  Barbell: [
    // Chest
    "Barbell Bench Press",
    "Barbell Incline Bench Press",
    "Barbell Decline Bench Press",
    "Close-Grip Bench Press",
    "JM Press",
    "Floor Press",
    "Paused Bench Press",
    "Spoto Press",
    // Back
    "Barbell Deadlift",
    "Trap Bar Deadlift",
    "Rack Pull",
    "Deficit Deadlift",
    "Barbell Bent-Over Row",
    "Pendlay Row",
    "T-Bar Row",
    "Barbell Shrug",
    "Yates Row",
    "Seal Row",
    "Barbell Meadows Row",
    // Shoulders
    "Barbell Overhead Press",
    "Upright Row",
    "Barbell Push Press",
    "Behind-the-Neck Press",
    "Barbell Bradford Press",
    // Arms
    "Barbell Curl",
    "EZ-Bar Curl",
    "Preacher Curl",
    "Spider Curl",
    "Incline Barbell Curl",
    "Barbell Reverse Curl",
    "Barbell Drag Curl",
    "Skull Crusher",
    // Legs
    "Barbell Back Squat",
    "Barbell Front Squat",
    "Zercher Squat",
    "Safety Bar Squat",
    "Box Squat",
    "Pause Squat",
    "Barbell Hack Squat",
    "Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Good Morning",
    "Barbell Walking Lunge",
    "Barbell Reverse Lunge",
    "Barbell Step-Up",
    "Barbell Split Squat",
    "Hip Thrust",
    "Barbell Glute Bridge",
    "Sumo Deadlift",
    "Barbell Calf Raise",
    // Core / Full Body
    "Landmine Rotation",
    "Landmine Press",
    "Ab Wheel Rollout",
    "Barbell Rollout",
    "Barbell Power Clean",
    "Barbell Snatch",
    "Barbell Thruster",
  ],
  Dumbbell: [
    // Chest
    "Dumbbell Bench Press",
    "Dumbbell Incline Bench Press",
    "Dumbbell Decline Bench Press",
    "Dumbbell Chest Fly",
    "Incline Dumbbell Fly",
    "Dumbbell Pullover",
    "Neutral Grip Dumbbell Press",
    "Dumbbell Floor Press",
    "Dumbbell Squeeze Press",
    // Back
    "Dumbbell Single-Arm Row",
    "Dumbbell Chest-Supported Row",
    "Dumbbell Shrug",
    "Dumbbell Romanian Deadlift",
    "Dumbbell Seal Row",
    "Dumbbell Kroc Row",
    // Shoulders
    "Dumbbell Overhead Press",
    "Arnold Press",
    "Seated Dumbbell Press",
    "Dumbbell Lateral Raise",
    "Dumbbell Front Raise",
    "Dumbbell Rear Delt Fly",
    "Dumbbell Y-Raise",
    "Dumbbell Bent-Over Lateral Raise",
    // Arms
    "Dumbbell Curl",
    "Incline Dumbbell Curl",
    "Hammer Curl",
    "Concentration Curl",
    "Cross-Body Hammer Curl",
    "Dumbbell Spider Curl",
    "Dumbbell Reverse Curl",
    "Zottman Curl",
    "Dumbbell Preacher Curl",
    "Dumbbell Skull Crusher",
    "Overhead Tricep Extension",
    "Tricep Kickback",
    "Dumbbell JM Press",
    // Legs
    "Bulgarian Split Squat",
    "Goblet Squat",
    "Dumbbell Front Squat",
    "Dumbbell Lunge",
    "Dumbbell Walking Lunge",
    "Dumbbell Reverse Lunge",
    "Dumbbell Lateral Lunge",
    "Dumbbell Step-Up",
    "Single-Leg Romanian Deadlift",
    "Sumo Squat",
    "Dumbbell Sumo Deadlift",
    "Dumbbell Hip Thrust",
    "Dumbbell Glute Bridge",
    "Dumbbell Calf Raise",
    // Core / Full Body
    "Russian Twist",
    "Dumbbell Side Bend",
    "Dumbbell Woodchop",
    "Farmer's Carry",
    "Dumbbell Clean and Press",
  ],
  Cable: [
    // Chest
    "Cable Chest Fly",
    "Low Cable Chest Fly",
    "High Cable Chest Fly",
    "Cable Incline Fly",
    "Cable Decline Fly",
    "Cable Chest Press",
    // Back
    "Lat Pulldown",
    "Close-Grip Lat Pulldown",
    "Wide-Grip Lat Pulldown",
    "Single-Arm Cable Row",
    "Seated Cable Row",
    "Wide-Grip Cable Row",
    "Cable High Row",
    "Straight-Arm Pulldown",
    "Cable Pullover",
    "Cable Shrug",
    // Shoulders
    "Face Pull",
    "Cable Lateral Raise",
    "Cable Rear Delt Fly",
    "Cable Front Raise",
    "Cable Upright Row",
    "Cable Y-Raise",
    "Single-Arm Cable Lateral Raise",
    // Arms
    "Cable Curl",
    "Cable Rope Curl",
    "Cable Reverse Curl",
    "Cable Hammer Curl",
    "Cable Concentration Curl",
    "Cable Incline Curl",
    "Tricep Pushdown",
    "Rope Pushdown",
    "Cable Overhead Tricep Extension",
    "Single-Arm Pushdown",
    "Cable Tricep Kickback",
    // Legs / Glutes
    "Cable Pull-Through",
    "Cable Kickback",
    "Cable Hip Extension",
    "Cable Hip Abduction",
    "Cable Hip Adduction",
    "Donkey Kick",
    "Cable Romanian Deadlift",
    "Cable Squat",
    // Core
    "Cable Crunch",
    "Kneeling Cable Crunch",
    "Pallof Press",
    "Cable Woodchop",
    "Cable Oblique Crunch",
    "Half-Kneeling Cable Chop",
  ],
  Machine: [
    // Chest
    "Machine Chest Press",
    "Pec Deck Fly",
    "Machine Fly",
    "Smith Machine Bench Press",
    "Smith Machine Incline Press",
    "Smith Machine Decline Press",
    "Machine Pullover",
    // Back
    "Chest-Supported Row",
    "Machine High Row",
    "Machine Low Row",
    "T-Bar Row Machine",
    "Smith Machine Row",
    // Shoulders
    "Machine Shoulder Press",
    "Smith Machine Shoulder Press",
    "Machine Lateral Raise",
    "Reverse Pec Deck",
    "Machine Rear Delt Fly",
    // Arms
    "Machine Curl",
    "Machine Preacher Curl",
    "Machine Tricep Press",
    "Machine Tricep Extension",
    // Legs
    "Leg Press",
    "Hack Squat",
    "Pendulum Squat",
    "Belt Squat",
    "Leg Extension",
    "Smith Machine Squat",
    "Lying Leg Curl",
    "Seated Leg Curl",
    "Standing Leg Curl",
    "Glute-Ham Raise",
    "Machine Hip Thrust",
    "Smith Machine Hip Thrust",
    "Smith Machine Romanian Deadlift",
    "Abductor Machine",
    "Adductor Machine",
    "Reverse Hyperextension",
    "Machine Back Extension",
    // Calves
    "Standing Calf Raise",
    "Seated Calf Raise",
    "Leg Press Calf Raise",
    "Donkey Calf Raise",
    "Smith Machine Calf Raise",
  ],
  Bodyweight: [
    // Chest / Push
    "Push-Up",
    "Wide Push-Up",
    "Close Push-Up",
    "Decline Push-Up",
    "Incline Push-Up",
    "Diamond Push-Up",
    "Pike Push-Up",
    "Archer Push-Up",
    "Hindu Push-Up",
    "Plyometric Push-Up",
    "One-Arm Push-Up",
    "Chest Dip",
    "Parallel Dip",
    "Tricep Dip",
    // Back / Pull
    "Pull-Up",
    "Chin-Up",
    "Wide-Grip Pull-Up",
    "Neutral Grip Pull-Up",
    "Close-Grip Chin-Up",
    "Inverted Row",
    "Australian Pull-Up",
    "Ring Row",
    "Muscle-Up",
    "Typewriter Pull-Up",
    "L-Sit Pull-Up",
    // Legs
    "Jump Squat",
    "Box Jump",
    "Wall Sit",
    "Lunge",
    "Reverse Lunge",
    "Pistol Squat",
    "Cossack Squat",
    "Step-Up",
    "Nordic Hamstring Curl",
    "Glute Bridge",
    "Hip Thrust Bodyweight",
    "Single-Leg Squat",
    "Single-Leg Calf Raise",
    // Core
    "Ab Wheel Rollout",
    "Decline Sit-Up",
    "Hanging Leg Raise",
    "Leg Raise",
    "Toes-to-Bar",
    "L-Sit",
    "Dragon Flag",
    "Plank",
    "Side Plank",
    "Hollow Hold",
    "Bicycle Crunch",
    "V-Up",
    "Dead Bug",
    "Bird Dog",
    "Superman",
    "Reverse Crunch",
    "Flutter Kicks",
    "Windshield Wiper",
    "Mountain Climber",
    "Sit-Up",
    "Crunch",
    // Cardio / Full Body
    "Burpee",
    "Sled Push",
    "Battle Ropes",
  ],
  Kettlebell: [
    "Kettlebell Swing",
    "Kettlebell Single-Arm Swing",
    "Kettlebell Snatch",
    "Kettlebell Clean",
    "Kettlebell Goblet Squat",
    "Kettlebell Front Rack Squat",
    "Kettlebell Overhead Squat",
    "Kettlebell Sumo Deadlift",
    "Kettlebell Lunge",
    "Kettlebell Lateral Lunge",
    "Kettlebell Step-Up",
    "Kettlebell Romanian Deadlift",
    "Kettlebell Press",
    "Kettlebell Row",
    "Kettlebell Floor Press",
    "Kettlebell Thruster",
    "Kettlebell Around the World",
    "Kettlebell Turkish Get-Up",
    "Kettlebell Halo",
    "Kettlebell Windmill",
    "Kettlebell Hip Thrust",
    "Kettlebell Deadlift",
  ],
};

// ── Exercise metadata helpers ─────────────────────────────
const MUSCLE_MAP = {
  Chest: [
    "Barbell Bench Press",
    "Barbell Incline Bench Press",
    "Barbell Decline Bench Press",
    "Close-Grip Bench Press",
    "JM Press",
    "Floor Press",
    "Paused Bench Press",
    "Spoto Press",
    "Dumbbell Bench Press",
    "Dumbbell Incline Bench Press",
    "Dumbbell Decline Bench Press",
    "Dumbbell Chest Fly",
    "Incline Dumbbell Fly",
    "Dumbbell Pullover",
    "Neutral Grip Dumbbell Press",
    "Dumbbell Floor Press",
    "Dumbbell Squeeze Press",
    "Cable Chest Fly",
    "Low Cable Chest Fly",
    "High Cable Chest Fly",
    "Cable Incline Fly",
    "Cable Decline Fly",
    "Cable Chest Press",
    "Machine Chest Press",
    "Pec Deck Fly",
    "Machine Fly",
    "Smith Machine Bench Press",
    "Smith Machine Incline Press",
    "Smith Machine Decline Press",
    "Machine Pullover",
    "Push-Up",
    "Wide Push-Up",
    "Close Push-Up",
    "Decline Push-Up",
    "Incline Push-Up",
    "Diamond Push-Up",
    "Archer Push-Up",
    "Plyometric Push-Up",
    "One-Arm Push-Up",
    "Chest Dip",
    "Parallel Dip",
    "Kettlebell Floor Press",
  ],
  Back: [
    "Barbell Deadlift",
    "Trap Bar Deadlift",
    "Rack Pull",
    "Deficit Deadlift",
    "Barbell Bent-Over Row",
    "Pendlay Row",
    "T-Bar Row",
    "Barbell Shrug",
    "Yates Row",
    "Seal Row",
    "Barbell Meadows Row",
    "Dumbbell Single-Arm Row",
    "Dumbbell Chest-Supported Row",
    "Dumbbell Shrug",
    "Dumbbell Romanian Deadlift",
    "Dumbbell Seal Row",
    "Dumbbell Kroc Row",
    "Lat Pulldown",
    "Close-Grip Lat Pulldown",
    "Wide-Grip Lat Pulldown",
    "Single-Arm Cable Row",
    "Seated Cable Row",
    "Wide-Grip Cable Row",
    "Cable High Row",
    "Straight-Arm Pulldown",
    "Cable Pullover",
    "Cable Shrug",
    "Chest-Supported Row",
    "Machine High Row",
    "Machine Low Row",
    "T-Bar Row Machine",
    "Smith Machine Row",
    "Pull-Up",
    "Chin-Up",
    "Wide-Grip Pull-Up",
    "Neutral Grip Pull-Up",
    "Close-Grip Chin-Up",
    "Inverted Row",
    "Australian Pull-Up",
    "Ring Row",
    "Muscle-Up",
    "Typewriter Pull-Up",
    "L-Sit Pull-Up",
    "Kettlebell Row",
  ],
  Shoulders: [
    "Barbell Overhead Press",
    "Upright Row",
    "Barbell Push Press",
    "Behind-the-Neck Press",
    "Barbell Bradford Press",
    "Dumbbell Overhead Press",
    "Arnold Press",
    "Seated Dumbbell Press",
    "Dumbbell Lateral Raise",
    "Dumbbell Front Raise",
    "Dumbbell Rear Delt Fly",
    "Dumbbell Y-Raise",
    "Dumbbell Bent-Over Lateral Raise",
    "Face Pull",
    "Cable Lateral Raise",
    "Cable Rear Delt Fly",
    "Cable Front Raise",
    "Cable Upright Row",
    "Cable Y-Raise",
    "Single-Arm Cable Lateral Raise",
    "Machine Shoulder Press",
    "Smith Machine Shoulder Press",
    "Machine Lateral Raise",
    "Reverse Pec Deck",
    "Machine Rear Delt Fly",
    "Pike Push-Up",
    "Hindu Push-Up",
    "Kettlebell Press",
    "Kettlebell Halo",
  ],
  Biceps: [
    "Barbell Curl",
    "EZ-Bar Curl",
    "Preacher Curl",
    "Spider Curl",
    "Incline Barbell Curl",
    "Barbell Reverse Curl",
    "Barbell Drag Curl",
    "Dumbbell Curl",
    "Incline Dumbbell Curl",
    "Hammer Curl",
    "Concentration Curl",
    "Cross-Body Hammer Curl",
    "Dumbbell Spider Curl",
    "Dumbbell Reverse Curl",
    "Zottman Curl",
    "Dumbbell Preacher Curl",
    "Cable Curl",
    "Cable Rope Curl",
    "Cable Reverse Curl",
    "Cable Hammer Curl",
    "Cable Concentration Curl",
    "Cable Incline Curl",
    "Machine Curl",
    "Machine Preacher Curl",
    "Close-Grip Chin-Up",
    "Chin-Up",
  ],
  Triceps: [
    "Close-Grip Bench Press",
    "JM Press",
    "Skull Crusher",
    "Floor Press",
    "Dumbbell Skull Crusher",
    "Overhead Tricep Extension",
    "Tricep Kickback",
    "Dumbbell JM Press",
    "Tricep Pushdown",
    "Rope Pushdown",
    "Cable Overhead Tricep Extension",
    "Single-Arm Pushdown",
    "Cable Tricep Kickback",
    "Machine Tricep Press",
    "Machine Tricep Extension",
    "Diamond Push-Up",
    "Close Push-Up",
    "Tricep Dip",
    "Parallel Dip",
    "Landmine Press",
  ],
  Quads: [
    "Barbell Back Squat",
    "Barbell Front Squat",
    "Zercher Squat",
    "Safety Bar Squat",
    "Box Squat",
    "Pause Squat",
    "Barbell Hack Squat",
    "Dumbbell Front Squat",
    "Goblet Squat",
    "Sumo Squat",
    "Leg Press",
    "Hack Squat",
    "Pendulum Squat",
    "Belt Squat",
    "Leg Extension",
    "Smith Machine Squat",
    "Bulgarian Split Squat",
    "Barbell Split Squat",
    "Barbell Walking Lunge",
    "Barbell Reverse Lunge",
    "Dumbbell Lunge",
    "Dumbbell Walking Lunge",
    "Dumbbell Reverse Lunge",
    "Dumbbell Lateral Lunge",
    "Dumbbell Step-Up",
    "Barbell Step-Up",
    "Lunge",
    "Reverse Lunge",
    "Jump Squat",
    "Box Jump",
    "Wall Sit",
    "Pistol Squat",
    "Cossack Squat",
    "Single-Leg Squat",
    "Step-Up",
    "Cable Squat",
    "Kettlebell Goblet Squat",
    "Kettlebell Front Rack Squat",
    "Kettlebell Overhead Squat",
    "Kettlebell Lunge",
    "Kettlebell Lateral Lunge",
    "Kettlebell Step-Up",
  ],
  Hamstrings: [
    "Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Good Morning",
    "Dumbbell Romanian Deadlift",
    "Single-Leg Romanian Deadlift",
    "Dumbbell Sumo Deadlift",
    "Cable Romanian Deadlift",
    "Smith Machine Romanian Deadlift",
    "Lying Leg Curl",
    "Seated Leg Curl",
    "Standing Leg Curl",
    "Glute-Ham Raise",
    "Nordic Hamstring Curl",
    "Cable Pull-Through",
    "Rack Pull",
    "Deficit Deadlift",
    "Kettlebell Romanian Deadlift",
    "Kettlebell Sumo Deadlift",
    "Kettlebell Deadlift",
  ],
  Glutes: [
    "Hip Thrust",
    "Barbell Glute Bridge",
    "Sumo Deadlift",
    "Dumbbell Hip Thrust",
    "Dumbbell Glute Bridge",
    "Machine Hip Thrust",
    "Smith Machine Hip Thrust",
    "Kettlebell Hip Thrust",
    "Cable Kickback",
    "Cable Hip Extension",
    "Cable Hip Abduction",
    "Cable Hip Adduction",
    "Abductor Machine",
    "Adductor Machine",
    "Reverse Hyperextension",
    "Donkey Kick",
    "Sumo Squat",
    "Dumbbell Sumo Deadlift",
    "Glute Bridge",
    "Hip Thrust Bodyweight",
    "Bird Dog",
    "Cossack Squat",
    "Kettlebell Sumo Deadlift",
    "Kettlebell Swing",
    "Kettlebell Single-Arm Swing",
  ],
  Calves: [
    "Standing Calf Raise",
    "Seated Calf Raise",
    "Leg Press Calf Raise",
    "Single-Leg Calf Raise",
    "Donkey Calf Raise",
    "Barbell Calf Raise",
    "Dumbbell Calf Raise",
    "Smith Machine Calf Raise",
  ],
  Core: [
    "Cable Crunch",
    "Kneeling Cable Crunch",
    "Pallof Press",
    "Cable Woodchop",
    "Cable Oblique Crunch",
    "Half-Kneeling Cable Chop",
    "Ab Wheel Rollout",
    "Barbell Rollout",
    "Decline Sit-Up",
    "Sit-Up",
    "Crunch",
    "Reverse Crunch",
    "Hanging Leg Raise",
    "Leg Raise",
    "Toes-to-Bar",
    "L-Sit",
    "Dragon Flag",
    "Windshield Wiper",
    "Flutter Kicks",
    "Plank",
    "Side Plank",
    "Hollow Hold",
    "Bicycle Crunch",
    "V-Up",
    "Dead Bug",
    "Bird Dog",
    "Superman",
    "Russian Twist",
    "Dumbbell Side Bend",
    "Dumbbell Woodchop",
    "Landmine Rotation",
    "Mountain Climber",
    "Kettlebell Windmill",
  ],
  "Full Body": [
    "Barbell Power Clean",
    "Barbell Snatch",
    "Barbell Thruster",
    "Kettlebell Swing",
    "Kettlebell Single-Arm Swing",
    "Kettlebell Snatch",
    "Kettlebell Clean",
    "Kettlebell Turkish Get-Up",
    "Kettlebell Thruster",
    "Kettlebell Around the World",
    "Farmer's Carry",
    "Dumbbell Clean and Press",
    "Sled Push",
    "Battle Ropes",
    "Burpee",
    "Box Jump",
    "Machine Back Extension",
    "Hindu Push-Up",
    "Muscle-Up",
  ],
};

function getMuscleGroup(name) {
  for (const [group, names] of Object.entries(MUSCLE_MAP)) {
    if (names.includes(name)) return group;
  }
  return "";
}

function getEquipment(name) {
  for (const [equip, list] of Object.entries(EXERCISES)) {
    if (list.includes(name)) return equip;
  }
  return "";
}

// ── State ─────────────────────────────────────────────────
const state = {
  view: "home",
  activeWorkout: null, // workout in progress (Start Workout flow)
  dayWorkout: null, // workout being edited from the calendar day view
  dayIsReadOnly: false, // true when viewing a previously completed workout
  exerciseSavePending: false,
  editingExIndex: null,
  formSets: [],
  formRepMode: "target", // 'target' | 'rir' | 'er' — rep mode for the exercise form
  customExMuscleGroup: null, // muscle group set via the custom exercise modal
  exerciseContext: "workout", // 'workout' | 'day' — which view the exercise form serves
  calendar: {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  },
  planDays: new Set(), // DOW indices selected in plan form
  editingPlan: null, // plan whose days are being edited
  editingPlanDow: null, // day-of-week being edited in plan template
  editingPlanMuscleCounts: {}, // { 'Chest': 2, 'Back': 3 } — stepper values for current day
  editingPlanMuscleGroup: null, // which muscle group picker is open
  exMuscleFilter: null, // active muscle group string or null
  exEquipFilter: null, // active equipment group string or null
  exMusclePickerFrom: null, // 'exercise-muscle' when entering via picker; null in edit mode
  exHistoryName: null, // exercise name for exercise-history view
  exHistoryBackTo: "home",
  exLibMuscle: null, // selected muscle filter in exercise library (null = All)
  exLibSearch: "", // search query in exercise library
  _sessionPRs: {}, // max weight logged per exercise in the current active workout session
  _pendingTemplateDayTemplates: null, // day templates from a pre-made plan, applied on first save
  _pendingTemplateDayLabels: null, // day labels from a pre-made plan, applied on first save
  openPlanDays: null, // Set of DOW indices with open accordion panels; null = all open
  volumeWeekOffset: 0, // 0 = current week, -1 = last week, etc.
  _homeAction: null,
};

// ── Unit Helpers ──────────────────────────────────────────
// (LBS_TO_KG, KG_TO_LBS, weightUnit, toDisplayWeight, fromDisplayWeight,
// fmtWeight now live in ./lib/units.js and are imported at the top.)

function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasWorkoutContent(workout) {
  if (!workout) return false;
  return !!(
    workout.name ||
    workout.notes ||
    (Array.isArray(workout.exercises) && workout.exercises.length > 0)
  );
}

function clearActiveWorkoutDraft() {
  localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
}

function clearDayWorkoutDraft() {
  localStorage.removeItem(DAY_WORKOUT_DRAFT_KEY);
}

function persistActiveWorkoutDraft() {
  if (!hasWorkoutContent(state.activeWorkout)) {
    clearActiveWorkoutDraft();
    return;
  }
  localStorage.setItem(
    ACTIVE_WORKOUT_DRAFT_KEY,
    JSON.stringify({ workout: state.activeWorkout }),
  );
}

function persistDayWorkoutDraft() {
  if (state.dayIsReadOnly || !hasWorkoutContent(state.dayWorkout)) {
    clearDayWorkoutDraft();
    return;
  }
  localStorage.setItem(
    DAY_WORKOUT_DRAFT_KEY,
    JSON.stringify({
      workout: state.dayWorkout,
      returnView: state.dayReturnView || "calendar",
    }),
  );
}

function restoreWorkoutDrafts() {
  const activeDraft = readJsonStorage(ACTIVE_WORKOUT_DRAFT_KEY);
  if (activeDraft && activeDraft.workout) {
    state.activeWorkout = activeDraft.workout;
  }

  const dayDraft = readJsonStorage(DAY_WORKOUT_DRAFT_KEY);
  if (dayDraft && dayDraft.workout) {
    state.dayWorkout = dayDraft.workout;
    state.dayReturnView = dayDraft.returnView || "calendar";
    state.dayIsReadOnly = false;
  }
}

function getCompletedDatesSet() {
  return new Set(
    loadWorkouts()
      .filter((w) => (w.status ?? "completed") === "completed")
      .map((w) => w.date),
  );
}

function getSavedPlannedDatesSet() {
  return new Set(
    loadWorkouts()
      .filter((w) => (w.status ?? "completed") === "planned")
      .map((w) => w.date),
  );
}

function getSkippedDatesSet() {
  return new Set(
    loadWorkouts()
      .filter((w) => (w.status ?? "completed") === "skipped")
      .map((w) => w.date),
  );
}

function getNextScheduledWorkout(plan = getActivePlan()) {
  if (!plan || !Array.isArray(plan.workoutDays)) return null;

  const completedDates = getCompletedDatesSet();
  const skippedDates = getSkippedDatesSet();
  const savedPlannedDates = getSavedPlannedDatesSet();
  const todayIso = todayISO();
  const todayDow = new Date().getDay();

  const todayIsWorkoutDay =
    plan.workoutDays.includes(todayDow) &&
    todayIso >= plan.start &&
    todayIso <= plan.end;

  if (
    todayIsWorkoutDay &&
    !completedDates.has(todayIso) &&
    !skippedDates.has(todayIso)
  ) {
    return {
      iso: todayIso,
      dow: todayDow,
      label: "Today",
      saved: savedPlannedDates.has(todayIso),
    };
  }

  for (let i = 1; i <= 21; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = localISO(d);
    const dow = d.getDay();
    if (iso > plan.end) break;
    if (iso < plan.start) continue;
    if (!plan.workoutDays.includes(dow)) continue;
    if (completedDates.has(iso) || skippedDates.has(iso)) continue;
    return {
      iso,
      dow,
      label:
        i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-US", { weekday: "long" }),
      saved: savedPlannedDates.has(iso),
    };
  }

  return null;
}

function findMostRecentMissedWorkoutDate() {
  const today = todayISO();
  const skipped = getSkippedDatesSet();
  const completed = getCompletedDatesSet();
  const planned = new Set([...planDatesSet(), ...getSavedPlannedDatesSet()]);
  return (
    [...planned]
      .filter((iso) => iso < today && !completed.has(iso) && !skipped.has(iso))
      .sort((a, b) => b.localeCompare(a))[0] || null
  );
}

function dismissHintKey(key) {
  localStorage.setItem(`${HINT_STORAGE_PREFIX}${key}`, "1");
  refreshContextHints();
}

window.dismissHint = dismissHintKey;

function refreshContextHints() {
  document.querySelectorAll(".context-hint").forEach((el) => {
    const key = el.dataset.hintKey;
    el.hidden = key
      ? localStorage.getItem(`${HINT_STORAGE_PREFIX}${key}`) === "1"
      : true;
  });
}

function syncHomeAction(action) {
  state._homeAction = action;
}

window.runHomeNextAction = function (kind = "primary") {
  const action = state._homeAction;
  if (!action) return;
  const fn =
    kind === "secondary" ? action.secondary?.onClick : action.primary?.onClick;
  if (typeof fn === "function") fn();
};

function renderHomeNextAction() {
  const el = document.getElementById("home-next-action");
  if (!el) return;

  let action = null;

  if (hasWorkoutContent(state.activeWorkout)) {
    const exCount = state.activeWorkout.exercises?.length || 0;
    action = {
      kicker: "Recovery",
      title: state.activeWorkout.name
        ? `Resume ${state.activeWorkout.name}`
        : "Resume workout draft",
      detail: `${exCount} exercise${exCount !== 1 ? "s" : ""} saved${state.activeWorkout.date ? ` · ${formatDate(state.activeWorkout.date)}` : ""}`,
      primary: {
        label: "Resume",
        onClick: () => {
          state.exerciseContext = "workout";
          navigate("workout");
        },
      },
      secondary: {
        label: "Discard",
        onClick: () => {
          state.activeWorkout = null;
          clearActiveWorkoutDraft();
          renderHome();
        },
      },
    };
  } else if (hasWorkoutContent(state.dayWorkout) && !state.dayIsReadOnly) {
    const exCount = state.dayWorkout.exercises?.length || 0;
    action = {
      kicker: "Recovery",
      title: `Resume ${formatDateLong(state.dayWorkout.date)}`,
      detail: `${exCount} exercise${exCount !== 1 ? "s" : ""} saved in progress`,
      primary: {
        label: "Resume",
        onClick: () => {
          state.exerciseContext = "day";
          navigate("day");
        },
      },
      secondary: {
        label: "Discard",
        onClick: () => {
          state.dayWorkout = null;
          clearDayWorkoutDraft();
          renderHome();
        },
      },
    };
  } else {
    const missedIso = findMostRecentMissedWorkoutDate();
    if (missedIso) {
      action = {
        kicker: "Missed Workout",
        title: formatDateLong(missedIso),
        detail:
          "Log it as today's workout, or skip it to clear this reminder.",
        primary: {
          label: "Log Today",
          onClick: () => {
            state._missedRecovery = { iso: missedIso, from: "home" };
            recoverMissedDay("today");
          },
        },
        secondary: {
          label: "Skip Day",
          onClick: () => {
            state._missedRecovery = { iso: missedIso, from: "home" };
            recoverMissedDay("skip");
          },
        },
      };
    } else {
      const plan = getActivePlan();
      const nextWorkout = getNextScheduledWorkout(plan);
      if (nextWorkout && plan) {
        const template = plan.dayTemplates?.[nextWorkout.dow] || [];
        action = {
          kicker: "Next Action",
          title: `${nextWorkout.label} · ${plan.name}`,
          detail:
            template.length > 0
              ? template
                  .map((ex) => ex.name)
                  .slice(0, 4)
                  .join(" · ")
              : "Your next planned workout is ready to go.",
          primary: {
            label:
              nextWorkout.label === "Today" ? "Open Workout" : "Preview Day",
            onClick: () => openDaySelection(nextWorkout.iso, "home", true),
          },
          secondary: null,
        };
      } else {
        action = {
          kicker: "Next Action",
          title: getActivePlan() ? "Browse exercises" : "Set your active plan",
          detail: getActivePlan()
            ? "No upcoming workout is queued, so this is a good time to browse exercises or build your next day."
            : "Create or activate a plan so Home, Calendar, and day suggestions stay in sync.",
          primary: {
            label: getActivePlan() ? "Exercises" : "Open Plans",
            onClick: () => navigate(getActivePlan() ? "exercises" : "plan"),
          },
          secondary: null,
        };
      }
    }
  }

  if (!action) {
    el.innerHTML = "";
    syncHomeAction(null);
    return;
  }

  syncHomeAction(action);
  el.innerHTML = `
    <div class="next-action-card">
      <div class="next-action-content">
        <div class="next-action-kicker">${escHtml(action.kicker)}</div>
        <div class="next-action-title">${escHtml(action.title)}</div>
        <div class="next-action-detail">${escHtml(action.detail)}</div>
      </div>
      <div class="next-action-actions">
        <button class="btn btn-primary" onclick="runHomeNextAction('primary')">${escHtml(action.primary.label)}</button>
        ${action.secondary ? `<button class="btn btn-secondary${action.secondary.isIcon ? " next-action-icon-btn" : ""}" onclick="runHomeNextAction('secondary')" title="${escHtml(action.secondary.label)}">${action.secondary.rawLabel || escHtml(action.secondary.label)}</button>` : ""}
      </div>
    </div>`;
}

window.toggleWeightUnit = function (ctx) {
  saveUnitPref(weightUnit() === "lbs" ? "kg" : "lbs");
  renderBwHomeWidget();
  // Re-render whichever exercise view is active
  if (ctx === "day" || state.dayWorkout) renderDay();
  if (ctx === "workout" || state.activeWorkout) renderWorkout();
  // Update bw view toggle label if it's visible
  const btn = document.getElementById("btn-unit-toggle");
  if (btn) btn.textContent = weightUnit().toUpperCase();
};

// ── RIR Helpers ───────────────────────────────────────────
function calcAutoMsLen(_weeks) {
  // RIR always progresses 3 → 2 → 1 → 0 over a fixed 4-week block
  return 4;
}

function updateRirAutoInfo() {
  const el = document.getElementById("plan-rir-auto-info");
  if (!el) return;
  const weeks = parseInt(document.getElementById("plan-weeks")?.value, 10) || 8;
  const cycles = Math.ceil(weeks / 5); // 4 training + 1 deload
  const cycleNote = cycles > 1 ? ` · ${cycles} blocks over your plan` : "";
  el.textContent = `RIR 3 → 2 → 1 → 0 per 4-week block, then deload${cycleNote}`;
}

function getRirContext(plan, iso) {
  if (!plan.rir) return null;
  const msLen = 4; // always 4-week blocks, RIR 3 → 2 → 1 → 0
  const cycleLen = msLen + 1; // mesocycle weeks + 1 deload week
  const start = new Date(plan.start + "T00:00:00");
  const date = new Date(iso + "T00:00:00");
  const weekNum = Math.floor(Math.round((date - start) / 86400000) / 7); // 0-indexed
  const weekInCycle = weekNum % cycleLen;
  const isDeloadWeek = weekInCycle === msLen;
  const blockNum = Math.floor(weekNum / cycleLen);
  // RIR resets each block (3→0), deload week gets RIR 3 (light)
  const targetRIR = isDeloadWeek
    ? 3
    : Math.min(3, Math.max(0, msLen - 1 - weekInCycle));
  return { weekNum, weekInCycle, targetRIR, blockNum, msLen, isDeloadWeek };
}

function findLastLoggedSet(workouts, planName, exName, dow, beforeIso) {
  const sorted = workouts
    .filter((w) => w.date < beforeIso && w.name === planName)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const w of sorted) {
    if (new Date(w.date + "T00:00:00").getDay() !== dow) continue;
    const ex = w.exercises.find((e) => e.name === exName);
    if (!ex) continue;
    const set = ex.sets.find((s) => s.actualReps != null && s.rir != null);
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
// (localISO, todayISO, formatDate, formatDateLong now live in
// ./lib/dates.js and are imported at the top.)

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderReleaseNotes() {
  const overlay = document.getElementById("release-notes");
  const list = document.getElementById("release-notes-list");
  if (!overlay || !list) return;

  document.getElementById("release-notes-version").textContent =
    `Version ${APP_RELEASE.version}`;
  document.getElementById("release-notes-title").textContent =
    APP_RELEASE.title;
  document.getElementById("release-notes-summary").textContent =
    APP_RELEASE.summary;
  list.innerHTML = APP_RELEASE.sections
    .map(
      (section) => `
        <div class="release-notes-section">
          <div class="release-notes-section-title">${escHtml(section.title)}</div>
          <div class="release-notes-section-items">
            ${section.items
              .map(
                (note) => `
                  <div class="release-note-item">
                    <div class="release-note-dot"></div>
                    <div class="release-note-text">${escHtml(note)}</div>
                  </div>`,
              )
              .join("")}
          </div>
        </div>`,
    )
    .join("");
}

function dismissReleaseNotes() {
  const overlay = document.getElementById("release-notes");
  if (!overlay) return;
  localStorage.setItem(RELEASE_NOTES_STORAGE_KEY, APP_RELEASE.version);
  overlay.classList.add("hidden");
  overlay.hidden = true;
  overlay.style.display = "";
}

function showReleaseNotesIfNeeded() {
  if (!localStorage.getItem("wt_seen")) return;
  if (localStorage.getItem(RELEASE_NOTES_STORAGE_KEY) === APP_RELEASE.version) {
    return;
  }

  renderReleaseNotes();
  const overlay = document.getElementById("release-notes");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  overlay.hidden = false;
  overlay.style.display = "";
}

function watchInstallingWorker(registration) {
  return new Promise((resolve) => {
    const worker = registration.installing;
    if (!worker) {
      resolve(null);
      return;
    }

    const finish = () => resolve(registration.waiting || null);
    if (worker.state === "installed") {
      finish();
      return;
    }

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") finish();
      if (worker.state === "redundant") resolve(null);
    });
  });
}

// ── Hydration loading overlay ──────────────────────────
const HYDRATION_CIRCUMFERENCE = 2 * Math.PI * 52; // matches r="52" in SVG

function showStartupBrandOverlay() {
  const overlay = document.getElementById("startup-brand-overlay");
  if (!overlay) return;
  overlay.hidden = false;
}

function hideStartupBrandOverlay() {
  const overlay = document.getElementById("startup-brand-overlay");
  if (!overlay) return;
  overlay.hidden = true;
}

function finishInitialBoot() {
  document.body.classList.remove("app-booting");
}

function showHydrationOverlay() {
  const overlay = document.getElementById("hydration-overlay");
  if (!overlay) return;
  overlay.hidden = false;
  setHydrationProgress(0, "Loading your data\u2026");
}

function setHydrationProgress(percent, label) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const ring = document.getElementById("hydration-ring-fill");
  const pctEl = document.getElementById("hydration-pct");
  const labelEl = document.getElementById("hydration-label");
  if (ring)
    ring.style.strokeDashoffset = HYDRATION_CIRCUMFERENCE * (1 - pct / 100);
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (labelEl && label) labelEl.textContent = label;
}

function hideHydrationOverlay() {
  const overlay = document.getElementById("hydration-overlay");
  if (!overlay) return;
  overlay.hidden = true;
}

async function ensureLatestAppBuild() {
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  let waitingWorker = registration.waiting || null;

  if (!waitingWorker) {
    const updateResult = new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(null), 2500);

      const handleWorker = () => {
        watchInstallingWorker(registration).then((worker) => {
          clearTimeout(timeoutId);
          resolve(worker);
        });
      };

      if (registration.installing) {
        handleWorker();
        return;
      }

      registration.addEventListener("updatefound", handleWorker, {
        once: true,
      });
    });

    try {
      await registration.update();
    } catch (e) {
      console.warn("Service worker update check failed:", e);
    }

    waitingWorker = registration.waiting || (await updateResult);
  }

  if (!waitingWorker) return false;

  const reloadKey = `${RELEASE_RELOAD_PREFIX}${APP_RELEASE.version}`;
  if (sessionStorage.getItem(reloadKey) === "1") return false;

  sessionStorage.setItem(reloadKey, "1");

  await new Promise((resolve) => {
    const timeoutId = setTimeout(resolve, 1500);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        clearTimeout(timeoutId);
        resolve();
      },
      { once: true },
    );
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  });

  window.location.reload();
  return true;
}

function clearLocalUserState() {
  clearCaches();
  [
    "wt_active_plan",
    "wt_workouts",
    "wt_plans",
    "wt_bodyweights",
    "wt_display_name",
    "wt_draft_active_workout",
    "wt_draft_day_workout",
  ].forEach((key) => localStorage.removeItem(key));
}

async function deleteCurrentUserData(uid) {
  const { collection, getDocs, deleteDoc, doc } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  const collections = ["workouts", "plans", "bodyweights"];
  await Promise.all(
    collections.map(async (name) => {
      const snap = await getDocs(
        collection(window._db, `users/${uid}/${name}`),
      );
      await Promise.all(snap.docs.map((entry) => deleteDoc(entry.ref)));
    }),
  );

  await deleteDoc(doc(window._db, `users/${uid}`)).catch(() => {});
}

async function handleDeleteAccount() {
  const btn = document.getElementById("btn-delete-account");
  const user = window._auth && window._auth.currentUser;
  if (!btn || !user) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Deleting...";

  try {
    const uid = user.uid;
    const { deleteUser, getIdTokenResult } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

    const token = await getIdTokenResult(user, true);
    const authTimeMs = token.claims.auth_time
      ? Number(token.claims.auth_time) * 1000
      : 0;
    const authAgeMs = Date.now() - authTimeMs;

    if (!authTimeMs || authAgeMs > 5 * 60 * 1000) {
      throw new Error("requires-recent-login");
    }

    await deleteCurrentUserData(uid);
    await deleteUser(user);
    clearLocalUserState();
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (msg.includes("requires-recent-login") || msg.includes("recent login")) {
      showAlert(
        "Re-authentication required",
        "For security, please sign out, sign back in, and then try deleting your account again.",
      );
    } else {
      showAlert(
        "Could not delete account",
        "Something went wrong while deleting your account. Please try again.",
      );
    }
    console.error(e);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ── Modal ─────────────────────────────────────────────────
function showModal({
  title,
  msg,
  onConfirm,
  confirmText = "OK",
  confirmClass = "btn-primary",
  cancelText = null,
  onCancel = null,
} = {}) {
  const overlay = document.getElementById("modal-overlay");
  document.getElementById("modal-title").textContent = title || "";
  document.getElementById("modal-msg").innerHTML = msg || "";
  const actions = document.getElementById("modal-actions");
  actions.innerHTML = "";

  if (cancelText) {
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.textContent = cancelText;
    btn.onclick = () => {
      overlay.hidden = true;
      if (onCancel) onCancel();
    };
    actions.appendChild(btn);
  }

  const confirmBtn = document.createElement("button");
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
  showModal({ title, msg, confirmText: "OK" });
}

function showToastMessage({
  icon = "✓",
  label = "Update",
  title = "Saved",
  detail = "",
  tone = "default",
}) {
  const toast = document.getElementById("pr-toast");
  if (!toast) return;
  toast.querySelector(".pr-toast-icon").textContent = icon;
  toast.querySelector(".pr-toast-label").textContent = label;
  toast.querySelector(".pr-toast-ex").textContent = title;
  toast.querySelector(".pr-toast-weight").textContent = detail;
  toast.classList.remove(
    "pr-toast-success",
    "pr-toast-neutral",
    "pr-toast-out",
  );
  if (tone === "success") toast.classList.add("pr-toast-success");
  if (tone === "neutral") toast.classList.add("pr-toast-neutral");
  toast.hidden = false;
  void toast.offsetWidth;
  toast.classList.add("pr-toast-in");
  clearTimeout(toast._prTimeout);
  toast._prTimeout = setTimeout(() => {
    toast.classList.remove("pr-toast-in");
    toast.classList.add("pr-toast-out");
    setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove(
        "pr-toast-out",
        "pr-toast-success",
        "pr-toast-neutral",
      );
    }, 350);
  }, 2200);
}

function nextPaint() {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
}

function setPlanProgress(percent, title, detail, stepLabel) {
  const overlay = document.getElementById("plan-progress-overlay");
  if (!overlay) return;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  document.getElementById("plan-progress-title").textContent =
    title || "Updating active plan";
  document.getElementById("plan-progress-detail").textContent = detail || "";
  document.getElementById("plan-progress-step").textContent =
    stepLabel || "Working";
  document.getElementById("plan-progress-percent").textContent =
    `${safePercent}%`;
  document.getElementById("plan-progress-fill").style.width = `${safePercent}%`;
  overlay.hidden = false;
}

function hidePlanProgress() {
  const overlay = document.getElementById("plan-progress-overlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.getElementById("plan-progress-fill").style.width = "0%";
  document.getElementById("plan-progress-percent").textContent = "0%";
  document.getElementById("plan-progress-step").textContent = "Starting";
}

window.showTrainingMethodInfo = function (method) {
  if (method === "rir") {
    showAlert(
      "Reps in Reserve (RIR)",
      `
      <p style="margin:0 0 10px">RIR measures how close you are to failure. <strong>RIR 3</strong> means you could do 3 more reps; <strong>RIR 0</strong> means you hit true failure.</p>
      <p style="margin:0 0 10px">Each week of your mesocycle the target RIR drops by 1 — so the load progressively intensifies:</p>
      <p style="margin:0;font-family:monospace;font-size:13px">Wk 1 → RIR 3 &nbsp;|&nbsp; Wk 2 → RIR 2<br>Wk 3 → RIR 1 &nbsp;|&nbsp; Wk 4 → RIR 0</p>
      <p style="margin:10px 0 0;color:var(--text2);font-size:13px">Log the reps you actually completed. The app uses that to auto-calculate next week's target.</p>
    `,
    );
  } else if (method === "er") {
    showAlert(
      "Effective Reps (ER)",
      `
      <p style="margin:0 0 10px">ER training accumulates reps close to failure using rest-pause technique.</p>
      <p style="margin:0 0 10px"><strong>How it works:</strong></p>
      <ol style="margin:0 0 10px;padding-left:18px">
        <li>Do your <strong>ignition set</strong> to near-failure (e.g. 12 reps)</li>
        <li>Rest 10–15 seconds</li>
        <li>Keep going in short bursts until you hit the <strong>ER target</strong> total</li>
      </ol>
      <p style="margin:0;color:var(--text2);font-size:13px">Only the reps near failure count as "effective." This method maximises stimulus in less time.</p>
    `,
    );
  }
};

function showPRToast(exerciseName, weight) {
  showToastMessage({
    icon: "🏆",
    label: "New PR!",
    title: exerciseName,
    detail: fmtWeight(weight),
  });
}

function setExerciseSavePending(pending) {
  state.exerciseSavePending = pending;
  const btn = document.getElementById("btn-save-exercise");
  if (!btn) return;
  btn.disabled = pending;
  btn.textContent = pending ? "Saving..." : "Save Exercise";
}

// ── Rest Timer ────────────────────────────────────────────
let _restInterval = null;

function startRestTimer(seconds) {
  clearInterval(_restInterval);
  let remaining = seconds;
  const urgentAt = Math.min(10, Math.floor(seconds / 3));
  const chip = document.getElementById("rest-timer");
  const countEl = document.getElementById("rest-timer-count");
  chip.hidden = false;
  chip.classList.remove("urgent");
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
    if (remaining <= urgentAt) chip.classList.add("urgent");
  }, 1000);
}

window.setRestTimer = (s) => startRestTimer(s);
window.dismissRestTimer = () => {
  clearInterval(_restInterval);
  document.getElementById("rest-timer").hidden = true;
};

// ── Built-in Exercise Set (lazy, cached) ──────────────────
// Flattens EXERCISES into a Set for O(1) membership checks. EXERCISES is
// constant after module init, so a single lazy build is enough for the
// lifetime of the page.
let _builtInSetCache = null;
function _builtInSet() {
  if (!_builtInSetCache) {
    _builtInSetCache = new Set(Object.values(EXERCISES).flat());
  }
  return _builtInSetCache;
}

// ── PR Detection ──────────────────────────────────────────
// Memoized by the workouts cache generation counter from storage.js.
// Invalidated implicitly whenever addWorkout/updateWorkout/deleteWorkout,
// clearCaches, or hydrateFromFirestore bump the generation, so callers
// never see a stale PR map without us having to thread invalidations
// through every call site.
let _prMapCache = null;
let _prMapCacheGen = -1;
function buildPRMap() {
  const gen = getWorkoutsGeneration();
  if (_prMapCache && _prMapCacheGen === gen) return _prMapCache;
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
  _prMapCache = prMap;
  _prMapCacheGen = gen;
  return prMap;
}

// ── Navigation ────────────────────────────────────────────
function navigate(view) {
  state.view = view;
  document
    .querySelectorAll(".view")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");

  // Hide bottom nav on the auth screen
  document.getElementById("bottom-nav").style.display =
    view === "auth" ? "none" : "";

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  if (view === "home") renderHome();
  if (view === "workout") renderWorkout();
  if (view === "day") renderDay();
  if (view === "calendar") renderCalendar();
  if (view === "history") renderHistory();
  if (view === "exercise") renderExerciseForm();
  if (view === "bodyweight") renderBodyWeight();
  if (view === "exercise-history") renderExerciseHistory();
  if (view === "plan") renderPlan();
  if (view === "plan-editor") renderPlanEditor();
  if (view === "plan-day-muscles") renderPlanDayMuscles();
  if (view === "plan-muscle-picker") renderMuscleGroupPicker();
  if (view === "volume") {
    state.volumeWeekOffset = 0;
    renderVolumeTracker();
  }
  if (view === "exercise-muscle") renderExMusclePickerView();
  if (view === "exercises") {
    state.exLibSearch = "";
    renderExerciseLibrary();
  }
  if (view === "settings") renderSettings();
  refreshContextHints();

  window.scrollTo(0, 0);
}
window.navigate = navigate;

// ── Settings / Profile ─────────────────────────────────────
function renderSettings() {
  const user = window._auth && window._auth.currentUser;
  document.getElementById("settings-email").textContent = user
    ? user.email
    : "";

  // Display name: show saved name or prompt to set one
  const savedName = localStorage.getItem("wt_display_name") || "";
  const showRow = document.getElementById("display-name-show");
  const editRow = document.getElementById("display-name-edit");
  const nameValue = document.getElementById("display-name-value");
  if (savedName) {
    nameValue.textContent = savedName;
    showRow.style.display = "flex";
    editRow.style.display = "none";
  } else {
    showRow.style.display = "none";
    editRow.style.display = "flex";
    document.getElementById("settings-name").value = "";
  }

  // Highlight active unit chip
  const unit = loadUnitPref();
  document.querySelectorAll("#settings-unit-chips .ex-chip").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.unit === unit);
  });

  // Highlight active theme chip
  const isLight = document.body.classList.contains("light");
  document
    .getElementById("settings-theme-dark")
    .classList.toggle("chip-active", !isLight);
  document
    .getElementById("settings-theme-light")
    .classList.toggle("chip-active", isLight);

  const palette = getAccentPalette();
  const sel = document.getElementById("settings-theme-palette-select");
  if (sel) sel.value = palette;
}

// Auth tab switcher (called from inline onclick)
window.switchAuthTab = function (tab) {
  const isSignIn = tab === "signin";
  document
    .getElementById("auth-tab-signin")
    .classList.toggle("active", isSignIn);
  document
    .getElementById("auth-tab-signup")
    .classList.toggle("active", !isSignIn);
  document.getElementById("btn-auth-submit").textContent = isSignIn
    ? "Sign In"
    : "Create Account";
  document.getElementById("auth-password").autocomplete = isSignIn
    ? "current-password"
    : "new-password";
  document.getElementById("auth-error").hidden = true;
  document.getElementById("btn-auth-submit").dataset.mode = tab;
};

// ── Home ──────────────────────────────────────────────────

function renderHome() {
  document.getElementById("home-date").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  renderStats();
  renderBwHomeWidget();
  renderTodayPlan();
  renderHomeNextAction();
}

function renderTodayPlan() {
  const el = document.getElementById("home-today-plan");
  if (!el) return;

  const plan = getActivePlan();
  const nextWorkout = getNextScheduledWorkout(plan);
  if (!plan || !Array.isArray(plan.workoutDays) || !nextWorkout) {
    el.innerHTML = "";
    return;
  }

  const exList =
    plan.dayTemplates &&
    plan.dayTemplates[nextWorkout.dow] &&
    plan.dayTemplates[nextWorkout.dow].length > 0
      ? plan.dayTemplates[nextWorkout.dow]
          .map((e) => escHtml(e.name))
          .join(" · ")
      : "Workout day";

  const rirCtx = getRirContext(plan, nextWorkout.iso);
  const rirBadge = rirCtx
    ? rirCtx.isDeloadWeek
      ? `<span class="today-plan-rir today-plan-rir-deload">Deload Week</span>`
      : `<span class="today-plan-rir">Wk&nbsp;${rirCtx.weekInCycle + 1}/${rirCtx.msLen} · RIR&nbsp;${rirCtx.targetRIR}</span>`
    : "";

  el.innerHTML = `
    <div class="today-plan-card">
      <div class="today-plan-next-label">Next Workout</div>
      <div class="today-plan-card-top">
        <div>
          <div class="today-plan-label">${nextWorkout.label} — ${escHtml(plan.name)} ${rirBadge}</div>
          <div class="today-plan-exercises">${exList}</div>
        </div>
        <button class="today-plan-start-btn" onclick="startNextWorkout('${nextWorkout.iso}','${nextWorkout.label}')">Start ›</button>
      </div>
    </div>`;
}

window.startNextWorkout = function (targetIso, label) {
  const today = todayISO();
  if (targetIso === today) {
    selectDay(targetIso, "home");
    return;
  }
  showModal({
    title: "Start early?",
    msg: `This workout is scheduled for ${label}. Start it now, or open today to log a different workout?`,
    confirmText: "Start scheduled",
    cancelText: "Open today",
    onConfirm: () => selectDay(targetIso, "home"),
    onCancel: () => selectDay(today, "home"),
  });
};

// ── Volume Tracker ────────────────────────────────────────

function getWeekVolumeByMuscle(weekOffset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const workouts = loadWorkouts().filter((w) => {
    if ((w.status ?? "completed") !== "completed") return false;
    const d = new Date(w.date + "T00:00:00");
    return d >= monday && d <= sunday;
  });

  const sets = {};
  workouts.forEach((w) => {
    w.exercises.forEach((ex) => {
      const muscle = ex.muscleGroup || getMuscleGroup(ex.name);
      if (!muscle || muscle === "Full Body") return;
      // ER sets count as 1.5× toward weekly volume (rest-pause technique is
      // more stimulus-per-set than a straight set)
      const erMultiplier = ex.repMode === "er" ? 1.5 : 1;
      sets[muscle] = (sets[muscle] || 0) + ex.sets.length * erMultiplier;
    });
  });
  return { sets, monday, sunday };
}

window.volWeekNav = function (delta) {
  const next = state.volumeWeekOffset + delta;
  if (next > 0) return; // can't navigate into the future
  state.volumeWeekOffset = next;
  renderVolumeTracker();
};

function renderVolumeTracker() {
  const MUSCLES = Object.keys(MUSCLE_MAP).filter((m) => m !== "Full Body");
  const REC_MIN = 10;
  const REC_MAX = 20;
  const BAR_MAX = 24;

  const offset = state.volumeWeekOffset;
  const { sets, monday, sunday } = getWeekVolumeByMuscle(offset);
  const isCurrentWeek = offset === 0;

  const fmtOpts = { month: "short", day: "numeric" };
  const weekStr =
    monday.toLocaleDateString("en-US", fmtOpts) +
    " – " +
    sunday.toLocaleDateString("en-US", fmtOpts);

  const rows = MUSCLES.map((muscle) => {
    const count = sets[muscle] || 0;
    const pct = Math.min(100, (count / BAR_MAX) * 100);
    const barCls =
      count === 0
        ? "vol-bar-empty"
        : count < REC_MIN
          ? "vol-bar-low"
          : count <= REC_MAX
            ? "vol-bar-ok"
            : "vol-bar-high";
    const minPct = (REC_MIN / BAR_MAX) * 100;
    const maxPct = (REC_MAX / BAR_MAX) * 100;
    return `
      <div class="vol-row">
        <div class="vol-row-top">
          <span class="vol-muscle">${muscle}</span>
          <span class="vol-count${count === 0 ? " vol-count-zero" : ""}">${Number.isInteger(count) ? count : count.toFixed(1)} set${count !== 1 ? "s" : ""}</span>
        </div>
        <div class="vol-bar-bg">
          <div class="vol-bar-fill ${barCls}" style="width:${pct}%"></div>
          <div class="vol-bar-marker" style="left:${minPct}%"></div>
          <div class="vol-bar-marker" style="left:${maxPct}%"></div>
        </div>
      </div>`;
  }).join("");

  document.getElementById("volume-content").innerHTML = `
    <div class="vol-week-nav">
      <button class="vol-week-nav-btn" onclick="volWeekNav(-1)">‹</button>
      <span class="vol-week-range">${weekStr}</span>
      <button class="vol-week-nav-btn" onclick="volWeekNav(1)" ${isCurrentWeek ? "disabled" : ""}>›</button>
    </div>
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

  const completedWorkouts = workouts.filter(
    (w) => (w.status ?? "completed") === "completed",
  );
  const plannedWorkouts = workouts.filter(
    (w) => (w.status ?? "completed") === "planned",
  );

  const completedDates = new Set(completedWorkouts.map((w) => w.date));
  const plannedDates = new Set(plannedWorkouts.map((w) => w.date));

  renderWeekStrip(completedDates, plannedDates, today);
}

function renderWeekStrip(completedDates, plannedDates, today) {
  const el = document.getElementById("week-strip");
  if (!el) return;

  // Monday of the current week
  const now = new Date();
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  el.innerHTML = DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = localISO(d);
    const isToday = iso === today;
    const completed = completedDates.has(iso);
    const planned = !completed && plannedDates.has(iso);
    const isFuture = iso > today;

    const dotClass = [
      "week-dot",
      completed ? "week-dot-logged" : "",
      planned ? "week-dot-planned" : "",
      isToday ? "week-dot-today" : "",
      isFuture ? "week-dot-future" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const labelClass =
      "week-day-label" + (isToday ? " week-day-label-today" : "");
    const isPastMissed = !completed && !planned && !isToday && !isFuture;
    const inner = completed
      ? '<span class="week-dot-check">✓</span>'
      : planned
        ? '<span class="week-dot-plan-dot"></span>'
        : isPastMissed
          ? '<span class="week-dot-miss">✕</span>'
          : "";

    return `
      <div class="week-day" onclick="selectDay('${iso}','home')" style="cursor:pointer">
        <div class="${dotClass}">${inner}</div>
        <div class="${labelClass}">${label}</div>
      </div>`;
  }).join("");
}

// ── Body Weight ───────────────────────────────────────────
function makeSvgLineChart(data, { w = 300, h = 90 } = {}) {
  if (data.length < 2) return "";
  const pad = { t: 8, b: 22, l: 38, r: 8 };
  const iW = w - pad.l - pad.r;
  const iH = h - pad.t - pad.b;
  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;
  const xS = (i) => pad.l + (i / (data.length - 1)) * iW;
  const yS = (v) => pad.t + iH - ((v - minV) / rangeV) * iH;
  const pts = data
    .map((d, i) => `${xS(i).toFixed(1)},${yS(d.value).toFixed(1)}`)
    .join(" ");
  const dots = data
    .map(
      (d, i) =>
        `<circle cx="${xS(i).toFixed(1)}" cy="${yS(d.value).toFixed(1)}" r="3" fill="var(--accent)"/>`,
    )
    .join("");
  const yLabels = [minV, maxV]
    .map(
      (v) =>
        `<text x="${pad.l - 5}" y="${yS(v) + 4}" text-anchor="end" font-size="9" fill="var(--text3)">${v}</text>`,
    )
    .join("");
  const fmtDate = (iso) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  const xLabels = `
    <text x="${pad.l}" y="${h - 3}" text-anchor="start" font-size="9" fill="var(--text3)">${fmtDate(data[0].date)}</text>
    <text x="${w - pad.r}" y="${h - 3}" text-anchor="end" font-size="9" fill="var(--text3)">${fmtDate(data[data.length - 1].date)}</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block;overflow:visible">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.8"/>
    ${dots}${yLabels}${xLabels}
  </svg>`;
}

function renderSparkline(entries) {
  if (entries.length < 2) return "";
  const vals = entries.map((e) => e.weight);
  const minV = Math.min(...vals),
    maxV = Math.max(...vals),
    rng = maxV - minV || 1;
  const sw = 60,
    sh = 24;
  const xS = (i) => (i / (entries.length - 1)) * sw;
  const yS = (v) => sh - 2 - ((v - minV) / rng) * (sh - 4);
  const pts = entries
    .map((e, i) => `${xS(i).toFixed(1)},${yS(e.weight).toFixed(1)}`)
    .join(" ");
  return `<svg viewBox="0 0 ${sw} ${sh}" width="${sw}" height="${sh}" style="display:block">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function renderBwHomeWidget() {
  const entries = loadBodyWeights();
  const valEl = document.getElementById("bw-home-value");
  const sparkEl = document.getElementById("bw-home-sparkline");
  if (!valEl) return;
  if (entries.length === 0) {
    valEl.textContent = `— ${weightUnit()}`;
    sparkEl.innerHTML = "";
    return;
  }
  valEl.textContent = `${toDisplayWeight(entries[0].weight)} ${weightUnit()}`;
  sparkEl.innerHTML = renderSparkline([...entries].slice(0, 14).reverse());
}

function renderBodyWeight() {
  const entries = loadBodyWeights();
  const unit = weightUnit();
  document.getElementById("bw-date").value = todayISO();
  const todayEntry = entries.find((e) => e.date === todayISO());
  document.getElementById("bw-input").value = todayEntry
    ? toDisplayWeight(todayEntry.weight)
    : "";
  document.getElementById("bw-input").placeholder = unit;
  const toggleBtn = document.getElementById("btn-unit-toggle");
  if (toggleBtn) toggleBtn.textContent = unit.toUpperCase();

  const graphEl = document.getElementById("bw-graph-section");
  if (entries.length >= 2) {
    const chartData = [...entries]
      .reverse()
      .map((e) => ({ date: e.date, value: toDisplayWeight(e.weight) || 0 }));
    graphEl.innerHTML = `<div class="bw-graph-wrap">${makeSvgLineChart(chartData, { w: 320, h: 100 })}</div>`;
  } else {
    graphEl.innerHTML =
      entries.length === 0
        ? '<div class="bw-empty">No entries yet — log your first weight above.</div>'
        : "";
  }

  const listEl = document.getElementById("bw-list");
  if (entries.length === 0) {
    listEl.innerHTML = "";
    return;
  }
  listEl.innerHTML = `
    <div class="section-title" style="padding: 16px 0 8px">History</div>
    ${entries
      .map(
        (e) => `
      <div class="bw-list-row">
        <span class="bw-list-date">${formatDate(e.date)}</span>
        <span class="bw-list-weight">${toDisplayWeight(e.weight)} ${unit}</span>
        <button class="btn btn-ghost btn-sm" onclick="deleteBwEntry('${e.date}')">Remove</button>
      </div>`,
      )
      .join("")}`;
}

window.deleteBwEntry = function (date) {
  deleteBodyWeight(date);
  renderBodyWeight();
  renderBwHomeWidget();
};

// ── Exercise History ──────────────────────────────────────
window.showExerciseHistory = function (name, event) {
  event.stopPropagation();
  state.exHistoryName = name;
  state.exHistoryBackTo = state.view;
  navigate("exercise-history");
};

// Called from exercise card — resolves name by index to avoid encoding issues
window.openExerciseHistory = function (ctx, ei, event) {
  event.stopPropagation();
  const ex = workoutFor(ctx)?.exercises[ei];
  if (!ex) return;
  state.exHistoryName = ex.name;
  state.exHistoryBackTo = state.view;
  navigate("exercise-history");
};

function renderExerciseHistory() {
  const name = state.exHistoryName;
  document.getElementById("ex-history-title").textContent = name || "Exercise";

  const workouts = loadWorkouts();
  const sessions = workouts
    .filter((w) => w.exercises.some((e) => e.name === name))
    .sort((a, b) => a.date.localeCompare(b.date));

  const content = document.getElementById("ex-history-content");
  if (sessions.length === 0) {
    content.innerHTML =
      '<div class="ex-history-empty">No history logged for this exercise yet.</div>';
    return;
  }

  // Graph: max weight per session
  const graphData = sessions.map((w) => {
    const ex = w.exercises.find((e) => e.name === name);
    const max = Math.max(...ex.sets.map((s) => s.weight || 0));
    return { date: w.date, value: toDisplayWeight(max) || 0 };
  });

  const lastSession = sessions[sessions.length - 1];
  const lastExercise = lastSession.exercises.find((e) => e.name === name);
  const bestWeight = Math.max(...graphData.map((entry) => entry.value || 0));
  const lastMax = Math.max(...lastExercise.sets.map((s) => s.weight || 0));
  const lastDisplay = toDisplayWeight(lastMax);
  const allTargetsHit = lastExercise.sets
    .filter((s) => (s.weight || 0) > 0)
    .every((s) => (s.actualReps ?? s.reps) >= (s.reps || 1));
  const isKg = weightUnit() === "kg";
  const jumpLbs = isKg
    ? lastMax >= 220
      ? 2.5 * KG_TO_LBS
      : 1.25 * KG_TO_LBS
    : lastMax >= 100
      ? 5
      : 2.5;
  const jumpDisplay = isKg
    ? lastMax >= 220
      ? 2.5
      : 1.25
    : lastMax >= 100
      ? 5
      : 2.5;
  const progressSummary = `
    <div class="ex-history-summary">
      <div class="ex-history-summary-card">
        <div class="ex-history-summary-label">Best Weight</div>
        <div class="ex-history-summary-value">${bestWeight ? `${bestWeight} ${weightUnit()}` : "—"}</div>
        <div class="ex-history-summary-detail">Top single-session weight for ${escHtml(name)}</div>
      </div>
      <div class="ex-history-summary-card">
        <div class="ex-history-summary-label">Last Session</div>
        <div class="ex-history-summary-value">${lastDisplay ? `${lastDisplay} ${weightUnit()}` : "—"}</div>
        <div class="ex-history-summary-detail">${formatDate(lastSession.date)} · ${lastSession.sets ? "" : escHtml(lastSession.name)}</div>
      </div>
      <div class="ex-history-summary-card ex-history-summary-wide">
        <div class="ex-history-summary-label">Suggested Next Step</div>
        <div class="ex-history-summary-value">${allTargetsHit && lastMax > 0 ? `${toDisplayWeight(lastMax + jumpLbs)} ${weightUnit()}` : `${lastDisplay || 0} ${weightUnit()}`}</div>
        <div class="ex-history-summary-detail">${allTargetsHit && lastMax > 0 ? `Last session hit every target, so try +${jumpDisplay} ${weightUnit()} next time.` : "Repeat the same weight until every set hits its target reps cleanly."}</div>
      </div>
    </div>`;

  const sessionsHtml = [...sessions]
    .reverse()
    .map((w) => {
      const ex = w.exercises.find((e) => e.name === name);
      const setRows = ex.sets
        .map((s, i) => {
          const hit = s.actualReps != null ? ` · hit ${s.actualReps}` : "";
          return `<div class="ex-history-set-row">
        <span class="ex-history-set-num">Set ${i + 1}</span>
        <span class="ex-history-set-val">${s.reps} reps × ${s.weight ? fmtWeight(s.weight) : `0 ${weightUnit()}`}${hit}</span>
      </div>`;
        })
        .join("");
      return `<div class="ex-history-session">
      <div class="ex-history-session-header">${formatDate(w.date)} <span class="ex-history-session-name">· ${escHtml(w.name)}</span></div>
      ${setRows}
    </div>`;
    })
    .join("");

  content.innerHTML = `
    ${progressSummary}
    <div class="ex-history-graph-wrap">${makeSvgLineChart(graphData, { w: 320, h: 100 })}</div>
    <div class="ex-history-subtitle">Max weight per session</div>
    <div class="ex-history-sessions">${sessionsHtml}</div>`;
}

function setRowHTML(s, i, prWeight) {
  const repsDisplay =
    s.actualReps != null && s.actualReps > 0
      ? `${s.actualReps}<span style="color:var(--text3);font-size:11px"> / ${s.reps}</span>`
      : `${s.reps}`;
  const rirDisplay =
    s.rir != null ? `<span class="set-rir-history">RIR ${s.rir}</span>` : "";
  const prBadge =
    prWeight && s.weight && s.weight >= prWeight
      ? `<span class="pr-badge">PR</span>`
      : "";
  return `
    <tr>
      <td class="set-num">${i + 1}</td>
      <td>${repsDisplay} reps ${rirDisplay}</td>
      <td>${s.weight ? fmtWeight(s.weight) : "—"}${prBadge}</td>
    </tr>`;
}

function calcVolume(w) {
  const volLbs = w.exercises.reduce(
    (t, ex) =>
      t +
      ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0,
  );
  if (!volLbs) return null;
  const vol = weightUnit() === "kg" ? Math.round(volLbs * LBS_TO_KG) : volLbs;
  const unit = weightUnit();
  return vol >= 1000 ? `${(vol / 1000).toFixed(1)}k ${unit}` : `${vol} ${unit}`;
}

function workoutCardHTML(w) {
  const exCount = w.exercises.length;
  const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const vol = calcVolume(w);

  const exerciseRows = w.exercises
    .map((ex) => {
      const setRows = ex.sets.map((s, i) => setRowHTML(s, i)).join("");
      return `
      <div class="exercise-row">
        <div class="exercise-row-name">${escHtml(ex.name)}</div>
        <table class="sets-table">
          <thead><tr><th></th><th>Reps</th><th>Weight</th></tr></thead>
          <tbody>${setRows}</tbody>
        </table>
      </div>`;
    })
    .join("");

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
        <span class="meta-pill">${exCount} exercise${exCount !== 1 ? "s" : ""}</span>
        <span class="meta-pill">${setCount} set${setCount !== 1 ? "s" : ""}</span>
        ${vol ? `<span class="meta-pill vol-pill">${vol}</span>` : ""}
      </div>
      <div class="workout-card-exercises">${exerciseRows}</div>
    </div>`;
}

window.toggleCard = function (el) {
  el.classList.toggle("expanded");
};

// ── Active Workout (Start Workout flow) ───────────────────
function startWorkout() {
  if (hasWorkoutContent(state.activeWorkout)) {
    state.exerciseContext = "workout";
    navigate("workout");
    return;
  }
  state.activeWorkout = {
    id: uid(),
    name: "",
    date: todayISO(),
    exercises: [],
  };
  state._sessionPRs = {};
  state.exerciseContext = "workout";
  persistActiveWorkoutDraft();
  navigate("workout");
}

function renderWorkout() {
  const w = state.activeWorkout;
  if (!w) return;
  document.getElementById("workout-name").value = w.name;
  document.getElementById("workout-date").value = w.date;
  document.getElementById("workout-notes").value = w.notes || "";

  const container = document.getElementById("active-exercises");
  if (w.exercises.length === 0) {
    container.innerHTML = emptyExerciseState();
    return;
  }
  const prMap = buildPRMap();
  container.innerHTML = buildExerciseListHtml(w.exercises, "workout", prMap);
}

function syncWorkoutFields() {
  const w = state.activeWorkout;
  if (!w) return;
  w.name = document.getElementById("workout-name").value.trim();
  w.date = document.getElementById("workout-date").value;
  w.notes = document.getElementById("workout-notes").value.trim() || undefined;
  persistActiveWorkoutDraft();
}

// ── Progressive Overload ──────────────────────────────────

function getOverloadSuggestions(workout) {
  const allWorkouts = loadWorkouts();
  const suggestions = [];

  workout.exercises.forEach((ex) => {
    const curDoneSets = ex.sets.filter((s) => s.done && s.weight > 0);
    if (curDoneSets.length === 0) return;

    // Find most recent prior completed session with this exercise
    const prev = allWorkouts
      .filter(
        (w) =>
          w.date < workout.date &&
          (w.status ?? "completed") === "completed" &&
          w.exercises.some((e) => e.name === ex.name),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!prev) return; // first time logging this exercise — no suggestion yet

    const curMax = Math.max(...curDoneSets.map((s) => s.weight));
    const allDone = ex.sets.every((s) => s.done);
    const hitReps = curDoneSets.every(
      (s) => (s.actualReps ?? s.reps) >= (s.reps || 1),
    );
    // Use unit-appropriate increments; threshold in lbs (220 lbs ≈ 100 kg)
    const isKg = weightUnit() === "kg";
    const niceInc = isKg
      ? curMax >= 220
        ? 2.5 * KG_TO_LBS
        : 1.25 * KG_TO_LBS
      : curMax >= 100
        ? 5
        : 2.5;
    const dispInc = isKg
      ? curMax >= 220
        ? 2.5
        : 1.25
      : curMax >= 100
        ? 5
        : 2.5;
    const unit = weightUnit();

    if (allDone && hitReps) {
      suggestions.push({
        name: ex.name,
        msg: `${toDisplayWeight(curMax)} → ${toDisplayWeight(curMax + niceInc)} ${unit} (+${dispInc})`,
      });
    } else if (allDone && !hitReps) {
      suggestions.push({
        name: ex.name,
        msg: `${toDisplayWeight(curMax)} ${unit} — repeat weight, hit all reps first`,
      });
    }
  });

  return suggestions;
}

function showOverloadModal(suggestions) {
  if (suggestions.length === 0) return;
  const rows = suggestions
    .map(
      (s) =>
        `<div class="overload-row">
      <span class="overload-name">${escHtml(s.name)}</span>
      <span class="overload-msg">${escHtml(s.msg)}</span>
    </div>`,
    )
    .join("");
  showModal({
    title: "Next Session",
    msg: `<div class="overload-intro">Suggested weights based on today:</div><div class="overload-list">${rows}</div>`,
    confirmText: "Got it",
  });
}

function finishWorkout() {
  syncWorkoutFields();
  const w = state.activeWorkout;
  if (!w.name) w.name = "Workout – " + formatDate(w.date);
  if (w.exercises.length === 0) {
    showAlert("No exercises", "Add at least one exercise before finishing.");
    return;
  }

  const doFinish = () => {
    const suggestions = getOverloadSuggestions(w);
    addWorkout(w);
    state.activeWorkout = null;
    clearActiveWorkoutDraft();
    navigate("home");
    if (suggestions.length > 0)
      setTimeout(() => showOverloadModal(suggestions), 300);
  };

  const allDone = w.exercises.every((ex) => ex.sets.every((s) => s.done));
  if (allDone) {
    doFinish();
  } else {
    showModal({
      title: "Not all sets checked",
      msg: "Some sets haven't been marked done. Finish the workout anyway?",
      confirmText: "Finish Workout",
      confirmClass: "btn-danger-solid",
      cancelText: "Keep Going",
      onConfirm: doFinish,
    });
  }
}

// ── Day View (calendar drill-down) ────────────────────────
function buildWorkoutForDate(iso, existingWorkout) {
  const workout = existingWorkout
    ? cloneJSON(existingWorkout)
    : { id: uid(), date: iso, name: "", exercises: [] };

  if (workout.exercises.length === 0) {
    const dow = new Date(iso + "T00:00:00").getDay();
    const plan = getActivePlan();
    if (
      plan &&
      iso >= plan.start &&
      iso <= plan.end &&
      plan.workoutDays.includes(dow) &&
      plan.dayTemplates &&
      plan.dayTemplates[dow] &&
      plan.dayTemplates[dow].length > 0
    ) {
      workout.exercises = cloneJSON(plan.dayTemplates[dow]);
      if (!workout.name) workout.name = plan.name;

      const rirCtx = getRirContext(plan, iso);
      if (rirCtx) {
        const allWorkouts = loadWorkouts();
        workout.exercises = workout.exercises.map((ex) => ({
          ...ex,
          repMode: ex.repMode === "er" ? "er" : "rir",
          sets: ex.sets.map((s) => {
            const lastSet = findLastLoggedSet(
              allWorkouts,
              plan.name,
              ex.name,
              dow,
              iso,
            );
            const adjReps = computeAdjustedReps(
              s.reps,
              lastSet,
              rirCtx.targetRIR,
            );
            return { ...s, reps: adjReps, rir: rirCtx.targetRIR };
          }),
        }));
        workout._rirCtx = rirCtx;
      }
    }
  }

  return workout;
}

function isMissedPlannedDate(iso) {
  const today = todayISO();
  if (iso >= today) return false;
  return (
    (planDatesSet().has(iso) || getSavedPlannedDatesSet().has(iso)) &&
    !getCompletedDatesSet().has(iso) &&
    !getSkippedDatesSet().has(iso)
  );
}

function upsertWorkoutByDate(workout) {
  const existing = loadWorkouts().find((w) => w.date === workout.date);
  if (existing) updateWorkout({ ...existing, ...workout, id: existing.id });
  else addWorkout({ ...workout, id: workout.id || uid() });
}

function getRecoverySeedForDate(iso) {
  const existing = loadWorkouts().find((w) => w.date === iso);
  return buildWorkoutForDate(iso, existing);
}

function showMissedDayRecoveryModal(iso, from = "calendar") {
  state._missedRecovery = { iso, from };
  showModal({
    title: "Recover Missed Workout",
    msg: `<div class="swap-prompt">${formatDateLong(iso)} was planned but not completed.</div>
      <div class="swap-list">
        <div class="swap-option" onclick="recoverMissedDay('open')">Open scheduled day</div>
        <div class="swap-option" onclick="recoverMissedDay('today')">Move to today</div>
        <div class="swap-option" onclick="recoverMissedDay('pick')">Pick another date</div>
        <div class="swap-option" onclick="recoverMissedDay('skip')">Skip this day</div>
      </div>`,
    confirmText: "Close",
    confirmClass: "btn-secondary",
  });
}

window.recoverMissedDay = function (action) {
  document.getElementById("modal-overlay").hidden = true;
  const recovery = state._missedRecovery;
  if (!recovery) return;

  if (action === "open") {
    openDaySelection(recovery.iso, recovery.from, true);
    return;
  }

  if (action === "skip") {
    const existing = loadWorkouts().find((w) => w.date === recovery.iso);
    upsertWorkoutByDate({
      ...(existing || {}),
      date: recovery.iso,
      name: existing?.name || `${formatDate(recovery.iso)} Workout`,
      exercises: existing?.exercises || [],
      status: "skipped",
    });
    renderHome();
    if (state.view === "calendar") renderCalendar();
    return;
  }

  const openMovedDate = (targetIso) => {
    const source = getRecoverySeedForDate(recovery.iso);
    const targetExisting = loadWorkouts().find((w) => w.date === targetIso);
    if (
      targetExisting &&
      (targetExisting.status ?? "completed") === "completed"
    ) {
      showAlert(
        "Date already completed",
        "Choose a date that does not already have a completed workout.",
      );
      return;
    }

    upsertWorkoutByDate({
      ...(targetExisting || {}),
      date: targetIso,
      name: source.name || `${formatDate(targetIso)} Workout`,
      notes: source.notes,
      exercises: cloneJSON(source.exercises || []),
      status: "planned",
    });
    upsertWorkoutByDate({
      ...(loadWorkouts().find((w) => w.date === recovery.iso) || {}),
      date: recovery.iso,
      name: source.name || `${formatDate(recovery.iso)} Workout`,
      exercises: cloneJSON(source.exercises || []),
      status: "skipped",
    });
    openDaySelection(targetIso, recovery.from, true);
  };

  if (action === "today") {
    openMovedDate(todayISO());
    return;
  }

  if (action === "pick") {
    showModal({
      title: "Reschedule Workout",
      msg: `<div class="field-label" style="margin-top:4px">Target Date</div>
          <input type="date" id="modal-date-input" value="${todayISO()}" style="margin-top:6px;width:100%;background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;color:var(--text);font-size:15px;outline:none" />`,
      confirmText: "Move",
      cancelText: "Cancel",
      onConfirm: () => {
        const dateStr = document.getElementById("modal-date-input").value;
        if (!dateStr) return false;
        openMovedDate(dateStr);
      },
    });
  }
};

function openDaySelection(iso, from, skipRecovery = false) {
  const workouts = loadWorkouts();
  const existing = workouts.find((w) => w.date === iso);
  if (!skipRecovery && isMissedPlannedDate(iso)) {
    showMissedDayRecoveryModal(iso, from || "calendar");
    return;
  }
  state.dayWorkout = buildWorkoutForDate(iso, existing);
  state.dayIsReadOnly = !!(
    existing && (existing.status ?? "completed") === "completed"
  );

  state.exerciseContext = "day";
  state.dayReturnView = from || "calendar";
  persistDayWorkoutDraft();
  navigate("day");
}

window.selectDay = function (iso, from) {
  openDaySelection(iso, from);
};

function renderDay() {
  const w = state.dayWorkout;
  if (!w) return;

  const notesEl = document.getElementById("day-notes");
  if (notesEl) notesEl.value = w.notes || "";
  document.getElementById("day-view-title").textContent = formatDateLong(
    w.date,
  );
  let daySubtitle =
    w.exercises.length > 0
      ? `${w.exercises.length} exercise${w.exercises.length !== 1 ? "s" : ""}`
      : "No exercises yet";
  if (w._rirCtx) {
    const { weekInCycle, targetRIR, msLen, isDeloadWeek } = w._rirCtx;
    daySubtitle += isDeloadWeek
      ? ` · Deload Week`
      : ` · Wk ${weekInCycle + 1}/${msLen} · RIR ${targetRIR}`;
  }
  document.getElementById("day-view-subtitle").textContent = daySubtitle;

  const deloadBanner = document.getElementById("day-deload-banner");
  if (deloadBanner) {
    deloadBanner.hidden = !(w._rirCtx && w._rirCtx.isDeloadWeek);
  }

  const readOnlyBanner = document.getElementById("day-readonly-banner");
  const addBtn = document.getElementById("btn-day-add-exercise");
  const finishBtn = document.getElementById("btn-day-finish-workout");
  const notesWrap = document.querySelector("#view-day .notes-action-wrap");

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

  const container = document.getElementById("day-exercises");
  if (w.exercises.length === 0) {
    container.innerHTML = emptyExerciseState();
    if (!state.dayIsReadOnly) {
      document.getElementById("btn-day-finish-workout").disabled = true;
    }
    return;
  }
  container.innerHTML = buildExerciseListHtml(w.exercises, "day");
  if (!state.dayIsReadOnly) {
    document.getElementById("btn-day-finish-workout").disabled = false;
  }
}

// Save or update the day's workout in localStorage
function persistDay() {
  const w = state.dayWorkout;
  if (!w) return;
  // Sync notes from textarea
  const notesEl = document.getElementById("day-notes");
  if (notesEl) w.notes = notesEl.value.trim() || undefined;

  const workouts = loadWorkouts();
  const exists = workouts.some((x) => x.id === w.id);

  if (w.exercises.length === 0) {
    if (exists) deleteWorkout(w.id);
    return;
  }

  if (!w.name) w.name = formatDate(w.date) + " Workout";
  if (!w.status) w.status = "planned";
  if (exists) updateWorkout(w);
  else addWorkout(w);
  persistDayWorkoutDraft();
}

// ── Shared Exercise Card ──────────────────────────────────
// Used by active workout, day view, and plan template

// Renders a list of exercise cards, inserting SS connector bars between supersetted pairs
function buildExerciseListHtml(exercises, ctx, prMap) {
  let html = "";
  for (let ei = 0; ei < exercises.length; ei++) {
    const prev = exercises[ei - 1];
    const next = exercises[ei + 1];
    const ex = exercises[ei];
    const connectedAbove = !!(
      ex.supersetId &&
      prev &&
      prev.supersetId === ex.supersetId
    );
    const connectedBelow = !!(
      ex.supersetId &&
      next &&
      next.supersetId === ex.supersetId
    );
    html += exerciseCardHTML(ex, ei, ctx, exercises.length, prMap, {
      connectedAbove,
      connectedBelow,
    });
    if (connectedBelow) {
      html += `<div class="ss-connector-bar"><span class="ss-connector-label">SUPERSET</span></div>`;
    }
  }
  return html;
}

function exerciseCardHTML(ex, ei, ctx, totalCount, prMap, ssInfo = {}) {
  const { connectedAbove = false, connectedBelow = false } = ssInfo;
  const readOnly = ctx === "day" && state.dayIsReadOnly;
  const canLog = ctx !== "planTemplate" && !readOnly;
  const planRIR =
    ctx === "planTemplate" && state.editingPlan && state.editingPlan.rir;
  const muscle = ex.muscleGroup || getMuscleGroup(ex.name);
  const muscleClass = muscle
    ? ` muscle-${muscle.toLowerCase().replace(/\s+/g, "-")}`
    : "";
  const canReorder = ctx !== "planTemplate" && totalCount > 1 && !readOnly;
  const equip = getEquipment(ex.name);
  const historicalPR = prMap ? prMap[ex.name] || 0 : 0;

  const setRows = ex.sets
    .map((s, si) => {
      const done = s.done || false;
      const isPR = done && s.weight > 0 && s.weight > historicalPR;
      const prBadge = isPR ? `<span class="pr-badge">PR</span>` : "";
      return `
    <tr class="set-row${done ? " set-row-done" : ""}">
      <td class="set-num-cell">${si + 1}</td>
      <td><input class="set-pill" type="number" min="0" step="${weightUnit() === "kg" ? "1.25" : "2.5"}" inputmode="decimal"
           value="${s.weight ? toDisplayWeight(s.weight) : ""}" placeholder="–"
           onchange="handleSetChange('${ctx}',${ei},${si},'weight',this.value)" ${readOnly ? "disabled" : ""}/>
        ${prBadge}</td>
      ${
        planRIR
          ? ""
          : `<td><input class="set-pill" type="number" min="0" inputmode="numeric"
           value="${s.reps || ""}" placeholder="${s.rir != null || s.erTarget != null ? "Log reps" : "–"}"
           onchange="handleSetChange('${ctx}',${ei},${si},'reps',this.value)" ${readOnly ? "disabled" : ""}/>
        ${canLog && s.rir != null ? `<span class="set-rir-label set-rir-label-tap" onclick="showTrainingMethodInfo('rir')">@RIR&nbsp;${s.rir}</span>` : ""}
        ${canLog && s.erTarget != null ? `<div class="er-controls"><span class="set-rir-label set-rir-label-tap" onclick="showTrainingMethodInfo('er')">ER&nbsp;${s.erTarget}</span><button class="er-rest-btn" onclick="setRestTimer(15)" title="Start 15s ER rest">⏱ 15s</button></div>` : ""}</td>`
      }
      ${
        canLog
          ? `<td class="set-log-cell">
        <label class="set-check-wrap">
          <input type="checkbox" ${done ? "checked" : ""}
            onchange="handleSetDone('${ctx}',${ei},${si},this.checked)" />
          <span class="set-check-box"></span>
        </label>
      </td>`
          : readOnly && done
            ? `<td class="set-log-cell"><span style="color:var(--green);font-size:14px">✓</span></td>`
            : `<td></td>`
      }
      <td><button class="btn-remove-set" onclick="handleRemoveSet('${ctx}',${ei},${si})">×</button></td>
    </tr>`;
    })
    .join("");

  const muscleTag = muscle
    ? `<div class="ex-muscle-tag ex-muscle-${muscle.toLowerCase().replace(/\s+/g, "-")}">${muscle.toUpperCase()}</div>`
    : "";

  const ssCardClass =
    connectedAbove && connectedBelow
      ? " ss-card-mid"
      : connectedAbove
        ? " ss-card-end"
        : connectedBelow
          ? " ss-card-start"
          : "";

  return `
    <div class="active-exercise-card${muscleClass}${ssCardClass}">
      ${muscleTag}
      <div class="active-exercise-header">
        <div class="active-exercise-name-row">
          ${
            canReorder
              ? `<div class="reorder-btns">
            <button class="reorder-btn${ei === 0 ? " disabled" : ""}" onclick="handleMoveExercise('${ctx}',${ei},'up')" ${ei === 0 ? "disabled" : ""}>▲</button>
            <button class="reorder-btn${ei === totalCount - 1 ? " disabled" : ""}" onclick="handleMoveExercise('${ctx}',${ei},'down')" ${ei === totalCount - 1 ? "disabled" : ""}>▼</button>
          </div>`
              : ""
          }
          <div class="active-exercise-info">
            <div class="active-exercise-name active-exercise-name-tap" onclick="openExerciseHistory('${ctx}',${ei},event)">${escHtml(ex.name)}</div>
            ${equip ? `<div class="active-exercise-equip">${equip}</div>` : ""}
          </div>
        </div>
        <div class="active-exercise-actions">
          ${!readOnly ? `<button class="btn btn-secondary btn-sm" onclick="handleSwapExercise('${ctx}',${ei})" title="Swap exercise">⇄ Swap</button>` : ""}
          ${canLog ? `<button class="btn btn-sm ${ex.supersetId ? "btn-ss-active" : "btn-secondary"}" onclick="handleLinkSuperset('${ctx}',${ei})" title="Superset">SS</button>` : ""}
          ${!readOnly ? `<button class="btn btn-secondary btn-sm" onclick="handleEditExercise('${ctx}',${ei})">Edit</button>` : ""}
          ${
            !readOnly
              ? `<button class="btn btn-icon btn-secondary" onclick="handleRemoveExercise('${ctx}',${ei})" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>`
              : ""
          }
        </div>
      </div>
      <table class="sets-editor">
        <thead>
          <tr>
            <th class="set-num-head">#</th>
            <th style="cursor:pointer;user-select:none" onclick="toggleWeightUnit('${ctx}')" title="Tap to switch units">Weight (${weightUnit()}) ↕</th>
            ${planRIR ? "" : `<th>Reps</th>`}
            ${canLog ? '<th class="set-log-head">Log</th>' : ""}
            <th></th>
          </tr>
        </thead>
        <tbody>${setRows}</tbody>
      </table>
      ${!readOnly ? `<button class="btn btn-ghost btn-sm mt-8" onclick="handleAddSet('${ctx}',${ei})">+ Add Set</button>` : ""}
    </div>`;
}

function workoutFor(ctx) {
  if (ctx === "day") return state.dayWorkout;
  if (ctx === "planTemplate") {
    const dow = state.editingPlanDow;
    if (!state.editingPlan.dayTemplates[dow])
      state.editingPlan.dayTemplates[dow] = [];
    // Return a proxy-like object whose .exercises points at the template array
    return { exercises: state.editingPlan.dayTemplates[dow] };
  }
  return state.activeWorkout;
}

function rerenderFor(ctx) {
  if (ctx === "day") {
    persistDay();
    renderDay();
  } else if (ctx === "planTemplate") {
    upsertPlan(state.editingPlan);
    renderPlanEditor();
  } else {
    persistActiveWorkoutDraft();
    renderWorkout();
  }
}

window.handleSetChange = function (ctx, ei, si, field, val) {
  const set = workoutFor(ctx).exercises[ei].sets[si];
  set[field] =
    field === "weight" ? fromDisplayWeight(val) : parseFloat(val) || 0;
  if (field === "reps" && set.done && set.rir != null) {
    set.actualReps = set.reps;
  }
  if (ctx === "day") persistDay();
  if (ctx === "planTemplate") upsertPlan(state.editingPlan);
  if (ctx === "workout") persistActiveWorkoutDraft();
};

window.handleRemoveSet = function (ctx, ei, si) {
  workoutFor(ctx).exercises[ei].sets.splice(si, 1);
  rerenderFor(ctx);
};

window.handleAddSet = function (ctx, ei) {
  const sets = workoutFor(ctx).exercises[ei].sets;
  const last = sets.slice(-1)[0];
  sets.push({
    reps: last ? last.reps : 0,
    weight: last ? last.weight : 0,
    ...(last?.rir != null ? { rir: last.rir } : {}),
  });
  rerenderFor(ctx);
};

window.handleSetDone = function (ctx, ei, si, checked) {
  const ex = workoutFor(ctx).exercises[ei];
  const set = ex.sets[si];
  set.done = checked;
  if (checked) {
    if (set.rir != null) set.actualReps = set.reps;
    navigator.vibrate && navigator.vibrate(30);
    startRestTimer(ex.repMode === "er" ? 15 : 90);
    // PR detection (active workout only)
    if (ctx === "workout" && set.weight > 0) {
      const historical = buildPRMap();
      const historicalMax = historical[ex.name] || 0;
      const sessionMax = state._sessionPRs[ex.name] || 0;
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
    document.getElementById("rest-timer").hidden = true;
  }
  rerenderFor(ctx);
};

window.handleEditExercise = function (ctx, ei) {
  state.exerciseContext = ctx;
  state.editingExIndex = ei;
  state.exMusclePickerFrom = null;
  navigate("exercise");
};

window.handleRemoveExercise = function (ctx, ei) {
  const exercises = workoutFor(ctx).exercises;
  const removed = exercises[ei];
  exercises.splice(ei, 1);
  rerenderFor(ctx);
  showToastMessage({
    icon: "🗑",
    label: "Removed",
    title: removed?.name || "Exercise deleted",
    detail: "Deleted from this workout",
    tone: "neutral",
  });
};

// ── Superset ──────────────────────────────────────────────

window.handleLinkSuperset = function (ctx, ei) {
  const exercises = workoutFor(ctx).exercises;
  const ex = exercises[ei];

  if (ex.supersetId) {
    showModal({
      title: "Remove Superset",
      msg: `Unlink <strong>${escHtml(ex.name)}</strong> from its superset partner?`,
      confirmText: "Unlink",
      cancelText: "Cancel",
      confirmClass: "btn-danger-solid",
      onConfirm: () => {
        const id = ex.supersetId;
        exercises.forEach((e) => {
          if (e.supersetId === id) delete e.supersetId;
        });
        rerenderFor(ctx);
      },
    });
    return;
  }

  const available = exercises
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => i !== ei && !e.supersetId);

  if (available.length === 0) {
    showAlert(
      "No available exercises",
      "Add another exercise first, or unlink existing supersets.",
    );
    return;
  }

  state._ssCtx = ctx;
  state._ssEi = ei;
  state._ssOptions = available;

  const listHtml = available
    .map(
      ({ e }, idx) =>
        `<div class="swap-option" onclick="confirmSuperset(${idx})">${escHtml(e.name)}</div>`,
    )
    .join("");

  showModal({
    title: "Link as Superset",
    msg: `<div class="swap-prompt">Alternate <strong>${escHtml(ex.name)}</strong> with:</div><div class="swap-list">${listHtml}</div>`,
    confirmText: "Cancel",
    confirmClass: "btn-secondary",
  });
};

window.confirmSuperset = function (optionIdx) {
  document.getElementById("modal-overlay").hidden = true;
  const { _ssCtx: ctx, _ssEi: ei, _ssOptions: opts } = state;
  const exercises = workoutFor(ctx).exercises;
  const ssId = "ss-" + uid();
  exercises[ei].supersetId = ssId;
  exercises[opts[optionIdx].i].supersetId = ssId;
  rerenderFor(ctx);
};

// ── Exercise Swap ─────────────────────────────────────────

window.handleSwapExercise = function (ctx, ei) {
  const ex = workoutFor(ctx).exercises[ei];
  const muscle = ex.muscleGroup || getMuscleGroup(ex.name);
  if (!muscle) {
    showAlert(
      "No muscle group",
      "Assign a muscle group to this exercise before swapping.",
    );
    return;
  }
  const options = (MUSCLE_MAP[muscle] || []).filter((n) => n !== ex.name);
  if (options.length === 0) {
    showAlert("No alternatives", `No other exercises found for ${muscle}.`);
    return;
  }
  state._swapCtx = ctx;
  state._swapEi = ei;
  state._swapOptions = options;

  const listHtml = options
    .map(
      (n, i) =>
        `<div class="swap-option" onclick="confirmSwap(${i})">${escHtml(n)}</div>`,
    )
    .join("");

  showModal({
    title: `Swap — ${muscle}`,
    msg: `<div class="swap-prompt">Replacing: <strong>${escHtml(ex.name)}</strong></div><div class="swap-list">${listHtml}</div>`,
    confirmText: "Cancel",
    confirmClass: "btn-secondary",
  });
};

window.confirmSwap = function (optionIdx) {
  document.getElementById("modal-overlay").hidden = true;
  const { _swapCtx: ctx, _swapEi: ei, _swapOptions: options } = state;
  const ex = workoutFor(ctx).exercises[ei];
  ex.name = options[optionIdx];
  ex.muscleGroup = getMuscleGroup(ex.name) || ex.muscleGroup;
  rerenderFor(ctx);
};

window.handleMoveExercise = function (ctx, ei, direction) {
  const exercises = workoutFor(ctx).exercises;
  const swapIdx = direction === "up" ? ei - 1 : ei + 1;
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
  document.getElementById("ex-muscle-picker-grid").innerHTML = [
    ...muscles,
    "All",
  ]
    .map((m) => {
      const cssKey = m.toLowerCase().replace(/\s+/g, "-");
      return `<button class="ex-muscle-card ex-muscle-${cssKey}" onclick="selectExMuscle('${m}')">
        <span class="ex-muscle-card-name">${m}</span>
      </button>`;
    })
    .join("");
}

window.selectExMuscle = function (muscle) {
  state.exMuscleFilter = muscle === "All" ? null : muscle;
  state.exEquipFilter = null;
  state.exMusclePickerFrom = "exercise-muscle";
  state.editingExIndex = null;
  navigate("exercise");
};

// ── Exercise Library ──────────────────────────────────────

const EQUIP_ORDER = [
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Kettlebell",
];

function renderExerciseLibrary() {
  const muscles = Object.keys(MUSCLE_MAP);
  const selected = state.exLibMuscle;
  const query = (state.exLibSearch || "").trim().toLowerCase();

  // Muscle filter pills
  const pillsHtml = ["All", ...muscles]
    .map((m) => {
      const active = (m === "All" && !selected) || m === selected;
      const cssKey = m.toLowerCase().replace(/\s+/g, "-");
      return `<button class="ex-lib-pill${active ? " active" : ""} ex-lib-pill-${cssKey}"
      onclick="setExLibMuscle(${m === "All" ? "null" : `'${m}'`})">${m}</button>`;
    })
    .join("");
  document.getElementById("ex-lib-muscle-pills").innerHTML = pillsHtml;

  // Sync search input without disrupting focus
  const searchEl = document.getElementById("ex-lib-search");
  if (searchEl && searchEl !== document.activeElement) {
    searchEl.value = state.exLibSearch || "";
  }

  // Build list
  const visibleMuscles = selected ? [selected] : muscles;
  let html = "";

  for (const muscle of visibleMuscles) {
    let names = MUSCLE_MAP[muscle];
    if (query) names = names.filter((n) => n.toLowerCase().includes(query));
    if (!names.length) continue;

    const cssKey = muscle.toLowerCase().replace(/\s+/g, "-");

    // Group names by equipment in canonical order
    const byEquip = {};
    for (const name of names) {
      const equip = getEquipment(name) || "Other";
      (byEquip[equip] = byEquip[equip] || []).push(name);
    }
    const equipKeys = [...EQUIP_ORDER, "Other"].filter((e) => byEquip[e]);

    const groupsHtml = equipKeys
      .map(
        (equip) =>
          `<div class="ex-lib-equip-group">
        <div class="ex-lib-equip-label">${equip}</div>
        <div class="ex-lib-equip-rows">
          ${byEquip[equip]
            .map(
              (name) =>
                `<button class="ex-lib-row" onclick="openExLibExercise('${escHtml(name)}')">${escHtml(name)}</button>`,
            )
            .join("")}
        </div>
      </div>`,
      )
      .join("");

    html += `<div class="ex-lib-muscle-section">
      <div class="ex-lib-muscle-header ex-lib-muscle-${cssKey}">${muscle}</div>
      ${groupsHtml}
    </div>`;
  }

  if (!html) {
    html = `<div class="ex-lib-empty">No exercises match "${escHtml(state.exLibSearch)}"</div>`;
  }

  document.getElementById("ex-lib-list").innerHTML = html;
  requestAnimationFrame(updateExerciseLibraryPillNav);
}

function updateExerciseLibraryPillNav() {
  const bar = document.getElementById("ex-lib-muscle-bar");
  const pills = document.getElementById("ex-lib-muscle-pills");
  if (!bar || !pills) return;

  const hasOverflow = pills.scrollWidth - pills.clientWidth > 12;
  const atStart = pills.scrollLeft <= 6;
  const atEnd = pills.scrollLeft + pills.clientWidth >= pills.scrollWidth - 6;

  bar.classList.toggle("show-left", hasOverflow && !atStart);
  bar.classList.toggle("show-right", hasOverflow && !atEnd);
  bar.classList.toggle("show-scroll-hint", hasOverflow && atStart && !atEnd);
}

function scrollExerciseLibraryPills(direction) {
  const pills = document.getElementById("ex-lib-muscle-pills");
  if (!pills) return;
  pills.scrollBy({
    left: direction * Math.max(180, Math.round(pills.clientWidth * 0.72)),
    behavior: "smooth",
  });
}

window.setExLibMuscle = function (muscle) {
  state.exLibMuscle = muscle;
  renderExerciseLibrary();
};

window.onExLibSearch = function (val) {
  state.exLibSearch = val;
  renderExerciseLibrary();
};

window.openExLibExercise = function (name) {
  state.exHistoryName = name;
  state.exHistoryBackTo = "exercises";
  navigate("exercise-history");
};

// ── Exercise Form ─────────────────────────────────────────
function renderExerciseForm() {
  setExerciseSavePending(false);
  const editing = state.editingExIndex !== null;
  document.getElementById("exercise-view-title").textContent = editing
    ? "Edit Exercise"
    : "Add Exercise";

  if (editing) {
    const ex = workoutFor(state.exerciseContext).exercises[
      state.editingExIndex
    ];
    document.getElementById("exercise-name").value = ex.name;
    state.formSets = ex.sets.map((s) => ({ ...s }));
    state.formRepMode = ex.repMode || "target";
    state.customExMuscleGroup = ex.muscleGroup || null;
    showExConfigPanel(ex.name);
  } else {
    document.getElementById("exercise-name").value = "";
    state.formSets = [{ reps: 0, weight: 0 }];
    state.formRepMode = "target";
    state.customExMuscleGroup = null;
    state.exEquipFilter = null;
    showExPickerPanel();
  }
}

function showExPickerPanel() {
  document.getElementById("ex-picker-panel").hidden = false;
  document.getElementById("ex-config-panel").hidden = true;

  const filterInput = document.getElementById("ex-filter");
  filterInput.value = "";
  document.getElementById("ex-search-clear").hidden = true;
  filterInput.oninput = () => {
    document.getElementById("ex-search-clear").hidden = !filterInput.value;
    renderExPickerList(filterInput.value.trim().toLowerCase());
  };

  renderExPickerMuscleFilters();
  renderExPickerList("");
}

function renderExPickerMuscleFilters() {
  const muscles = Object.keys(MUSCLE_MAP);
  const selected = state.exMuscleFilter;
  const pillsHtml = ["All", ...muscles]
    .map((m) => {
      const active = (m === "All" && !selected) || m === selected;
      const cssKey = m.toLowerCase().replace(/\s+/g, "-");
      return `<button class="ex-lib-pill${active ? " active" : ""} ex-lib-pill-${cssKey}"
      onclick="setExPickerMuscle(${m === "All" ? "null" : `'${m}'`})">${m}</button>`;
    })
    .join("");
  document.getElementById("ex-picker-muscle-pills").innerHTML = pillsHtml;
}

function renderExPickerList(filter) {
  // O(1) membership checks: the prior code ran used.filter(n => !builtInAll.includes(n))
  // which is O(used × builtIn) per keystroke in the picker filter input.
  const builtInSet = _builtInSet();
  const used = [
    ...new Set(loadWorkouts().flatMap((w) => w.exercises.map((e) => e.name))),
  ];
  const custom = used.filter((n) => !builtInSet.has(n));
  const selectedMuscle = state.exMuscleFilter;
  let html = "";

  if (!selectedMuscle) {
    // All muscles: group by muscle → equipment
    for (const muscle of Object.keys(MUSCLE_MAP)) {
      const cssKey = muscle.toLowerCase().replace(/\s+/g, "-");
      const byEquip = {};
      for (const name of MUSCLE_MAP[muscle]) {
        if (filter && !name.toLowerCase().includes(filter)) continue;
        const equip = getEquipment(name) || "Other";
        (byEquip[equip] = byEquip[equip] || []).push(name);
      }
      const equipKeys = [...EQUIP_ORDER, "Other"].filter((e) => byEquip[e]);
      if (!equipKeys.length) continue;
      html += `<div class="ex-lib-muscle-section">
        <div class="ex-lib-muscle-header ex-lib-muscle-${cssKey}">${muscle}</div>
        ${equipKeys
          .map(
            (equip) => `<div class="ex-lib-equip-group">
          <div class="ex-lib-equip-label">${equip}</div>
          <div class="ex-lib-equip-rows">
            ${byEquip[equip].map((n) => `<button class="ex-lib-row" onclick="selectExFromPicker('${escHtml(n)}')">${escHtml(n)}</button>`).join("")}
          </div></div>`,
          )
          .join("")}
      </div>`;
    }
    // Custom exercises block
    if (custom.length) {
      const fc = filter
        ? custom.filter((n) => n.toLowerCase().includes(filter))
        : custom;
      if (fc.length)
        html += `<div class="ex-lib-muscle-section">
        <div class="ex-lib-muscle-header" style="background:var(--surface3);color:var(--text2)">Custom</div>
        <div class="ex-lib-equip-rows" style="margin-top:2px">
          ${fc.map((n) => `<button class="ex-lib-row" onclick="selectExFromPicker('${escHtml(n)}')">${escHtml(n)}</button>`).join("")}
        </div></div>`;
    }
  } else {
    // Single muscle: group by equipment
    const names = (MUSCLE_MAP[selectedMuscle] || []).filter(
      (n) => !filter || n.toLowerCase().includes(filter),
    );
    const byEquip = {};
    for (const name of names) {
      const equip = getEquipment(name) || "Other";
      (byEquip[equip] = byEquip[equip] || []).push(name);
    }
    [...EQUIP_ORDER, "Other"]
      .filter((e) => byEquip[e])
      .forEach((equip) => {
        html += `<div class="ex-lib-equip-group">
        <div class="ex-lib-equip-label">${equip}</div>
        <div class="ex-lib-equip-rows">
          ${byEquip[equip].map((n) => `<button class="ex-lib-row" onclick="selectExFromPicker('${escHtml(n)}')">${escHtml(n)}</button>`).join("")}
        </div></div>`;
      });
  }

  document.getElementById("ex-picker-list").innerHTML =
    html || `<div class="ex-filter-empty">No exercises match</div>`;
}

window.setExPickerMuscle = function (muscle) {
  state.exMuscleFilter = muscle;
  renderExPickerMuscleFilters();
  renderExPickerList(
    document.getElementById("ex-filter").value.trim().toLowerCase(),
  );
};

window.selectExFromPicker = function (name) {
  state.customExMuscleGroup = null;
  document.getElementById("exercise-name").value = name;
  showExConfigPanel(name);
};

function showExConfigPanel(name) {
  document.getElementById("ex-picker-panel").hidden = true;
  document.getElementById("ex-config-panel").hidden = false;

  const editing = state.editingExIndex !== null;
  const muscle = getMuscleGroup(name) || state.customExMuscleGroup || "";
  const cssKey = muscle ? muscle.toLowerCase().replace(/\s+/g, "-") : "";
  const muscleTag = muscle
    ? `<span class="ex-muscle-tag ex-muscle-${cssKey}" style="font-size:10px;padding:2px 8px">${muscle.toUpperCase()}</span>`
    : "";
  const changeBtn = editing
    ? ""
    : `<button class="ex-config-change-btn" onclick="showExPickerPanel()">‹ Change</button>`;

  document.getElementById("ex-config-header").innerHTML = `
    <div class="ex-config-name-row">
      <div class="ex-config-name">${escHtml(name)}</div>
      ${changeBtn}
    </div>
    ${muscleTag ? `<div style="margin-top:6px">${muscleTag}</div>` : ""}`;

  renderExTrainingTypeChips();
  renderSetRows();
}

function renderExTrainingTypeChips() {
  const inRirTemplate =
    state.exerciseContext === "planTemplate" &&
    state.editingPlan &&
    state.editingPlan.rir;
  const mode = inRirTemplate
    ? state.formRepMode === "er"
      ? "er"
      : "planRir"
    : state.formRepMode;

  const types = inRirTemplate
    ? [
        { key: "planRir", label: "RIR", desc: "Auto-managed by plan" },
        { key: "er", label: "ER", desc: "Explosive Reps" },
      ]
    : [
        { key: "target", label: "Target Reps", desc: "Fixed reps per set" },
        { key: "rir", label: "RIR", desc: "Reps in Reserve" },
        { key: "er", label: "ER", desc: "Explosive Reps" },
      ];

  document.getElementById("ex-training-type-chips").innerHTML = types
    .map(
      ({ key, label, desc }) =>
        `<button class="ex-type-chip${mode === key ? " active" : ""}" onclick="setFormRepMode('${key}')">
      <span class="ex-type-chip-label">${label}</span>
      <span class="ex-type-chip-desc">${desc}</span>
    </button>`,
    )
    .join("");
}

window.clearExSearch = function () {
  const input = document.getElementById("ex-filter");
  input.value = "";
  document.getElementById("ex-search-clear").hidden = true;
  input.focus();
  renderExPickerList("");
};

window.clearExSearch = function () {
  const input = document.getElementById("ex-filter");
  input.value = "";
  document.getElementById("ex-search-clear").hidden = true;
  input.focus();
  refreshChips();
};

window.openCustomExModal = function () {
  const muscles = Object.keys(MUSCLE_MAP);
  state._pendingCustomMuscle = state.customExMuscleGroup || null;
  showModal({
    title: "Custom Exercise",
    msg: `
      <div class="field-label" style="margin-top:4px;margin-bottom:8px">1. Select Muscle Group</div>
      <div class="custom-ex-muscle-grid" id="custom-ex-muscle-grid">
        ${muscles.map((m) => `<button class="custom-ex-muscle-btn${state._pendingCustomMuscle === m ? " active" : ""}" data-muscle="${escHtml(m)}" onclick="selectCustomExMuscle('${escHtml(m)}')">${escHtml(m)}</button>`).join("")}
      </div>
      <div class="field-label" style="margin-top:14px">2. Exercise Name</div>
      <input type="text" id="modal-custom-ex-name" autocomplete="off" maxlength="60"
        style="margin-top:6px;width:100%;background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;color:var(--text);font-size:15px;outline:none"
        placeholder="e.g. Banded Pull-Apart" />
      <div id="modal-custom-ex-error" style="color:var(--red);font-size:13px;font-weight:600;margin-top:8px;min-height:18px"></div>`,
    confirmText: "Add",
    cancelText: "Cancel",
    onConfirm: () => {
      const nameEl = document.getElementById("modal-custom-ex-name");
      const errEl = document.getElementById("modal-custom-ex-error");
      const name = nameEl ? nameEl.value.trim().slice(0, 60) : "";
      if (!state._pendingCustomMuscle) {
        if (errEl) errEl.textContent = "Please select a muscle group first.";
        return false; // keep modal open
      }
      if (!name) {
        if (errEl) errEl.textContent = "Please enter a name for the exercise.";
        if (nameEl) nameEl.focus();
        return false; // keep modal open
      }
      state.customExMuscleGroup = state._pendingCustomMuscle;
      state._pendingCustomMuscle = null;
      document.getElementById("exercise-name").value = name;
      showExConfigPanel(name);
    },
    onCancel: () => {
      state._pendingCustomMuscle = null;
    },
  });
  setTimeout(() => {
    // Don't auto-focus name — user should select muscle first
  }, 80);
};

window.selectCustomExMuscle = function (muscle) {
  state._pendingCustomMuscle = muscle;
  document.querySelectorAll(".custom-ex-muscle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.muscle === muscle);
  });
};

function renderSetRows() {
  const inRirTemplate =
    state.exerciseContext === "planTemplate" &&
    state.editingPlan &&
    state.editingPlan.rir;

  const mode = inRirTemplate
    ? state.formRepMode === "er"
      ? "er"
      : "planRir"
    : state.formRepMode;

  document.getElementById("sets-form-body").innerHTML = state.formSets
    .map((s, i) => {
      let repFields = "";
      if (mode === "target") {
        repFields = `<div class="set-field">
          <span class="set-field-label">Target Reps</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.reps || ""}" placeholder="0"
            onchange="formSetChange(${i},'reps',this.value)" />
        </div>`;
      } else if (mode === "rir") {
        repFields = `<div class="set-field">
          <span class="set-field-label">RIR Target</span>
          <input class="set-input" type="number" min="0" max="10" inputmode="numeric"
            value="${s.rir != null ? s.rir : ""}" placeholder="e.g. 2"
            onchange="formSetChange(${i},'rir',this.value)" />
        </div>`;
      } else if (mode === "er") {
        repFields = `<div class="set-field">
          <span class="set-field-label">Ignition Reps</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.reps || ""}" placeholder="e.g. 12"
            onchange="formSetChange(${i},'reps',this.value)" />
        </div>
        <div class="set-field">
          <span class="set-field-label">ER Target (total)</span>
          <input class="set-input" type="number" min="0" inputmode="numeric"
            value="${s.erTarget || ""}" placeholder="e.g. 20"
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
          <input class="set-input" type="number" min="0" step="${weightUnit() === "kg" ? "1.25" : "2.5"}" inputmode="decimal"
            value="${s.weight ? toDisplayWeight(s.weight) : ""}" placeholder="0"
            onchange="formSetChange(${i},'weight',this.value)" />
        </div>
        ${repFields}
      </div>
    </div>`;
    })
    .join("");
}

window.setFormRepMode = function (mode) {
  state.formRepMode = mode;
  renderExTrainingTypeChips();
  renderSetRows();
};

window.formSetChange = function (i, field, val) {
  state.formSets[i][field] =
    field === "weight" ? fromDisplayWeight(val) : parseFloat(val) || 0;
};

window.formRemoveSet = function (i) {
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
  if (state.exerciseSavePending) return;
  setExerciseSavePending(true);

  const name = document.getElementById("exercise-name").value.trim();
  if (!name) {
    setExerciseSavePending(false);
    showAlert(
      "No exercise selected",
      "Select an exercise from the list or tap + Add Custom Exercise.",
    );
    return;
  }
  try {
    // Flush any uncommitted input values
    const inRirTemplate =
      state.exerciseContext === "planTemplate" &&
      state.editingPlan &&
      state.editingPlan.rir;
    const mode = inRirTemplate ? "planRir" : state.formRepMode;
    document
      .querySelectorAll("#sets-form-body .set-block")
      .forEach((block, idx) => {
        const inputs = block.querySelectorAll("input");
        state.formSets[idx].weight = fromDisplayWeight(inputs[0].value);
        if (mode === "target") {
          if (inputs[1])
            state.formSets[idx].reps = parseFloat(inputs[1].value) || 0;
        } else if (mode === "rir") {
          if (inputs[1])
            state.formSets[idx].rir = parseFloat(inputs[1].value) || 0;
        } else if (mode === "er") {
          if (inputs[1])
            state.formSets[idx].reps = parseFloat(inputs[1].value) || 0;
          if (inputs[2])
            state.formSets[idx].erTarget = parseFloat(inputs[2].value) || 0;
        }
      });

    // Strip fields that don't belong to the current mode (prevents stale RIR/ER badges)
    state.formSets.forEach((s) => {
      if (mode === "target" || mode === "planRir") {
        delete s.rir;
        delete s.erTarget;
      } else if (mode === "rir") {
        delete s.erTarget;
      } else if (mode === "er") {
        delete s.rir;
      }
    });

    // For RIR templates: store repMode only when exercise is ER (marks it as ad-hoc ER)
    const resolvedMuscle =
      state.customExMuscleGroup || getMuscleGroup(name) || undefined;
    const exercise = {
      name,
      repMode: inRirTemplate
        ? mode === "er"
          ? "er"
          : undefined
        : state.formRepMode,
      muscleGroup: resolvedMuscle,
      sets: inRirTemplate
        ? state.formSets
        : state.formSets.filter(
            (s) => s.reps > 0 || s.weight > 0 || s.erTarget > 0,
          ),
    };
    if (exercise.sets.length === 0) exercise.sets = [{ reps: 0, weight: 0 }];
    state.customExMuscleGroup = null;

    const target = workoutFor(state.exerciseContext);
    if (state.editingExIndex !== null)
      target.exercises[state.editingExIndex] = exercise;
    else target.exercises.push(exercise);

    if (state.exerciseContext === "day") persistDay();
    if (state.exerciseContext === "planTemplate") upsertPlan(state.editingPlan);
    if (state.exerciseContext === "workout") persistActiveWorkoutDraft();

    state.editingExIndex = null;
    const dest =
      state.exerciseContext === "planTemplate"
        ? "plan-editor"
        : state.exerciseContext;
    navigate(dest);
  } catch (error) {
    console.error("Failed to save exercise:", error);
    setExerciseSavePending(false);
    showAlert(
      "Could not save exercise",
      "Something went wrong while saving this exercise. Please try again.",
    );
  }
}

// ── Calendar ──────────────────────────────────────────────
function getActivePlan() {
  const id = loadActivePlanId();
  if (!id) return null;
  return loadPlans().find((p) => p.id === id) || null;
}

function planDatesSet() {
  const dates = new Set();
  try {
    const plan = getActivePlan();
    if (!plan || !plan.start || !plan.end || !Array.isArray(plan.workoutDays))
      return dates;
    let cur = new Date(plan.start + "T00:00:00");
    const end = new Date(plan.end + "T00:00:00");
    while (cur <= end) {
      if (plan.workoutDays.includes(cur.getDay())) dates.add(localISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } catch (e) {
    /* don't let a bad plan kill the calendar */
  }
  return dates;
}

function calcStreak(workouts) {
  const dates = new Set(
    workouts
      .filter((w) => (w.status ?? "completed") === "completed")
      .map((w) => w.date),
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
  if (c.month > 11) {
    c.year++;
    c.month = 0;
  }
  if (c.month < 0) {
    c.year--;
    c.month = 11;
  }
  renderCalendar();
}

window.jumpCalendarToToday = function () {
  const now = new Date();
  state.calendar.year = now.getFullYear();
  state.calendar.month = now.getMonth();
  renderCalendar();
};

function renderCalendar() {
  const { year, month } = state.calendar;
  const today = todayISO();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // Jump-to-today button
  const jumpBtn = document.getElementById("cal-jump-today");
  if (jumpBtn) jumpBtn.hidden = isCurrentMonth;

  document.getElementById("cal-month-label").textContent = new Date(
    year,
    month,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const allWorkouts = loadWorkouts();
  const workoutDates = new Set(
    allWorkouts
      .filter((w) => (w.status ?? "completed") === "completed")
      .map((w) => w.date),
  );
  const savedPlannedDates = new Set(
    allWorkouts
      .filter((w) => (w.status ?? "completed") === "planned")
      .map((w) => w.date),
  );
  const skippedDates = getSkippedDatesSet();
  const plan = getActivePlan();
  const plannedDates = new Set(
    [...planDatesSet()].filter((iso) => !skippedDates.has(iso)),
  );

  // ── Mesocycle week banner ──
  const weekBannerEl = document.getElementById("cal-week-banner");
  if (weekBannerEl) {
    const rir = plan ? getRirContext(plan, today) : null;
    if (rir) {
      const label = rir.isDeloadWeek
        ? `Deload Week  ·  RIR 3 (easy)`
        : `Block ${rir.blockNum + 1}  ·  Week ${rir.weekInCycle + 1} / ${rir.msLen}  ·  RIR ${rir.targetRIR}`;
      weekBannerEl.textContent = label;
      weekBannerEl.className = `cal-week-banner${rir.isDeloadWeek ? " cal-week-banner-deload" : ""}`;
      weekBannerEl.hidden = false;
    } else {
      weekBannerEl.hidden = true;
    }
  }

  // ── Month stats (streak + completion) ──
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  let plannedInMonth = 0,
    loggedInMonth = 0;
  for (const iso of plannedDates) {
    if (!iso.startsWith(monthStr) || iso > today) continue;
    plannedInMonth++;
    if (workoutDates.has(iso)) loggedInMonth++;
  }
  const streak = calcStreak(allWorkouts);
  const statsEl = document.getElementById("cal-month-stats");
  if (statsEl) {
    const parts = [];
    if (streak > 0) parts.push(`🔥 ${streak}-day streak`);
    if (plannedInMonth > 0)
      parts.push(`${loggedInMonth} / ${plannedInMonth} workouts logged`);
    statsEl.innerHTML = parts
      .map((p) => `<span class="cal-stat-chip">${p}</span>`)
      .join("");
    statsEl.hidden = parts.length === 0;
  }

  // ── Build grid cells ──
  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const firstDow = new Date(year, month, 1).getDay();

  // Pad to full weeks
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);

  let html = `<div class="cal-header-row">${DOW.map((d) => `<div class="cal-header-cell">${d}</div>`).join("")}</div>`;

  for (let w = 0; w < cells.length / 7; w++) {
    const week = cells.slice(w * 7, w * 7 + 7);
    const firstIso = week.find((c) => c !== null);
    let weekClass = "cal-week-row";
    if (plan && firstIso) {
      const rir = getRirContext(plan, firstIso);
      if (rir && rir.isDeloadWeek) weekClass += " deload-week";
    }

    html += `<div class="${weekClass}">`;
    for (const iso of week) {
      if (!iso) {
        html += `<div class="cal-day cal-empty"></div>`;
        continue;
      }

      const d = parseInt(iso.split("-")[2], 10);
      const isToday = iso === today;
      const isPast = iso < today;
      const hasLog = workoutDates.has(iso);
      const hasSvdPlan = savedPlannedDates.has(iso);
      const hasPlan = plannedDates.has(iso);
      const isSkipped = skippedDates.has(iso);
      const isPlanned = !isSkipped && (hasPlan || hasSvdPlan);
      const isMissed = isPast && isPlanned && !hasLog;

      // Muscle group label from plan template
      let dayLabel = "";
      if (plan && hasPlan && plan.dayTemplates) {
        const dow = new Date(iso + "T00:00:00").getDay();
        const exs = plan.dayTemplates[dow] || [];
        if (exs.length > 0) {
          const muscles = [
            ...new Set(
              exs
                .map((e) => e.muscleGroup || getMuscleGroup(e.name))
                .filter(Boolean),
            ),
          ];
          dayLabel = muscles
            .slice(0, 2)
            .map((m) => m.slice(0, 4))
            .join("/");
        }
      }

      const cls = [
        "cal-day",
        isToday ? "today" : "",
        isMissed ? "missed" : "",
        hasLog ? "logged" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const dots =
        (hasLog ? `<span class="dot dot-workout"></span>` : "") +
        (!hasLog && isPlanned && !isMissed
          ? `<span class="dot dot-plan"></span>`
          : "") +
        (isMissed ? `<span class="dot dot-missed"></span>` : "");

      html += `
        <div class="${cls}" onclick="selectDay('${iso}')"
             ontouchstart="calDayTouchStart(event,'${iso}')"
             ontouchend="calDayTouchEnd(event)"
             ontouchmove="calDayTouchMove(event)">
          <span class="cal-day-num">${d}</span>
          ${dayLabel ? `<span class="cal-day-label">${dayLabel}</span>` : ""}
          ${dots ? `<div class="cal-dots">${dots}</div>` : ""}
        </div>`;
    }
    html += `</div>`;
  }

  document.getElementById("cal-grid").innerHTML = html;
  setupCalendarSwipe();
}

// ── Calendar swipe & long-press ───────────────────────────
let _calSwipeX = 0;
let _calSwipeMoved = false;
let _calLongPressTimer = null;
let _calLongPressIso = null;

let _calSwipeHandlers = null;
function setupCalendarSwipe() {
  const section = document.getElementById("view-calendar");
  if (!section) return;
  // Remove prior listeners if any (avoids stacking on DOM rebuilds)
  if (_calSwipeHandlers && _calSwipeHandlers.el) {
    const h = _calSwipeHandlers;
    h.el.removeEventListener("touchstart", h.start);
    h.el.removeEventListener("touchmove", h.move);
    h.el.removeEventListener("touchend", h.end);
  }
  let sx = 0,
    moved = false;
  const onStart = (e) => {
    if (
      document.getElementById("cal-day-popup") &&
      !document.getElementById("cal-day-popup").hidden
    )
      return;
    sx = e.touches[0].clientX;
    moved = false;
  };
  const onMove = () => {
    moved = true;
  };
  const onEnd = (e) => {
    if (moved) {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 55) advanceMonth(dx < 0 ? 1 : -1);
    }
  };
  section.addEventListener("touchstart", onStart, { passive: true });
  section.addEventListener("touchmove", onMove, { passive: true });
  section.addEventListener("touchend", onEnd, { passive: true });
  _calSwipeHandlers = { el: section, start: onStart, move: onMove, end: onEnd };
}

window.calDayTouchStart = function (e, iso) {
  _calLongPressIso = iso;
  _calSwipeX = e.touches[0].clientX;
  _calSwipeMoved = false;
  clearTimeout(_calLongPressTimer);
  _calLongPressTimer = setTimeout(() => {
    if (!_calSwipeMoved) openCalDayPopup(_calLongPressIso);
  }, 450);
};
window.calDayTouchMove = function () {
  _calSwipeMoved = true;
  clearTimeout(_calLongPressTimer);
};
window.calDayTouchEnd = function () {
  clearTimeout(_calLongPressTimer);
};

window.openCalDayPopup = function (iso) {
  const popup = document.getElementById("cal-day-popup");
  const dateEl = document.getElementById("cal-popup-date");
  const bodyEl = document.getElementById("cal-popup-body");
  const openBtn = document.getElementById("cal-popup-open");
  if (!popup) return;

  dateEl.textContent = formatDateLong(iso);

  const allWorkouts = loadWorkouts();
  const logged = allWorkouts.find(
    (w) => w.date === iso && (w.status ?? "completed") === "completed",
  );
  const plan = getActivePlan();
  const dow = new Date(iso + "T00:00:00").getDay();
  const tplExs = plan && plan.dayTemplates ? plan.dayTemplates[dow] || [] : [];

  let html = "";
  if (logged && logged.exercises.length > 0) {
    html =
      `<div class="popup-section-label">Logged</div>` +
      logged.exercises
        .map(
          (ex) =>
            `<div class="popup-ex-row"><span class="popup-ex-name">${escHtml(ex.name)}</span>
         <span class="popup-ex-meta">${ex.sets.length} set${ex.sets.length !== 1 ? "s" : ""}</span></div>`,
        )
        .join("");
  } else if (tplExs.length > 0) {
    html =
      `<div class="popup-section-label">Planned</div>` +
      tplExs
        .map(
          (ex) =>
            `<div class="popup-ex-row"><span class="popup-ex-name">${escHtml(ex.name)}</span>
         <span class="popup-ex-meta">${ex.sets.length} set${ex.sets.length !== 1 ? "s" : ""}</span></div>`,
        )
        .join("");
  } else {
    html = `<div class="popup-empty">No exercises planned.</div>`;
  }
  bodyEl.innerHTML = html;
  openBtn.onclick = () => {
    closeCalDayPopup();
    selectDay(iso);
  };
  popup.hidden = false;
};

window.closeCalDayPopup = function () {
  const popup = document.getElementById("cal-day-popup");
  if (popup) popup.hidden = true;
};

// ── Plan Day Editor ───────────────────────────────────────
const DOW_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

window.openPlanEditor = function (id) {
  const plan = loadPlans().find((p) => p.id === id);
  if (!plan) return;
  if (!plan.dayTemplates) plan.dayTemplates = {};
  state.editingPlan = JSON.parse(JSON.stringify(plan));
  state.openPlanDays = null;
  document.getElementById("plan-name").value = plan.name;
  document.getElementById("plan-name").dataset.editId = plan.id;
  document.getElementById("plan-start").value = plan.start;
  let weeks = plan.weeks || 0;
  if (!weeks && plan.start && plan.end) {
    const ms =
      new Date(plan.end + "T00:00:00") - new Date(plan.start + "T00:00:00");
    weeks = Math.max(1, Math.round(ms / (7 * 86400000)));
  }
  document.getElementById("plan-weeks").value = weeks || 8;
  document.getElementById("plan-end").value = plan.end || "";
  document.getElementById("plan-rir-toggle").checked = !!plan.rir;
  document.getElementById("plan-rir-options").style.display = plan.rir
    ? ""
    : "none";
  state.planDays = new Set(plan.workoutDays);
  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.classList.toggle("active", state.planDays.has(Number(btn.dataset.dow)));
  });
  updatePlanDatePreview();
  document.getElementById("plan-editor-title").textContent =
    plan.name || "Edit Plan";
  document.getElementById("plan-form-edit-banner").hidden = false;
  document.getElementById(
    "plan-form-edit-label",
  ).textContent = `Editing: ${plan.name}`;
  document.getElementById("btn-save-plan").textContent = "Update Plan";
  clearPlanErrors();
  navigate("plan-editor");
};

function openPlanEditorNew() {
  state.editingPlan = {
    id: uid(),
    name: "",
    workoutDays: [],
    dayTemplates: {},
    dayLabels: {},
    rir: false,
    mesocycleLength: 4,
  };
  state.openPlanDays = null;
  state._pendingTemplateDayTemplates = null;
  state._pendingTemplateDayLabels = null;
  document.getElementById("plan-name").value = "";
  document.getElementById("plan-name").dataset.editId = state.editingPlan.id;
  document.getElementById("plan-start").value = todayISO();
  document.getElementById("plan-weeks").value = "8";
  document.getElementById("plan-end").value = "";
  document.getElementById("plan-date-preview").hidden = true;
  document.getElementById("plan-rir-toggle").checked = false;
  document.getElementById("plan-rir-options").style.display = "none";
  state.planDays = new Set();
  document
    .querySelectorAll(".day-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById("plan-editor-title").textContent = "New Plan";
  document.getElementById("plan-form-edit-banner").hidden = true;
  document.getElementById("btn-save-plan").textContent = "Save Plan";
  clearPlanErrors();
  navigate("plan-editor");
}

function renderPlanEditor() {
  const plan = state.editingPlan;
  if (!plan) return;
  const body = document.getElementById("plan-editor-body");

  if (!plan.workoutDays || plan.workoutDays.length === 0) {
    body.innerHTML = `<div class="plan-editor-empty">Select workout days above to add exercises.</div>`;
    return;
  }

  const sortedDays = [...plan.workoutDays].sort((a, b) => a - b);
  body.innerHTML = sortedDays
    .map((dow) => {
      const exercises = plan.dayTemplates[dow] || [];
      const dayIndex = sortedDays.indexOf(dow);
      const prevDow = dayIndex > 0 ? sortedDays[dayIndex - 1] : null;

      // Summary line
      const muscles =
        exercises.length > 0
          ? [
              ...new Set(
                exercises
                  .map((e) => e.muscleGroup || getMuscleGroup(e.name))
                  .filter(Boolean),
              ),
            ]
          : [];
      const summary =
        exercises.length > 0
          ? `<div class="plan-day-card-summary">${exercises.length} exercise${exercises.length !== 1 ? "s" : ""}${muscles.length ? " · " + muscles.join(", ") : ""}</div>`
          : `<div class="plan-day-card-summary plan-day-card-summary-empty">Tap to add exercises</div>`;

      // Is this day's accordion open?
      const isOpen =
        state.openPlanDays === null || state.openPlanDays.has(dow);

      // Exercise rows
      const exRows =
        exercises.length === 0
          ? `<div class="plan-day-empty">No exercises yet — add one below.</div>`
          : exercises
              .map((ex, ei) => {
                const modeBadge =
                  ex.repMode === "er"
                    ? `<span class="er-badge">ER</span>`
                    : plan.rir
                      ? `<span class="rir-badge">RIR</span>`
                      : "";
                return `
          <div class="plan-day-ex-row">
            <div class="plan-day-ex-info">
              <div class="plan-day-ex-name">${escHtml(ex.name)}${modeBadge}</div>
              <div class="plan-day-ex-meta">${ex.sets.length} set${ex.sets.length !== 1 ? "s" : ""}</div>
            </div>
            <div class="plan-day-ex-actions">
              <button class="btn btn-secondary btn-sm" onclick="planTemplateEditEx(${dow},${ei})">Edit</button>
              <button class="btn btn-icon btn-secondary" onclick="planTemplateRemoveEx(${dow},${ei})" title="Remove">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>`;
              })
              .join("");

      return `
      <div class="plan-day-card">
        <button class="plan-day-card-header" onclick="togglePlanDayAccordion(${dow})" aria-expanded="${isOpen}">
          <div>
            <div class="plan-day-card-title">${DOW_NAMES[dow]}</div>
            ${summary}
          </div>
          <span class="plan-day-card-chevron${isOpen ? " open" : ""}">&#9660;</span>
        </button>
        <div class="plan-day-card-body"${isOpen ? "" : " hidden"}>
          <div class="plan-day-shortcuts">
            <button class="btn btn-secondary btn-sm" onclick="planTemplateCopyPreviousDay(${dow})" ${prevDow === null ? "disabled" : ""}>Copy Prev</button>
            <button class="btn btn-secondary btn-sm" onclick="openPlanDayCopyMenu(${dow})">Copy From…</button>
            <button class="btn btn-secondary btn-sm" onclick="planTemplateClearDay(${dow})">Clear</button>
          </div>
          ${exRows}
          <button class="btn btn-ghost btn-sm plan-day-add-btn" onclick="planTemplateAddEx(${dow})">+ Add Exercise</button>
        </div>
      </div>`;
    })
    .join("");
}

window.togglePlanDayAccordion = function (dow) {
  if (state.openPlanDays === null) {
    // Initialize: all open except this one
    state.openPlanDays = new Set(state.editingPlan.workoutDays);
    state.openPlanDays.delete(dow);
  } else if (state.openPlanDays.has(dow)) {
    state.openPlanDays.delete(dow);
  } else {
    state.openPlanDays.add(dow);
  }
  renderPlanEditor();
};

window.planTemplateAddEx = function (dow) {
  state.editingPlan.dayTemplates[dow] =
    state.editingPlan.dayTemplates[dow] || [];
  state.editingPlanDow = dow;
  state.exerciseContext = "planTemplate";
  state.editingExIndex = null;
  state.exMuscleFilter = null;
  navigate("exercise");
};

window.planTemplateEditEx = function (dow, ei) {
  state.editingPlanDow = dow;
  state.exerciseContext = "planTemplate";
  state.editingExIndex = ei;
  state.exMusclePickerFrom = null;
  navigate("exercise");
};

window.planTemplateRemoveEx = function (dow, ei) {
  state.editingPlan.dayTemplates[dow].splice(ei, 1);
  upsertPlan(state.editingPlan);
  renderPlanEditor();
};

window.planTemplateCopyPreviousDay = function (dow) {
  const days = [...state.editingPlan.workoutDays].sort((a, b) => a - b);
  const idx = days.indexOf(dow);
  if (idx <= 0) return;
  const prevDow = days[idx - 1];
  state.editingPlan.dayTemplates[dow] = cloneJSON(
    state.editingPlan.dayTemplates[prevDow] || [],
  );
  upsertPlan(state.editingPlan);
  renderPlanEditor();
};

window.openPlanDayCopyMenu = function (dow) {
  const options = [...state.editingPlan.workoutDays]
    .filter((candidate) => candidate !== dow)
    .map(
      (candidate) =>
        `<div class="swap-option" onclick="copyPlanDayFrom(${dow},${candidate})">${DOW_NAMES[candidate]}</div>`,
    )
    .join("");
  showModal({
    title: "Copy Day Template",
    msg: `<div class="swap-prompt">Copy exercises into ${DOW_NAMES[dow]} from:</div><div class="swap-list">${options}</div>`,
    confirmText: "Cancel",
    confirmClass: "btn-secondary",
  });
};

window.copyPlanDayFrom = function (targetDow, sourceDow) {
  document.getElementById("modal-overlay").hidden = true;
  state.editingPlan.dayTemplates[targetDow] = cloneJSON(
    state.editingPlan.dayTemplates[sourceDow] || [],
  );
  upsertPlan(state.editingPlan);
  renderPlanEditor();
};

window.planTemplateClearDay = function (dow) {
  state.editingPlan.dayTemplates[dow] = [];
  upsertPlan(state.editingPlan);
  renderPlanEditor();
};

// ── Plan Day Muscle Count Flow ────────────────────────────
window.openPlanDayMuscles = function (dow) {
  state.editingPlanDow = dow;
  // Derive current counts from existing exercises in this day's template
  const existing = state.editingPlan.dayTemplates[dow] || [];
  const counts = {};
  for (const ex of existing) {
    const g = ex.muscleGroup || getMuscleGroup(ex.name) || "Other";
    counts[g] = (counts[g] || 0) + 1;
  }
  state.editingPlanMuscleCounts = counts;
  navigate("plan-day-muscles");
};

function renderPlanDayMuscles() {
  const plan = state.editingPlan;
  if (!plan) return;
  const dow = state.editingPlanDow;
  document.getElementById("plan-day-muscles-title").textContent =
    DOW_NAMES[dow];

  const template = plan.dayTemplates[dow] || [];
  const counts = state.editingPlanMuscleCounts;

  const rows = Object.keys(MUSCLE_MAP)
    .map((group) => {
      const count = counts[group] || 0;
      const selected = template.filter(
        (e) => (e.muscleGroup || getMuscleGroup(e.name)) === group,
      ).length;
      const done = selected === count && count > 0;
      const metaColor = done ? "var(--green)" : "var(--accent)";

      const drillBtn =
        count > 0
          ? `
      <button class="muscle-drill-btn" onclick="openMuscleGroupPicker('${group}')">
        ${selected}/${count} chosen — Select exercises ›
      </button>`
          : "";

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
    })
    .join("");

  document.getElementById("plan-day-muscles-body").innerHTML = rows;
}

window.adjustMuscleCount = function (group, delta) {
  const current = state.editingPlanMuscleCounts[group] || 0;
  const newCount = Math.max(0, current + delta);
  state.editingPlanMuscleCounts[group] = newCount;

  // If count decreased, trim excess exercises from that group
  const dow = state.editingPlanDow;
  if (!state.editingPlan.dayTemplates[dow])
    state.editingPlan.dayTemplates[dow] = [];
  const exercises = state.editingPlan.dayTemplates[dow];
  const groupExercises = exercises.filter(
    (e) => (e.muscleGroup || getMuscleGroup(e.name)) === group,
  );
  if (groupExercises.length > newCount) {
    const toRemove = groupExercises.length - newCount;
    for (let i = 0; i < toRemove; i++) {
      // Find the last occurrence of this group and remove it
      for (let j = exercises.length - 1; j >= 0; j--) {
        if (
          (exercises[j].muscleGroup || getMuscleGroup(exercises[j].name)) ===
          group
        ) {
          exercises.splice(j, 1);
          break;
        }
      }
    }
  }
  renderPlanDayMuscles();
};

window.openMuscleGroupPicker = function (group) {
  state.editingPlanMuscleGroup = group;
  navigate("plan-muscle-picker");
};

function renderMuscleGroupPicker() {
  const group = state.editingPlanMuscleGroup;
  const dow = state.editingPlanDow;
  const limit = state.editingPlanMuscleCounts[group] || 0;
  const template = state.editingPlan.dayTemplates[dow] || [];
  // Selected exercises for this group, in their current order
  const selectedExs = template.filter(
    (e) => (e.muscleGroup || getMuscleGroup(e.name)) === group,
  );
  const selectedNames = selectedExs.map((e) => e.name);
  const selectedCount = selectedExs.length;
  const atLimit = selectedCount >= limit;

  document.getElementById("plan-muscle-picker-title").textContent = group;
  const subtitleEl = document.getElementById("plan-muscle-picker-subtitle");
  subtitleEl.textContent = `${selectedCount} of ${limit} selected`;
  subtitleEl.style.color =
    selectedCount === limit ? "var(--green)" : "var(--text2)";

  // ── Selected section (reorderable) ──
  const checkSvg = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg>`;
  const selectedRows = selectedExs
    .map((ex, i) => {
      const isFirst = i === 0;
      const isLast = i === selectedExs.length - 1;
      return `
      <div class="ex-pick-row selected">
        <div class="ex-pick-check">${checkSvg}</div>
        <div class="ex-pick-name">${escHtml(ex.name)}</div>
        <div class="ex-pick-reorder" onclick="event.stopPropagation()">
          <button class="reorder-btn${isFirst ? " disabled" : ""}" onclick="reorderMuscleExercise('${escHtml(ex.name)}','up')" ${isFirst ? "disabled" : ""}>▲</button>
          <button class="reorder-btn${isLast ? " disabled" : ""}" onclick="reorderMuscleExercise('${escHtml(ex.name)}','down')" ${isLast ? "disabled" : ""}>▼</button>
        </div>
        <div class="ex-pick-sets" onclick="event.stopPropagation()">
          <span class="ex-pick-sets-label">Sets</span>
          <button class="stepper-btn" style="width:26px;height:26px;font-size:15px" onclick="adjustExSetCount('${escHtml(ex.name)}',-1)">−</button>
          <span class="stepper-val" style="font-size:14px;min-width:18px">${ex.sets.length}</span>
          <button class="stepper-btn" style="width:26px;height:26px;font-size:15px" onclick="adjustExSetCount('${escHtml(ex.name)}',1)">+</button>
        </div>
        <button class="ex-pick-remove" onclick="toggleMuscleExercise('${escHtml(ex.name)}')" title="Remove">×</button>
      </div>`;
    })
    .join("");

  // ── Custom exercise input ──
  const customInput = !atLimit
    ? `
    <div class="custom-ex-row">
      <input type="text" id="custom-ex-input" class="input" placeholder="Custom exercise name…" autocomplete="off" style="flex:1;height:38px;font-size:13px" />
      <button class="btn btn-primary btn-sm" onclick="addCustomMuscleExercise()">+ Add</button>
    </div>`
    : "";

  // ── Available exercises ──
  const available = (MUSCLE_MAP[group] || []).filter(
    (n) => !selectedNames.includes(n),
  );
  const availableRows = available
    .map(
      (name) => `
    <div class="ex-pick-row${atLimit ? " at-limit" : ""}" onclick="${atLimit ? "" : `toggleMuscleExercise('${escHtml(name)}')`}">
      <div class="ex-pick-check"></div>
      <div class="ex-pick-name">${escHtml(name)}</div>
    </div>`,
    )
    .join("");

  const selectedSection = selectedRows
    ? `<div class="picker-section-label">Selected</div>${selectedRows}<div class="picker-section-divider"></div>`
    : "";
  const availableSection = `<div class="picker-section-label">Available</div>${availableRows || '<div class="empty-state" style="padding:12px 0"><div class="empty-label">All exercises selected.</div></div>'}`;

  document.getElementById("plan-muscle-picker-body").innerHTML =
    `${selectedSection}${customInput}${availableSection}`;
}

window.toggleMuscleExercise = function (name) {
  const dow = state.editingPlanDow;
  const group = state.editingPlanMuscleGroup;
  const limit = state.editingPlanMuscleCounts[group] || 0;
  if (!state.editingPlan.dayTemplates[dow])
    state.editingPlan.dayTemplates[dow] = [];
  const exercises = state.editingPlan.dayTemplates[dow];
  const idx = exercises.findIndex(
    (e) =>
      e.name === name && (e.muscleGroup || getMuscleGroup(e.name)) === group,
  );
  if (idx >= 0) {
    exercises.splice(idx, 1);
  } else {
    const selected = exercises.filter(
      (e) => (e.muscleGroup || getMuscleGroup(e.name)) === group,
    ).length;
    if (selected >= limit) return; // at limit, ignore
    exercises.push({
      name,
      muscleGroup: group,
      sets: Array.from({ length: 3 }, () => ({ weight: 0, reps: 0 })),
    });
  }
  renderMuscleGroupPicker();
};

window.adjustExSetCount = function (name, delta) {
  const dow = state.editingPlanDow;
  const exercises = state.editingPlan.dayTemplates[dow] || [];
  const ex = exercises.find((e) => e.name === name);
  if (!ex) return;
  if (delta > 0) {
    ex.sets.push({ weight: 0, reps: 0 });
  } else if (ex.sets.length > 1) {
    ex.sets.pop();
  }
  renderMuscleGroupPicker();
};

window.reorderMuscleExercise = function (name, direction) {
  const dow = state.editingPlanDow;
  const group = state.editingPlanMuscleGroup;
  const exercises = state.editingPlan.dayTemplates[dow] || [];
  // Find all indices of exercises in this group
  const groupIndices = exercises
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (e.muscleGroup || getMuscleGroup(e.name)) === group)
    .map(({ i }) => i);
  const posInGroup = groupIndices.findIndex((i) => exercises[i].name === name);
  if (posInGroup < 0) return;

  if (direction === "up" && posInGroup > 0) {
    const a = groupIndices[posInGroup];
    const b = groupIndices[posInGroup - 1];
    [exercises[a], exercises[b]] = [exercises[b], exercises[a]];
  } else if (direction === "down" && posInGroup < groupIndices.length - 1) {
    const a = groupIndices[posInGroup];
    const b = groupIndices[posInGroup + 1];
    [exercises[a], exercises[b]] = [exercises[b], exercises[a]];
  }
  renderMuscleGroupPicker();
};

window.addCustomMuscleExercise = function () {
  const input = document.getElementById("custom-ex-input");
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  const dow = state.editingPlanDow;
  const group = state.editingPlanMuscleGroup;
  const limit = state.editingPlanMuscleCounts[group] || 0;
  if (!state.editingPlan.dayTemplates[dow])
    state.editingPlan.dayTemplates[dow] = [];
  const exercises = state.editingPlan.dayTemplates[dow];
  const selected = exercises.filter(
    (e) => (e.muscleGroup || getMuscleGroup(e.name)) === group,
  ).length;
  if (selected >= limit) return;
  // Don't add duplicates
  if (exercises.some((e) => e.name.toLowerCase() === name.toLowerCase()))
    return;
  exercises.push({
    name,
    muscleGroup: group,
    sets: Array.from({ length: 3 }, () => ({ weight: 0, reps: 0 })),
  });
  input.value = "";
  renderMuscleGroupPicker();
};

window.savePlanDay = function () {
  upsertPlan(state.editingPlan);
  navigate("plan-editor");
};

// ── Plan Templates Library ────────────────────────────────
const PLAN_TEMPLATES = [
  {
    id: "tpl-ppl",
    name: "Push / Pull / Legs",
    description:
      "6-day split. Chest, shoulders & triceps → Back & biceps → Legs & glutes, repeated twice per week.",
    tags: ["Intermediate", "Hypertrophy"],
    workoutDays: [1, 2, 3, 5, 6, 0], // Mon–Sat + Sun
    defaultWeeks: 8,
    // pattern: 7-element array, true = workout day (starting from defaultStartDow=Mon)
    pattern: [true, true, true, true, true, true, false],
    defaultStartDow: 1,
    slotLabels: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
    dayLabels: {
      1: "Push A",
      2: "Pull A",
      3: "Legs A",
      5: "Push B",
      6: "Pull B",
      0: "Legs B",
    },
    dayTemplates: {
      1: [
        // Push A
        {
          name: "Barbell Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Incline Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Chest Fly",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Overhead Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Lateral Raise",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Tricep Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Skull Crusher",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      2: [
        // Pull A
        {
          name: "Barbell Bent-Over Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Lat Pulldown",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Cable Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Face Pull",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hammer Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      3: [
        // Legs A
        {
          name: "Barbell Back Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Leg Press",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Romanian Deadlift",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Lying Leg Curl",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hip Thrust",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Standing Calf Raise",
          muscleGroup: "Calves",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      5: [
        // Push B — same muscles, different exercises
        {
          name: "Dumbbell Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Chest Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Machine Chest Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Arnold Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Lateral Raise",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Rope Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Overhead Tricep Extension",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      6: [
        // Pull B
        {
          name: "Pull-Up",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Single-Arm Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Straight-Arm Pulldown",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Rear Delt Fly",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "EZ-Bar Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Concentration Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      0: [
        // Legs B
        {
          name: "Hack Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Bulgarian Split Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Leg Curl",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Good Morning",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Kickback",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Calf Raise",
          muscleGroup: "Calves",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
    },
  },
  {
    id: "tpl-ul",
    name: "Upper / Lower",
    description:
      "4-day split. Upper body strength & hypertrophy alternating with lower body. Great for beginners and intermediates.",
    tags: ["Beginner", "Intermediate", "Hypertrophy"],
    workoutDays: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
    defaultWeeks: 8,
    pattern: [true, true, false, true, true, false, false],
    defaultStartDow: 1,
    slotLabels: ["Upper A", "Lower A", "Upper B", "Lower B"],
    dayTemplates: {
      1: [
        // Upper A
        {
          name: "Barbell Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Bent-Over Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Overhead Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Lat Pulldown",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Skull Crusher",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      2: [
        // Lower A
        {
          name: "Barbell Back Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Romanian Deadlift",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Leg Press",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Lying Leg Curl",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hip Thrust",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Standing Calf Raise",
          muscleGroup: "Calves",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      4: [
        // Upper B
        {
          name: "Dumbbell Incline Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Pull-Up",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Lateral Raise",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Cable Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hammer Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Tricep Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      5: [
        // Lower B
        {
          name: "Barbell Deadlift",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hack Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Bulgarian Split Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Leg Curl",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Hip Abduction",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Calf Raise",
          muscleGroup: "Calves",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
    },
  },
  {
    id: "tpl-fb",
    name: "Full Body (3×/wk)",
    description:
      "3-day full body. Every session trains all major muscle groups. Great for beginners or time-crunched athletes.",
    tags: ["Beginner", "Strength", "Time-Efficient"],
    workoutDays: [1, 3, 5], // Mon, Wed, Fri
    defaultWeeks: 6,
    pattern: [true, false, true, false, true, false, false],
    defaultStartDow: 1,
    slotLabels: ["Full Body A", "Full Body B", "Full Body C"],
    dayTemplates: {
      1: [
        // Day A
        {
          name: "Barbell Back Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Bent-Over Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Overhead Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Tricep Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      3: [
        // Day B
        {
          name: "Romanian Deadlift",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Incline Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Pull-Up",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Arnold Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hammer Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Skull Crusher",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      5: [
        // Day C
        {
          name: "Leg Press",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Chest Fly",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Cable Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Lateral Raise",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hip Thrust",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Plank",
          muscleGroup: "Core",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
    },
  },
  {
    id: "tpl-glutes",
    name: "Glutes & Legs Focus",
    description:
      "4-day lower-body priority. Two dedicated glute/leg days plus upper body maintenance. Perfect for glute and leg development.",
    tags: ["Intermediate", "Hypertrophy", "Glutes"],
    workoutDays: [1, 2, 4, 5],
    defaultWeeks: 8,
    pattern: [true, true, false, true, true, false, false],
    defaultStartDow: 1,
    slotLabels: ["Glutes & Hamstrings", "Upper", "Quads & Glutes", "Upper B"],
    dayTemplates: {
      1: [
        // Glutes & Hamstrings
        {
          name: "Hip Thrust",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Romanian Deadlift",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Kickback",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Lying Leg Curl",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Abductor Machine",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Calf Raise",
          muscleGroup: "Calves",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      2: [
        // Upper
        {
          name: "Barbell Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Lat Pulldown",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Overhead Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Cable Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Tricep Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      4: [
        // Quads & Glutes
        {
          name: "Barbell Back Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Bulgarian Split Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Leg Extension",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Hip Abduction",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Hip Extension",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Standing Calf Raise",
          muscleGroup: "Calves",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      5: [
        // Upper B
        {
          name: "Dumbbell Incline Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Pull-Up",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Face Pull",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Lateral Raise",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hammer Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Rope Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
    },
  },
  {
    id: "tpl-arms",
    name: "Arms & Chest Specialization",
    description:
      "4-day plan with extra arm and chest volume. Great for building a bigger upper body when arms and chest are your priority.",
    tags: ["Intermediate", "Hypertrophy", "Arms"],
    workoutDays: [1, 2, 4, 5],
    defaultWeeks: 6,
    pattern: [true, true, false, true, true, false, false],
    defaultStartDow: 1,
    slotLabels: [
      "Chest & Triceps",
      "Back & Biceps",
      "Shoulders & Arms",
      "Legs",
    ],
    dayTemplates: {
      1: [
        // Chest & Triceps
        {
          name: "Barbell Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Incline Bench Press",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Chest Fly",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Pec Deck Fly",
          muscleGroup: "Chest",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Skull Crusher",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Rope Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Overhead Tricep Extension",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      2: [
        // Back & Biceps
        {
          name: "Barbell Deadlift",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Pull-Up",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Seated Cable Row",
          muscleGroup: "Back",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Barbell Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Incline Dumbbell Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hammer Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      4: [
        // Shoulders & Arms
        {
          name: "Barbell Overhead Press",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Dumbbell Lateral Raise",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Face Pull",
          muscleGroup: "Shoulders",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "EZ-Bar Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Tricep Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Cable Reverse Curl",
          muscleGroup: "Biceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Single-Arm Pushdown",
          muscleGroup: "Triceps",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
      5: [
        // Legs
        {
          name: "Barbell Back Squat",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Romanian Deadlift",
          muscleGroup: "Hamstrings",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Leg Press",
          muscleGroup: "Quads",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Hip Thrust",
          muscleGroup: "Glutes",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
        {
          name: "Standing Calf Raise",
          muscleGroup: "Calves",
          sets: [
            { weight: 0, reps: 0 },
            { weight: 0, reps: 0 },
          ],
        },
      ],
    },
  },
];

function renderPlanTemplates() {
  const container = document.getElementById("plan-templates-list");
  if (!container) return;
  const DOW_FULL = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  container.innerHTML = PLAN_TEMPLATES.map((tpl) => {
    const dowLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    // Build the day-of-week pips dynamically from pattern + default start
    const defaultStart = tpl.defaultStartDow ?? 1;
    const computedWorkoutDays = tpl.pattern
      ? tpl.pattern
          .map((on, i) => (on ? (defaultStart + i) % 7 : -1))
          .filter((d) => d !== -1)
      : tpl.workoutDays;
    const pips = dowLabels
      .map(
        (lbl, i) =>
          `<div class="plan-day-pip ${computedWorkoutDays.includes(i) ? "on" : "off"}">${lbl}</div>`,
      )
      .join("");

    const tags = tpl.tags
      .map((t) => `<span class="tpl-tag">${t}</span>`)
      .join("");

    // Start-day selector (only for templates with a pattern)
    const startDayRow = tpl.pattern
      ? `
      <div class="tpl-start-day-row">
        <label class="tpl-start-day-label">First workout day:</label>
        <select class="tpl-start-day-select" id="tpl-startdow-${tpl.id}" onchange="updateTplPips('${tpl.id}')">
          ${DOW_FULL.map((name, i) => `<option value="${i}"${i === defaultStart ? " selected" : ""}>${name}</option>`).join("")}
        </select>
      </div>`
      : "";

    // Exercise preview per day
    const patternPositions = tpl.pattern
      ? tpl.pattern.map((on, i) => (on ? i : -1)).filter((i) => i !== -1)
      : [];
    const previewDays = tpl.workoutDays
      .map((origDow, slotIdx) => {
        const label =
          (tpl.slotLabels && tpl.slotLabels[slotIdx]) || `Day ${slotIdx + 1}`;
        const exercises = (tpl.dayTemplates[origDow] || [])
          .map((ex) => `<li>${escHtml(ex.name)}</li>`)
          .join("");
        return `<div class="tpl-day-preview"><div class="tpl-day-label">${escHtml(label)}</div><ul class="tpl-ex-list">${exercises}</ul></div>`;
      })
      .join("");

    return `
      <div class="plan-template-card" id="tpl-card-${tpl.id}">
        <div class="plan-template-name">${escHtml(tpl.name)}</div>
        <div class="plan-template-tags">${tags}</div>
        <div class="plan-template-desc">${escHtml(tpl.description)}</div>
        <div class="plan-card-days tpl-pips-${tpl.id}" style="margin:10px 0 6px">${pips}</div>
        ${startDayRow}
        <div class="tpl-actions">
          <button class="btn btn-primary btn-sm" onclick="usePlanTemplate('${tpl.id}')">Use This Plan</button>
          <button class="btn btn-ghost btn-sm tpl-preview-btn" onclick="toggleTplPreview('${tpl.id}')">View Exercises ▾</button>
        </div>
        <div class="tpl-preview-wrap" id="tpl-preview-${tpl.id}" hidden>
          <div class="tpl-preview-grid">${previewDays}</div>
        </div>
      </div>`;
  }).join("");
}

window.toggleTplPreview = function (tplId) {
  const wrap = document.getElementById(`tpl-preview-${tplId}`);
  const btn = document.querySelector(`#tpl-card-${tplId} .tpl-preview-btn`);
  if (!wrap) return;
  wrap.hidden = !wrap.hidden;
  if (btn)
    btn.textContent = wrap.hidden ? "View Exercises ▾" : "Hide Exercises ▴";
};

window.updateTplPips = function (tplId) {
  const tpl = PLAN_TEMPLATES.find((t) => t.id === tplId);
  if (!tpl || !tpl.pattern) return;
  const select = document.getElementById(`tpl-startdow-${tplId}`);
  const startDow = parseInt(select.value, 10);
  const dowLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const newWorkoutDays = tpl.pattern
    .map((on, i) => (on ? (startDow + i) % 7 : -1))
    .filter((d) => d !== -1);
  const pipsEl = document.querySelector(`.tpl-pips-${tplId}`);
  if (pipsEl) {
    pipsEl.innerHTML = dowLabels
      .map(
        (lbl, i) =>
          `<div class="plan-day-pip ${newWorkoutDays.includes(i) ? "on" : "off"}">${lbl}</div>`,
      )
      .join("");
  }
};

window.usePlanTemplate = function (tplId) {
  const tpl = PLAN_TEMPLATES.find((t) => t.id === tplId);
  if (!tpl) return;

  // Read the user-selected start day (falls back to template default or Monday)
  const startDowSelect = document.getElementById(`tpl-startdow-${tplId}`);
  const startDow = startDowSelect
    ? parseInt(startDowSelect.value, 10)
    : (tpl.defaultStartDow ?? 1);

  // Compute workout days and remap day templates based on selected start day
  let finalWorkoutDays = tpl.workoutDays;
  let finalDayTemplates = tpl.dayTemplates;
  let finalDayLabels = tpl.dayLabels || {};

  if (tpl.pattern) {
    // Positions within the 7-day cycle that are workout days (in slot order)
    const patternPositions = tpl.pattern
      .map((on, i) => (on ? i : -1))
      .filter((i) => i !== -1);
    // Map each slot position to a DOW based on start day
    const newWorkoutDays = patternPositions.map((pos) => (startDow + pos) % 7);
    // Remap dayTemplates and dayLabels from original DOWs to new DOWs
    const newDayTemplates = {};
    const newDayLabels = {};
    tpl.workoutDays.forEach((origDow, slotIdx) => {
      const newDow = newWorkoutDays[slotIdx];
      if (newDow !== undefined) {
        newDayTemplates[newDow] = tpl.dayTemplates[origDow];
        if (tpl.slotLabels && tpl.slotLabels[slotIdx]) {
          newDayLabels[newDow] = tpl.slotLabels[slotIdx];
        }
      }
    });
    finalWorkoutDays = newWorkoutDays;
    finalDayTemplates = newDayTemplates;
    finalDayLabels = newDayLabels;
  }

  // Open plan editor pre-filled with this template
  state.editingPlan = {
    id: uid(),
    name: tpl.name,
    workoutDays: [...finalWorkoutDays].sort(),
    dayTemplates: JSON.parse(JSON.stringify(finalDayTemplates)),
    dayLabels: JSON.parse(JSON.stringify(finalDayLabels)),
    rir: false,
    mesocycleLength: 4,
  };
  state.openPlanDays = null;
  state._pendingTemplateDayTemplates = null;
  state._pendingTemplateDayLabels = null;
  document.getElementById("plan-name").value = tpl.name;
  document.getElementById("plan-name").dataset.editId = state.editingPlan.id;
  document.getElementById("plan-weeks").value = tpl.defaultWeeks;
  document.getElementById("plan-start").value = todayISO();
  document.getElementById("plan-end").value = "";
  document.getElementById("plan-date-preview").hidden = true;
  document.getElementById("plan-rir-toggle").checked = false;
  document.getElementById("plan-rir-options").style.display = "none";
  state.planDays = new Set(finalWorkoutDays);
  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.classList.toggle("active", state.planDays.has(Number(btn.dataset.dow)));
  });
  updatePlanDatePreview();
  document.getElementById("plan-editor-title").textContent = tpl.name;
  document.getElementById("plan-form-edit-banner").hidden = true;
  document.getElementById("btn-save-plan").textContent = "Save Plan";
  clearPlanErrors();
  navigate("plan-editor");
};

// ── Plan ──────────────────────────────────────────────────
function renderPlan() {
  // Render saved plans
  const plans = loadPlans();
  const list = document.getElementById("plan-list");
  const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  renderPlanTemplates();

  if (plans.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-label">No plans yet.</div><p>Use a template above or create one with the + New Plan button.</p></div>`;
    return;
  }

  const activePlanId = loadActivePlanId();
  list.innerHTML = plans
    .map((p) => {
      const isActive = p.id === activePlanId;
      const pips = DOW_LABELS.map(
        (lbl, i) => `
      <div class="plan-day-pip ${p.workoutDays.includes(i) ? "on" : "off"}">${lbl}</div>
    `,
      ).join("");
      const activeBtn = isActive
        ? `<span class="plan-active-badge">● Active</span>`
        : `<button class="btn btn-secondary btn-sm" onclick="setActivePlan('${p.id}')">Set Active</button>`;
      return `
      <div class="plan-card${isActive ? " plan-card-active" : ""}">
        <div class="plan-card-name">${escHtml(p.name)}${p.rir ? '<span class="rir-badge">RIR</span>' : ""}</div>
        <div class="plan-card-meta">${formatDate(p.start)} — ${formatDate(p.end)}</div>
        <div class="plan-card-days">${pips}</div>
        <div class="plan-card-actions">
          <div class="plan-card-primary-actions">
            ${activeBtn}
            <button class="btn btn-primary btn-sm" onclick="openPlanEditor('${p.id}')">Edit Plan</button>
            <button class="btn btn-secondary btn-sm plan-card-more-btn" onclick="togglePlanMenu('${p.id}')" title="More options">···</button>
          </div>
          <div class="plan-card-secondary-actions" id="plan-menu-${p.id}" hidden>
            <button class="btn btn-secondary btn-sm" onclick="copyPlan('${p.id}')">Duplicate Plan</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeletePlan('${p.id}')">Delete</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

function setPlanError(msg) {
  let el = document.getElementById("plan-error");
  if (!el) {
    el = document.createElement("div");
    el.id = "plan-error";
    el.style.cssText =
      "color:var(--red);font-size:13px;font-weight:600;margin-top:-10px";
    document.getElementById("btn-save-plan").before(el);
  }
  el.textContent = msg;
}

function clearPlanErrors() {
  document
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));
  const errEl = document.getElementById("plan-error");
  if (errEl) errEl.remove();
}

function computePlanEnd(start, weeks) {
  // end = last day of the final week (start + weeks*7 - 1 day)
  const d = new Date(start + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7 - 1);
  return localISO(d);
}

function updatePlanDatePreview() {
  const start = document.getElementById("plan-start").value;
  const weeksVal = parseInt(document.getElementById("plan-weeks").value, 10);
  const preview = document.getElementById("plan-date-preview");
  const endEl = document.getElementById("plan-end");
  if (!start || !weeksVal || weeksVal < 1) {
    preview.hidden = true;
    endEl.value = "";
    return;
  }
  const isRir = document.getElementById("plan-rir-toggle").checked;
  const msLen = calcAutoMsLen(weeksVal);
  const end = computePlanEnd(start, weeksVal);
  endEl.value = end;
  const deloadNote = isRir ? ` · deload every ${msLen} wks` : "";
  preview.textContent = `${weeksVal} weeks${deloadNote} → ends ${formatDate(end)}`;
  preview.hidden = false;
  updateRirAutoInfo();
}

function savePlan() {
  clearPlanErrors();
  const nameEl = document.getElementById("plan-name");
  const startEl = document.getElementById("plan-start");
  const weeksEl = document.getElementById("plan-weeks");
  const name = nameEl.value.trim();
  const start = startEl.value;
  const weeks = parseInt(weeksEl.value, 10);

  if (!name) {
    nameEl.classList.add("input-error");
    setPlanError("Enter a plan name.");
    nameEl.focus();
    return;
  }
  if (!start) {
    startEl.classList.add("input-error");
    setPlanError("Set a start date.");
    return;
  }
  if (!weeks || weeks < 1) {
    weeksEl.classList.add("input-error");
    setPlanError("Enter the number of training weeks (at least 1).");
    return;
  }
  if (state.planDays.size === 0) {
    setPlanError("Select at least one workout day.");
    return;
  }

  const isRir = document.getElementById("plan-rir-toggle").checked;
  const msLen = calcAutoMsLen(weeks);
  const end = computePlanEnd(start, weeks);

  const planId =
    state.editingPlan?.id || nameEl.dataset.editId || uid();
  const plan = {
    id: planId,
    name,
    start,
    end,
    weeks,
    workoutDays: [...state.planDays].sort(),
    dayTemplates: state.editingPlan?.dayTemplates || {},
    dayLabels: state.editingPlan?.dayLabels || {},
    rir: isRir,
    mesocycleLength: msLen,
  };
  delete nameEl.dataset.editId;
  state.editingPlan = null;
  clearPlanErrors();
  upsertPlan(plan);
  navigate("plan");
  renderPlan();
}

window.togglePlanMenu = function (id) {
  const el = document.getElementById(`plan-menu-${id}`);
  if (el) el.hidden = !el.hidden;
};

window.loadPlanIntoForm = function (id) {
  openPlanEditor(id);
};

window.setActivePlan = function (id) {
  return (async () => {
    if (state._planActivationInProgress || loadActivePlanId() === id) return;

    state._planActivationInProgress = true;

    try {
      setPlanProgress(
        8,
        "Saving active plan",
        "Syncing your plan selection before rebuilding your schedule.",
        "Saving selection",
      );
      await nextPaint();

      setPlanProgress(
        34,
        "Saving active plan",
        "Writing the active plan so your app state stays in sync.",
        "Syncing data",
      );
      // localStorage is written synchronously inside saveActivePlanId.
      // The Firestore sync is fire-and-forget so a network hiccup never
      // blocks the local UI flow.
      try {
        await saveActivePlanId(id);
      } catch (syncErr) {
        console.warn(
          "Firestore sync for active plan failed (will retry on next write):",
          syncErr,
        );
      }

      setPlanProgress(
        56,
        "Refreshing plans",
        "Updating the plan list so the active state is visible immediately.",
        "Refreshing plans",
      );
      await nextPaint();
      renderPlan();

      setPlanProgress(
        78,
        "Refreshing schedule",
        "Updating today, the calendar, and any open workout views.",
        "Rebuilding schedule",
      );
      await nextPaint();
      if (state.view === "home") renderHome();
      else renderTodayPlan();
      if (state.view === "calendar") renderCalendar();
      if (state.view === "day" && state.dayWorkout) renderDay();

      setPlanProgress(
        100,
        "Active plan updated",
        "Your calendar and workout suggestions are ready.",
        "Complete",
      );
      await new Promise((resolve) => setTimeout(resolve, 180));
    } catch (err) {
      showAlert(
        "Could not update active plan",
        "There was a problem setting this plan as active. Please try again.",
      );
      console.error(err);
    } finally {
      hidePlanProgress();
      state._planActivationInProgress = false;
    }
  })();
};

window.confirmDeletePlan = function (id) {
  showModal({
    title: "Delete Plan?",
    msg: "This will permanently remove the plan and all its exercises.",
    confirmText: "Delete",
    confirmClass: "btn-danger-solid",
    cancelText: "Cancel",
    onConfirm: () => {
      const wasActive = loadActivePlanId() === id;
      deletePlan(id);
      if (wasActive) saveActivePlanId(null);
      renderPlan();
      if (wasActive) renderTodayPlan();
    },
  });
};

window.copyPlan = function (id) {
  const plan = loadPlans().find((p) => p.id === id);
  if (!plan) return;
  const planDays = Math.round(
    (new Date(plan.end + "T00:00:00") - new Date(plan.start + "T00:00:00")) /
      86400000,
  );
  const todayStr = todayISO();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + planDays);
  const endStr = localISO(endDate);
  upsertPlan({
    id: uid(),
    name: plan.name + " (Copy)",
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
  const container = document.getElementById("history-list");
  const workouts = loadWorkouts();

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-label">No history yet.</div>
        <p>Completed workouts will appear here.</p>
      </div>`;
    document.getElementById("progress-graph-section").innerHTML = "";
    return;
  }

  const prMap = buildPRMap();
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = sorted.map((w) => historyCardHTML(w, prMap)).join("");
  document.getElementById("progress-graph-section").innerHTML =
    renderProgressGraph(workouts);
}

function historyCardHTML(w, prMap) {
  const exCount = w.exercises.length;
  const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const vol = calcVolume(w);

  const exerciseRows = w.exercises
    .map((ex) => {
      const exPR = prMap ? prMap[ex.name] : null;
      const setRows = ex.sets.map((s, i) => setRowHTML(s, i, exPR)).join("");
      return `
      <div class="exercise-row">
        <div class="exercise-row-name ex-history-link" onclick="showExerciseHistory('${escHtml(ex.name)}',event)">${escHtml(ex.name)} <span class="ex-history-link-hint">›</span></div>
        <table class="sets-table">
          <thead><tr><th></th><th>Reps</th><th>Weight</th></tr></thead>
          <tbody>${setRows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const notesHtml = w.notes
    ? `<div class="workout-card-notes">"${escHtml(w.notes)}"</div>`
    : "";

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
        <span class="meta-pill">${exCount} exercise${exCount !== 1 ? "s" : ""}</span>
        <span class="meta-pill">${setCount} set${setCount !== 1 ? "s" : ""}</span>
        ${vol ? `<span class="meta-pill vol-pill">${vol}</span>` : ""}
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

window.confirmDelete = function (id, event) {
  event.stopPropagation();
  showModal({
    title: "Delete Workout?",
    msg: "This cannot be undone.",
    confirmText: "Delete",
    confirmClass: "btn-danger-solid",
    cancelText: "Cancel",
    onConfirm: () => {
      deleteWorkout(id);
      renderHistory();
    },
  });
};

window.copyWorkoutToDay = function (id, event) {
  event.stopPropagation();
  const source = loadWorkouts().find((w) => w.id === id);
  if (!source) return;

  showModal({
    title: "Copy to Day",
    msg: `<div class="field-label" style="margin-top:4px">Target Date</div>
          <input type="date" id="modal-date-input" value="${todayISO()}" style="margin-top:6px;width:100%;background:var(--surface3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;color:var(--text);font-size:15px;outline:none" />`,
    confirmText: "Copy",
    cancelText: "Cancel",
    onConfirm: () => {
      const dateStr = document.getElementById("modal-date-input").value;
      if (!dateStr) return;
      const workouts = loadWorkouts();
      const existing = workouts.find((w) => w.date === dateStr);
      const exercises = JSON.parse(JSON.stringify(source.exercises));
      if (existing) {
        const exCount = existing.exercises.length;
        const existingLabel = `${escHtml(existing.name || formatDate(dateStr) + " Workout")} (${exCount} exercise${exCount !== 1 ? "s" : ""})`;
        showModal({
          title: "Replace Workout?",
          msg: `This will replace <strong>${existingLabel}</strong> on ${formatDate(dateStr)} with <strong>${escHtml(source.name)}</strong>. This cannot be undone.`,
          confirmText: "Replace",
          confirmClass: "btn-danger-solid",
          cancelText: "Cancel",
          onConfirm: () => {
            updateWorkout({ ...existing, exercises });
            selectDay(dateStr);
          },
        });
      } else {
        addWorkout({ id: uid(), date: dateStr, name: source.name, exercises });
        selectDay(dateStr);
      }
    },
  });
};

window.exportToCSV = function () {
  const workouts = loadWorkouts();
  if (workouts.length === 0) {
    showAlert("No Data", "No workouts to export yet.");
    return;
  }
  const rows = [
    [
      "Date",
      "Workout",
      "Notes",
      "Exercise",
      "Set",
      "Weight (lbs)",
      "Reps",
      "Done",
      "RIR",
    ],
  ];
  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        const s = ex.sets[i];
        rows.push([
          w.date,
          w.name,
          w.notes || "",
          ex.name,
          i + 1,
          s.weight || 0,
          s.actualReps != null ? s.actualReps : s.reps || 0,
          s.done ? "Yes" : "No",
          s.rir != null ? s.rir : "",
        ]);
      }
    }
  }
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workouts-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function renderProgressGraph(workouts) {
  const weeklyCount = {};
  for (const w of workouts) {
    const d = new Date(w.date + "T00:00:00");
    const ws = new Date(d);
    ws.setDate(d.getDate() - d.getDay() + 1); // Monday
    const key = localISO(ws);
    weeklyCount[key] = (weeklyCount[key] || 0) + 1;
  }
  const keys = Object.keys(weeklyCount).sort().slice(-10);
  if (keys.length === 0) return "";

  const maxV = Math.max(...keys.map((k) => weeklyCount[k]));
  const bw = 32,
    gap = 10,
    h = 64,
    pad = 16,
    labelH = 28;
  const svgW = keys.length * (bw + gap) - gap + pad * 2;
  const svgH = h + labelH;

  const bars = keys
    .map((k, i) => {
      const count = weeklyCount[k];
      const barH = maxV > 0 ? Math.max(6, Math.round((count / maxV) * h)) : 6;
      const x = pad + i * (bw + gap);
      const barY = h - barH;
      const lbl = new Date(k + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `
      <rect x="${x}" y="${barY}" width="${bw}" height="${barH}" rx="4" fill="var(--accent)" opacity="0.8"/>
      <text x="${x + bw / 2}" y="${barY - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--accent)">${count}</text>
      <text x="${x + bw / 2}" y="${h + 14}" text-anchor="middle" font-size="8" fill="var(--text3)">${lbl}</text>`;
    })
    .join("");

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
  const btn = document.getElementById("btn-theme-toggle");
  if (!btn) return;
  const isLight = document.body.classList.contains("light");
  // Show moon when dark (tap to go light), sun when light (tap to go dark)
  btn.innerHTML = isLight
    ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
}

function getAccentPalette() {
  const palette = localStorage.getItem("wt_theme_palette") || "classic";
  return THEME_PALETTES.some((item) => item.id === palette)
    ? palette
    : "classic";
}

function applyAccentPalette(palette) {
  const nextPalette = THEME_PALETTES.some((item) => item.id === palette)
    ? palette
    : "classic";
  document.body.dataset.accentPalette = nextPalette;
  localStorage.setItem("wt_theme_palette", nextPalette);
}

function syncProfilePrefs(patch) {
  if (!window._auth || !window._auth.currentUser) return;
  const u = window._auth.currentUser.uid;
  import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
    .then(({ doc, setDoc }) =>
      setDoc(doc(window._db, `users/${u}`), patch, { merge: true }),
    )
    .catch((err) => console.warn("Could not sync profile preference:", err));
}

window.toggleRirGuide = function () {
  const body = document.getElementById("rir-guide-body");
  const toggle = document.getElementById("rir-guide-toggle");
  const open = body.hasAttribute("hidden");
  body.toggleAttribute("hidden", !open);
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.classList.toggle("open", open);
};

window.toggleErGuide = function () {
  const body = document.getElementById("er-guide-body");
  const toggle = document.getElementById("er-guide-toggle");
  const open = body.hasAttribute("hidden");
  body.toggleAttribute("hidden", !open);
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.classList.toggle("open", open);
};

window.toggleTheme = function () {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem("wt_theme", isLight ? "light" : "dark");
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", isLight ? "#f2f2f8" : "#0c0c10");
  updateThemeBtn();
};

// ── Service Worker ────────────────────────────────────────
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js", { updateViaCache: "none" })
      .catch(() => {});

    // Auto-reload when the service worker activates a new cache version
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SW_UPDATED") {
        window.location.reload();
      }
    });

    // iOS PWAs resume from memory without a full page reload, so the
    // normal SW update check (at load time) never re-fires.  Re-check
    // for a waiting worker every time the app returns to the foreground.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update().catch(() => {});
      });
    });
  }
}

// ── Save Status Indicator ─────────────────────────────────
// Subscribes to storage.js write-tracker events and updates the
// #save-status pill. Hidden when idle+online; visible (and auto-fading
// after "Saved") otherwise. One source of truth: the state coming out
// of subscribeSaveStatus() in storage.js.
function setupSaveStatusIndicator() {
  const el = document.getElementById("save-status");
  if (!el) return;
  const textEl = document.getElementById("save-status-text");
  const LABELS = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    offline: "Offline",
    error: "Save failed",
  };
  let hideTimer = null;

  const clearHide = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  subscribeSaveStatus(({ state }) => {
    el.setAttribute("data-state", state);
    if (textEl) textEl.textContent = LABELS[state] || "";

    if (state === "idle") {
      // Fade out, then remove from the accessibility tree.
      clearHide();
      el.classList.remove("is-visible");
      hideTimer = setTimeout(() => el.setAttribute("hidden", ""), 200);
      return;
    }

    clearHide();
    el.removeAttribute("hidden");
    // Next frame so the transition picks up the display change.
    requestAnimationFrame(() => el.classList.add("is-visible"));

    if (state === "saved") {
      // Briefly show "Saved" then drop to idle so it doesn't nag.
      hideTimer = setTimeout(() => {
        el.setAttribute("data-state", "idle");
        if (textEl) textEl.textContent = "";
        el.classList.remove("is-visible");
        setTimeout(() => el.setAttribute("hidden", ""), 200);
      }, 1400);
    }
  });
}

// ── Event Listeners ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  setupSaveStatusIndicator();
  applyAccentPalette(getAccentPalette());
  updateThemeBtn();
  refreshContextHints();

  // Splash screen — manual only; re-openable via the home-screen info icon
  const splash = document.getElementById("splash");
  document
    .getElementById("btn-splash-dismiss")
    .addEventListener("click", () => {
      localStorage.setItem("wt_seen", "1");
      splash.classList.add("hidden");
      splash.style.display = "";
      document.body.classList.add("seen");
    });

  window.showSplash = function () {
    document.body.classList.remove("seen");
    splash.classList.remove("hidden");
    splash.style.display = "flex";
  };

  document
    .getElementById("btn-release-dismiss")
    .addEventListener("click", dismissReleaseNotes);

  const exLibPills = document.getElementById("ex-lib-muscle-pills");
  if (exLibPills) {
    exLibPills.addEventListener("scroll", updateExerciseLibraryPillNav, {
      passive: true,
    });
  }

  document
    .getElementById("ex-lib-muscle-nav-left")
    .addEventListener("click", () => scrollExerciseLibraryPills(-1));
  document
    .getElementById("ex-lib-muscle-nav-right")
    .addEventListener("click", () => scrollExerciseLibraryPills(1));
  window.addEventListener("resize", updateExerciseLibraryPillNav);

  // Bottom nav
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.view));
  });

  // Home
  document
    .getElementById("btn-start-workout")
    .addEventListener("click", startWorkout);
  document
    .getElementById("btn-go-plan")
    .addEventListener("click", () => navigate("plan"));
  document
    .getElementById("bw-home-strip")
    .addEventListener("click", () => navigate("bodyweight"));

  // Active workout
  document.getElementById("btn-workout-back").addEventListener("click", () => {
    syncWorkoutFields();
    persistActiveWorkoutDraft();
    navigate("home");
  });
  document.getElementById("btn-add-exercise").addEventListener("click", () => {
    state.exerciseContext = "workout";
    state.editingExIndex = null;
    state.exMuscleFilter = null;
    navigate("exercise");
  });
  document
    .getElementById("btn-finish-workout")
    .addEventListener("click", finishWorkout);
  document
    .getElementById("workout-name")
    .addEventListener("input", syncWorkoutFields);
  document
    .getElementById("workout-date")
    .addEventListener("change", syncWorkoutFields);
  document
    .getElementById("workout-notes")
    .addEventListener("input", syncWorkoutFields);

  // Day view
  document.getElementById("btn-day-back").addEventListener("click", () => {
    persistDay();
    navigate(state.dayReturnView || "calendar");
  });
  document
    .getElementById("btn-day-add-exercise")
    .addEventListener("click", () => {
      state.exerciseContext = "day";
      state.editingExIndex = null;
      state.exMuscleFilter = null;
      navigate("exercise");
    });
  document
    .getElementById("btn-day-finish-workout")
    .addEventListener("click", () => {
      const w = state.dayWorkout;
      if (!w) return;

      const doFinish = () => {
        w.status = "completed";
        const suggestions = getOverloadSuggestions(w);
        persistDay();
        state.dayWorkout = null;
        clearDayWorkoutDraft();
        navigate(state.dayReturnView || "calendar");
        if (suggestions.length > 0)
          setTimeout(() => showOverloadModal(suggestions), 300);
      };

      const allDone =
        w.exercises.length > 0 &&
        w.exercises.every((ex) => ex.sets.every((s) => s.done));
      if (allDone) {
        doFinish();
      } else {
        showModal({
          title: "Not all sets checked",
          msg: "Some sets haven't been marked done. Complete the workout anyway?",
          confirmText: "Complete Workout",
          confirmClass: "btn-danger-solid",
          cancelText: "Keep Going",
          onConfirm: doFinish,
        });
      }
    });
  document.getElementById("day-notes").addEventListener("input", () => {
    const w = state.dayWorkout;
    if (!w) return;
    w.notes = document.getElementById("day-notes").value.trim() || undefined;
    persistDay();
  });

  // Muscle picker (exercise flow)
  document
    .getElementById("btn-ex-muscle-back")
    .addEventListener("click", () => {
      const dest =
        state.exerciseContext === "planTemplate"
          ? "plan-editor"
          : state.exerciseContext;
      navigate(dest);
    });

  // Exercise form
  document.getElementById("btn-exercise-back").addEventListener("click", () => {
    const editing = state.editingExIndex !== null;
    const configVisible = !document.getElementById("ex-config-panel").hidden;
    const contextDest =
      state.exerciseContext === "planTemplate"
        ? "plan-editor"
        : state.exerciseContext;

    // Add mode on config panel → back to picker (no data loss)
    if (configVisible && !editing) {
      showExPickerPanel();
      return;
    }
    // Edit mode → confirm discard; picker panel → just go back
    if (editing) {
      showModal({
        title: "Discard changes?",
        msg: "Go back without saving your changes?",
        confirmText: "Discard",
        confirmClass: "btn-danger-solid",
        cancelText: "Keep Editing",
        onConfirm: () => {
          state.editingExIndex = null;
          navigate(contextDest);
        },
      });
    } else {
      state.editingExIndex = null;
      navigate(contextDest);
    }
  });
  document.getElementById("btn-add-set").addEventListener("click", addFormSet);
  document
    .getElementById("btn-save-exercise")
    .addEventListener("click", saveExercise);

  // Calendar month navigation
  document
    .getElementById("cal-prev")
    .addEventListener("click", () => advanceMonth(-1));
  document
    .getElementById("cal-next")
    .addEventListener("click", () => advanceMonth(1));

  // Plan
  document
    .getElementById("btn-plan-back")
    .addEventListener("click", () => navigate("home"));
  document
    .getElementById("btn-new-plan")
    .addEventListener("click", () => openPlanEditorNew());

  // Plan editor
  document
    .getElementById("btn-plan-editor-back")
    .addEventListener("click", () => navigate("plan"));

  // Plan day muscle count + picker
  document
    .getElementById("btn-plan-day-muscles-back")
    .addEventListener("click", () => navigate("plan-editor"));
  document
    .getElementById("btn-plan-day-muscles-done")
    .addEventListener("click", savePlanDay);
  document
    .getElementById("btn-plan-muscle-picker-back")
    .addEventListener("click", () => navigate("plan-day-muscles"));

  // Plan — day toggles + save
  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dow = Number(btn.dataset.dow);
      if (state.planDays.has(dow)) {
        state.planDays.delete(dow);
        btn.classList.remove("active");
      } else {
        state.planDays.add(dow);
        btn.classList.add("active");
        if (state.openPlanDays !== null) state.openPlanDays.add(dow);
      }
      if (state.editingPlan) {
        state.editingPlan.workoutDays = [...state.planDays].sort();
        if (!state.editingPlan.dayTemplates)
          state.editingPlan.dayTemplates = {};
        renderPlanEditor();
      }
    });
  });
  document.getElementById("btn-save-plan").addEventListener("click", savePlan);
  document.getElementById("plan-rir-toggle").addEventListener("change", (e) => {
    document.getElementById("plan-rir-options").style.display = e.target.checked
      ? ""
      : "none";
    updateRirAutoInfo();
    updatePlanDatePreview();
  });
  document
    .getElementById("plan-start")
    .addEventListener("change", updatePlanDatePreview);
  document
    .getElementById("plan-weeks")
    .addEventListener("input", updatePlanDatePreview);

  // Body weight view
  document
    .getElementById("btn-bw-back")
    .addEventListener("click", () => navigate("home"));
  document.getElementById("btn-unit-toggle").addEventListener("click", () => {
    window.toggleWeightUnit(null);
    renderBodyWeight();
  });
  document.getElementById("btn-bw-save").addEventListener("click", () => {
    const rawVal = parseFloat(document.getElementById("bw-input").value);
    const date = document.getElementById("bw-date").value || todayISO();
    const maxDisplay = weightUnit() === "kg" ? 454 : 999;
    if (!rawVal || rawVal <= 0 || rawVal > maxDisplay) {
      showAlert(
        "Invalid weight",
        `Enter a weight between 1 and ${maxDisplay} ${weightUnit()}.`,
      );
      return;
    }
    logBodyWeight(date, fromDisplayWeight(rawVal));
    renderBodyWeight();
    renderBwHomeWidget();
  });

  // Exercise history view
  document
    .getElementById("btn-ex-history-back")
    .addEventListener("click", () => {
      navigate(state.exHistoryBackTo || "history");
    });

  // Volume tracker view
  document.getElementById("btn-volume-back").addEventListener("click", () => {
    navigate("home");
  });

  // ── Auth ───────────────────────────────────────────────
  // Set initial button mode
  document.getElementById("btn-auth-submit").dataset.mode = "signin";

  document
    .getElementById("btn-auth-submit")
    .addEventListener("click", async () => {
      const email = document.getElementById("auth-email").value.trim();
      const pass = document.getElementById("auth-password").value;
      const errEl = document.getElementById("auth-error");
      const mode = document.getElementById("btn-auth-submit").dataset.mode;
      errEl.hidden = true;
      try {
        if (mode === "signup") {
          await window._signUp(window._auth, email, pass);
        } else {
          await window._signIn(window._auth, email, pass);
        }
        // onAuthStateChanged handles the rest
      } catch (e) {
        errEl.textContent = e.message
          .replace("Firebase: ", "")
          .replace(/ \(auth\/.*\)/, "");
        errEl.hidden = false;
      }
    });

  document
    .getElementById("btn-forgot-password")
    .addEventListener("click", async () => {
      const email = document.getElementById("auth-email").value.trim();
      const errEl = document.getElementById("auth-error");
      if (!email) {
        errEl.textContent = "Enter your email address above first.";
        errEl.hidden = false;
        return;
      }
      try {
        await window._resetPassword(window._auth, email);
        errEl.style.cssText =
          "background:rgba(52,211,153,0.1);border-color:rgba(52,211,153,0.25);color:var(--green)";
        errEl.textContent = `Reset email sent to ${email}. Check your inbox.`;
        errEl.hidden = false;
      } catch (e) {
        errEl.style.cssText = "";
        errEl.textContent = e.message
          .replace("Firebase: ", "")
          .replace(/ \(auth\/.*\)/, "");
        errEl.hidden = false;
      }
    });

  // Allow Enter key to submit auth form
  ["auth-email", "auth-password"].forEach((id) => {
    document.getElementById(id).addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("btn-auth-submit").click();
    });
  });

  // ── Auth state observer ────────────────────────────────
  window._onAuthStateChanged(window._auth, async (user) => {
    if (user) {
      try {
        const reloadedForUpdate = await ensureLatestAppBuild();
        if (reloadedForUpdate) return;

        showStartupBrandOverlay();
        await nextPaint();
        await new Promise((r) => setTimeout(r, 180));
        showHydrationOverlay();
        await nextPaint();
        hideStartupBrandOverlay();
        setHydrationProgress(10, "Checking for migrations\u2026");
        await nextPaint();

        await migrateLocalStorageIfNeeded();
        setHydrationProgress(25, "Fetching your workouts\u2026");
        await nextPaint();
        document.querySelector(".hydration-ring-wrap")?.classList.add("spinning");

        await hydrateFromFirestore();
        document.querySelector(".hydration-ring-wrap")?.classList.remove("spinning");
        setHydrationProgress(80, "Applying preferences\u2026");
        await nextPaint();

        // Sync theme from cloud on login
        const savedTheme = localStorage.getItem("wt_theme");
        if (savedTheme === "light") document.body.classList.add("light");
        else document.body.classList.remove("light");
        applyAccentPalette(getAccentPalette());
        restoreWorkoutDrafts();
        refreshContextHints();

        setHydrationProgress(100, "Ready!");
        await new Promise((r) => setTimeout(r, 220));
      } catch (e) {
        console.warn("Hydration error:", e);
      } finally {
        hideHydrationOverlay();
        hideStartupBrandOverlay();
      }
      navigate("home");
      finishInitialBoot();
      setTimeout(showReleaseNotesIfNeeded, 180);
    } else {
      hideHydrationOverlay();
      hideStartupBrandOverlay();
      clearLocalUserState();
      navigate("auth");
      finishInitialBoot();
    }
  });

  // ── Settings ───────────────────────────────────────────
  document
    .getElementById("btn-display-name-change")
    .addEventListener("click", () => {
      const editRow = document.getElementById("display-name-edit");
      document.getElementById("settings-name").value =
        localStorage.getItem("wt_display_name") || "";
      document.getElementById("display-name-show").style.display = "none";
      editRow.style.display = "flex";
    });

  document
    .getElementById("btn-display-name-cancel")
    .addEventListener("click", () => {
      renderSettings();
    });

  document
    .getElementById("btn-settings-save-name")
    .addEventListener("click", async () => {
      const name = document.getElementById("settings-name").value.trim();
      if (!name) return;
      try {
        const { doc, setDoc } =
          await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const u = window._auth.currentUser.uid;
        await setDoc(
          doc(window._db, `users/${u}`),
          { displayName: name },
          { merge: true },
        );
        localStorage.setItem("wt_display_name", name);
        renderSettings();
      } catch (e) {
        showAlert("Error", e.message);
      }
    });

  document.querySelectorAll("#settings-unit-chips .ex-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      saveUnitPref(btn.dataset.unit);
      renderSettings();
    });
  });

  document
    .getElementById("settings-theme-dark")
    .addEventListener("click", () => {
      document.body.classList.remove("light");
      localStorage.setItem("wt_theme", "dark");
      syncProfilePrefs({ theme: "dark" });
      renderSettings();
    });

  document
    .getElementById("settings-theme-light")
    .addEventListener("click", () => {
      document.body.classList.add("light");
      localStorage.setItem("wt_theme", "light");
      syncProfilePrefs({ theme: "light" });
      renderSettings();
    });

  document
    .getElementById("settings-theme-palette-select")
    .addEventListener("change", (e) => {
      applyAccentPalette(e.target.value);
      syncProfilePrefs({ themePalette: getAccentPalette() });
      renderSettings();
    });

  document.getElementById("btn-logout").addEventListener("click", () => {
    showModal({
      title: "Sign Out?",
      msg: "You will need to sign back in to access your data.",
      confirmText: "Sign Out",
      confirmClass: "btn-danger-solid",
      cancelText: "Cancel",
      onConfirm: () => window._signOut(window._auth),
    });
  });

  document
    .getElementById("btn-delete-account")
    .addEventListener("click", () => {
      showModal({
        title: "Delete Account?",
        msg: "This permanently removes your login and saved data from Tensile. This action cannot be undone.",
        confirmText: "Delete Account",
        confirmClass: "btn-danger-solid",
        cancelText: "Cancel",
        onConfirm: () => {
          handleDeleteAccount();
        },
      });
    });

  // Don't navigate to home here — onAuthStateChanged handles initial navigation.
});
