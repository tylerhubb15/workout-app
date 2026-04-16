export const APP_RELEASE = {
  version: "2026.04.16.2",
  title: "What\u2019s New in Tensile",
  summary:
    "Exercise editing is more reliable now, with safer save behavior, clearer delete feedback, and a steadier mobile action layout.",
  sections: [
    {
      title: "Exercise Flow",
      items: [
        "Save Exercise now ignores repeated taps while a save is already in progress, which prevents the same exercise from being added multiple times.",
        "Deleting an exercise now gives immediate visual confirmation so it is clear that the row was removed from the current workout or day.",
        "The exercise config screen now keeps the Save Exercise action farther above the bottom navigation bar on mobile layouts.",
      ],
    },
    {
      title: "Previously Added",
      items: [
        "Home now surfaces a smart next-action card that can resume saved drafts, recover missed workout days, or point you to your next scheduled session.",
        "Workout and calendar day edits now autosave so you can leave a session and resume it later without losing progress.",
        "Exercise history now highlights your best weight, last session, and a suggested next load based on whether you hit your target reps.",
        "Workout, calendar, plans, and exercises now include lightweight contextual hints so the app is easier to learn without relying on the splash screen.",
        "Missed planned days can now be opened, moved, rescheduled, or explicitly skipped so the calendar stays honest.",
      ],
    },
  ],
};
