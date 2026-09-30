import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { useAppStore } from '../store/useAppStore';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const initializeAuth = useAppStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: 'Inter_700Bold',
            fontSize: 16,
          },
          contentStyle: {
            backgroundColor: Colors.bg,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="patient/home" options={{ title: 'Emergency SOS', headerShown: false }} />
        <Stack.Screen name="patient/livemap" options={{ title: 'Live Map & Tracking' }} />
        <Stack.Screen name="patient/track" options={{ title: 'Live Tracker' }} />
        <Stack.Screen name="patient/firstaid" options={{ title: 'First Aid Assistant' }} />
        <Stack.Screen name="patient/profile" options={{ title: 'Health Profile' }} />
        <Stack.Screen name="patient/schemes" options={{ title: 'Schemes & Claims' }} />
        <Stack.Screen name="driver/home" options={{ title: 'Driver Console', headerShown: false }} />
        <Stack.Screen name="driver/scanner" options={{ title: 'QR Patient Scanner' }} />
        <Stack.Screen name="driver/navigation" options={{ title: 'Active Mission' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
