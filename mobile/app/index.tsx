import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';

export default function Index() {
  const router = useRouter();
  const { user, token } = useAppStore();

  useEffect(() => {
    // Small timeout to allow state to settle
    const timer = setTimeout(() => {
      if (token && user) {
        if (user.role === 'driver') {
          router.replace('/driver/home');
        } else {
          router.replace('/patient/home');
        }
      } else {
        router.replace('/login');
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [user, token]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
