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
const ios = cfg.ios || {};
const android = cfg.android || {};

// Firebase config — falls back to EAS env vars when .config/config.json is absent
const firebase = cfg.firebase || {};
const fb = {
  projectId:         firebase.projectId         || process.env.FIREBASE_PROJECT_ID,
  appIdAndroid:      firebase.appIdAndroid       || process.env.FIREBASE_APP_ID_ANDROID,
  appIdIos:          firebase.appIdIos           || process.env.FIREBASE_APP_ID_IOS,
  apiKeyAndroid:     firebase.apiKeyAndroid      || process.env.FIREBASE_API_KEY_ANDROID,
  apiKeyIos:         firebase.apiKeyIos          || process.env.FIREBASE_API_KEY_IOS,
  authDomain:        firebase.authDomain         || process.env.FIREBASE_AUTH_DOMAIN,
  storageBucket:     firebase.storageBucket      || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebase.messagingSenderId  || process.env.FIREBASE_MESSAGING_SENDER_ID,
  measurementId:     firebase.measurementId,
};

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
        projectId: expo.projectId || "b968ca0e-a0aa-48f9-acaa-fc6ba35ac01a",
      },
      // Firebase config — accessible in app via Constants.expoConfig.extra.firebase
      firebase: fb,
    },
    ios: {
      bundleIdentifier: ios.bundleIdentifier || "com.lucratech.pawmii",
      supportsTablet: false,
      infoPlist: {
        NSHealthShareUsageDescription:
          "Pawmii reads your steps and active calories to earn coins for your pet.",
        NSHealthUpdateUsageDescription:
          "Pawmii needs health write access to track your fitness progress.",
        UIBackgroundModes: ["fetch"],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: android.packageName || "com.pawmii.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
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
      ["expo-build-properties", {
        android: {
          kotlinVersion: "1.9.25",
          minSdkVersion: 26,
          compileSdkVersion: 35,
          targetSdkVersion: 34,
        },
      }],
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
      // Adds the androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE intent filter
      // required by Health Connect.
      "react-native-health-connect",
      // Patches MainActivity.onCreate to register the Health Connect permission
      // delegate — without this, requestPermission() crashes on Android.
      "./plugins/withHealthConnectDelegate",
    ],
    updates: {
      url: "https://u.expo.dev/b968ca0e-a0aa-48f9-acaa-fc6ba35ac01a",
    },
    runtimeVersion: "1.0.0",
    assetBundlePatterns: ["**/*"],
  },
};
