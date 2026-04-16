#!/usr/bin/env node
/**
 * Validates .config/config.json without copying files.
 * Used in CI to check secrets are properly injected.
 * Exit code 0 = OK, 1 = hard error, 2 = warnings only.
 */

const fs = require("fs");
const path = require("path");

const configPath = path.resolve(__dirname, "../.config/config.json");

if (!fs.existsSync(configPath)) {
  console.error("❌  .config/config.json not found");
  process.exit(1);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (e) {
  console.error("❌  .config/config.json is not valid JSON:", e.message);
  process.exit(1);
}

const REQUIRED = [
  ["expo",     "accountName"],
  ["expo",     "projectId"],
  ["expo",     "accessToken"],
  ["firebase", "projectId"],
  ["firebase", "apiKeyAndroid"],
  ["firebase", "appIdAndroid"],
  ["firebase", "messagingSenderId"],
  ["android",  "packageName"],
];

const OPTIONAL_IOS = [
  ["firebase", "apiKeyIos"],
  ["firebase", "appIdIos"],
  ["ios",      "appleTeamId"],
  ["ios",      "appStoreConnectAppId"],
];

let hasErrors = false;
let hasWarnings = false;

for (const [section, key] of REQUIRED) {
  const val = cfg[section]?.[key];
  if (!val || val.startsWith("YOUR_") || val === "PASTE_EAS_UUID_HERE") {
    console.error(`❌  Missing required: ${section}.${key}`);
    hasErrors = true;
  }
}

for (const [section, key] of OPTIONAL_IOS) {
  const val = cfg[section]?.[key];
  if (!val || val.startsWith("YOUR_")) {
    console.warn(`⚠️   iOS field not set (optional): ${section}.${key}`);
    hasWarnings = true;
  }
}

// Expo project ID format
if (cfg.expo?.projectId?.startsWith("@")) {
  console.warn(`⚠️   expo.projectId is a slug — EAS needs the UUID. Run: eas project:info`);
  hasWarnings = true;
}

if (hasErrors) {
  process.exit(1);
}

console.log(hasWarnings
  ? "✅  Required config valid (iOS fields optional — pending Apple enrollment)"
  : "✅  config.json fully valid");
process.exit(0);
