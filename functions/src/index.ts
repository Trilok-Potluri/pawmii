/**
 * Pawmii Cloud Functions — Entry Point
 * Node 22 | Firebase Functions v2 | us-central1
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin once at module level
admin.initializeApp();

// Export all functions
export { calculateCoins } from "./coinCalculator";
export { hungerDecay } from "./hungerDecay";
export { feedPet } from "./feedPet";
export { dailyReset } from "./dailyReset";
