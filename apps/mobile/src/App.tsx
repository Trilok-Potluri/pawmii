import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./navigation/AppNavigator";
import { initializeFirebase } from "./services/firebase";
import { setupNotifications } from "./services/notifications";

// Initialize Firebase on app load
initializeFirebase();

export default function App() {
  useEffect(() => {
    // Request notification permissions and register token
    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
