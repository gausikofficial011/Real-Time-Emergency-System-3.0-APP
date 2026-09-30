import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && !ip.includes('ngrok') && !ip.includes('expo')) {
        return `http://${ip}:5000/api`;
      }
    }
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';
    }
  }
  return 'http://10.20.20.85:5000/api';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token from SecureStore', error);
  }
  return config;
});

export const auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  signup: (data: object) => api.post('/auth/signup', data),
  googleLogin: (email: string, name: string, avatar?: string) => api.post('/auth/google', { email, name, avatar }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: object) => api.put('/auth/profile', data),
};

export const emergency = {
  create: (data: {
    incidentType: string;
    location: { lat: number; lng: number; address: string; landmark?: string };
    victimCount: number;
    age: number;
    isHighway: boolean;
    description?: string;
  }) => api.post('/emergency', data),
  getById: (id: string) => api.get(`/emergency/${id}`),
  getAll: (params?: object) => api.get('/emergency/all', { params }),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/emergency/${id}/status`, { status, notes }),
};

export const ambulance = {
  getAll: (params?: object) => api.get('/ambulance/all', { params }),
  updateLocation: (id: string, lat: number, lng: number) =>
    api.put(`/ambulance/${id}/location`, { lat, lng }),
  updateStatus: (id: string, status: string) =>
    api.put(`/ambulance/${id}/status`, { status }),
};

export const hospital = {
  getAll: (params?: object) => api.get('/hospital/all', { params }),
  getById: (id: string) => api.get(`/hospital/${id}`),
};

