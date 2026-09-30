import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('emergencyai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('emergencyai_token');
      localStorage.removeItem('emergencyai_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  signup: (data: object) => api.post('/auth/signup', data),
  googleLogin: (email: string, name: string, avatar?: string) =>
    api.post('/auth/google', { email, name, avatar }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: object) => api.put('/auth/profile', data),
  updateProfileDriver: (data: object) => api.put('/auth/profile/driver', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { oldPassword, newPassword }),
  getUsers: (params?: object) => api.get('/auth/users', { params }),
  getUserById: (id: string) => api.get(`/auth/users/${id}`),
  toggleUserStatus: (userId: string, isActive: boolean) => api.patch('/auth/status', { userId, isActive }),
};

// ─── Emergency ────────────────────────────────────────────────────────────────
export const emergency = {
  getAll: (params?: object) => api.get('/emergency/all', { params }),
  getActive: () => api.get('/emergency/active'),
  getById: (id: string) => api.get(`/emergency/${id}`),
  create: (data: object) => api.post('/emergency', data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/emergency/${id}/status`, { status, notes }),
  delete: (id: string) => api.delete(`/emergency/${id}`),
  getStats: () => api.get('/emergency/stats'),
};

// ─── Ambulance ────────────────────────────────────────────────────────────────
export const ambulance = {
  getAll: (params?: object) => api.get('/ambulance/all', { params }),
  getNearest: (lat: number, lng: number, type?: string) =>
    api.get('/ambulance/nearest', { params: { lat, lng, type } }),
  getById: (id: string) => api.get(`/ambulance/${id}`),
  create: (data: object) => api.post('/ambulance', data),
  update: (id: string, data: object) => api.put(`/ambulance/${id}`, data),
  assign: (data: { emergencyId: string; ambulanceId: string; hospitalId?: string }) =>
    api.put('/ambulance/assign', data),
  updateLocation: (id: string, lat: number, lng: number) =>
    api.put(`/ambulance/${id}/location`, { lat, lng }),
  updateStatus: (id: string, status: string) =>
    api.put(`/ambulance/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/ambulance/${id}`),
};

// ─── Hospital ─────────────────────────────────────────────────────────────────
export const hospital = {
  getAll: (params?: object) => api.get('/hospital/all', { params }),
  getById: (id: string) => api.get(`/hospital/${id}`),
  create: (data: object) => api.post('/hospital', data),
  update: (id: string, data: object) => api.put(`/hospital/${id}`, data),
  delete: (id: string) => api.delete(`/hospital/${id}`),
  getAmbulances: (id: string) => api.get(`/hospital/${id}/ambulances`),
};

// ─── Insurance ────────────────────────────────────────────────────────────────
export const insurance = {
  getPolicies: () => api.get('/insurance/policies'),
  addPolicy: (data: object) => api.post('/insurance/policies', data),
  getClaims: () => api.get('/insurance/claims'),
  fileClaim: (data: object) => api.post('/insurance/claims', data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analytics = {
  getSummary: () => api.get('/analytics/summary'),
  getMonthly: () => api.get('/analytics/monthly'),
  getResponseTimes: () => api.get('/analytics/response-times'),
  getAmbulanceUtilization: () => api.get('/analytics/ambulance-utilization'),
  getUserStats: () => api.get('/analytics/user'),
  getTrends: () => api.get('/analytics/trends'),
};

export const healthCheck = {
  backend: () => axios.get('http://localhost:5000/health', { timeout: 3000 }),
  checkBackend: () => axios.get('http://localhost:5000/health', { timeout: 3000 }),
  aiService: () => axios.get('http://localhost:8000/health', { timeout: 3000 }),
  checkAI: () => axios.get('http://localhost:8000/health', { timeout: 3000 }),
};

export default api;
