export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType = 'medical' | 'accident' | 'fire' | 'natural_disaster' | 'crime';
export type AmbulanceStatus = 'available' | 'dispatched' | 'on_scene' | 'returning' | 'maintenance';
export type EmergencyStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';
export type EquipmentLevel = 'basic' | 'advanced' | 'critical_care';
export type UserRole = 'user' | 'patient' | 'driver' | 'admin' | 'hospital_staff' | 'superadmin';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  landmark?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface TimelineEvent {
  category: string;
  notes: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface HealthProfile {
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  primaryPhone?: string;
  chronicConditions?: string;
  residentialAddress?: string;
  emergencyContacts: EmergencyContact[];
  preferredHospital?: string;
  timeline?: TimelineEvent[];
}

export interface DriverProfile {
  vehicleNumber: string;
  licenseNumber: string;
  currentStatus: AmbulanceStatus;
  currentAmbulance?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  healthProfile?: HealthProfile;
  driverProfile?: DriverProfile;
  location?: Location;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIPrediction {
  severity: SeverityLevel;
  confidence: number;
  recommendation: string;
  predictedAt: string;
}

export interface Emergency {
  _id: string;
  emergencyId: string;
  reportedBy: User | string;
  incidentType: IncidentType;
  location: Location;
  severity: SeverityLevel;
  status: EmergencyStatus;
  victimCount: number;
  description?: string;
  aiPrediction?: AIPrediction;
  assignedAmbulance?: Ambulance | string;
  assignedHospital?: Hospital | string;
  isHighway: boolean;
  notes?: string;
  respondedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ambulance {
  _id: string;
  vehicleNumber: string;
  registrationNumber: string;
  driver?: User | string;
  hospital?: Hospital | string;
  equipmentLevel: EquipmentLevel;
  status: AmbulanceStatus;
  currentLocation?: Location & { lastUpdated?: string };
  currentEmergency?: Emergency | string;
  specifications?: {
    capacity: number;
    yearOfManufacture?: number;
    lastServiced?: string;
    fuelType?: string;
    make?: string;
    model?: string;
  };
  totalTrips: number;
  isActive: boolean;
  distanceKm?: number;
  estimatedEtaMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  _id: string;
  name: string;
  address: string;
  location: Location;
  phone?: string;
  email?: string;
  type: string;
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  treatmentTypes: string[];
  emergencyLevel: string;
  ambulances?: Ambulance[];
  ambulanceCount?: number;
  isActive: boolean;
  rating?: number;
  established?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalEmergencies: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  avgResponseTime: number;
  activeAmbulances: number;
  availableAmbulances: number;
  ambulanceByStatus: Record<string, number>;
  totalHospitals: number;
  totalBeds: number;
  availableBeds: number;
  totalIcu: number;
  availableIcu: number;
}

export interface MonthlyData {
  month: string;
  total: number;
  medical?: number;
  accident?: number;
  fire?: number;
  natural_disaster?: number;
  crime?: number;
}

export interface Notification {
  id: string;
  type: 'new_emergency' | 'assignment_confirmed' | 'status_update' | 'info';
  title: string;
  message: string;
  severity?: SeverityLevel;
  timestamp: string;
  read: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface ResponseTimeData {
  type: string;
  avgMinutes: number;
}

export interface SystemHealthStatus {
  service: string;
  status: 'connected' | 'disconnected' | 'degraded';
  latency: number | null;
  lastChecked: string;
  details: string;
}

export interface NearestAmbulance {
  _id: string;
  vehicleNumber: string;
  equipmentLevel: EquipmentLevel;
  status: string;
  distance: number;
  isActive: boolean;
  registrationNumber: string;
  specifications?: { capacity: number };
  estimatedArrival?: number;
}

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      platform: string;
      showNotification: (title: string, body: string) => void;
    };
  }
}
