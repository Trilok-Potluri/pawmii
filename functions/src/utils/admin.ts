import * as admin from "firebase-admin";

/**
 * Lazy getters for Firebase Admin services.
 * Using functions instead of module-level constants ensures
 * admin.initializeApp() has run before any service is accessed,
 * regardless of bundle evaluation order.
 */
export const getDb = (): admin.firestore.Firestore => admin.firestore();
export const getMessaging = (): admin.messaging.Messaging => admin.messaging();
