import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OnboardingWelcomeScreen } from '../screens/OnboardingWelcome';
import { OnboardingNameDogScreen } from '../screens/OnboardingNameDog';
import { OnboardingHealthScreen } from '../screens/OnboardingHealth';
import { HomeScreen } from '../screens/HomeScreen';
import { useUserStore } from '../store/userStore';
import { COLORS } from '../utils/theme';

export type RootStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingNameDog: undefined;
  OnboardingHealth: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const onboardingCompleted = useUserStore((s) => s.onboardingCompleted);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.bg },
        }}
        initialRouteName={onboardingCompleted ? 'Home' : 'OnboardingWelcome'}
      >
        {!onboardingCompleted ? (
          <>
            <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
            <Stack.Screen name="OnboardingNameDog" component={OnboardingNameDogScreen} />
            <Stack.Screen name="OnboardingHealth" component={OnboardingHealthScreen} />
          </>
        ) : null}
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
