import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { AppNavigator } from "./navigation/AppNavigator";
import { initializeFirebase, getFirebaseAuth, getFirestoreDb } from "./services/firebase";
import { setupNotifications, storePushTokenForUser } from "./services/notifications";
import { useUserStore } from "./store/userStore";
import { COLORS } from "./utils/theme";

// Initialize Firebase synchronously before any component renders
initializeFirebase();

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const setUser = useUserStore((s) => s.setUser);
  const setOnboardingCompleted = useUserStore((s) => s.setOnboardingCompleted);
  const uid = useUserStore((s) => s.uid);

  // Auth state listener — persists anonymous sessions across app restarts
  useEffect(() => {
    let auth;
    try {
      auth = getFirebaseAuth();
    } catch {
      // Firebase not configured — allow app to proceed without auth
      setIsAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const db = getFirestoreDb();
          const userSnap = await getDoc(doc(db, "users", user.uid));
          const onboardingDone = userSnap.exists()
            ? (userSnap.data().onboardingCompleted ?? false)
            : false;
          setUser(user.uid, user.isAnonymous);
          if (onboardingDone) {
            setOnboardingCompleted(true);
          }
        } catch {
          // Firestore unavailable — just set uid and let onboarding flow handle it
          setUser(user.uid, user.isAnonymous);
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Request push permissions once. Token storage is deferred until uid is available.
  useEffect(() => {
    setupNotifications();
  }, []);

  // Store FCM token as soon as uid becomes available (handles first-launch timing)
  useEffect(() => {
    if (uid) {
      storePushTokenForUser(uid);
    }
  }, [uid]);

  if (!isAuthReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={COLORS.accentBright} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
