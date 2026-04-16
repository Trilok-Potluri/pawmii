/**
 * Pawmii Dynamic Expo Config
 *
 * Reads ALL configuration from .config/config.json at build time.
 * NEVER use .env files — drop credentials in .config/ instead.
 * Run `npm run setup` from the monorepo root before building.
 */

const path = require("path");
const fs = require("fs");

// ─── Load config from .config/config.json ────────────────────────────────────

const configPath = path.resolve(__dirname, "../../.config/config.json");

let cfg = {};
if (fs.existsSync(configPath)) {
  cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
} else {
  console.warn(
    "\n⚠️  .config/config.json not found.\n" +
    "   Copy .config/config.template.json → .config/config.json and fill in values.\n" +
    "   Then run: npm run setup\n"
  );
}

// ─── Config accessor helpers ─────────────────────────────────────────────────

const expo = cfg.expo || {};
const firebase = cfg.firebase || {};
const ios = cfg.ios || {};
const android = cfg.android || {};

// ─── Expo Config ──────────────────────────────────────────────────────────────

module.exports = {
  expo: {
    name: "Pawmii",
    slug: "pawmii",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0A0918",
    },
    owner: expo.accountName,
    extra: {
      eas: {
        projectId: expo.projectId,
      },
      // Firebase config — accessible in app via Constants.expoConfig.extra.firebase
      firebase: {
        projectId: firebase.projectId,
        authDomain: firebase.authDomain,
        storageBucket: firebase.storageBucket,
        messagingSenderId: firebase.messagingSenderId,
        measurementId: firebase.measurementId,
        // Platform-specific keys resolved at runtime
        apiKeyIos: firebase.apiKeyIos,
        apiKeyAndroid: firebase.apiKeyAndroid,
        appIdIos: firebase.appIdIos,
        appIdAndroid: firebase.appIdAndroid,
      },
    },
    ios: {
      bundleIdentifier: ios.bundleIdentifier || "com.lucratech.pawmii",
      buildNumber: "1",
      supportsTablet: false,
      infoPlist: {
        NSHealthShareUsageDescription:
          "Pawmii reads your steps and active calories to earn coins for your pet.",
        NSHealthUpdateUsageDescription:
          "Pawmii needs health write access to track your fitness progress.",
        UIBackgroundModes: ["fetch"],
      },
    },
    android: {
      package: android.packageName || "com.lucratech.pawmii",
      versionCode: 1,
      googleServicesFile: "./google-services.json",
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#7B5CF6",
      },
    },
    plugins: [
      "expo-build-properties",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#7B5CF6",
          sounds: [],
        },
      ],
      [
        "react-native-health",
        {
          iCloudContainerEnvironment: "Development",
          NSHealthShareUsageDescription:
            "Pawmii reads your steps and active calories to earn coins for your pet.",
          NSHealthUpdateUsageDescription:
            "Pawmii needs health write access to track your fitness progress.",
        },
      ],
    ],
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ["**/*"],
  },
};
