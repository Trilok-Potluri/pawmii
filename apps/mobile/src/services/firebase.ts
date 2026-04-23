/**
 * Firebase initialization — reads config from Expo Constants (fed by app.config.js).
 * No .env files. All values come from .config/config.json at build time.
 *
 * IMPORTANT: On React Native we MUST use `initializeAuth` with
 * `getReactNativePersistence(AsyncStorage)` — `getAuth` defaults to in-memory
 * persistence which silently drops the anonymous session every app restart
 * (each cold launch would mint a new uid and orphan the user's pet and coins).
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  // @ts-expect-error getReactNativePersistence is exported at runtime but
  // missing from public types in firebase@10.x. Safe to import.
  getReactNativePersistence,
  signInAnonymously as _signInAnonymously,
  Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import Constants from "expo-constants";
import { Platform } from "react-native";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

function readConfig() {
  const cfg = Constants.expoConfig?.extra?.firebase;
  if (!cfg) {
    throw new Error(
      "[Firebase] No config found. Did you fill in .config/config.json and run `npm run setup`?"
    );
  }
  return {
    apiKey: Platform.OS === "ios" ? cfg.apiKeyIos : cfg.apiKeyAndroid,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: Platform.OS === "ios" ? cfg.appIdIos : cfg.appIdAndroid,
    measurementId: cfg.measurementId,
  };
}

export function initializeFirebase(): void {
  if (app && auth && db && functions) return;

  let firebaseConfig;
  try {
    firebaseConfig = readConfig();
  } catch (err) {
    console.error(err);
    return;
  }

  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

  // Anonymous sessions must persist across cold starts. On React Native that
  // requires AsyncStorage-backed persistence; otherwise every launch mints a
  // new uid and silently strands the user's pet + coins.
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized (e.g. React Fast Refresh) — reuse existing instance
    auth = getAuth(app);
  }

  db = getFirestore(app);
  functions = getFunctions(app, "us-central1");
}

export function getFirebaseAuth(): Auth {
  if (!auth) initializeFirebase();
  if (!auth) {
    throw new Error("[Firebase] Auth is not configured.");
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) initializeFirebase();
  if (!db) {
    throw new Error("[Firebase] Firestore is not configured.");
  }
  return db;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) initializeFirebase();
  if (!functions) {
    throw new Error("[Firebase] Functions is not configured.");
  }
  return functions;
}

/**
 * Signs in anonymously. Called on Welcome screen CTA tap.
 * Returns { uid }.
 */
export async function signInAnonymously(): Promise<{ uid: string }> {
  const a = getFirebaseAuth();
  const cred = await _signInAnonymously(a);
  return { uid: cred.user.uid };
}
