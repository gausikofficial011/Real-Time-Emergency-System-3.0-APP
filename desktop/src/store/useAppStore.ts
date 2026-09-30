import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Emergency, Ambulance, Hospital, AnalyticsSummary, Notification } from '../types';

// Simple UUID polyfill since we may not have the package
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;

  // Data
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  analyticsSummary: AnalyticsSummary | null;

  // UI
  selectedEmergencyId: string | null;
  notifications: Notification[];
  isLoading: boolean;
  sidebarCollapsed: boolean;

  // Actions - Auth
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;

  // Actions - Emergencies
  setEmergencies: (emergencies: Emergency[]) => void;
  addEmergency: (emergency: Emergency) => void;
  updateEmergency: (id: string, updates: Partial<Emergency>) => void;
  setSelectedEmergency: (id: string | null) => void;

  // Actions - Ambulances
  setAmbulances: (ambulances: Ambulance[]) => void;
  addAmbulance: (ambulance: Ambulance) => void;
  updateAmbulance: (id: string, updates: Partial<Ambulance>) => void;
  removeAmbulance: (id: string) => void;

  // Actions - Hospitals
  setHospitals: (hospitals: Hospital[]) => void;
  addHospital: (hospital: Hospital) => void;
  updateHospital: (id: string, updates: Partial<Hospital>) => void;
  removeHospital: (id: string) => void;

  // Actions - Analytics
  setAnalytics: (summary: AnalyticsSummary) => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      emergencies: [],
      ambulances: [],
      hospitals: [],
      analyticsSummary: null,
      selectedEmergencyId: null,
      notifications: [],
      isLoading: false,
      sidebarCollapsed: false,

      // Auth
      setUser: (user) => set({ user }),
      setToken: (token) => {
        localStorage.setItem('emergencyai_token', token);
        set({ token });
      },
      logout: () => {
        localStorage.removeItem('emergencyai_token');
        localStorage.removeItem('emergencyai_user');
        set({ user: null, token: null, emergencies: [], ambulances: [], hospitals: [], notifications: [] });
      },

      // Emergencies
      setEmergencies: (emergencies) => set({ emergencies }),
      addEmergency: (emergency) =>
        set((state) => ({ emergencies: [emergency, ...state.emergencies] })),
      updateEmergency: (id, updates) =>
        set((state) => ({
          emergencies: state.emergencies.map((e) => (e._id === id ? { ...e, ...updates } : e)),
        })),
      setSelectedEmergency: (id) => set({ selectedEmergencyId: id }),

      // Ambulances
      setAmbulances: (ambulances) => set({ ambulances }),
      addAmbulance: (ambulance) =>
        set((state) => ({ ambulances: [...state.ambulances, ambulance] })),
      updateAmbulance: (id, updates) =>
        set((state) => ({
          ambulances: state.ambulances.map((a) => (a._id === id ? { ...a, ...updates } : a)),
        })),
      removeAmbulance: (id) =>
        set((state) => ({ ambulances: state.ambulances.filter((a) => a._id !== id) })),

      // Hospitals
      setHospitals: (hospitals) => set({ hospitals }),
      addHospital: (hospital) =>
        set((state) => ({ hospitals: [...state.hospitals, hospital] })),
      updateHospital: (id, updates) =>
        set((state) => ({
          hospitals: state.hospitals.map((h) => (h._id === id ? { ...h, ...updates } : h)),
        })),
      removeHospital: (id) =>
        set((state) => ({ hospitals: state.hospitals.filter((h) => h._id !== id) })),

      // Analytics
      setAnalytics: (summary) => set({ analyticsSummary: summary }),

      // Notifications
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: generateId(),
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.notifications.slice(0, 49), // Keep max 50
          ],
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // UI
      setLoading: (loading) => set({ isLoading: loading }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'emergencyai-store',
      partialize: (state) => ({ user: state.user, token: state.token, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
