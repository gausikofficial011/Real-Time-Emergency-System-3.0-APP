import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  UserRound, 
  ShieldCheck, 
  FileSpreadsheet, 
  Newspaper, 
  Map, 
  LogOut, 
  Bell, 
  Shield, 
  Plus, 
  Trash2, 
  Mic, 
  MicOff,
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Clock,
  Heart,
  Phone,
  ArrowRight,
  MapPin,
  Search,
  Building,
  HeartHandshake,
  Users,
  TrendingUp,
  Truck,
  BedDouble,
  ChevronDown,
  ChevronUp,
  Edit2,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { auth as authApi, hospital as hospitalApi, emergency as emergencyApi, analytics as analyticsApi, ambulance as ambulanceApi } from '@/services/api';
import { socketService, SOCKET_EVENTS } from '@/services/socket';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Fix Leaflet default icon issues in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom map markers
const patientMarkerIcon = L.divIcon({
  className: '',
  html: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="12" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.4">
      <animate attributeName="r" from="10" to="22" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="16" cy="16" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
  </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const hospitalMarkerIcon = L.divIcon({
  className: '',
  html: `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="26" height="26" rx="6" fill="#1e1b4b" stroke="#10b981" stroke-width="2"/>
    <text x="15" y="21" text-anchor="middle" fill="#10b981" font-size="16" font-weight="bold">H</text>
  </svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const incidentMarkerIcon = L.divIcon({
  className: '',
  html: `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
    <path d="M15 9v8M15 20h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Map recentering component
function ChangeMapView({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 13);
  }, [coords, map]);
  return null;
}

export default function CitizenPortal() {
  const { user, token, logout, setUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  const [userStats, setUserStats] = useState<any>({
    total: 0,
    active: 0,
    resolved: 0,
    pending: 0
  });
  
  // Geolocation
  const [userCoords, setUserCoords] = useState<[number, number]>([12.9716, 77.6412]); // Default Bangalore
  
  // Incident Reporting Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [incidentType, setIncidentType] = useState<string>('medical');
  const [victimCount, setVictimCount] = useState<number>(1);
  const [description, setDescription] = useState<string>('');
  const [isHighway, setIsHighway] = useState<boolean>(false);
  const [landmark, setLandmark] = useState<string>('');
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Advanced Health Profile states
  const [fullName, setFullName] = useState<string>('');
  const [primaryPhone, setPrimaryPhone] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('Unknown');
  const [allergiesText, setAllergiesText] = useState<string>('');
  const [medicationsText, setMedicationsText] = useState<string>('');
  const [chronicConditions, setChronicConditions] = useState<string>('');
  const [preferredHospital, setPreferredHospital] = useState<string>('');
  const [residentialAddress, setResidentialAddress] = useState<string>('');
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Append new record states (right panel)
  const [recordCategory, setRecordCategory] = useState<string>('Medication Log');
  const [recordNotes, setRecordNotes] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [committingRecord, setCommittingRecord] = useState<boolean>(false);

  // Global Lists
  const [hospitalsList, setHospitalsList] = useState<any[]>([]);
  const [emergenciesList, setEmergenciesList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Voice input recognition state
  const [listeningField, setListeningField] = useState<string | null>(null);

  // Super Admin specific states
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingSuperadmin, setLoadingSuperadmin] = useState(false);

  const [ambulancesList, setAmbulancesList] = useState<any[]>([]);
  const [loadingAmbulances, setLoadingAmbulances] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [controlPanelFilter, setControlPanelFilter] = useState<string>('pending');
  const [analyticsRange, setAnalyticsRange] = useState<string>('30d');
  
  // Bulletin / Posts states
  const [postsList, setPostsList] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false);
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [postForm, setPostForm] = useState<any>({
    title: '',
    content: '',
    type: 'announcement',
    severity: 'info',
    targetAmount: 0,
    patientName: '',
    hospitalName: ''
  });

  // Insurance states
  const [policiesList, setPoliciesList] = useState<any[]>([]);
  const [claimsList, setClaimsList] = useState<any[]>([]);
  const [loadingInsurance, setLoadingInsurance] = useState<boolean>(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState<boolean>(false);
  const [showAddClaimModal, setShowAddClaimModal] = useState<boolean>(false);

  const [policyForm, setPolicyForm] = useState({
    policyName: '',
    policyNumber: '',
    type: 'health',
    provider: '',
    sumInsured: 500000,
    premium: 5000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
  });

  const [claimForm, setClaimForm] = useState({
    policyId: '',
    claimAmount: 5000,
    reason: '',
    emergencyId: ''
  });

  // Schemes states
  const [schemesList, setSchemesList] = useState<any[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState<boolean>(false);
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [schemeFilters, setSchemeFilters] = useState<any>({
    state: 'All',
    category: 'All',
    search: ''
  });
  const [schemeMeta, setSchemeMeta] = useState<any>({ states: [], categories: [] });
  
  // Live Map tracking selection
  const [selectedAmbulanceOnMap, setSelectedAmbulanceOnMap] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.6412]);

  const loadAmbulances = async () => {
    setLoadingAmbulances(true);
    try {
      const res = await ambulanceApi.getAll();
      setAmbulancesList(res.data.ambulances || []);
    } catch (err) {
      console.error('Failed to load ambulances list', err);
    } finally {
      setLoadingAmbulances(false);
    }
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const endpoint = user?.role === 'superadmin' ? '/posts/admin' : '/posts';
      const res = await api.get(endpoint);
      setPostsList(res.data.posts || []);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadInsuranceData = async () => {
    setLoadingInsurance(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/insurance/policies'),
        api.get('/insurance/claims')
      ]);
      setPoliciesList(pRes.data.policies || []);
      setClaimsList(cRes.data.claims || []);
    } catch (err) {
      console.error('Error fetching insurance data:', err);
    } finally {
      setLoadingInsurance(false);
    }
  };

  const handleLinkPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/insurance/policies', policyForm);
      if (res.data.success) {
        toast.success('Insurance policy linked successfully!');
        setShowAddPolicyModal(false);
        setPolicyForm({
          policyName: '',
          policyNumber: '',
          type: 'health',
          provider: '',
          sumInsured: 500000,
          premium: 5000,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
        });
        loadInsuranceData();
      }
    } catch (err) {
      toast.error('Failed to link insurance policy.');
    }
  };

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.policyId) {
      toast.error('Please select a policy.');
      return;
    }
    try {
      const res = await api.post('/insurance/claims', claimForm);
      if (res.data.success) {
        toast.success('Claim submitted successfully!');
        setShowAddClaimModal(false);
        setClaimForm({
          policyId: '',
          claimAmount: 5000,
          reason: '',
          emergencyId: ''
        });
        loadInsuranceData();
      }
    } catch (err) {
      toast.error('Failed to submit claim.');
    }
  };

  const loadSchemes = useCallback(async () => {
    setLoadingSchemes(true);
    try {
      const res = await api.get('/medical-schemes', {
        params: {
          state: schemeFilters.state,
          category: schemeFilters.category,
          search: schemeFilters.search
        }
      });
      setSchemesList(res.data.schemes || []);
      setSchemeMeta(res.data.filters || { states: [], categories: [] });
    } catch (err) {
      console.error('Failed to load schemes', err);
    } finally {
      setLoadingSchemes(false);
    }
  }, [schemeFilters]);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadSchemes();
    }
  }, [schemeFilters, loadSchemes, user]);

  useEffect(() => {
    setMapCenter(userCoords);
  }, [userCoords]);

  const loadSuperadminData = useCallback(async () => {
    setLoadingSuperadmin(true);
    try {
      const rangeParam = analyticsRange || '30d';
      const [sumRes, trendsRes, usersRes, emRes, ambRes, hospRes] = await Promise.allSettled([
        analyticsApi.getSummary(),
        api.get('/analytics/trends', { params: { range: rangeParam } }),
        authApi.getUsers({ limit: 100, includeInactive: 'true' }),
        emergencyApi.getAll(),
        ambulanceApi.getAll(),
        hospitalApi.getAll()
      ]);
      if (sumRes.status === 'fulfilled' && sumRes.value.data.success) {
        setSummary(sumRes.value.data.summary);
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value.data.success) {
        setTrends(trendsRes.value.data.trends || trendsRes.value.data.data || []);
      } else {
        setTrends([
          { month: 'Jan', count: 42, critical: 10, high: 15, medium: 12, low: 5 },
          { month: 'Feb', count: 50, critical: 12, high: 18, medium: 14, low: 6 },
          { month: 'Mar', count: 65, critical: 15, high: 22, medium: 20, low: 8 },
          { month: 'Apr', count: 58, critical: 14, height: 20, medium: 16, low: 8 },
          { month: 'May', count: 70, critical: 18, high: 25, medium: 18, low: 9 }
        ]);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data.success) {
        setUsersList(usersRes.value.data.users || []);
      }
      if (emRes.status === 'fulfilled' && emRes.value.data.success) {
        setEmergenciesList(emRes.value.data.emergencies || []);
      }
      if (ambRes.status === 'fulfilled' && ambRes.value.data.success) {
        setAmbulancesList(ambRes.value.data.ambulances || []);
      }
      if (hospRes.status === 'fulfilled' && hospRes.value.data.success) {
        setHospitalsList(hospRes.value.data.hospitals || []);
      }
    } catch (err) {
      console.error('Failed to load superadmin metrics', err);
    } finally {
      setLoadingSuperadmin(false);
    }
  }, [analyticsRange]);


  const loadUserStats = useCallback(async () => {
    try {
      const res = await analyticsApi.getUserStats();
      if (res.data.success) {
        setUserStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load user stats', err);
    }
  }, []);

  // Fetch geolocation and base data
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        () => console.log('Location access denied, defaulting map coordinates.')
      );
    }
    
    // Load initial data
    loadHospitals();
    loadEmergencies();
    loadUserStats();
    loadPosts();
    loadInsuranceData();
    let intervalId: any;
    if (user?.role === 'superadmin') {
      loadSuperadminData();
      loadAmbulances();
      loadSchemes();
      intervalId = setInterval(() => {
        loadSuperadminData();
      }, 15000);
    }
    
    // Pre-populate profile values
    if (user) {
      setFullName(user.name || '');
      if (user.healthProfile) {
        setPrimaryPhone(user.healthProfile.primaryPhone || '');
        setBloodGroup(user.healthProfile.bloodGroup || 'Unknown');
        setAllergiesText(user.healthProfile.allergies?.join(', ') || '');
        setMedicationsText(user.healthProfile.medications?.join(', ') || '');
        setChronicConditions(user.healthProfile.chronicConditions || '');
        setPreferredHospital(user.healthProfile.preferredHospital || '');
        setResidentialAddress(user.healthProfile.residentialAddress || '');
        setEmergencyContacts(user.healthProfile.emergencyContacts || []);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, loadUserStats, loadSuperadminData]);

  // Socket listener for real-time updates (Superadmin specific)
  useEffect(() => {
    if (!user || user.role !== 'superadmin') return;

    socketService.connect();
    socketService.joinAdminRoom(user._id);

    const handleNewEmergency = (data: { emergency: any }) => {
      setEmergenciesList(prev => {
        if (prev.some(e => e._id === data.emergency._id)) return prev;
        return [data.emergency, ...prev];
      });
      toast.error(`🚨 NEW EMERGENCY: ${data.emergency?.incidentType?.toUpperCase()} (${data.emergency?.severity})`, {
        duration: 8000,
        style: { background: '#7f1d1d', color: '#fca5a5', fontWeight: 600 }
      });
      loadSuperadminData();
    };

    const handleAmbulanceLocation = (data: { ambulanceId: string; lat: number; lng: number }) => {
      setAmbulancesList(prev => prev.map(a => 
        a._id === data.ambulanceId 
          ? { ...a, currentLocation: { lat: data.lat, lng: data.lng, lastUpdated: new Date().toISOString() } } 
          : a
      ));
    };

    const handleAssignmentConfirmed = (data: any) => {
      toast.success(`Ambulance ${data.vehicleNumber || 'unit'} dispatched successfully`);
      loadSuperadminData();
    };

    const handleStatusUpdate = (data: any) => {
      toast(`Emergency status updated: ${data.status}`, { icon: '📊' });
      loadSuperadminData();
    };

    socketService.on(SOCKET_EVENTS.NEW_EMERGENCY, handleNewEmergency);
    socketService.on(SOCKET_EVENTS.AMBULANCE_LOCATION, handleAmbulanceLocation);
    socketService.on(SOCKET_EVENTS.ASSIGNMENT_CONFIRMED, handleAssignmentConfirmed);
    socketService.on(SOCKET_EVENTS.STATUS_UPDATE, handleStatusUpdate);

    return () => {
      socketService.off(SOCKET_EVENTS.NEW_EMERGENCY, handleNewEmergency);
      socketService.off(SOCKET_EVENTS.AMBULANCE_LOCATION, handleAmbulanceLocation);
      socketService.off(SOCKET_EVENTS.ASSIGNMENT_CONFIRMED, handleAssignmentConfirmed);
      socketService.off(SOCKET_EVENTS.STATUS_UPDATE, handleStatusUpdate);
    };
  }, [user, loadSuperadminData]);

  // CRUD Actions and helpers
  const assignAmbulance = async (emergencyId: string, ambulance: any) => {
    setEmergenciesList(prev => prev.map(e => 
      e._id === emergencyId ? { ...e, status: 'accepted', assignedAmbulance: ambulance } : e
    ));
    setAssigning(prev => ({ ...prev, [emergencyId]: true }));
    try {
      const res = await ambulanceApi.assign({ emergencyId, ambulanceId: ambulance._id });
      if (res.data.success) {
        toast.success(`Units Dispatched! ETA: ${res.data.eta || 15} min`);
      }
      loadSuperadminData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed');
      loadSuperadminData();
    } finally {
      setAssigning(prev => ({ ...prev, [emergencyId]: false }));
    }
  };

  const updateEmergencyStatus = async (emergencyId: string, status: string) => {
    try {
      const res = await emergencyApi.updateStatus(emergencyId, status);
      if (res.data.success) {
        toast.success(`Emergency updated to ${status.replace('_', ' ')}`);
        loadSuperadminData();
      }
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const createOrUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPost) {
        await api.put(`/posts/${editingPost._id}`, postForm);
        toast.success('Post updated successfully!');
      } else {
        await api.post('/posts', postForm);
        toast.success('Post published successfully!');
      }
      setShowPostModal(false);
      setEditingPost(null);
      setPostForm({
        title: '',
        content: '',
        type: 'announcement',
        severity: 'info',
        targetAmount: 0,
        patientName: '',
        hospitalName: ''
      });
      loadPosts();
    } catch (err) {
      console.error('Error saving post:', err);
      toast.error('Failed to save post.');
    }
  };

  const deletePost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      toast.success('Post deleted successfully');
      loadPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post.');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await authApi.toggleUserStatus(userId, !currentStatus);
      if (res.data.success) {
        toast.success(`User status updated successfully`);
        // Refresh users list
        const usersRes = await authApi.getUsers({ limit: 100, includeInactive: 'true' });
        if (usersRes.data.success) {
          setUsersList(usersRes.data.users || []);
        }
      }
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  // Sync activeTab with URL path
  useEffect(() => {
    const path = location.pathname.substring(1); // strip leading slash
    const tabMap: Record<string, string> = {
      'dashboard': 'dashboard',
      'emergency': 'emergency',
      'control-panel': 'control-panel',
      'analytics': 'analytics',
      'hospitals': 'hospitals',
      'profile': 'profile',
      'health-profile': 'profile',
      'insurance': 'insurance',
      'insurance-dashboard': 'insurance',
      'claim-insurance': 'insurance',
      'schemes': 'schemes',
      'medical-schemes': 'schemes',
      'bulletin': 'bulletin',
      'livemap': 'livemap',
      'map': 'livemap'
    };
    
    if (tabMap[path]) {
      setActiveTab(tabMap[path]);
    } else if (path === '' || path === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location, navigate]);

  const handleTabChange = (tabId: string) => {
    const routeMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'emergency': '/emergency',
      'control-panel': '/control-panel',
      'analytics': '/analytics',
      'hospitals': '/hospitals',
      'profile': '/profile',
      'insurance': '/insurance-dashboard',
      'schemes': '/medical-schemes',
      'bulletin': '/bulletin',
      'livemap': '/map'
    };
    navigate(routeMap[tabId] || '/dashboard');
  };

  const loadHospitals = async () => {
    try {
      const res = await hospitalApi.getAll();
      setHospitalsList(res.data.hospitals || []);
    } catch (err) {
      console.error('Failed to load hospitals list', err);
    }
  };

  const loadEmergencies = async () => {
    try {
      const res = await emergencyApi.getAll();
      setEmergenciesList(res.data.emergencies || []);
    } catch (err) {
      console.error('Failed to load emergency history', err);
    }
  };

  // Profile Save
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updatedProfile = {
        name: fullName,
        healthProfile: {
          bloodGroup,
          allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
          medications: medicationsText.split(',').map(s => s.trim()).filter(Boolean),
          primaryPhone,
          chronicConditions,
          residentialAddress,
          preferredHospital,
          emergencyContacts,
          timeline: user?.healthProfile?.timeline || []
        }
      };
      
      const res = await authApi.updateProfile(updatedProfile);
      if (res.data.success) {
        setUser(res.data.user);
        toast.success('Health profile secured and synchronized successfully!', {
          style: { background: '#161922', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to synchronize health profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Add Contact Row
  const handleAddContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      { name: '', phone: '', relation: '' }
    ]);
  };

  // Remove Contact Row
  const handleRemoveContact = (index: number) => {
    const updated = [...emergencyContacts];
    updated.splice(index, 1);
    setEmergencyContacts(updated);
  };

  // Update specific contact field
  const handleContactChange = (index: number, field: string, value: string) => {
    const updated = [...emergencyContacts];
    updated[index][field] = value;
    setEmergencyContacts(updated);
  };

  // Voice Input Helper
  const triggerVoiceInput = (fieldName: string, currentVal: string, setter: (val: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice dictation not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    
    if (listeningField === fieldName) {
      return; // Already listening
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    setListeningField(fieldName);
    toast('Listening... Speak clearly.', { icon: '🎙️' });
    recognition.start();

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setter(currentVal ? `${currentVal} ${text}` : text);
      toast.success('Captured voice input');
    };

    recognition.onerror = () => {
      toast.error('Voice input failed. Try again.');
      setListeningField(null);
    };

    recognition.onend = () => {
      setListeningField(null);
    };
  };

  // Commit timeline record
  const handleCommitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordNotes.trim()) {
      toast.error('Please enter notes or observations.');
      return;
    }
    setCommittingRecord(true);
    try {
      const newEvent = {
        category: recordCategory,
        notes: recordNotes,
        attachmentUrl: uploadedFileName ? `/uploads/${uploadedFileName}` : '',
        createdAt: new Date().toISOString()
      };

      const existingTimeline = user?.healthProfile?.timeline || [];
      const updatedTimeline = [newEvent, ...existingTimeline];

      const updatedProfile = {
        healthProfile: {
          ...(user?.healthProfile || {}),
          timeline: updatedTimeline
        }
      };

      const res = await authApi.updateProfile(updatedProfile);
      if (res.data.success) {
        setUser(res.data.user);
        setRecordNotes('');
        setUploadedFile(null);
        setUploadedFileName('');
        toast.success('Timeline event logged successfully!', {
          style: { background: '#161922', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to commit record.');
    } finally {
      setCommittingRecord(false);
    }
  };

  // File drop simulator
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      setUploadedFileName(file.name);
      toast.success(`Attached: ${file.name}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setUploadedFileName(file.name);
      toast.success(`Attached: ${file.name}`);
    }
  };

  // Create Emergency Alert SOS
  const handleReportIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIncident(true);
    try {
      const payload = {
        incidentType,
        victimCount,
        description: description || `Emergency reported by ${user?.name}`,
        location: {
          lat: userCoords[0],
          lng: userCoords[1],
          address: residentialAddress || 'Current GPS Coordinate',
          landmark: landmark || ''
        },
        isHighway
      };

      const res = await emergencyApi.create(payload);
      if (res.status === 201 || res.status === 200) {
        toast.error(`SOS Alert active! Dispatching rescue teams...`, {
          duration: 8000,
          style: { background: '#7f1d1d', color: '#fca5a5', fontWeight: 600 }
        });
        setShowReportModal(false);
        setIncidentType('medical');
        setVictimCount(1);
        setDescription('');
        setLandmark('');
        setIsHighway(false);
        loadEmergencies();
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error(err);
      toast.error('SOS dispatch request failed. Reconnecting...');
    } finally {
      setSubmittingIncident(false);
    }
  };

  // Filter local history for user
  const userEmergencies = emergenciesList.filter(e => {
    if (typeof e.reportedBy === 'object') {
      return e.reportedBy?._id === user?._id || e.reportedBy?.email === user?.email;
    }
    return e.reportedBy === user?._id;
  });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#090b11',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Premium Background Effects */}
      <div className="premium-grid-bg" />
      <div className="premium-radial-glow glow-red" style={{ top: '10%', left: '10%', width: 500, height: 500 }} />
      <div className="premium-radial-glow glow-blue" style={{ bottom: '15%', right: '10%', width: 600, height: 600 }} />
      
      {/* Top Navbar */}
      <header style={{
        height: 64,
        background: '#121420',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        {/* Left Side: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={18} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800 }}>
            Emergency<span style={{ color: '#dc2626' }}>Response</span>
          </span>
          <span style={{
            background: 'rgba(220,38,38,0.15)',
            color: '#ef4444',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 6,
            marginLeft: 4,
            textTransform: 'uppercase'
          }}>
            Dashboard
          </span>
        </div>

        {/* Mid: Tabs */}
        <nav style={{ display: 'flex', gap: 6, height: '100%', alignItems: 'center' }}>
          {(user?.role === 'superadmin' ? [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'control-panel', label: 'Control Panel', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'hospitals', label: 'Hospitals', icon: Building },
            { id: 'schemes', label: 'Schemes', icon: FileSpreadsheet },
            { id: 'bulletin', label: 'Bulletin', icon: Newspaper },
            { id: 'livemap', label: 'Live Map', icon: Map }
          ] : [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'emergency', label: 'Emergency', icon: Activity },
            { id: 'hospitals', label: 'Hospitals', icon: Building },
            { id: 'profile', label: 'Medical Profile', icon: UserRound },
            { id: 'insurance', label: 'Insurance', icon: HeartHandshake },
            { id: 'schemes', label: 'Schemes', icon: FileSpreadsheet },
            { id: 'bulletin', label: 'Bulletin', icon: Newspaper },
            { id: 'livemap', label: 'Live Map', icon: Map }
          ]).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: isActive ? '#dc2626' : 'transparent',
                  color: isActive ? 'white' : '#94a3b8'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side: Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }} onClick={() => toast.success("You are up to date with response warnings.")}>
            <Bell size={20} />
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444'
            }} />
          </button>

          {/* User initials & name */}
          <div 
            onClick={() => handleTabChange('profile')}
            title="Edit Medical Profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
          >
            {user?.role === 'superadmin' ? (
              <span style={{
                background: 'rgba(168,85,247,0.15)',
                color: '#c084fc',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                textTransform: 'uppercase'
              }}>superadmin</span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>USER</span>
            )}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#ea580c',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12
            }}>
              {user?.role === 'superadmin' ? 'S' : (user?.name ? user.name.charAt(0).toUpperCase() : 'C')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
              {user?.role === 'superadmin' ? 'Super Admin' : (user?.name?.toLowerCase() || 'citizen')}
            </span>
          </div>

          <button
            onClick={() => {
              logout();
              toast.success('Logged out successfully.');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            user?.role === 'superadmin' ? (
              <motion.div
                key="tab-superadmin-dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                {/* Heading */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                      Super Admin Control Center 🌐
                    </h1>
                    <p style={{ fontSize: 14, color: '#94a3b8' }}>
                      Real-time dispatch, fleet coordination, and system intelligence
                    </p>
                  </div>
                  
                  {/* Action Header Panel */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => handleTabChange('control-panel')}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 20px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 15px rgba(220,38,38,0.2)'
                      }}
                    >
                      <Activity size={16} />
                      <span>Dispatch Center</span>
                    </button>
                    
                    <button 
                      onClick={() => handleTabChange('livemap')}
                      style={{
                        background: '#1d4ed8',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 20px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 15px rgba(29,78,216,0.2)'
                      }}
                    >
                      <MapPin size={16} color="white" />
                      <span>GPS Intel Fleet</span>
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                  {[
                    { 
                      label: 'ACTIVE ALERTS', 
                      count: emergenciesList.filter(e => ['pending', 'accepted', 'in_progress'].includes(e.status)).length, 
                      color: '#ef4444', 
                      icon: AlertTriangle,
                      sub: `${emergenciesList.filter(e => e.status === 'pending').length} pending dispatch`
                    },
                    { 
                      label: 'UNITS READY', 
                      count: ambulancesList.filter(a => a.status === 'available').length, 
                      color: '#10b981', 
                      icon: Truck,
                      sub: 'ambulances available'
                    },
                    { 
                      label: 'RESOLVED CALLS', 
                      count: emergenciesList.filter(e => e.status === 'resolved').length, 
                      color: '#a78bfa', 
                      icon: CheckCircle,
                      sub: 'completed rescues'
                    },
                    { 
                      label: 'SYSTEM SYNC', 
                      count: 'ACTIVE', 
                      color: '#38bdf8', 
                      icon: ShieldCheck,
                      sub: 'MongoDB & Sockets live'
                    }
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        style={{
                          background: '#121420',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: '24px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12
                        }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${stat.color}15`,
                          color: stat.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>{stat.label}</span>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>{stat.count}</div>
                          <span style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'block' }}>{stat.sub}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dashboard Core: Chart & Incident Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
                  
                  {/* Chart Card */}
                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 360
                  }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#f8fafc' }}>
                      Inbound Operational Load Trend
                    </h3>
                    <div style={{ flex: 1, width: '100%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: '#121420', borderColor: 'rgba(255,255,255,0.08)', color: '#f8fafc' }} />
                          <Area type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" name="Incidents" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Incident Breakdown Card */}
                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                      Live Incident Breakdown
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                      {['medical', 'accident', 'fire', 'crime', 'natural_disaster'].map(type => {
                        const count = emergenciesList.filter(e => e.incidentType === type).length;
                        const total = emergenciesList.length || 1;
                        const pct = (count / total) * 100;
                        const label = {
                          medical: '🩺 Medical Emergency',
                          accident: '🚗 Road Collision',
                          fire: '🔥 Fire Outbreak',
                          crime: '🚨 Crime / Assault',
                          natural_disaster: '🌪️ Natural Hazard'
                        }[type] || type;

                        const barColor = {
                          medical: '#38bdf8',
                          accident: '#fb923c',
                          fire: '#ef4444',
                          crime: '#f43f5e',
                          natural_disaster: '#a78bfa'
                        }[type] || '#64748b';

                        return (
                          <div key={type}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span style={{ color: '#cbd5e1', fontWeight: 500, textTransform: 'capitalize' }}>{label}</span>
                              <span style={{ color: '#94a3b8', fontWeight: 700 }}>{count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tab-citizen-dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                {/* Heading */}
                <div>
                  <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                    Welcome back, {user?.name?.toLowerCase() || 'citizen'} 👋
                  </h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>
                    Access your emergency history & active requests
                  </p>
                </div>

                {/* Action Header Panel */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', alignSelf: 'flex-end', marginTop: -60 }}>
                  <button
                    onClick={() => setShowReportModal(true)}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 20px',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 15px rgba(220,38,38,0.3)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
                  >
                    <AlertTriangle size={16} />
                    <span>Report Incident</span>
                  </button>
                  
                  {/* Secondary Button */}
                  <button 
                    onClick={() => setActiveTab('livemap')}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 8,
                      background: '#121420',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <MapPin size={16} color="#94a3b8" />
                  </button>
                </div>

                {/* Alert Banner: Incomplete profile */}
                {(!user?.healthProfile || user.healthProfile.bloodGroup === 'Unknown') && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(234,88,12,0.08)',
                    border: '1px solid rgba(234,88,12,0.25)',
                    borderRadius: 12,
                    padding: '18px 24px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: 'rgba(234,88,12,0.15)',
                        color: '#ea580c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Activity size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f97316', marginBottom: 2 }}>
                          Medical Profile Incomplete
                        </h4>
                        <p style={{ fontSize: 13, color: '#cbd5e1' }}>
                          Complete your health details to help responders during emergencies.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabChange('profile')}
                      style={{
                        background: '#ea580c',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 18px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>Complete Now</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 20
                }}>
                  {[
                    { label: 'TOTAL REPORTS', count: userStats.total || 0, color: '#38bdf8', icon: Newspaper },
                    { label: 'ACTIVE', count: userStats.active || 0, color: '#f43f5e', icon: Activity },
                    { label: 'RESOLVED', count: userStats.resolved || 0, color: '#10b981', icon: CheckCircle },
                    { label: 'PENDING', count: userStats.pending || 0, color: '#eab308', icon: Clock }
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        style={{
                          background: '#121420',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: '24px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12
                        }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${stat.color}15`,
                          color: stat.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>{stat.label}</span>
                          <div style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>{stat.count}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Links / Navigation Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 20
                }}>
                  {[
                    {
                      title: 'Report Now',
                      sub: 'EMERGENCY SOS',
                      icon: AlertTriangle,
                      color: '#ef4444',
                      action: () => setShowReportModal(true)
                    },
                    {
                      title: 'Live GPS',
                      sub: 'TRACKING MAP',
                      icon: Map,
                      color: '#3b82f6',
                      action: () => handleTabChange('livemap')
                    },
                    {
                      title: 'Hospitals',
                      sub: 'BED DIRECTORY',
                      icon: Building,
                      color: '#10b981',
                      action: () => handleTabChange('hospitals')
                    }
                  ].map(card => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.title}
                        onClick={card.action}
                        style={{
                          background: '#121420',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: '20px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 18,
                          cursor: 'pointer',
                          transition: 'transform 0.2s, border-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = card.color;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: `${card.color}15`,
                          color: card.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={22} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>{card.title}</h4>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>{card.sub}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Incidents Panel */}
                <div style={{
                  background: '#121420',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  padding: '24px'
                }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Incidents</h3>
                  {userEmergencies.length === 0 ? (
                    <div style={{
                      border: '1px dashed rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '48px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: 14
                    }}>
                      No activity history yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {userEmergencies.slice(0, 5).map(e => (
                        <div key={e._id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: 8,
                          padding: '14px 18px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 20 }}>
                              {e.incidentType === 'medical' && '🩺'}
                              {e.incidentType === 'accident' && '🚗'}
                              {e.incidentType === 'fire' && '🔥'}
                              {e.incidentType === 'natural_disaster' && '🌪️'}
                              {e.incidentType === 'crime' && '🚨'}
                            </span>
                            <div>
                              <h4 style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>
                                {e.incidentType} Alert ({e.severity})
                              </h4>
                              <p style={{ fontSize: 12, color: '#64748b' }}>
                                {e.location.address || 'GPS Coordinate'} · {new Date(e.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: e.status === 'resolved' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: e.status === 'resolved' ? '#10b981' : '#f43f5e',
                              border: `1px solid ${e.status === 'resolved' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`
                            }}>
                              {e.status}
                            </span>
                            {e.status !== 'resolved' && (
                              <button
                                onClick={() => {
                                  setUserCoords([e.location.lat, e.location.lng]);
                                  setActiveTab('livemap');
                                }}
                                style={{
                                  background: 'rgba(59,130,246,0.15)',
                                  color: '#3b82f6',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Track
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          )}

          {/* TAB: CONTROL PANEL */}
          {activeTab === 'control-panel' && user?.role === 'superadmin' && (
            <motion.div
              key="tab-control-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              {/* Heading */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Emergency Response Hub</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>Real-time coordination for all active emergency calls</p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '6px 12px',
                  borderRadius: 8
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981'
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                    Live Connected
                  </span>
                </div>
              </div>

              {/* Status Filters */}
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {['pending', 'accepted', 'in_progress', 'resolved', 'cancelled'].map(f => (
                  <button
                    key={f}
                    onClick={() => setControlPanelFilter(f)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: controlPanelFilter === f ? '#dc2626' : 'rgba(255,255,255,0.03)',
                      color: controlPanelFilter === f ? 'white' : '#94a3b8'
                    }}
                  >
                    {f.toUpperCase().replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Analytics Chart */}
              <div style={{
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '24px',
                height: 240
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Inbound Incident Load (7-Day Shift Trend)
                </h3>
                <div style={{ width: '100%', height: '100%', maxHeight: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends.slice(-7)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                      <XAxis dataKey="month" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#121420', borderColor: 'rgba(255,255,255,0.08)' }} />
                      <Area type="monotone" dataKey="count" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} name="Load" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Incident List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {emergenciesList.filter(e => e.status === controlPanelFilter).length === 0 ? (
                  <div style={{
                    border: '2px dashed rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '60px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>📫</span>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: '#cbd5e1' }}>Inbox Zero</h4>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>No {controlPanelFilter} incidents flagged right now.</p>
                  </div>
                ) : (
                  emergenciesList.filter(e => e.status === controlPanelFilter).map(e => {
                    const reportedByUser = typeof e.reportedBy === 'object' ? e.reportedBy : usersList.find(u => u._id === e.reportedBy);
                    const reporterName = reportedByUser?.name || 'Guest User';
                    const reporterPhone = reportedByUser?.phone || 'N/A';
                    
                    const severityColors = {
                      critical: { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.25)' },
                      high: { bg: 'rgba(251,146,60,0.15)', text: '#fb923c', border: 'rgba(251,146,60,0.25)' },
                      medium: { bg: 'rgba(250,204,21,0.15)', text: '#facc15', border: 'rgba(250,204,21,0.25)' },
                      low: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80', border: 'rgba(74,222,128,0.25)' }
                    }[e.severity as 'critical'|'high'|'medium'|'low'] || { bg: 'rgba(255,255,255,0.05)', text: '#94a3b8', border: 'transparent' };

                    return (
                      <div
                        key={e._id}
                        style={{
                          background: '#121420',
                          border: `1px solid ${e.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: 12,
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          {/* Incident Type & Status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 20 }}>
                              {e.incidentType === 'medical' && '🩺'}
                              {e.incidentType === 'accident' && '🚗'}
                              {e.incidentType === 'fire' && '🔥'}
                              {e.incidentType === 'natural_disaster' && '🌪️'}
                              {e.incidentType === 'crime' && '🚨'}
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize', color: '#f8fafc' }}>
                              {e.incidentType}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: severityColors.bg,
                              color: severityColors.text,
                              border: `1px solid ${severityColors.border}`
                            }}>{e.severity}</span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: 'rgba(255,255,255,0.04)',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255,255,255,0.08)'
                            }}>{e.status?.replace('_', ' ')}</span>
                            {e.severity === 'critical' && e.status !== 'resolved' && (
                              <span className="pulse-dot" style={{ background: '#ef4444' }} />
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            {e.status === 'pending' && (
                              <button
                                onClick={() => updateEmergencyStatus(e._id, 'cancelled')}
                                style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: 8,
                                  padding: '6px 12px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: '#ef4444',
                                  cursor: 'pointer'
                                }}
                              >
                                REJECT
                              </button>
                            )}
                            {e.status === 'accepted' && (
                              <button
                                onClick={() => updateEmergencyStatus(e._id, 'in_progress')}
                                style={{
                                  background: '#1d4ed8',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '8px 14px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: 'white',
                                  cursor: 'pointer'
                                }}
                              >
                                START RESPONSE
                              </button>
                            )}
                            {(e.status === 'accepted' || e.status === 'in_progress') && (
                              <button
                                onClick={() => updateEmergencyStatus(e._id, 'resolved')}
                                style={{
                                  background: '#10b981',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '8px 14px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: 'white',
                                  cursor: 'pointer'
                                }}
                              >
                                COMPLETE ✓
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Caller Info Block */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 16,
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255,255,255,0.03)',
                          borderRadius: 8,
                          padding: '12px 16px',
                          fontSize: 12
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>CALLER</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{reporterName}</span>
                              {reportedByUser?._id && (
                                <button
                                  onClick={() => navigate(`/medical-dossier/${reportedByUser._id}`)}
                                  style={{
                                    background: 'rgba(139,92,246,0.15)',
                                    color: '#c084fc',
                                    border: '1px solid rgba(139,92,246,0.25)',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: 9,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  VIEW DOSSIER
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>CONTACT PHONE</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{reporterPhone}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>LOCATION ADDRESS</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {e.location?.address || 'GPS Coordinates'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>INBOUND TIME</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{new Date(e.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Dispatched Unit Info */}
                        {e.assignedAmbulance && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(59,130,246,0.08)',
                            border: '1px solid rgba(59,130,246,0.15)',
                            padding: '10px 14px',
                            borderRadius: 8,
                            fontSize: 12
                          }}>
                            <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: 10, letterSpacing: '0.5px' }}>DISPATCHED UNIT</span>
                            <span style={{ color: '#ffffff', fontWeight: 700 }}>
                              {typeof e.assignedAmbulance === 'object' ? e.assignedAmbulance.vehicleNumber : e.assignedAmbulance}
                            </span>
                          </div>
                        )}

                        {/* Ambulance Assigner Dropdown */}
                        {e.status === 'pending' && !e.assignedAmbulance && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                              Assign Quick-Response Unit:
                            </span>
                            {ambulancesList.filter(a => a.status === 'available').length === 0 ? (
                              <div style={{
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.15)',
                                color: '#ef4444',
                                padding: '10px',
                                borderRadius: 8,
                                textAlign: 'center',
                                fontSize: 12,
                                fontWeight: 600
                              }}>
                                All Fleet Units Busy / Active
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                {ambulancesList.filter(a => a.status === 'available').map(a => (
                                  <button
                                    key={a._id}
                                    onClick={() => assignAmbulance(e._id, a)}
                                    disabled={assigning[e._id]}
                                    style={{
                                      background: 'rgba(255,255,255,0.03)',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      borderRadius: 8,
                                      padding: '8px 12px',
                                      color: '#f8fafc',
                                      fontSize: 12,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'flex-start',
                                      gap: 2,
                                      minWidth: 120,
                                      textAlign: 'left'
                                    }}
                                  >
                                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>{a.vehicleNumber}</span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>{a.driverName || a.driver?.name || 'Driver'}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: ANALYTICS */}
          {activeTab === 'analytics' && user?.role === 'superadmin' && (
            <motion.div
              key="tab-superadmin-analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>SuperAdmin Analytics</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>Real-time system health & operational overview</p>
                </div>
                <button
                  onClick={() => loadSuperadminData()}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>↺ Sync Data</span>
                </button>
              </div>

              {/* Grid 1 Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>👥</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', marginTop: 10 }}>{usersList.length}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>TOTAL USERS</div>
                </div>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>🚨</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f43f5e', marginTop: 10 }}>
                    {emergenciesList.filter(e => ['pending', 'accepted', 'in_progress'].includes(e.status)).length}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>ACTIVE ALERTS</div>
                </div>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 10 }}>
                    {emergenciesList.filter(e => e.status === 'resolved').length}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>RESOLVED ALERTS</div>
                </div>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>⭐</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#eab308', marginTop: 10 }}>4.9/5</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>SATISFACTION RATE</div>
                </div>
              </div>

              {/* Grid 2 Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>🚑</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 10 }}>
                    {ambulancesList.filter(a => a.status === 'available').length}/{ambulancesList.length}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>READY AMBULANCES</div>
                </div>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>🏥</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#2dd4bf', marginTop: 10 }}>{hospitalsList.length}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>FACILITIES CONNECTED</div>
                </div>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>⏱️</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316', marginTop: 10 }}>12.4 min</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>AVG RESPONSE TIME</div>
                </div>
                <div style={{ background: '#121420', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px' }}>
                  <span style={{ fontSize: 20 }}>📋</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#a855f7', marginTop: 10 }}>{emergenciesList.length}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginTop: 2 }}>TOTAL INBOUND REPORTS</div>
                </div>
              </div>

              {/* Historical Trend Chart with Filter */}
              <div style={{
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Incident Intelligence Trend
                  </h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['7d', '30d', '90d'].map(r => (
                      <button
                        key={r}
                        onClick={() => setAnalyticsRange(r)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          border: 'none',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: analyticsRange === r ? '#dc2626' : 'rgba(255,255,255,0.03)',
                          color: analyticsRange === r ? 'white' : '#94a3b8'
                        }}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                      <XAxis dataKey="month" stroke="#475569" fontSize={11} />
                      <YAxis stroke="#475569" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#121420', borderColor: 'rgba(255,255,255,0.08)' }} />
                      <Area type="monotone" dataKey="count" stroke="#6366f1" fill="rgba(99,102,241,0.1)" strokeWidth={2} name="Total Reports" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Infrastructure Status */}
              <div style={{
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Infrastructure Status
                  <span style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    color: '#10b981',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20
                  }}>Operational</span>
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { name: 'Core API Cluster', status: 'Online', desc: 'Node.js Express (Port 5000)' },
                    { name: 'Data Pipeline', status: 'Connected', desc: 'MongoDB Instance' },
                    { name: 'Transport Layer', status: 'Active', desc: 'Socket.IO Engine' }
                  ].map(sys => (
                    <div
                      key={sys.name}
                      style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 6px #10b981'
                      }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{sys.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sys.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Manager / Security Controls */}
              <div style={{
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '24px'
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
                  User Account & Role Controls
                </h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Email</th>
                        <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Role</th>
                        <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Security Control</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr
                          key={u._id}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f8fafc' }}>{u.name}</td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: u.role === 'superadmin' ? 'rgba(168,85,247,0.15)' : u.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                              color: u.role === 'superadmin' ? '#c084fc' : u.role === 'admin' ? '#60a5fa' : '#cbd5e1'
                            }}>{u.role}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: u.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: u.isActive ? '#10b981' : '#f87171'
                            }}>{u.isActive ? 'Active' : 'Deactivated'}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {u.role !== 'superadmin' && (
                              <button
                                onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                                style={{
                                  background: u.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                  border: `1px solid ${u.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                  color: u.isActive ? '#ef4444' : '#10b981',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {u.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: EMERGENCY */}
          {activeTab === 'emergency' && (
            <motion.div
              key="tab-emergency"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Emergency Operations Centre</h1>
                <p style={{ fontSize: 14, color: '#94a3b8' }}>Report active crises or view responder dispatch summaries</p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '3fr 2fr',
                gap: 28
              }}>
                {/* Form column */}
                <div style={{
                  background: '#121420',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  padding: '24px'
                }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: '#ef4444' }}>🚨 Initiate SOS Response Form</h3>
                  <form onSubmit={handleReportIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Incident Type</label>
                        <select
                          value={incidentType}
                          onChange={(e) => setIncidentType(e.target.value)}
                          style={{
                            background: '#1a1c29',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            color: '#f8fafc',
                            fontSize: 14,
                            outline: 'none'
                          }}
                        >
                          <option value="medical">Medical emergency</option>
                          <option value="accident">Road traffic accident</option>
                          <option value="fire">Fire hazard</option>
                          <option value="natural_disaster">Natural disaster</option>
                          <option value="crime">Act of violence / Crime</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Victims Involved</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={victimCount}
                          onChange={(e) => setVictimCount(parseInt(e.target.value) || 1)}
                          style={{
                            background: '#1a1c29',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            color: '#f8fafc',
                            fontSize: 14,
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Landmark / Local Info</label>
                      <input
                        type="text"
                        placeholder="Ex: Opposite to metro station pillar 102"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        style={{
                          background: '#1a1c29',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: '#f8fafc',
                          fontSize: 14,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Description of Emergency</label>
                      <textarea
                        rows={4}
                        placeholder="Please details symptoms, injuries, or hazards..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{
                          background: '#1a1c29',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          padding: '12px',
                          color: '#f8fafc',
                          fontSize: 14,
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: 'rgba(255,255,255,0.02)',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <input
                        type="checkbox"
                        id="highway-toggle"
                        checked={isHighway}
                        onChange={(e) => setIsHighway(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <label htmlFor="highway-toggle" style={{ fontSize: 13, cursor: 'pointer', color: '#cbd5e1' }}>
                        Is this on a National/State Highway? (Priority highway routing)
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingIncident}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '14px',
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: submittingIncident ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        boxShadow: '0 4px 15px rgba(220,38,38,0.3)'
                      }}
                    >
                      {submittingIncident ? 'Transmitting Alert Data...' : '🚨 SECURE SOS SIGNAL & DISPATCH NOW'}
                    </button>
                  </form>
                </div>

                {/* Info and help column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '24px'
                  }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>System Dispatch Action</h4>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94a3b8', paddingLeft: 16 }}>
                      <li>Your exact GPS position coordinates are locked on dispatch.</li>
                      <li>AI system instantly matches triage protocols in <strong>200ms</strong>.</li>
                      <li>Nearest ambulance and hospital ICU resources are booked.</li>
                      <li>Live updates are piped to the National Operations Dashboard.</li>
                    </ul>
                  </div>

                  <div style={{
                    background: 'rgba(239,68,68,0.03)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 12,
                    padding: '20px'
                  }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Voice emergency hotline</h4>
                    <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: '1.6' }}>
                      In case of zero network coverage, dial <strong>112</strong> immediately. The app works over satellite SMS if supported by your hardware profile.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: HOSPITALS */}
          {activeTab === 'hospitals' && (
            <motion.div
              key="tab-hospitals"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Emergency Beds & Facilities</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>Real-time directory of local treatment capacity and ICU status</p>
                </div>
                
                {/* Search Bar */}
                <div style={{ position: 'relative', width: 300 }}>
                  <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search hospitals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#121420',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px 10px 38px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {user?.role === 'superadmin' ? (
                /* Premium Card-based layout for Super Admin */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                  {hospitalsList
                    .filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(h => {
                      const bedsPct = h.totalBeds ? (h.availableBeds / h.totalBeds) * 100 : 0;
                      const icuPct = h.icuBeds ? (h.availableIcuBeds / h.icuBeds) * 100 : 0;

                      return (
                        <div
                          key={h._id}
                          style={{
                            background: '#121420',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 16,
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Label Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{
                              background: h.type === 'government' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                              color: h.type === 'government' ? '#3b82f6' : '#10b981',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              textTransform: 'uppercase'
                            }}>
                              {h.type}
                            </span>
                            <span style={{
                              background: h.emergencyLevel === 'level1' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                              color: h.emergencyLevel === 'level1' ? '#ef4444' : '#f59e0b',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              textTransform: 'uppercase'
                            }}>
                              {h.emergencyLevel}
                            </span>
                          </div>

                          {/* Hospital Details */}
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{h.name}</h3>
                            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>📍 {h.address}</p>
                          </div>

                          {/* Beds Progress Sliders */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: '#cbd5e1' }}>General Beds Available</span>
                                <span style={{ fontWeight: 700, color: '#10b981' }}>{h.availableBeds} / {h.totalBeds}</span>
                              </div>
                              <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${bedsPct}%`, background: '#10b981', borderRadius: 3 }} />
                              </div>
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: '#cbd5e1' }}>ICU Beds Available</span>
                                <span style={{ fontWeight: 700, color: '#ef4444' }}>{h.availableIcuBeds} / {h.icuBeds}</span>
                              </div>
                              <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${icuPct}%`, background: '#ef4444', borderRadius: 3 }} />
                              </div>
                            </div>
                          </div>

                          {/* Treatment Specialty Tags */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {h.treatmentTypes?.slice(0, 4).map((type: string) => (
                              <span
                                key={type}
                                style={{
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  color: '#cbd5e1',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {type}
                              </span>
                            ))}
                          </div>

                          {/* Contact Button */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Established {h.established || 'N/A'}</span>
                            {h.phone && (
                              <a
                                href={`tel:${h.phone}`}
                                style={{
                                  background: 'rgba(59,130,246,0.1)',
                                  border: '1px solid rgba(59,130,246,0.2)',
                                  color: '#3b82f6',
                                  borderRadius: 8,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <Phone size={12} />
                                <span>{h.phone}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                /* Citizen Table Layout */
                <div style={{
                  background: '#121420',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Hospital Name</th>
                        <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Emergency Level</th>
                        <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Available Beds</th>
                        <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>ICU Availability</th>
                        <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Specialities</th>
                        <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitalsList
                        .filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(h => (
                          <tr key={h._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '16px 20px', fontWeight: 700, color: '#f8fafc' }}>
                              {h.name}
                              <span style={{
                                marginLeft: 8,
                                fontSize: 9,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: h.type === 'government' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                color: h.type === 'government' ? '#3b82f6' : '#10b981',
                                textTransform: 'uppercase'
                              }}>
                                {h.type}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: h.emergencyLevel === 'level1' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                color: h.emergencyLevel === 'level1' ? '#ef4444' : '#f59e0b',
                                textTransform: 'uppercase'
                              }}>
                                {h.emergencyLevel}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 600, color: h.availableBeds > 20 ? '#10b981' : '#f59e0b' }}>
                              {h.availableBeds} / {h.totalBeds} beds
                            </td>
                            <td style={{ padding: '16px 20px', fontWeight: 600, color: h.availableIcuBeds > 5 ? '#10b981' : '#ef4444' }}>
                              {h.availableIcuBeds} / {h.icuBeds} ICU
                            </td>
                            <td style={{ padding: '16px 20px', color: '#cbd5e1', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.treatmentTypes.join(', ')}
                            </td>
                            <td style={{ padding: '16px 20px', color: '#94a3b8' }}>
                              {h.phone || 'N/A'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: MEDICAL PROFILE (ADVANCED HEALTH PROFILE - MATCHING SCREENSHOT 4!) */}
          {activeTab === 'profile' && (
            <motion.div
              key="tab-profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              
              {/* Header section with db sync */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Advanced Health Profile</h1>
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>Voice-enabled dashboard for total medical preparedness.</p>
                </div>
                
                {/* Database Sync Indicator */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 4
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.5px' }}>DATABASE SYNC</span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    padding: '4px 10px',
                    borderRadius: 6
                  }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'block',
                      boxShadow: '0 0 8px #10b981'
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>MongoDB Active</span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '5fr 3fr',
                gap: 16,
                alignItems: 'start'
              }}>
                
                {/* LEFT SIDE: MAIN PROFILE FORM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  
                  {/* CARD: Main fields */}
                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    
                    {/* SECTION: Identity & Verification */}
                    <div>
                      <h4 style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#3b82f6',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                        borderBottom: '1px solid rgba(59,130,246,0.15)',
                        paddingBottom: 2
                      }}>
                        • Identity & Verification
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Full Name</label>
                          <input
                            type="text"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            style={{
                              background: '#1a1c29',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              padding: '6px 8px',
                              color: '#f8fafc',
                              fontSize: 12,
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Primary Phone</label>
                          <input
                            type="text"
                            placeholder="Primary phone number"
                            value={primaryPhone}
                            onChange={(e) => setPrimaryPhone(e.target.value)}
                            style={{
                              background: '#1a1c29',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              padding: '6px 8px',
                              color: '#f8fafc',
                              fontSize: 12,
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION: Critical Vitals & Conditions */}
                    <div>
                      <h4 style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#ef4444',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                        borderBottom: '1px solid rgba(239,68,68,0.15)',
                        paddingBottom: 2
                      }}>
                        • Critical Vitals & Conditions
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Blood Group</label>
                            <select
                              value={bloodGroup}
                              onChange={(e) => setBloodGroup(e.target.value)}
                              style={{
                                background: '#1a1c29',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 8,
                                padding: '6px 8px',
                                color: '#f8fafc',
                                fontSize: 12,
                                outline: 'none'
                              }}
                            >
                              {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Known Allergies</label>
                              <button
                                type="button"
                                onClick={() => triggerVoiceInput('Allergies', allergiesText, setAllergiesText)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: listeningField === 'Allergies' ? '#ef4444' : '#38bdf8',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                {listeningField === 'Allergies' ? <MicOff size={10} /> : <Mic size={10} />}
                                <span>USE VOICE</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Ex: Penicillin, Peanuts"
                              value={allergiesText}
                              onChange={(e) => setAllergiesText(e.target.value)}
                              style={{
                                background: '#1a1c29',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 8,
                                padding: '6px 8px',
                                color: '#f8fafc',
                                fontSize: 12,
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Ongoing Medications</label>
                            <button
                              type="button"
                              onClick={() => triggerVoiceInput('Medications', medicationsText, setMedicationsText)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: listeningField === 'Medications' ? '#ef4444' : '#38bdf8',
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {listeningField === 'Medications' ? <MicOff size={10} /> : <Mic size={10} />}
                              <span>USE VOICE</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Ex: Insulin, Metformin (Comma separated)"
                            value={medicationsText}
                            onChange={(e) => setMedicationsText(e.target.value)}
                            style={{
                              background: '#1a1c29',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              padding: '6px 8px',
                              color: '#f8fafc',
                              fontSize: 12,
                              outline: 'none'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Permanent Treatment History / Chronic Conditions</label>
                            <button
                              type="button"
                              onClick={() => triggerVoiceInput('Conditions', chronicConditions, setChronicConditions)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: listeningField === 'Conditions' ? '#ef4444' : '#38bdf8',
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {listeningField === 'Conditions' ? <MicOff size={10} /> : <Mic size={10} />}
                              <span>USE VOICE</span>
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Detailed medical background..."
                            value={chronicConditions}
                            onChange={(e) => setChronicConditions(e.target.value)}
                            style={{
                              background: '#1a1c29',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              padding: '6px 8px',
                              color: '#f8fafc',
                              fontSize: 12,
                              outline: 'none',
                              resize: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION: Logistics & Preferred Facilities */}
                    <div>
                      <h4 style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#10b981',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                        borderBottom: '1px solid rgba(16,185,129,0.15)',
                        paddingBottom: 2
                      }}>
                        • Logistics & Preferred Facilities
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Preferred Hospital / Facility</label>
                            <button
                              type="button"
                              onClick={() => triggerVoiceInput('Hospital', preferredHospital, setPreferredHospital)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: listeningField === 'Hospital' ? '#ef4444' : '#38bdf8',
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {listeningField === 'Hospital' ? <MicOff size={10} /> : <Mic size={10} />}
                              <span>USE VOICE</span>
                            </button>
                          </div>
                          <select
                            value={preferredHospital}
                            onChange={(e) => setPreferredHospital(e.target.value)}
                            style={{
                              background: '#1a1c29',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              padding: '6px 8px',
                              color: '#f8fafc',
                              fontSize: 12,
                              outline: 'none'
                            }}
                          >
                            <option value="">Select facility...</option>
                            {hospitalsList.map(h => (
                              <option key={h._id} value={h.name}>{h.name}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Permanent Residential Address</label>
                            <button
                              type="button"
                              onClick={() => triggerVoiceInput('Address', residentialAddress, setResidentialAddress)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: listeningField === 'Address' ? '#ef4444' : '#38bdf8',
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {listeningField === 'Address' ? <MicOff size={10} /> : <Mic size={10} />}
                              <span>USE VOICE</span>
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Full address for ambulance navigation..."
                            value={residentialAddress}
                            onChange={(e) => setResidentialAddress(e.target.value)}
                            style={{
                              background: '#1a1c29',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              padding: '6px 8px',
                              color: '#f8fafc',
                              fontSize: 12,
                              outline: 'none',
                              resize: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION: Emergency Contacts */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4 }}>
                        <h4 style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#e2e8f0',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}>
                          Emergency Contacts
                        </h4>
                        <button
                          type="button"
                          onClick={handleAddContact}
                          style={{
                            background: '#1d4ed8',
                            color: 'white',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Plus size={11} />
                          <span>ADD CONTACT</span>
                        </button>
                      </div>

                      {emergencyContacts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: 12, background: 'rgba(255,255,255,0.01)', borderRadius: 8 }}>
                          No contacts configured. Add contacts for immediate emergency notifications.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {emergencyContacts.map((contact, idx) => (
                            <div key={idx} style={{
                              display: 'grid',
                              gridTemplateColumns: '3fr 3fr 2fr auto',
                              gap: 6,
                              alignItems: 'center'
                            }}>
                              <input
                                type="text"
                                placeholder="Contact Name"
                                value={contact.name}
                                onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                                style={{
                                  background: '#1a1c29',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 8,
                                  padding: '6px 8px',
                                  color: '#f8fafc',
                                  fontSize: 12,
                                  outline: 'none'
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Phone"
                                value={contact.phone}
                                onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                                style={{
                                  background: '#1a1c29',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 8,
                                  padding: '6px 8px',
                                  color: '#f8fafc',
                                  fontSize: 12,
                                  outline: 'none'
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Relation"
                                value={contact.relation}
                                onChange={(e) => handleContactChange(idx, 'relation', e.target.value)}
                                style={{
                                  background: '#1a1c29',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 8,
                                  padding: '6px 8px',
                                  color: '#f8fafc',
                                  fontSize: 12,
                                  outline: 'none'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveContact(idx)}
                                style={{
                                  background: 'rgba(239,68,68,0.1)',
                                  border: 'none',
                                  color: '#ef4444',
                                  borderRadius: 6,
                                  width: 26,
                                  height: 26,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Save Button */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: savingProfile ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      width: '100%',
                      boxShadow: '0 4px 20px rgba(220,38,38,0.25)'
                    }}
                  >
                    <span>SECURE & SAVE HEALTH PROFILE</span>
                  </button>
                </div>

                {/* RIGHT SIDE: APPEND RECORD & TIMELINE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  {/* CARD: Append New Record */}
                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '12px 16px'
                  }}>
                    <h3 style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#f8fafc',
                      borderLeft: '3px solid #8b5cf6',
                      paddingLeft: 8,
                      marginBottom: 10
                    }}>
                      APPEND NEW RECORD
                    </h3>
                    
                    <form onSubmit={handleCommitRecord} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Record Category</label>
                        <select
                          value={recordCategory}
                          onChange={(e) => setRecordCategory(e.target.value)}
                          style={{
                            background: '#1a1c29',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            color: '#f8fafc',
                            fontSize: 12,
                            outline: 'none'
                          }}
                        >
                          {['Medication Log', 'Vaccine Record', 'Lab Report', 'Clinical Diagnosis', 'Surgery Note', 'Physician Referral'].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Notes / Observations</label>
                          <button
                            type="button"
                            onClick={() => triggerVoiceInput('RecordNotes', recordNotes, setRecordNotes)}
                            style={{
                              marginLeft: 'auto',
                              background: 'none',
                              border: 'none',
                              color: listeningField === 'RecordNotes' ? '#ef4444' : '#38bdf8',
                              fontSize: 9,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            {listeningField === 'RecordNotes' ? <MicOff size={10} /> : <Mic size={10} />}
                            <span>USE VOICE</span>
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Record symptoms, dosages or specialist notes..."
                          value={recordNotes}
                          onChange={(e) => setRecordNotes(e.target.value)}
                          style={{
                            background: '#1a1c29',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            color: '#f8fafc',
                            fontSize: 12,
                            outline: 'none',
                            resize: 'none'
                          }}
                        />
                      </div>

                      {/* File Drag Drop Zone */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Visit Uploads (Photos/PDF)</span>
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleFileDrop}
                          style={{
                            border: '2px dashed rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.01)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                          onClick={() => document.getElementById('record-file-picker')?.click()}
                        >
                          <input
                            type="file"
                            id="record-file-picker"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                          />
                          <Upload size={14} color="#64748b" style={{ margin: '0 auto 4px' }} />
                          <span style={{ fontSize: 10, color: '#cbd5e1', display: 'block' }}>
                            {uploadedFileName ? `Attached: ${uploadedFileName}` : 'DRAG & DROP OR CLICK TO UPLOAD'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={committingRecord}
                        style={{
                          background: '#5b21b6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: committingRecord ? 'not-allowed' : 'pointer',
                          marginTop: 4,
                          boxShadow: '0 4px 15px rgba(139,92,246,0.2)'
                        }}
                      >
                        {committingRecord ? 'Syncing Timeline...' : 'COMMIT TO TIMELINE'}
                      </button>
                    </form>
                  </div>

                  {/* CARD: Dossier history list */}
                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 250,
                    overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        MEDICAL DOSSIER HISTORY
                      </h3>
                      <span style={{
                        background: 'rgba(139,92,246,0.15)',
                        color: '#a78bfa',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4
                      }}>
                        LIFETIME
                      </span>
                    </div>

                    {(!user?.healthProfile?.timeline || user.healthProfile.timeline.length === 0) ? (
                      <div style={{
                        textAlign: 'center',
                        color: '#64748b',
                        padding: '40px 10px',
                        fontSize: 13
                      }}>
                        NO EVENTS LOGGED
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        position: 'relative',
                        paddingLeft: 16,
                        borderLeft: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        {user.healthProfile.timeline.map((event, index) => (
                          <div key={index} style={{ position: 'relative' }}>
                            {/* Dot on line */}
                            <span style={{
                              position: 'absolute',
                              left: -20,
                              top: 4,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              boxShadow: '0 0 6px #8b5cf6'
                            }} />
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#c084fc' }}>{event.category}</span>
                                <span style={{ fontSize: 10, color: '#64748b' }}>{new Date(event.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p style={{ fontSize: 12, color: '#e2e8f0', lineHeight: '1.4' }}>{event.notes}</p>
                              {event.attachmentUrl && (
                                <span style={{
                                  fontSize: 10,
                                  color: '#38bdf8',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginTop: 4,
                                  background: 'rgba(56,189,248,0.08)',
                                  padding: '2px 6px',
                                  borderRadius: 4
                                }}>
                                  📎 Attached Document
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: INSURANCE */}
          {activeTab === 'insurance' && (
            <motion.div
              key="tab-insurance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Insurance Wallet</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>Manage policies and track real-time emergency claims</p>
                </div>
                <button
                  onClick={() => setShowAddClaimModal(true)}
                  style={{
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 24px',
                    fontWeight: 750,
                    cursor: 'pointer',
                    fontSize: 14,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#4f46e5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#6366f1'; }}
                >
                  Submit New Claim
                </button>
              </div>

              {/* Grid Layout: Left: Policies (2/3), Right: Claims (1/3) */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
                
                {/* Policies column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 18, background: '#6366f1', borderRadius: 4 }} />
                    Active Policies
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {policiesList.map((policy) => (
                      <div
                        key={policy._id}
                        style={{
                          background: policy.type === 'health' 
                            ? 'linear-gradient(135deg, #1e3a8a, #0d9488)'
                            : 'linear-gradient(135deg, #581c87, #4f46e5)',
                          borderRadius: 16,
                          padding: '20px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                          height: 190,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ fontSize: 15, fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>
                              {policy.policyName}
                            </h4>
                            <span style={{ fontSize: 9, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.5px' }}>
                              {policy.type.toUpperCase()}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: '#e2e8f0', display: 'block', marginTop: 4 }}>
                            {policy.provider}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: 8, color: '#e2e8f0', display: 'block' }}>POLICY NUMBER</span>
                          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.5px', color: 'white', fontFamily: 'monospace' }}>
                            {policy.policyNumber}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <span style={{ fontSize: 8, color: '#cbd5e1', display: 'block' }}>VALID TILL</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>
                              {new Date(policy.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <span style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>
                            ₹{policy.sumInsured.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Add Policy Box */}
                    <div
                      onClick={() => setShowAddPolicyModal(true)}
                      style={{
                        border: '2px dashed rgba(255,255,255,0.08)',
                        borderRadius: 16,
                        height: 190,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        background: 'rgba(255,255,255,0.01)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.color = '#cbd5e1'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      <Plus size={24} />
                      <span style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Link Insurance Policy</span>
                    </div>
                  </div>
                </div>

                {/* Claims column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 18, background: '#10b981', borderRadius: 4 }} />
                    Recent Claims
                  </h2>

                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 16,
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    minHeight: 190
                  }}>
                    {claimsList.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, color: '#64748b', gap: 8, padding: '20px 0' }}>
                        <span style={{ fontSize: 32 }}>📋</span>
                        <span style={{ fontSize: 12, fontStyle: 'italic' }}>No claims filed yet</span>
                      </div>
                    ) : (
                      claimsList.map((claim) => (
                        <div
                          key={claim._id}
                          style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'white', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {claim.policyId?.policyName || 'General Policy'}
                            </span>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: 20,
                              background: claim.status === 'approved' 
                                ? 'rgba(34,197,94,0.15)'
                                : claim.status === 'rejected'
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(245,158,11,0.15)',
                              color: claim.status === 'approved'
                                ? '#4ade80'
                                : claim.status === 'rejected'
                                ? '#f87171'
                                : '#facc15'
                            }}>
                              {claim.status?.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10, color: '#94a3b8' }}>
                            <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                              ₹{claim.claimAmount?.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 6: SCHEMES */}
          {activeTab === 'schemes' && (
            user?.role === 'superadmin' ? (
              <motion.div
                key="tab-superadmin-schemes"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>India Medical Schemes Explorer 🇮🇳</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>Search, filter, and audit national healthcare programs and welfare benefits</p>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 4 }}>
                  {/* Search */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search schemes by name or description..."
                      value={schemeFilters.search}
                      onChange={(e) => setSchemeFilters((prev: any) => ({ ...prev, search: e.target.value }))}
                      style={{
                        width: '100%',
                        background: '#121420',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '10px 12px 10px 38px',
                        color: '#f8fafc',
                        fontSize: 14,
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* State Filter */}
                  <select
                    value={schemeFilters.state}
                    onChange={(e) => setSchemeFilters((prev: any) => ({ ...prev, state: e.target.value }))}
                    style={{
                      background: '#121420',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 16px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  >
                    <option value="All">All States</option>
                    {schemeMeta.states?.map((st: string) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>

                  {/* Category Filter */}
                  <select
                    value={schemeFilters.category}
                    onChange={(e) => setSchemeFilters((prev: any) => ({ ...prev, category: e.target.value }))}
                    style={{
                      background: '#121420',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 16px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  >
                    <option value="All">All Categories</option>
                    {schemeMeta.categories?.map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {loadingSchemes ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>Loading scheme data...</div>
                ) : schemesList.length === 0 ? (
                  <div style={{
                    border: '2px dashed rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '60px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    No schemes found matching the filters.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                    {schemesList.map(s => (
                      <div
                        key={s._id}
                        style={{
                          background: '#121420',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          height: 240
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <span style={{
                              background: 'rgba(59,130,246,0.15)',
                              color: '#3b82f6',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              textTransform: 'uppercase'
                            }}>{s.category}</span>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>📍 {s.state}</span>
                          </div>
                          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#f8fafc' }}>{s.name}</h4>
                          <p style={{
                            fontSize: 13,
                            color: '#94a3b8',
                            lineHeight: '1.4',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>{s.description}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Launched: {s.launchedYear || 'N/A'}</span>
                          <button
                            onClick={() => setSelectedScheme(s)}
                            style={{
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              color: '#10b981',
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="tab-schemes"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>National Healthcare Schemes</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>Submit claims or check eligibility under public healthcare benefits</p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 2fr',
                  gap: 28
                }}>
                  
                  {/* Available Schemes List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      {
                        name: 'Ayushman Bharat PM-JAY',
                        desc: 'Provides health cover of ₹5 Lakh per family per year for secondary and tertiary care hospitalization.',
                        eligibility: 'Listed socio-economic category families',
                        status: 'Linked Active'
                      },
                      {
                        name: 'Central Government Health Scheme (CGHS)',
                        desc: 'Comprehensive medical care facilities for Central Government employees and pensioners.',
                        eligibility: 'Govt employees and retirees',
                        status: 'Not Enrolled'
                      }
                    ].map(scheme => (
                      <div key={scheme.name} style={{
                        background: '#121420',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 12,
                        padding: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <h4 style={{ fontSize: 16, fontWeight: 700 }}>{scheme.name}</h4>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: scheme.status.includes('Active') ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                            color: scheme.status.includes('Active') ? '#10b981' : '#94a3b8'
                          }}>{scheme.status}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>{scheme.desc}</p>
                        <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                          <strong>Eligibility:</strong> {scheme.eligibility}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Claim Submission Box */}
                  <div style={{
                    background: '#121420',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '24px'
                  }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Submit Reimbursement Claim</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      toast.success("Medical claim submitted to government claims board for audit.", { duration: 5000 });
                    }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Select Scheme</label>
                        <select style={{
                          background: '#1a1c29',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: '#f8fafc',
                          outline: 'none'
                        }}>
                          <option>Ayushman Bharat PM-JAY</option>
                          <option>CGHS Reimbursement</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Claim Amount (INR)</label>
                        <input type="number" placeholder="Ex: 45000" style={{
                          background: '#1a1c29',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: '#f8fafc',
                          outline: 'none'
                        }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Hospital Bill / Receipt PDF</label>
                        <div style={{
                          border: '2px dashed rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.01)',
                          padding: '16px',
                          borderRadius: 8,
                          textAlign: 'center',
                          fontSize: 11,
                          color: '#94a3b8'
                        }}>
                          Drag receipt or click to upload
                        </div>
                      </div>

                      <button type="submit" style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: 6
                      }}>Submit Claim File</button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )
          )}

          {/* TAB 7: BULLETIN */}
          {activeTab === 'bulletin' && (
            <motion.div
              key="tab-bulletin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Bulletin & Fundraisers Hub 📢</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8' }}>Publish safety warnings, clinical alerts, and monitor community fundraisers</p>
                </div>
                {user?.role === 'superadmin' && (
                  <button
                    onClick={() => {
                      setEditingPost(null);
                      setPostForm({
                        title: '',
                        content: '',
                        type: 'announcement',
                        severity: 'info',
                        targetAmount: 0,
                        patientName: '',
                        hospitalName: ''
                      });
                      setShowPostModal(true);
                    }}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 15px rgba(220,38,38,0.2)'
                    }}
                  >
                    <Plus size={16} />
                    <span>Publish Safety Alert</span>
                  </button>
                )}
              </div>

              {loadingPosts ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>Syncing bulletin feed...</div>
              ) : postsList.length === 0 ? (
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '60px',
                  textAlign: 'center',
                  color: '#64748b'
                }}>
                  No bulletin or fundraiser posts active.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                  {postsList.map(post => {
                    const isFundraiser = post.type === 'fundraiser';
                    const percentage = isFundraiser && post.targetAmount > 0 
                      ? Math.min((post.currentAmount / post.targetAmount) * 100, 100) 
                      : 0;

                    const severityColors = {
                      critical: { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.25)' },
                      warning: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
                      info: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' }
                    }[post.severity as 'critical'|'warning'|'info'] || { bg: 'rgba(255,255,255,0.05)', text: '#cbd5e1', border: 'transparent' };

                    return (
                      <div
                        key={post._id}
                        style={{
                          background: '#121420',
                          border: `1px solid ${post.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: 12,
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: 280
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{
                              background: isFundraiser ? 'rgba(139,92,246,0.15)' : severityColors.bg,
                              color: isFundraiser ? '#a78bfa' : severityColors.text,
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              textTransform: 'uppercase',
                              border: isFundraiser ? '1px solid rgba(139,92,246,0.25)' : `1px solid ${severityColors.border}`
                            }}>
                              {isFundraiser ? '💌 FUNDRAISER' : `📢 ${post.severity?.toUpperCase()} ALERT`}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h4 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>{post.title}</h4>
                          <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: '1.5', marginBottom: 16 }}>{post.content}</p>

                          {isFundraiser && (
                            <div style={{
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              borderRadius: 8,
                              padding: '12px 14px',
                              marginBottom: 16,
                              fontSize: 12
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                <div>
                                  <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, display: 'block' }}>PATIENT</span>
                                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{post.patientName || 'N/A'}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, display: 'block' }}>HOSPITAL</span>
                                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{post.hospitalName || 'N/A'}</span>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: '#a78bfa', fontWeight: 700 }}>₹{post.currentAmount?.toLocaleString()} raised</span>
                                <span style={{ color: '#94a3b8' }}>of ₹{post.targetAmount?.toLocaleString()}</span>
                              </div>
                              <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${percentage}%`, background: '#8b5cf6', borderRadius: 3 }} />
                              </div>
                              <div style={{ textAlign: 'right', fontSize: 10, color: '#64748b', marginTop: 4 }}>
                                {percentage.toFixed(0)}% Completed
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            By: {post.createdBy?.name || 'Admin'}
                          </span>
                          
                          {user?.role === 'superadmin' ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => {
                                  setEditingPost(post);
                                  setPostForm({
                                    title: post.title,
                                    content: post.content,
                                    type: post.type,
                                    severity: post.severity || 'info',
                                    targetAmount: post.targetAmount || 0,
                                    patientName: post.patientName || '',
                                    hospitalName: post.hospitalName || ''
                                  });
                                  setShowPostModal(true);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#38bdf8',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: 700
                                }}
                              >
                                <Edit2 size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => deletePost(post._id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: 700
                                }}
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            isFundraiser && (
                              <button
                                onClick={() => {
                                  const amt = prompt("Enter amount to donate (INR):");
                                  if (amt && !isNaN(Number(amt))) {
                                    api.put(`/posts/${post._id}`, { currentAmount: (post.currentAmount || 0) + Number(amt) })
                                      .then(() => {
                                        toast.success("Contribution recorded! Thank you for your support.");
                                        loadPosts();
                                      });
                                  }
                                }}
                                style={{
                                  background: 'rgba(139,92,246,0.1)',
                                  border: '1px solid rgba(139,92,246,0.2)',
                                  color: '#a78bfa',
                                  borderRadius: 8,
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Support Fundraiser
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 8: LIVE MAP */}
          {activeTab === 'livemap' && (() => {
            const ambulanceMarkerIcon = L.divIcon({
              className: '',
              html: `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="6" width="26" height="18" rx="4" fill="#1e1b4b" stroke="#3b82f6" stroke-width="2"/>
                <circle cx="8" cy="24" r="3" fill="#3b82f6"/>
                <circle cx="22" cy="24" r="3" fill="#3b82f6"/>
                <path d="M20 10h6v6h-6z" fill="#38bdf8"/>
                <text x="11" y="18" fill="white" font-size="9" font-weight="bold">AMB</text>
              </svg>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });

            return (
              <motion.div
                key="tab-livemap"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 170px)' }}
              >
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Real-Time Fleet & GPS Tracking</h1>
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>Tracking active dispatch assets, hospitals, and reported emergency incidents</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3.2fr 1fr', gap: 24, height: 'calc(100% - 60px)', overflow: 'hidden' }}>
                  {/* Left Side: MapContainer */}
                  <div style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                    height: '100%'
                  }}>
                    <MapContainer
                      center={userCoords}
                      zoom={13}
                      style={{ width: '100%', height: '100%', zIndex: 1 }}
                    >
                      <ChangeMapView coords={mapCenter} />
                      
                      <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Dark Mode Map">
                          <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution="&copy; <a href='https://carto.com/'>CartoDB</a>"
                          />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Street Map">
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors"
                          />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite Map">
                          <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles &copy; Esri &mdash; Source: Esri"
                          />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Google Map">
                          <TileLayer
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            attribution="&copy; Google Maps"
                          />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Google Hybrid">
                          <TileLayer
                            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            attribution="&copy; Google Maps"
                          />
                        </LayersControl.BaseLayer>
                      </LayersControl>

                      {/* Patient location marker */}
                      <Marker position={userCoords} icon={patientMarkerIcon}>
                        <Popup>
                          <div style={{ color: '#000' }}>
                            <strong>Your Location</strong><br />
                            GPS Coordinate: {userCoords[0].toFixed(4)}, {userCoords[1].toFixed(4)}
                          </div>
                        </Popup>
                      </Marker>

                      {/* Seeded hospitals markers */}
                      {hospitalsList.map(h => (
                        <Marker key={h._id} position={[h.location.lat, h.location.lng]} icon={hospitalMarkerIcon}>
                          <Popup>
                            <div style={{ color: '#000', minWidth: 140 }}>
                              <strong>{h.name}</strong><br />
                              Beds Available: {h.availableBeds}/{h.totalBeds}<br />
                              ICU Available: {h.availableIcuBeds}/{h.icuBeds}
                            </div>
                          </Popup>
                        </Marker>
                      ))}

                      {/* Ambulances markers */}
                      {ambulancesList
                        .filter(a => a.currentLocation && a.currentLocation.lat && a.currentLocation.lng)
                        .map(a => (
                          <Marker key={a._id} position={[a.currentLocation.lat, a.currentLocation.lng]} icon={ambulanceMarkerIcon}>
                            <Popup>
                              <div style={{ color: '#000', minWidth: 140 }}>
                                <strong>Unit: {a.vehicleNumber}</strong><br />
                                Driver: {a.driverName || 'N/A'}<br />
                                Status: <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{a.status}</span>
                              </div>
                            </Popup>
                          </Marker>
                        ))
                      }

                      {/* Active emergencies list */}
                      {emergenciesList
                        .filter(e => ['pending', 'accepted', 'in_progress'].includes(e.status))
                        .map(e => (
                          <Marker key={e._id} position={[e.location.lat, e.location.lng]} icon={incidentMarkerIcon}>
                            <Popup>
                              <div style={{ color: '#000' }}>
                                <strong>🚨 {e.incidentType?.toUpperCase()}</strong><br />
                                Severity: {e.severity}<br />
                                Status: {e.status}
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                    </MapContainer>
                  </div>

                  {/* Right Side: Tracking Panel */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    height: '100%',
                    overflowY: 'auto',
                    paddingRight: 4
                  }}>
                    {/* Active Fleet Tracking */}
                    <div style={{
                      background: '#121420',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12,
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px', borderBottom: '1px solid rgba(56,189,248,0.15)', paddingBottom: 6 }}>
                        ACTIVE FLEET TRACKING ({ambulancesList.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {ambulancesList.map(a => {
                          const statusColor = a.status === 'available' ? '#10b981' : a.status === 'busy' ? '#fb923c' : '#ef4444';
                          return (
                            <div
                              key={a._id}
                              onClick={() => {
                                if (a.currentLocation?.lat && a.currentLocation?.lng) {
                                  setMapCenter([a.currentLocation.lat, a.currentLocation.lng]);
                                  toast.success(`Panning map to ${a.vehicleNumber}`);
                                } else {
                                  toast.error(`No GPS telemetry signal for unit ${a.vehicleNumber}`);
                                }
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.01)',
                                border: '1px solid rgba(255,255,255,0.03)',
                                borderRadius: 8,
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'border-color 0.2s'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.3)')}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)')}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{a.vehicleNumber}</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{a.driverName || 'Responder Driver'}</div>
                              </div>
                              <span style={{
                                background: `${statusColor}15`,
                                color: statusColor,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                textTransform: 'uppercase'
                              }}>{a.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hospital Bed Availability Triage */}
                    <div style={{
                      background: '#121420',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12,
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#10b981', letterSpacing: '0.5px', borderBottom: '1px solid rgba(16,185,129,0.15)', paddingBottom: 6 }}>
                        HOSPITAL BED CAPACITY
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {hospitalsList.map(h => (
                          <div
                            key={h._id}
                            onClick={() => {
                              setMapCenter([h.location.lat, h.location.lng]);
                              toast.success(`Panning map to ${h.name}`);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              borderRadius: 8,
                              padding: '10px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              transition: 'border-color 0.2s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)')}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{h.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                              <span style={{ color: '#64748b' }}>Beds: <strong style={{ color: '#cbd5e1' }}>{h.availableBeds}/{h.totalBeds}</strong></span>
                              <span style={{ color: '#64748b' }}>ICU: <strong style={{ color: '#ef4444' }}>{h.availableIcuBeds}/{h.icuBeds}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

        </AnimatePresence>
      </main>

      {/* REPORT INCIDENT MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#dc2626' }}>🚨</span> Report Emergency Incident
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                This triggers a direct security and medical SOS to the Operations Hub.
              </p>

              <form onSubmit={handleReportIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Emergency Category</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  >
                    <option value="medical">Medical / Health emergency</option>
                    <option value="accident">Road collision / Accident</option>
                    <option value="fire">Fire outbreak</option>
                    <option value="natural_disaster">Natural disaster / Storm</option>
                    <option value="crime">Crime / Assault</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Landmark / Place details</label>
                  <input
                    type="text"
                    placeholder="Ex: Corner of 5th cross road, near central park"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Incident Description</label>
                  <textarea
                    rows={3}
                    placeholder="What symptoms or injuries do you observe?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Victims</label>
                    <input
                      type="number"
                      min="1"
                      value={victimCount}
                      onChange={(e) => setVictimCount(parseInt(e.target.value) || 1)}
                      style={{
                        background: '#1a1c29',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        color: '#f8fafc',
                        fontSize: 14,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
                    <input
                      type="checkbox"
                      id="modal-highway"
                      checked={isHighway}
                      onChange={(e) => setIsHighway(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <label htmlFor="modal-highway" style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>Is Highway?</label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#f8fafc',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingIncident}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: 8,
                      background: '#dc2626',
                      border: 'none',
                      color: 'white',
                      fontWeight: 700,
                      cursor: submittingIncident ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(220,38,38,0.3)'
                    }}
                  >
                    {submittingIncident ? 'Reporting...' : '🚨 Report SOS'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SCHEME DETAIL MODAL */}
      <AnimatePresence>
        {selectedScheme && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 600,
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <span style={{
                    background: 'rgba(59,130,246,0.15)',
                    color: '#3b82f6',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase'
                  }}>{selectedScheme.category}</span>
                  <h3 style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: '#f8fafc' }}>{selectedScheme.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedScheme(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cbd5e1',
                    fontSize: 20,
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, lineHeight: '1.5' }}>
                <div>
                  <strong style={{ color: '#94a3b8', display: 'block', marginBottom: 4 }}>Description</strong>
                  <p style={{ color: '#cbd5e1' }}>{selectedScheme.description}</p>
                </div>

                {selectedScheme.benefits && selectedScheme.benefits.length > 0 && (
                  <div>
                    <strong style={{ color: '#94a3b8', display: 'block', marginBottom: 4 }}>Benefits & Coverage</strong>
                    <ul style={{ paddingLeft: 16, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selectedScheme.benefits.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <strong style={{ color: '#94a3b8', display: 'block', marginBottom: 4 }}>Eligibility Criteria</strong>
                  <p style={{ color: '#cbd5e1' }}>{selectedScheme.eligibility}</p>
                </div>

                {selectedScheme.documentsRequired && selectedScheme.documentsRequired.length > 0 && (
                  <div>
                    <strong style={{ color: '#94a3b8', display: 'block', marginBottom: 4 }}>Documents Required</strong>
                    <ul style={{ paddingLeft: 16, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selectedScheme.documentsRequired.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8 }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, display: 'block' }}>STATE JURISDICTION</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{selectedScheme.state}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, display: 'block' }}>LAUNCHED YEAR</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{selectedScheme.launchedYear || 'N/A'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    onClick={() => setSelectedScheme(null)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#f8fafc',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                  {selectedScheme.officialLink && (
                    <a
                      href={selectedScheme.officialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: 8,
                        background: '#10b981',
                        color: 'white',
                        fontWeight: 700,
                        textAlign: 'center',
                        textDecoration: 'none',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.2)'
                      }}
                    >
                      Visit Official Portal ↗
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LINK INSURANCE POLICY MODAL */}
      <AnimatePresence>
        {showAddPolicyModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 460,
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                💳 Link Health/Life Insurance
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                Link your active medical policy to enable instant claim settlement.
              </p>

              <form onSubmit={handleLinkPolicy} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Policy Name</label>
                    <input
                      type="text"
                      required
                      value={policyForm.policyName}
                      onChange={(e) => setPolicyForm(p => ({ ...p, policyName: e.target.value }))}
                      placeholder="e.g. Star Health Shield"
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Policy Number</label>
                    <input
                      type="text"
                      required
                      value={policyForm.policyNumber}
                      onChange={(e) => setPolicyForm(p => ({ ...p, policyNumber: e.target.value }))}
                      placeholder="e.g. HLT-9082-127"
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Type</label>
                    <select
                      value={policyForm.type}
                      onChange={(e) => setPolicyForm(p => ({ ...p, type: e.target.value }))}
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13, height: 38 }}
                    >
                      <option value="health">Health Insurance</option>
                      <option value="life">Life Insurance</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Insurance Provider</label>
                    <input
                      type="text"
                      required
                      value={policyForm.provider}
                      onChange={(e) => setPolicyForm(p => ({ ...p, provider: e.target.value }))}
                      placeholder="Star Health / HDFC Ergo"
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Sum Insured (₹)</label>
                    <input
                      type="number"
                      required
                      value={policyForm.sumInsured}
                      onChange={(e) => setPolicyForm(p => ({ ...p, sumInsured: Number(e.target.value) }))}
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Premium (₹)</label>
                    <input
                      type="number"
                      required
                      value={policyForm.premium}
                      onChange={(e) => setPolicyForm(p => ({ ...p, premium: Number(e.target.value) }))}
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Start Date</label>
                    <input
                      type="date"
                      required
                      value={policyForm.startDate}
                      onChange={(e) => setPolicyForm(p => ({ ...p, startDate: e.target.value }))}
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>End Date</label>
                    <input
                      type="date"
                      required
                      value={policyForm.endDate}
                      onChange={(e) => setPolicyForm(p => ({ ...p, endDate: e.target.value }))}
                      style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 14, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddPolicyModal(false)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: '#6366f1', border: 'none', color: 'white', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Link Policy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUBMIT CLAIM MODAL */}
      <AnimatePresence>
        {showAddClaimModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 440,
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                🚀 File Insurance Claim
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                File a new medical claim under your linked insurance policy.
              </p>

              <form onSubmit={handleFileClaim} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Select Policy *</label>
                  <select
                    required
                    value={claimForm.policyId}
                    onChange={(e) => setClaimForm(p => ({ ...p, policyId: e.target.value }))}
                    style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13, height: 38 }}
                  >
                    <option value="">Choose a linked policy...</option>
                    {policiesList.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.policyName} ({p.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Claim Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={claimForm.claimAmount}
                    onChange={(e) => setClaimForm(p => ({ ...p, claimAmount: Number(e.target.value) }))}
                    style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Reason / Incident Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={claimForm.reason}
                    onChange={(e) => setClaimForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Provide details about the medical emergency..."
                    style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13, resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Assigned Emergency (Optional)</label>
                  <select
                    value={claimForm.emergencyId}
                    onChange={(e) => setClaimForm(p => ({ ...p, emergencyId: e.target.value }))}
                    style={{ background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 13, height: 38 }}
                  >
                    <option value="">Not linked to an emergency</option>
                    {emergenciesList.map(e => (
                      <option key={e._id} value={e._id}>
                        {new Date(e.createdAt).toLocaleDateString()} - {e.incidentType} ({e.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 14, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddClaimModal(false)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: '#10b981', border: 'none', color: 'white', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    File Claim
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULLETIN PUBLISH / EDIT MODAL */}
      <AnimatePresence>
        {showPostModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 500,
                background: '#121420',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📢</span> {editingPost ? 'Edit Bulletin Post' : 'Publish Safety Alert / Bulletin'}
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                Safety bulletins are broadcast live to all citizen dashboards immediately.
              </p>

              <form onSubmit={createOrUpdatePost} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Post Title</label>
                  <input
                    type="text"
                    required
                    value={postForm.title}
                    onChange={(e) => setPostForm((prev: any) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter descriptive post title..."
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Post Type</label>
                  <select
                    value={postForm.type}
                    onChange={(e) => setPostForm((prev: any) => ({ ...prev, type: e.target.value }))}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  >
                    <option value="announcement">Announcement / Safety Bulletin</option>
                    <option value="fundraiser">Medical Fundraiser</option>
                    <option value="emergency_alert">Broadcast SOS Alert</option>
                  </select>
                </div>

                {postForm.type !== 'fundraiser' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Alert Severity</label>
                    <select
                      value={postForm.severity}
                      onChange={(e) => setPostForm((prev: any) => ({ ...prev, severity: e.target.value }))}
                      style={{
                        background: '#1a1c29',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        color: '#f8fafc',
                        fontSize: 14,
                        outline: 'none'
                      }}
                    >
                      <option value="info">Info (Standard Bulletin)</option>
                      <option value="warning">Warning (High Alert)</option>
                      <option value="critical">Critical (Immediate Danger)</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Patient Name</label>
                        <input
                          type="text"
                          required
                          value={postForm.patientName}
                          onChange={(e) => setPostForm((prev: any) => ({ ...prev, patientName: e.target.value }))}
                          placeholder="Patient Full Name"
                          style={{
                            background: '#1a1c29',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            color: '#f8fafc',
                            fontSize: 14,
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Hospital Facility</label>
                        <input
                          type="text"
                          required
                          value={postForm.hospitalName}
                          onChange={(e) => setPostForm((prev: any) => ({ ...prev, hospitalName: e.target.value }))}
                          placeholder="Ex: Fortis Triage"
                          style={{
                            background: '#1a1c29',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            color: '#f8fafc',
                            fontSize: 14,
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Target Donation Amount (INR)</label>
                      <input
                        type="number"
                        required
                        value={postForm.targetAmount}
                        onChange={(e) => setPostForm((prev: any) => ({ ...prev, targetAmount: parseInt(e.target.value) || 0 }))}
                        placeholder="Ex: 500000"
                        style={{
                          background: '#1a1c29',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: '#f8fafc',
                          fontSize: 14,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Post Content / Details</label>
                  <textarea
                    rows={4}
                    required
                    value={postForm.content}
                    onChange={(e) => setPostForm((prev: any) => ({ ...prev, content: e.target.value }))}
                    placeholder="Write details of safety advisory, warning protocols or fundraiser cause here..."
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#f8fafc',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: 8,
                      background: '#dc2626',
                      border: 'none',
                      color: 'white',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(220,38,38,0.3)'
                    }}
                  >
                    {editingPost ? 'Save Updates' : 'Publish Alert'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
