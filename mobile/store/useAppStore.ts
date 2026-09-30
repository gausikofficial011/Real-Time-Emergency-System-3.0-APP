import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, Emergency, Ambulance, Hospital, AmbulanceStatus } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  currentEmergency: Emergency | null;
  dispatchedAmbulance: Ambulance | null;
  assignedHospital: Hospital | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentEmergency: (emergency: Emergency | null) => void;
  setDispatchedAmbulance: (ambulance: Ambulance | null) => void;
  setAssignedHospital: (hospital: Hospital | null) => void;
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  currentEmergency: null,
  dispatchedAmbulance: null,
  assignedHospital: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setCurrentEmergency: (currentEmergency) => set({ currentEmergency }),
  setDispatchedAmbulance: (dispatchedAmbulance) => set({ dispatchedAmbulance }),
  setAssignedHospital: (assignedHospital) => set({ assignedHospital }),

  initializeAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) });
      }
    } catch (e) {
      console.error('Failed to initialize auth', e);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      set({ user: null, token: null, currentEmergency: null, dispatchedAmbulance: null, assignedHospital: null });
    } catch (e) {
      console.error('Failed to log out', e);
    }
  },
}));
