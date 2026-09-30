import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAppStore } from '../../store/useAppStore';
import { emergency as emergencyApi, ambulance as ambulanceApi } from '../../services/api';
import { socketService } from '../../services/socket';
import { Colors, Radius, Spacing, Shadow, STATUS_COLORS } from '../../constants/theme';

export default function ActiveNavigation() {
  const router = useRouter();
  const { currentEmergency, setCurrentEmergency, user } = useAppStore();
  const [missionPhase, setMissionPhase] = useState<'to_patient' | 'to_hospital'>('to_patient');
  
  // Coordinates
  const [ambulanceLoc, setAmbulanceLoc] = useState({ lat: 28.5672, lng: 77.2100 });
  const [patientLoc, setPatientLoc] = useState({ lat: 28.5650, lng: 77.2120 });
  const [hospitalLoc, setHospitalLoc] = useState({ lat: 28.5680, lng: 77.2150 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentEmergency) return;

    // Load static coordinates
    setPatientLoc({
      lat: currentEmergency.location.lat,
      lng: currentEmergency.location.lng,
    });

    if (currentEmergency.assignedHospital && typeof currentEmergency.assignedHospital !== 'string') {
      setHospitalLoc({
        lat: currentEmergency.assignedHospital.location.lat,
        lng: currentEmergency.assignedHospital.location.lng,
      });
    }

    // Set active mission phase based on emergency status
    if (currentEmergency.status === 'in_progress' || currentEmergency.status === 'resolved') {
      setMissionPhase('to_hospital');
    } else {
      setMissionPhase('to_patient');
    }

    // Subscribe to driver location changes to update map local marker
    let locationWatcher: any = null;
    const watchLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (loc) => {
          setAmbulanceLoc({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      );
    };

    watchLocation();

    return () => {
      if (locationWatcher) locationWatcher.remove();
    };
  }, [currentEmergency]);

  const handleStatusTransition = async () => {
    if (!currentEmergency) return;
    setLoading(true);
    try {
      const ambId = user?.driverProfile?.currentAmbulance || 'amb_dummy_id';

      if (missionPhase === 'to_patient') {
        // Mark as arrived on scene -> transitions status to in_progress
        const newStatus = 'in_progress';
        await emergencyApi.updateStatus(currentEmergency._id, newStatus, 'Ambulance crew arrived on scene.');
        await ambulanceApi.updateStatus(ambId, 'on_scene');
        
        socketService.emit('status_change', { ambulanceId: ambId, status: 'on_scene' });
        
        // Update local state
        setCurrentEmergency({ ...currentEmergency, status: newStatus });
        setMissionPhase('to_hospital');
        Alert.alert('On Scene', 'Status updated to On Scene. Routing to hospital.');
      } else {
        // Mark as resolved -> transitions status to resolved
        const newStatus = 'resolved';
        await emergencyApi.updateStatus(currentEmergency._id, newStatus, 'Patient safely admitted to hospital.');
        await ambulanceApi.updateStatus(ambId, 'available');

        socketService.emit('status_change', { ambulanceId: ambId, status: 'available' });
        
        setCurrentEmergency(null);
        Alert.alert('Mission Complete', 'Emergency incident successfully resolved.');
        router.replace('/driver/home');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Transition failed', e?.response?.data?.message || 'Failed to update mission status.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentEmergency) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active mission found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/driver/home')}>
          <Text style={styles.backBtnText}>Return to Console</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#f8fafc" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#cbd5e1" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#bae6fd" }] }
  ];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: ambulanceLoc.lat,
          longitude: ambulanceLoc.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
      >
        {/* Ambulance Marker */}
        <Marker
          coordinate={{ latitude: ambulanceLoc.lat, longitude: ambulanceLoc.lng }}
          title="Ambulance (You)"
          pinColor={Colors.info}
        >
          <View style={styles.markerCircle}>
            <Text style={styles.markerEmoji}>🚑</Text>
          </View>
        </Marker>

        {/* Patient Marker */}
        <Marker
          coordinate={{ latitude: patientLoc.lat, longitude: patientLoc.lng }}
          title="Patient Location"
          pinColor={Colors.primary}
        />

        {/* Hospital Marker */}
        <Marker
          coordinate={{ latitude: hospitalLoc.lat, longitude: hospitalLoc.lng }}
          title="Hospital Destination"
        >
          <View style={styles.hospitalMarker}>
            <Text style={styles.markerEmoji}>🏥</Text>
          </View>
        </Marker>

        {/* Route line */}
        {missionPhase === 'to_patient' ? (
          <Polyline
            coordinates={[
              { latitude: ambulanceLoc.lat, longitude: ambulanceLoc.lng },
              { latitude: patientLoc.lat, longitude: patientLoc.lng },
            ]}
            strokeColor={Colors.primary}
            strokeWidth={4}
          />
        ) : (
          <Polyline
            coordinates={[
              { latitude: ambulanceLoc.lat, longitude: ambulanceLoc.lng },
              { latitude: hospitalLoc.lat, longitude: hospitalLoc.lng },
            ]}
            strokeColor={Colors.success}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Navigation overlay instructions */}
      <View style={styles.instructionCard}>
        <Text style={styles.phaseLabel}>
          {missionPhase === 'to_patient' ? '📍 PHASE 1: ROUTING TO INCIDENT' : '🏥 PHASE 2: ROUTING TO HOSPITAL'}
        </Text>
        
        <Text style={styles.addressLabel}>DESTINATION</Text>
        <Text style={styles.addressValue} numberOfLines={2}>
          {missionPhase === 'to_patient'
            ? currentEmergency.location.address
            : typeof currentEmergency.assignedHospital === 'object'
              ? currentEmergency.assignedHospital.name
              : 'Assigned Hospital'}
        </Text>

        <TouchableOpacity 
          style={[
            styles.actionBtn, 
            missionPhase === 'to_patient' ? styles.actionBtnOnScene : styles.actionBtnResolve
          ]}
          onPress={handleStatusTransition}
          disabled={loading}
        >
          <Text style={styles.actionBtnText}>
            {loading 
              ? 'SYNCING...' 
              : missionPhase === 'to_patient' 
                ? 'MARK AS ARRIVED ON SCENE' 
                : 'MARK INCIDENT AS RESOLVED'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: Spacing.md,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.sm,
  },
  backBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
  },
  markerCircle: {
    width: 36,
    height: 36,
    backgroundColor: Colors.surface,
    borderColor: Colors.info,
    borderWidth: 2,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalMarker: {
    width: 36,
    height: 36,
    backgroundColor: Colors.surface,
    borderColor: Colors.success,
    borderWidth: 2,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEmoji: {
    fontSize: 18,
  },
  instructionCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.lg,
  },
  phaseLabel: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.textSubtle,
    letterSpacing: 0.5,
  },
  addressValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: Spacing.md,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  actionBtnOnScene: {
    backgroundColor: Colors.primary,
    ...Shadow.red,
  },
  actionBtnResolve: {
    backgroundColor: Colors.success,
    ...Shadow.green,
  },
  actionBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
