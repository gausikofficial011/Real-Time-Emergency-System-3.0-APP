import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { socketService } from '../../services/socket';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';
import { emergency as emergencyApi } from '../../services/api';

const { width, height } = Dimensions.get('window');

export default function TrackEmergency() {
  const router = useRouter();
  const { currentEmergency, setCurrentEmergency } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [eta, setEta] = useState<number | null>(null);
  
  // Coordinates
  const [patientLoc, setPatientLoc] = useState({ lat: 28.5672, lng: 77.2100 }); // Default Delhi
  const [ambulanceLoc, setAmbulanceLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitalLoc, setHospitalLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!currentEmergency) return;

    // Load initial locations
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

    if (currentEmergency.assignedAmbulance && typeof currentEmergency.assignedAmbulance !== 'string') {
      const amb = currentEmergency.assignedAmbulance;
      if (amb.currentLocation) {
        setAmbulanceLoc({
          lat: amb.currentLocation.lat,
          lng: amb.currentLocation.lng,
        });
      }
    }

    // Socket subscription
    const handleLocationUpdate = (data: { ambulanceId: string; lat: number; lng: number }) => {
      const currentAmbId = typeof currentEmergency.assignedAmbulance === 'string'
        ? currentEmergency.assignedAmbulance
        : currentEmergency.assignedAmbulance?._id;

      if (currentAmbId === data.ambulanceId) {
        setAmbulanceLoc({ lat: data.lat, lng: data.lng });
        
        // Calculate raw ETA dynamically (approx 2 mins per km, min 1 min)
        const dist = haversineDistance(
          currentEmergency.location.lat,
          currentEmergency.location.lng,
          data.lat,
          data.lng
        );
        setEta(Math.max(1, Math.round(dist * 2.2)));
      }
    };

    const handleStatusUpdate = (data: any) => {
      if (data.emergencyId === currentEmergency._id) {
        setCurrentEmergency({ ...currentEmergency, status: data.status });
        if (data.status === 'resolved') {
          setCurrentEmergency(null);
          Alert.alert('Resolved', 'This incident has been resolved. Returning to home screen.');
          router.replace('/patient/home');
        }
      }
    };

    socketService.on('ambulance_location', handleLocationUpdate);
    socketService.on('status_update', handleStatusUpdate);

    // Initial mock ETA calculation
    if (ambulanceLoc) {
      const dist = haversineDistance(patientLoc.lat, patientLoc.lng, ambulanceLoc.lat, ambulanceLoc.lng);
      setEta(Math.max(1, Math.round(dist * 2.2)));
    } else {
      setEta(4); // Default screenshot eta
    }

    // Poll updates
    const pollInterval = setInterval(async () => {
      try {
        const res = await emergencyApi.getById(currentEmergency._id);
        const updated = res.data.emergency;
        setCurrentEmergency(updated);
        
        if (updated.assignedHospital) {
          setHospitalLoc({
            lat: updated.assignedHospital.location.lat,
            lng: updated.assignedHospital.location.lng,
          });
        }
        if (updated.assignedAmbulance?.currentLocation) {
          setAmbulanceLoc({
            lat: updated.assignedAmbulance.currentLocation.lat,
            lng: updated.assignedAmbulance.currentLocation.lng,
          });
        }
      } catch (e) {
        console.error('Error fetching emergency updates', e);
      }
    }, 10000);

    return () => {
      socketService.off('ambulance_location', handleLocationUpdate);
      socketService.off('status_update', handleStatusUpdate);
      clearInterval(pollInterval);
    };
  }, [currentEmergency]);

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  if (!currentEmergency) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active emergency found to track.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/patient/home')}>
          <Text style={styles.backBtnText}>Go Back Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Premium light mode map style matching screenshots
  const mapStyle = [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#f8fafc" }] // slate-50
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#64748b" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry",
      "stylers": [{ "color": "#cbd5e1" }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#f1f5f9" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#e2e8f0" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#e2e8f0" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#bae6fd" }] // light sky blue
    }
  ];

  // Resolve dynamic values
  const hasAmbulance = currentEmergency.assignedAmbulance && typeof currentEmergency.assignedAmbulance === 'object';
  const ambDetails = hasAmbulance ? (currentEmergency.assignedAmbulance as any) : null;
  
  const driverName = ambDetails?.driverName || ambDetails?.driver?.name || 'John D.';
  const vehicleNumber = ambDetails?.vehicleNumber || 'Ambulance Unit A-142';
  const ratingValue = '4.8';

  // Determine stage completed states
  // Stages: Assigned -> En Route -> Arrived -> Done
  const status = currentEmergency.status; // pending, assigned, in_progress, resolved
  
  const getStageState = (stage: string) => {
    // pending counts as Assigned active
    if (stage === 'Assigned') {
      if (status === 'pending') return 'active';
      return ['assigned', 'in_progress', 'resolved'].includes(status) ? 'checked' : 'pending';
    }
    if (stage === 'En Route') {
      if (status === 'pending') return 'pending';
      if (status === 'assigned') return 'active';
      return ['in_progress', 'resolved'].includes(status) ? 'checked' : 'pending';
    }
    if (stage === 'Arrived') {
      if (['pending', 'assigned'].includes(status)) return 'pending';
      if (status === 'in_progress') return 'active';
      return status === 'resolved' ? 'checked' : 'pending';
    }
    if (stage === 'Done') {
      return status === 'resolved' ? 'active' : 'pending';
    }
    return 'pending';
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Header matching Screenshot 4 */}
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.replace('/patient/home')}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <TouchableOpacity style={styles.headerBackBtn}>
          <Feather name="bell" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: patientLoc.lat,
          longitude: patientLoc.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        customMapStyle={mapStyle}
      >
        {/* Patient Marker */}
        <Marker
          coordinate={{ latitude: patientLoc.lat, longitude: patientLoc.lng }}
          title="Your Location"
        >
          <View style={styles.patientMarkerGlow}>
            <View style={styles.patientMarkerInner} />
          </View>
        </Marker>

        {/* Dispatched Ambulance Marker */}
        {ambulanceLoc && (
          <Marker
            coordinate={{ latitude: ambulanceLoc.lat, longitude: ambulanceLoc.lng }}
            title="Ambulance"
            description="En-route"
          >
            <View style={styles.ambulanceMarker}>
              <Text style={styles.markerEmoji}>🚑</Text>
            </View>
          </Marker>
        )}

        {/* Assigned Hospital Marker */}
        {hospitalLoc && (
          <Marker
            coordinate={{ latitude: hospitalLoc.lat, longitude: hospitalLoc.lng }}
            title="Assigned Hospital"
          >
            <View style={styles.hospitalMarker}>
              <Text style={styles.markerEmoji}>🏥</Text>
            </View>
          </Marker>
        )}

        {/* Dynamic Route Line */}
        {ambulanceLoc && (
          <Polyline
            coordinates={[
              { latitude: ambulanceLoc.lat, longitude: ambulanceLoc.lng },
              { latitude: patientLoc.lat, longitude: patientLoc.lng },
            ]}
            strokeColor={Colors.info}
            strokeWidth={3}
            lineDashPattern={[6, 4]}
          />
        )}
      </MapView>

      {/* Floating Bottom Card matching Screenshot 4 */}
      <View style={styles.bottomCardContainer}>
        {/* Status Line Block */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.headerLeftCol}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {status === 'pending' || status === 'assigned' ? 'ASSIGNED' : 'EN ROUTE'}
              </Text>
            </View>
            <View style={styles.etaContainer}>
              <Text style={styles.etaValue}>{eta || 4}</Text>
              <Text style={styles.etaUnit}>mins</Text>
            </View>
            <Text style={styles.vehicleNumberText}>{vehicleNumber}</Text>
          </View>

          {/* Driver details badge */}
          <View style={styles.driverInfoPill}>
            <Image
              style={styles.driverAvatar}
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
            />
            <View style={styles.driverMetaText}>
              <Text style={styles.driverName}>{driverName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color="#f59e0b" style={{ marginRight: 2 }} />
                <Text style={styles.ratingText}>{ratingValue}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Horizontal Step Timeline Tracker */}
        <View style={styles.timelineContainer}>
          {['Assigned', 'En Route', 'Arrived', 'Done'].map((stage, idx, arr) => {
            const stageState = getStageState(stage);
            const isLast = idx === arr.length - 1;
            
            // Connect line colors
            const nextStageState = !isLast ? getStageState(arr[idx + 1]) : 'pending';
            const lineColor = (stageState === 'checked' && nextStageState !== 'pending') 
              ? Colors.primary 
              : '#e2e8f0';

            return (
              <View key={stage} style={[styles.timelineStepWrapper, isLast && { flex: 0 }]}>
                <View style={styles.nodeWithLabel}>
                  {/* Circle Indicator */}
                  {stageState === 'checked' ? (
                    <View style={styles.nodeCircleChecked}>
                      <Feather name="check" size={10} color="#ffffff" />
                    </View>
                  ) : stageState === 'active' ? (
                    <View style={styles.nodeOuterRingActive}>
                      <View style={styles.nodeCircleActive} />
                    </View>
                  ) : (
                    <View style={styles.nodeCirclePending} />
                  )}
                  <Text style={[styles.timelineLabel, stageState !== 'pending' && styles.timelineLabelActive]}>
                    {stage}
                  </Text>
                </View>

                {/* Connection line */}
                {!isLast && <View style={[styles.timelineConnector, { backgroundColor: lineColor }]} />}
              </View>
            );
          })}
        </View>

        {/* Buttons Row */}
        <View style={styles.actionRowButtons}>
          <TouchableOpacity 
            style={styles.callDriverBtn}
            onPress={() => {
              Alert.alert('Call Driver', `Routing call to paramedic ${driverName}...`);
            }}
          >
            <Feather name="phone" size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.callDriverText}>Call Driver</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => {
              Alert.alert('Share Track', 'Emergency tracking link copied to clipboard.');
            }}
          >
            <Feather name="share-2" size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: Spacing.sm,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
    ...Shadow.sm,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
  },
  map: {
    flex: 1,
    width: width,
    height: height,
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
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    ...Shadow.red,
  },
  backBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
  },
  patientMarkerGlow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 90, 67, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  ambulanceMarker: {
    width: 36,
    height: 36,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: Colors.info,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  hospitalMarker: {
    width: 36,
    height: 36,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: Colors.success,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  markerEmoji: {
    fontSize: 18,
  },
  bottomCardContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 16,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeftCol: {
    flex: 1,
    gap: 4,
  },
  statusBadge: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  etaValue: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
  },
  etaUnit: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
    marginLeft: 4,
  },
  vehicleNumberText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    marginTop: 2,
  },
  driverInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  driverMetaText: {
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
  },
  
  // Progress Timeline
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginVertical: Spacing.sm,
  },
  timelineStepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nodeWithLabel: {
    alignItems: 'center',
    position: 'relative',
    width: 60,
  },
  nodeCircleChecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeOuterRingActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 90, 67, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCircleActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  nodeCirclePending: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 2,
  },
  timelineLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.textSubtle,
    marginTop: 6,
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: Colors.textPrimary,
  },
  timelineConnector: {
    height: 2,
    flex: 1,
    marginHorizontal: -20,
    zIndex: 1,
  },
  
  // Action row
  actionRowButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
  },
  callDriverBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: '#ffa089', // Soft salmon pink
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  callDriverText: {
    color: '#ffffff',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
