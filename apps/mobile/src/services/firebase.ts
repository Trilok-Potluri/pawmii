/**
 * Firebase initialization — reads config from Expo Constants (fed by app.config.js).
 * No .env files. All values come from .config/config.json at build time.
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously as _signInAnonymously,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import Constants from "expo-constants";
import { Platform } from "react-native";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

export function initializeFirebase(): void {
  if (getApps().length > 0) return; // Already initialized

  const cfg = Constants.expoConfig?.extra?.firebase;

  if (!cfg) {
    console.error(
      "[Firebase] No config found. Did you fill in .config/config.json and run `npm run setup`?"
    );
    return;
  }

  const firebaseConfig = {
    apiKey: Platform.OS === "ios" ? cfg.apiKeyIos : cfg.apiKeyAndroid,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: Platform.OS === "ios" ? cfg.appIdIos : cfg.appIdAndroid,
    measurementId: cfg.measurementId,
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app, "us-central1");
}

export function getFirebaseAuth(): Auth {
  if (!auth) initializeFirebase();
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) initializeFirebase();
  return db;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) initializeFirebase();
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
