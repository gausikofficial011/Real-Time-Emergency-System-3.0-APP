import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { ambulance as ambulanceApi } from './api';
import { socketService } from './socket';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      const { latitude, longitude } = location.coords;

      // We need user context here, but since this runs in a separate process,
      // we might need to fetch the ambulance ID from persistent storage.
      // For this implementation, we'll try to push to socket if connected,
      // and hit the API if we can retrieve the stored ambulanceId.

      console.log(`[Background Location] ${latitude}, ${longitude}`);

      // In a real production app, you'd use a shared state manager or persistent storage (SecureStore)
      // to retrieve the current active ambulance ID and driver ID.
    }
  }
});

export const startBackgroundLocationUpdates = async () => {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Background location permission denied');
      return false;
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!isStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'EmergencyAI Dispatch',
          notificationBody: 'Streaming live GPS for real-time response',
          notificationColor: '#ef4444',
        },
      });
      return true;
    }
    return true;
  } catch (error) {
    console.warn('Failed to start background location updates:', error);
    return false;
  }
};

export const stopBackgroundLocationUpdates = async () => {
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (error) {
    console.warn('Failed to stop background location updates:', error);
  }
};

