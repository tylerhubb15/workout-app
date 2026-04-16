export const APP_RELEASE = {
  version: "2026.04.15.3",
  title: "What’s New in Tensile",
  summary:
    "The app now refreshes users onto the latest build after deployment and surfaces a cleaner, more detailed update summary after sign-in.",
  sections: [
    {
      title: "Improvements",
      items: [
        "Users are now moved onto the newest app build automatically after an update is detected.",
        "Release notes are now grouped into clearer sections so updates are easier to scan.",
        "Plan activation continues to show visible progress while schedules and views refresh.",
      ],
    },
    {
      title: "Bug Fixes",
      items: [
        "The post-login update flow now reloads into the latest cached app shell before the user starts using the app.",
        "Release notes are tracked once per version, so users do not keep seeing the same update message.",
      ],
    },
  ],
};
