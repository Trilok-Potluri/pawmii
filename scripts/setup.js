#!/usr/bin/env node
/**
 * Pawmii Setup Script
 *
 * Run this from the monorepo root: `npm run setup`
 *
 * Does three things:
 * 1. Validates .config/config.json (required fields only — iOS fields are warnings)
 * 2. Copies google-services.json → apps/mobile/google-services.json
 * 3. Copies GoogleService-Info.plist → apps/mobile/GoogleService-Info.plist (if present)
 *
 * No .env files needed. All config flows through .config/ and app.config.js.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_DIR = path.join(ROOT, ".config");
const MOBILE_DIR = path.join(ROOT, "apps", "mobile");

// Required for Android builds right now
const REQUIRED_FIELDS = [
  { section: "expo",     key: "accountName",      label: "Expo account name" },
  { section: "expo",     key: "projectId",         label: "EAS project UUID" },
  { section: "expo",     key: "accessToken",       label: "Expo access token" },
  { section: "firebase", key: "projectId",          label: "Firebase project ID" },
  { section: "firebase", key: "apiKeyAndroid",      label: "Firebase Android API key" },
  { section: "firebase", key: "appIdAndroid",       label: "Firebase Android app ID" },
  { section: "firebase", key: "messagingSenderId",  label: "Firebase messaging sender ID" },
  { section: "android",  key: "packageName",        label: "Android package name" },
];

// Optional / iOS-only — warn but don't block
const OPTIONAL_FIELDS = [
  { section: "firebase", key: "apiKeyIos",             label: "Firebase iOS API key (iOS build)" },
  { section: "firebase", key: "appIdIos",              label: "Firebase iOS app ID (iOS build)" },
  { section: "ios",      key: "appleTeamId",           label: "Apple Team ID (iOS build — needs Apple Developer enrollment)" },
  { section: "ios",      key: "appStoreConnectAppId",  label: "App Store Connect App ID (iOS submission only)" },
  { section: "github",   key: "easBuildWebhookSecret", label: "EAS webhook secret (CI only — optional)" },
];

let hasErrors = false;
let hasWarnings = false;

console.log("\n🐾 Pawmii Setup\n");

// ─── 1. Load config.json ──────────────────────────────────────────────────────

const configPath = path.join(CONFIG_DIR, "config.json");

if (!fs.existsSync(configPath)) {
  console.error("❌  .config/config.json not found.");
  console.error("   Copy .config/config.template.json → .config/config.json and fill in your values.\n");
  process.exit(1);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (e) {
  console.error("❌  .config/config.json is not valid JSON:", e.message);
  process.exit(1);
}

// ─── 2. Validate required fields ─────────────────────────────────────────────

for (const { section, key, label } of REQUIRED_FIELDS) {
  const val = cfg[section]?.[key];
  if (!val || val.startsWith("YOUR_") || val === "PASTE_EAS_UUID_HERE") {
    console.error(`❌  Missing required: ${label} (${section}.${key})`);
    hasErrors = true;
  } else {
    console.log(`✅  ${label}`);
  }
}

// ─── 3. Warn on optional fields ───────────────────────────────────────────────

for (const { section, key, label } of OPTIONAL_FIELDS) {
  const val = cfg[section]?.[key];
  if (!val || val.startsWith("YOUR_")) {
    console.warn(`⚠️   Not set (optional): ${label}`);
    hasWarnings = true;
  }
}

// ─── 4. Expo projectId format check ──────────────────────────────────────────

const projectId = cfg.expo?.projectId;
if (projectId && projectId.startsWith("@")) {
  console.warn(
    `⚠️   expo.projectId looks like a slug ("${projectId}").\n` +
    `     EAS needs the UUID. Run: eas project:info  — then paste the UUID.\n`
  );
  hasWarnings = true;
}

// ─── 5. Copy credential files ─────────────────────────────────────────────────

console.log();

const FILES_TO_COPY = [
  {
    src: path.join(CONFIG_DIR, "google-services.json"),
    dest: path.join(MOBILE_DIR, "google-services.json"),
    required: true,
    label: "google-services.json (Firebase Android)",
  },
  {
    src: path.join(CONFIG_DIR, "GoogleService-Info.plist"),
    dest: path.join(MOBILE_DIR, "GoogleService-Info.plist"),
    required: false,
    label: "GoogleService-Info.plist (Firebase iOS — needed for iOS builds)",
  },
];

for (const file of FILES_TO_COPY) {
  if (!fs.existsSync(file.src)) {
    if (file.required) {
      console.error(`❌  ${file.label} not found in .config/`);
      console.error(`    Download from Firebase Console → Project Settings → Android app\n`);
      hasErrors = true;
    } else {
      console.warn(`⚠️   ${file.label} not found — Android builds will still work`);
      hasWarnings = true;
    }
    continue;
  }
  fs.copyFileSync(file.src, file.dest);
  console.log(`✅  Copied ${path.basename(file.src)} → apps/mobile/${path.basename(file.src)}`);
}

// ─── 6. Summary ──────────────────────────────────────────────────────────────

console.log();

if (hasErrors) {
  console.error("⛔  Setup incomplete. Fix errors above and run `npm run setup` again.\n");
  process.exit(1);
} else if (hasWarnings) {
  console.log(
    "✅  Setup complete — Android builds ready.\n" +
    "⚠️   iOS-specific fields not yet set (expected — pending Apple enrollment).\n\n" +
    "   Next steps:\n" +
    "   1. npm install         — install all workspace dependencies\n" +
    "   2. Drop dog sprites    — apps/mobile/assets/sprites/ (see README there)\n" +
    "   3. npm run mobile      — start Expo dev server\n" +
    "   4. npm run build:android — trigger Android EAS build\n"
  );
} else {
  console.log(
    "🎉  Full setup complete — iOS + Android builds ready.\n\n" +
    "   Next steps:\n" +
    "   1. npm install\n" +
    "   2. Drop sprites in apps/mobile/assets/sprites/\n" +
    "   3. npm run mobile\n"
  );
}
