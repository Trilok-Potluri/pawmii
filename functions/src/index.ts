/**
 * Pawmii Cloud Functions — Entry Point
 * Node 22 | Firebase Functions v2 | us-central1
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin once at module level
admin.initializeApp();

// Export all functions
export { calculateCoins } from "./coinCalculator";
export { petDecay }       from "./hungerDecay";
export { feedPet }        from "./feedPet";
export { playWithPet }    from "./playWithPet";
export { bathePet }       from "./bathePet";
export { dailyReset }     from "./dailyReset";
