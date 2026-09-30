import React, { useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAppStore } from './store/useAppStore';
import { socketService, SOCKET_EVENTS } from './services/socket';
import { emergency as emergencyApi, ambulance as ambulanceApi, hospital as hospitalApi, analytics as analyticsApi } from './services/api';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/Login';
import DispatchMap from './pages/DispatchMap';
import Analytics from './pages/Analytics';
import FleetManager from './pages/FleetManager';
import HospitalManager from './pages/HospitalManager';
import Diagnostics from './pages/Diagnostics';
import CitizenPortal from './pages/citizen/CitizenPortal';
import MedicalDossier from './pages/MedicalDossier';
import SuperadminDashboard from './pages/SuperadminDashboard';

import type { Emergency, Ambulance } from './types';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function MainLayout() {
  const { user, setEmergencies, setAmbulances, setHospitals, setAnalytics, addEmergency, updateAmbulance, addNotification, sidebarCollapsed } = useAppStore();

  const loadInitialData = useCallback(async () => {
    try {
      const [emRes, ambRes, hospRes, analyticsRes] = await Promise.allSettled([
        emergencyApi.getActive(),
        ambulanceApi.getAll(),
        hospitalApi.getAll(),
        analyticsApi.getSummary(),
      ]);

      if (emRes.status === 'fulfilled') setEmergencies(emRes.value.data.emergencies || []);
      if (ambRes.status === 'fulfilled') setAmbulances(ambRes.value.data.ambulances || []);
      if (hospRes.status === 'fulfilled') setHospitals(hospRes.value.data.hospitals || []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.summary);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, [setEmergencies, setAmbulances, setHospitals, setAnalytics]);

  useEffect(() => {
    if (!user) return;

    // Connect socket
    socketService.connect();
    socketService.joinAdminRoom(user._id);

    // Socket event handlers
    const handleNewEmergency = (data: { emergency: Emergency }) => {
      addEmergency(data.emergency);
      addNotification({
        type: 'new_emergency',
        title: `🚨 New ${data.emergency?.incidentType || 'Emergency'}`,
        message: data.emergency?.location?.address || 'Location being tracked',
        severity: data.emergency?.severity,
      });

      const isUrgent = data.emergency?.severity === 'critical' || data.emergency?.severity === 'high';
      if (isUrgent) {
        toast.error(`🚨 CRITICAL EMERGENCY: ${data.emergency?.incidentType?.toUpperCase()}`, { duration: 8000 });
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA==');
          audio.play().catch(() => {});
        } catch {}
        if ((window as any).electronAPI?.showNotification) {
          (window as any).electronAPI.showNotification('🚨 CRITICAL EMERGENCY', `${data.emergency?.incidentType} at ${data.emergency?.location?.address}`);
        }
      } else {
        toast(`New ${data.emergency?.incidentType} emergency reported`, { icon: '🚑' });
      }
    };

    const handleAmbulanceLocation = (data: { ambulanceId: string; lat: number; lng: number }) => {
      updateAmbulance(data.ambulanceId, {
        currentLocation: { lat: data.lat, lng: data.lng, lastUpdated: new Date().toISOString() },
      });
    };

    const handleAssignmentConfirmed = (data: any) => {
      addNotification({
        type: 'assignment_confirmed',
        title: '✅ Dispatch Confirmed',
        message: `Ambulance ${data.vehicleNumber} dispatched`,
      });
      toast.success(`Ambulance ${data.vehicleNumber} dispatched successfully`);
      loadInitialData();
    };

    const handleStatusUpdate = (data: any) => {
      toast(`Emergency status updated: ${data.status}`, { icon: '📊' });
      loadInitialData();
    };

    socketService.on(SOCKET_EVENTS.NEW_EMERGENCY, handleNewEmergency);
    socketService.on(SOCKET_EVENTS.AMBULANCE_LOCATION, handleAmbulanceLocation);
    socketService.on(SOCKET_EVENTS.ASSIGNMENT_CONFIRMED, handleAssignmentConfirmed);
    socketService.on(SOCKET_EVENTS.STATUS_UPDATE, handleStatusUpdate);

    loadInitialData();
    const interval = setInterval(loadInitialData, 30000);

    return () => {
      socketService.off(SOCKET_EVENTS.NEW_EMERGENCY, handleNewEmergency);
      socketService.off(SOCKET_EVENTS.AMBULANCE_LOCATION, handleAmbulanceLocation);
      socketService.off(SOCKET_EVENTS.ASSIGNMENT_CONFIRMED, handleAssignmentConfirmed);
      socketService.off(SOCKET_EVENTS.STATUS_UPDATE, handleStatusUpdate);
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <div className="page-body">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/dispatch" replace />} />
              <Route path="/dispatch" element={
                <motion.div key="dispatch" {...pageVariants} style={{ height: '100%' }}>
                  <DispatchMap />
                </motion.div>
              } />
              <Route path="/analytics" element={
                <motion.div key="analytics" {...pageVariants}>
                  <Analytics />
                </motion.div>
              } />
              <Route path="/fleet" element={
                <motion.div key="fleet" {...pageVariants}>
                  <FleetManager />
                </motion.div>
              } />
              <Route path="/hospitals" element={
                <motion.div key="hospitals" {...pageVariants}>
                  <HospitalManager />
                </motion.div>
              } />
              <Route path="/diagnostics" element={
                <motion.div key="diagnostics" {...pageVariants}>
                  <Diagnostics />
                </motion.div>
              } />
              <Route path="/medical-dossier/:userId" element={
                <motion.div key="medical-dossier" {...pageVariants}>
                  <MedicalDossier />
                </motion.div>
              } />
              <Route path="/superadmin" element={
                user?.role === 'superadmin' ? (
                  <motion.div key="superadmin" {...pageVariants}>
                    <SuperadminDashboard />
                  </motion.div>
                ) : (
                  <Navigate to="/dispatch" replace />
                )
              } />
            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, token } = useAppStore();
  const isAuthenticated = !!(user && token);
  const isCitizen = user?.role === 'patient' || user?.role === 'user' || user?.role === 'superadmin';

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage /> : (isCitizen ? <Navigate to="/dashboard" replace /> : <Navigate to="/dispatch" replace />)} 
      />
      <Route 
        path="/*" 
        element={isAuthenticated ? (isCitizen ? <CitizenPortal /> : <MainLayout />) : <Navigate to="/login" replace />} 
      />
    </Routes>
  );
}
