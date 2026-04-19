#!/usr/bin/env node
// scripts/gen-release-notes.js
//
// Reads the latest annotated git tag and writes js/release-notes.js.
//
// Usage:
//   node scripts/gen-release-notes.js
//
// Tag format:  v2026.04.18   (or v2026.04.18.2 for same-day bumps)
// Tag message: First line  → title  (default: "What's New in Tensile")
//              Blank line
//              Body lines  → bullet items grouped under "Highlights"
//
// Example:
//   git tag -a v2026.04.18 -m "Theme overhaul
//
//   Added 5 new color palettes with tinted backgrounds
//   Ember, Neon, Stealth, Forest, and Violet themes
//   Each theme tints surfaces in both dark and light mode"

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

// Get latest tag
let tag;
try {
  tag = run("git describe --tags --abbrev=0");
} catch {
  console.error("No git tags found. Create one first:");
  console.error('  git tag -a v2026.04.18 -m "Release title\\n\\nBullet 1\\nBullet 2"');
  process.exit(1);
}

// Parse version from tag name (strip leading 'v')
const version = tag.replace(/^v/, "");

// Get tag annotation message
let message;
try {
  message = run(`git tag -l --format=%(contents) ${tag}`);
} catch {
  message = "";
}

const lines = message.split("\n").map((l) => l.trim());
const title = lines[0] || "What\u2019s New in Tensile";

// Collect body lines (skip first line and any blank separator)
const bodyStart = lines[1] === "" ? 2 : 1;
const items = lines
  .slice(bodyStart)
  .filter((l) => l.length > 0)
  .map((l) => l.replace(/^[-*]\s*/, "")); // strip leading bullet chars

const summary =
  items.length > 0
    ? items[0]
    : `Release ${version}`;

const sections =
  items.length > 0
    ? [{ title: "Highlights", items }]
    : [];

const output = `export const APP_RELEASE = ${JSON.stringify(
  { version, title, summary, sections },
  null,
  2,
)};\n`;

const outPath = path.join(__dirname, "..", "js", "release-notes.js");
fs.writeFileSync(outPath, output, "utf8");
console.log(`Wrote ${outPath}`);
console.log(`  version: ${version}`);
console.log(`  title:   ${title}`);
console.log(`  items:   ${items.length}`);
