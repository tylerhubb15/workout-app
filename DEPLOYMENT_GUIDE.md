# Workout App — Deployment Guide

A step-by-step guide to evolving this app from a local PWA into a multi-user, app-store-ready product.

---

## Overview

| Phase         | What it does                       | Cost                    |
| ------------- | ---------------------------------- | ----------------------- |
| 1. Firebase   | Real user accounts + cloud storage | Free to start           |
| 2. PWABuilder | Publish to Google Play Store       | $25 one-time            |
| 3. Capacitor  | Publish to Apple App Store         | $99/year + Mac required |

---

## Phase 1: Firebase Auth + Firestore

Replace `localStorage` with cloud storage so each user has their own synced data.

### Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `workout-tracker`)
3. Disable Google Analytics (not needed) → click **Create project**

### Step 2: Enable Authentication

1. In the Firebase console, go to **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable **Email/Password**
4. Optionally also enable **Google** sign-in for easier login

### Step 3: Create a Firestore Database

1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (you'll lock it down later)
4. Pick the region closest to you → click **Enable**

### Step 4: Register Your Web App

1. In the Firebase console, click the gear icon → **Project settings**
2. Scroll to **Your apps** → click the `</>` (Web) icon
3. Give it a nickname → click **Register app**
4. Copy the `firebaseConfig` object shown — you'll need this

### Step 5: Add Firebase to Your App

Add these two script tags to the bottom of `index.html` before your own scripts:

```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const firebaseConfig = {
    // paste your config object here
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
  };

  const app = initializeApp(firebaseConfig);
  window.db = getFirestore(app);
  window.auth = getAuth(app);
</script>
```

### Step 6: Add Login UI

Add a simple login form to `index.html` (shown before the main app content):

```html
<div id="auth-screen">
  <h2>Sign In</h2>
  <input id="auth-email" type="email" placeholder="Email" />
  <input id="auth-password" type="password" placeholder="Password" />
  <button id="btn-login">Log In</button>
  <button id="btn-signup">Sign Up</button>
</div>

<div id="main-app" style="display:none">
  <!-- your existing app content here -->
</div>
```

### Step 7: Wire Up Auth in JavaScript

Create a new file `js/auth.js`:

```js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = window.auth;

document.getElementById("btn-signup").addEventListener("click", () => {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  createUserWithEmailAndPassword(auth, email, password).catch(console.error);
});

document.getElementById("btn-login").addEventListener("click", () => {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  signInWithEmailAndPassword(auth, email, password).catch(console.error);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("main-app").style.display = "block";
    window.currentUserId = user.uid;
    // initialize your app here
  } else {
    document.getElementById("auth-screen").style.display = "block";
    document.getElementById("main-app").style.display = "none";
  }
});
```

### Step 8: Replace localStorage with Firestore

In `js/storage.js`, replace localStorage calls with Firestore reads/writes.

**Before (localStorage):**

```js
export function loadWorkouts() {
  return JSON.parse(localStorage.getItem("workouts") || "[]");
}

export function addWorkout(workout) {
  const workouts = loadWorkouts();
  workouts.push(workout);
  localStorage.setItem("workouts", JSON.stringify(workouts));
}
```

**After (Firestore):**

```js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadWorkouts() {
  const uid = window.currentUserId;
  const q = query(collection(window.db, "workouts"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function addWorkout(workout) {
  const uid = window.currentUserId;
  await addDoc(collection(window.db, "workouts"), { ...workout, uid });
}
```

> Repeat this pattern for plans, body weights, and any other stored data.

### Step 9: Lock Down Firestore Security Rules

In the Firebase console go to **Firestore → Rules** and replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{docId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.uid;
    }
  }
}
```

This ensures users can only read and write their own data.

### Step 10: Deploy to GitHub Pages & Firebase Hosting

After any changes, push to `main` **and** redeploy Firebase Hosting:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Then **always** redeploy to Firebase Hosting:

```bash
cd path/to/workout_app
firebase deploy --only hosting
```

> **Important:** GitHub Pages updates automatically on push, but Firebase Hosting does **not**. You must run `firebase deploy --only hosting` after every commit/push, or your Firebase-hosted version will be stale.

---

## Phase 2: Google Play Store via PWABuilder

PWABuilder wraps your existing PWA into a Play Store package — no native code required.

### Prerequisites

- Your app must be live at a public HTTPS URL (GitHub Pages works)
- A Google Play Developer account ($25 one-time fee at [play.google.com/console](https://play.google.com/console))

### Step 1: Verify Your PWA is Valid

Check these are in place:

- `manifest.json` exists with `name`, `short_name`, `icons`, `start_url`, `display: "standalone"`
- `service-worker.js` is registered in `index.html`
- Site is served over HTTPS

### Step 2: Run PWABuilder

1. Go to [https://www.pwabuilder.com](https://www.pwabuilder.com)
2. Enter your GitHub Pages URL
3. PWABuilder will score your PWA and flag any missing items
4. Fix any warnings it surfaces (usually icon sizes or manifest fields)
5. Click **Package for stores** → select **Android**
6. Download the generated `.aab` file (Android App Bundle)

### Step 3: Create Your App in Google Play Console

1. Log in to [play.google.com/console](https://play.google.com/console)
2. Click **Create app**
3. Fill in app name, default language, and whether it's free
4. Complete the required store listing sections:
   - Short description (80 chars max)
   - Full description
   - Screenshots (at least 2 phone screenshots)
   - Feature graphic (1024x500 image)
   - App icon (512x512 PNG)

### Step 4: Upload Your App Bundle

1. Go to **Production → Releases → Create new release**
2. Upload the `.aab` file from PWABuilder
3. Add release notes
4. Click **Review release** → **Start rollout to Production**

### Step 5: Digital Asset Links (Required for PWA)

PWABuilder will generate an `assetlinks.json` file. You must host it at:

```
https://yourdomain.com/.well-known/assetlinks.json
```

For GitHub Pages, create the file at `.well-known/assetlinks.json` in your repo.
PWABuilder's output zip includes this file and instructions.

> Google review typically takes 1–3 days for new apps.

---

## Phase 3: Apple App Store via Capacitor

Capacitor wraps your web app in a native iOS shell. This requires a Mac and Xcode.

### Prerequisites

- A Mac with Xcode installed (free from the Mac App Store)
- Apple Developer account ($99/year at [developer.apple.com](https://developer.apple.com))
- Node.js installed on your Mac

### Step 1: Install Capacitor

In your project folder on your Mac:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

### Step 2: Initialize Capacitor

```bash
npx cap init "Workout Tracker" "com.yourname.workouttracker" --web-dir "."
```

This creates a `capacitor.config.json` pointing at your `index.html`.

### Step 3: Add the iOS Platform

```bash
npx cap add ios
```

This creates an `ios/` folder with a full Xcode project inside.

### Step 4: Sync Your Web Files

Every time you make changes to your web app, run:

```bash
npx cap sync ios
```

### Step 5: Open in Xcode

```bash
npx cap open ios
```

This opens the project in Xcode.

### Step 6: Configure Signing in Xcode

1. Select the project in the file tree → **Signing & Capabilities**
2. Set your **Team** to your Apple Developer account
3. Xcode will auto-generate a provisioning profile

### Step 7: Test on a Device or Simulator

1. In Xcode, select a simulator or your connected iPhone
2. Press the **Play** button to build and run
3. Test all features thoroughly before submitting

### Step 8: Archive and Submit

1. In Xcode menu: **Product → Archive**
2. Once archived, click **Distribute App → App Store Connect**
3. Follow the prompts to upload

### Step 9: Complete App Store Connect Listing

1. Log in to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Your uploaded build will appear under your app
3. Fill in:
   - App description
   - Keywords
   - Screenshots for iPhone (required) and iPad (optional)
   - Privacy policy URL (required — Firebase means you collect user data)
   - Age rating questionnaire
4. Submit for review

> Apple review typically takes 1–2 days.

---

## Summary Checklist

### Phase 1 — Firebase

- [ ] Create Firebase project
- [ ] Enable Email/Password auth
- [ ] Create Firestore database
- [ ] Add Firebase config to `index.html`
- [ ] Add login/signup UI
- [ ] Rewrite `js/storage.js` to use Firestore
- [ ] Set Firestore security rules
- [ ] Push to GitHub Pages

### Phase 2 — Google Play

- [ ] Register Google Play Developer account ($25)
- [ ] Validate PWA at pwabuilder.com
- [ ] Download `.aab` from PWABuilder
- [ ] Create app in Play Console
- [ ] Upload store listing assets
- [ ] Host `assetlinks.json` on your domain
- [ ] Submit for review

### Phase 3 — Apple App Store

- [ ] Register Apple Developer account ($99/yr)
- [ ] Install Node, Capacitor on Mac
- [ ] Run `npx cap add ios`
- [ ] Configure signing in Xcode
- [ ] Test on simulator/device
- [ ] Archive and upload via Xcode
- [ ] Complete App Store Connect listing
- [ ] Submit for review
