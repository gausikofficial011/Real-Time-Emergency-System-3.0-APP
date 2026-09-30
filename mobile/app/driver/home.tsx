import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAppStore } from '../../store/useAppStore';
import { ambulance as ambulanceApi, emergency as emergencyApi } from '../../services/api';
import { socketService } from '../../services/socket';
import { startBackgroundLocationUpdates, stopBackgroundLocationUpdates } from '../../services/location-task';
import { Colors, Radius, Spacing, Shadow, INCIDENT_ICONS } from '../../constants/theme';

export default function DriverHome() {
  const router = useRouter();
  const { user, currentEmergency, setCurrentEmergency, logout } = useAppStore();
  
  const [driverStatus, setDriverStatus] = useState<string>('available');
  const [ambulanceDetails, setAmbulanceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [locationTrackingActive, setLocationTrackingActive] = useState(false);

  // Fetch ambulance details and active emergency on load
  const fetchDriverState = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Find ambulance by driver user ID or vehicle Number
      // For demo / simple simulation, we look up the driver's profile details
      if (user.driverProfile?.currentAmbulance) {
        setDriverStatus(user.driverProfile.currentStatus || 'available');
      }
      
      // Let's check for any active emergency matching dispatch
      // We can fetch active and filter
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverState();

    // Sockets
    if (user?._id) {
      socketService.connect();
      socketService.joinRoom(user._id, 'driver');
    }

    // Subscribe to assignments
    const handleNewAssignment = (data: any) => {
      // data holds the assigned emergency details
      Alert.alert('🚨 Emergency Dispatched!', 'You have been assigned to a new incident.');
      setCurrentEmergency(data.emergency || data);
      setDriverStatus('dispatched');
    };

    socketService.on('ambulance_assigned', handleNewAssignment);
    socketService.on('dispatch_assigned', handleNewAssignment);

    return () => {
      socketService.off('ambulance_assigned', handleNewAssignment);
      socketService.off('dispatch_assigned', handleNewAssignment);
    };
  }, [user]);

  // Location push loop
  useEffect(() => {
    let locationTimer: any = null;

    const startLocationPush = async () => {
      let { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
      if (foreStatus !== 'granted') return;

      // Start background task
      await startBackgroundLocationUpdates();

      setLocationTrackingActive(true);
      locationTimer = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          // Send to socket
          socketService.updateDriverLocation(user?._id || '', loc.coords.latitude, loc.coords.longitude);

          // Update backend DB
          if (user?.driverProfile?.currentAmbulance) {
            await ambulanceApi.updateLocation(
              user.driverProfile.currentAmbulance,
              loc.coords.latitude,
              loc.coords.longitude
            );
          }
        } catch (err) {
          console.log('Location update skipped:', err);
        }
      }, 10000);
    };

    if (user && driverStatus !== 'maintenance') {
      startLocationPush();
    }

    return () => {
      if (locationTimer) clearInterval(locationTimer);
      stopBackgroundLocationUpdates();
      setLocationTrackingActive(false);
    };
  }, [user, driverStatus]);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      setDriverStatus(newStatus);
      
      // Update ambulance status in backend
      const ambId = user?.driverProfile?.currentAmbulance || 'amb_id_dummy';
      await ambulanceApi.updateStatus(ambId, newStatus);
      
      socketService.emit('status_change', { ambulanceId: ambId, status: newStatus });
      toastMessage(newStatus);
    } catch (e) {
      Alert.alert('Status sync failed', 'Please verify backend availability.');
    } finally {
      setLoading(false);
    }
  };

  const toastMessage = (status: string) => {
    let msg = '';
    switch (status) {
      case 'available': msg = 'You are marked as available for dispatch.'; break;
      case 'on_scene': msg = 'Marked as arrived on scene.'; break;
      case 'returning': msg = 'Returning to station.'; break;
      case 'maintenance': msg = 'Marked under maintenance.'; break;
    }
    Alert.alert('Status Synced', msg);
  };

  const getStatusBtnStyle = (status: string) => {
    if (driverStatus === status) {
      switch (status) {
        case 'available': return styles.statusBtnAvailable;
        case 'dispatched': return styles.statusBtnDispatched;
        case 'on_scene': return styles.statusBtnOnScene;
        case 'returning': return styles.statusBtnReturning;
        default: return styles.statusBtnMaint;
      }
    }
    return styles.statusBtnInactive;
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Ambulance Console</Text>
          <Text style={styles.userName}>{user?.name || 'Driver'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Dashboard Panel */}
        <View style={styles.dashboardCard}>
          <Text style={styles.sectionLabel}>CURRENT STATUS DASHBOARD</Text>
          <View style={styles.statusDisplay}>
            <View style={[styles.statusDot, { backgroundColor: Colors.white }]} />
            <Text style={styles.statusDisplayText}>{driverStatus.toUpperCase()}</Text>
            {locationTrackingActive && (
              <Text style={styles.trackingIndicator}>📡 GPS LIVE</Text>
            )}
          </View>

          <View style={styles.statusButtons}>
            <TouchableOpacity 
              style={[styles.statusBtn, getStatusBtnStyle('available')]}
              onPress={() => updateStatus('available')}
              disabled={loading}
            >
              <Text style={styles.statusBtnText}>Available</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statusBtn, getStatusBtnStyle('on_scene')]}
              onPress={() => updateStatus('on_scene')}
              disabled={loading}
            >
              <Text style={styles.statusBtnText}>On Scene</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statusBtn, getStatusBtnStyle('returning')]}
              onPress={() => updateStatus('returning')}
              disabled={loading}
            >
              <Text style={styles.statusBtnText}>Returning</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statusBtn, getStatusBtnStyle('maintenance')]}
              onPress={() => updateStatus('maintenance')}
              disabled={loading}
            >
              <Text style={styles.statusBtnText}>Out of Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Dispatch Request Card */}
        {currentEmergency ? (
          <View style={styles.dispatchCard}>
            <View style={styles.dispatchHeader}>
              <Text style={styles.dispatchBadge}>ACTIVE MISSION</Text>
              <Text style={styles.severityBadge}>{currentEmergency.severity.toUpperCase()}</Text>
            </View>

            <Text style={styles.incidentTitle}>
              {INCIDENT_ICONS[currentEmergency.incidentType]} {currentEmergency.incidentType.toUpperCase()}
            </Text>
            
            <View style={styles.incidentDetails}>
              <Text style={styles.detailLabel}>INCIDENT LOCATION</Text>
              <Text style={styles.detailValue}>{currentEmergency.location.address}</Text>

              <Text style={styles.detailLabel}>REPORTED DESCRIPTION</Text>
              <Text style={styles.detailValue}>
                {currentEmergency.description || 'No additional description provided.'}
              </Text>

              <Text style={styles.detailLabel}>PATIENT VICTIMS</Text>
              <Text style={styles.detailValue}>{currentEmergency.victimCount} patient(s)</Text>
            </View>

            <View style={styles.dispatchBtns}>
              <TouchableOpacity 
                style={styles.navBtn}
                onPress={() => router.push('/driver/navigation')}
              >
                <Text style={styles.navBtnText}>🗺️ OPEN MISSION NAVIGATION</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.scanBtn}
                onPress={() => router.push('/driver/scanner')}
              >
                <Text style={styles.scanBtnText}>📷 SCAN PATIENT MEDICAL ID</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardEmoji}>😴</Text>
            <Text style={styles.emptyCardTitle}>No Active Dispatch</Text>
            <Text style={styles.emptyCardSub}>
              Ensure you are marked 'AVAILABLE' to receive incoming emergency dispatches.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  welcomeText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  userName: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutBtnText: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dashboardCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textSubtle,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  statusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDisplayText: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    flex: 1,
  },
  trackingIndicator: {
    color: Colors.success,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusBtnInactive: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  statusBtnAvailable: {
    backgroundColor: Colors.successGlow,
    borderColor: Colors.success,
  },
  statusBtnDispatched: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  statusBtnOnScene: {
    backgroundColor: Colors.purpleGlow,
    borderColor: Colors.purple,
  },
  statusBtnReturning: {
    backgroundColor: Colors.infoGlow,
    borderColor: Colors.info,
  },
  statusBtnMaint: {
    backgroundColor: Colors.surfaceHigh,
    borderColor: Colors.textSubtle,
  },
  statusBtnText: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  dispatchCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    ...Shadow.md,
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dispatchBadge: {
    color: Colors.primary,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  severityBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    color: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  incidentTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  incidentDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.textSubtle,
    letterSpacing: 0.5,
  },
  detailValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  dispatchBtns: {
    gap: 8,
  },
  navBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    ...Shadow.red,
  },
  navBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  scanBtn: {
    backgroundColor: Colors.info,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  scanBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCardEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyCardTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  emptyCardSub: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
});
