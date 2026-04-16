export const APP_RELEASE = {
  version: "2026.04.16.5",
  title: "What\u2019s New in Tensile",
  summary:
    "Startup is now fully gated so the app shell stays hidden until Tensile branding and hydration are ready.",
  sections: [
    {
      title: "Startup Flow",
      items: [
        "The app shell now stays hidden during initial boot, so Home cannot paint underneath the startup overlays on a fast signed-in reload.",
        "Signed-in launches now hand off from a dedicated Tensile logo screen to the hydration ring before revealing the main app.",
        "Signed-out launches still route cleanly to auth, but the boot lock is only released after the correct first screen is ready.",
      ],
    },
  ],
};
