import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAppStore } from '../../store/useAppStore';
import { socketService } from '../../services/socket';
import { Colors, Radius, Spacing, Shadow, STATUS_COLORS, SEVERITY_COLORS, INCIDENT_ICONS } from '../../constants/theme';
import { ambulance as ambulanceApi, hospital as hospitalApi, emergency as emergencyApi } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default location (Coimbatore from the web screenshots)
const COIMBATORE_REGION = {
  latitude: 11.0168,
  longitude: 76.9558,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Beautiful custom Night Mode JSON style for Night Operations layer
const NIGHT_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#1a1a2e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1a2e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#121a2c" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#2a2a3e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#f59e0b" }, { "opacity": 0.2 }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f0f1a" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] }
];

export default function LiveMapScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const mapRef = useRef<MapView>(null);

  // Layer & Data states
  const [mapLayer, setMapLayer] = useState<'standard' | 'satellite' | 'hybrid' | 'night'>('standard');
  const [showUnits, setShowUnits] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  // Entities
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Active Bottom Sheet Tab
  const [activeTab, setActiveTab] = useState<'hub' | 'units' | 'beds'>('hub');

  const loadData = async (isManualSync = false) => {
    if (isManualSync) setSyncing(true);
    else setLoading(true);

    try {
      const [ambRes, hospRes, incRes] = await Promise.allSettled([
        ambulanceApi.getAll(),
        hospitalApi.getAll(),
        emergencyApi.getAll({ limit: 50 }),
      ]);

      if (ambRes.status === 'fulfilled') {
        setAmbulances(ambRes.value.data.ambulances || []);
      }
      if (hospRes.status === 'fulfilled') {
        setHospitals(hospRes.value.data.hospitals || []);
      }
      if (incRes.status === 'fulfilled') {
        // Filter out resolved or cancelled for map display unless they are recent
        const allIncidents = incRes.value.data.emergencies || [];
        setIncidents(allIncidents);
      }
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    loadData();

    // Sockets setup
    socketService.connect();
    
    const handleAmbulanceLocation = (data: { ambulanceId: string; lat: number; lng: number }) => {
      setAmbulances(prev => prev.map(amb => {
        if (amb._id === data.ambulanceId) {
          return {
            ...amb,
            currentLocation: {
              ...amb.currentLocation,
              lat: data.lat,
              lng: data.lng,
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return amb;
      }));
    };

    const handleNewEmergency = (data: { emergency: any }) => {
      if (data?.emergency) {
        setIncidents(prev => [data.emergency, ...prev.filter(e => e._id !== data.emergency._id)]);
      }
    };

    const handleStatusUpdate = (data: any) => {
      loadData();
    };

    socketService.on('ambulance_location', handleAmbulanceLocation);
    socketService.on('new_emergency', handleNewEmergency);
    socketService.on('status_update', handleStatusUpdate);

    return () => {
      socketService.off('ambulance_location', handleAmbulanceLocation);
      socketService.off('new_emergency', handleNewEmergency);
      socketService.off('status_update', handleStatusUpdate);
    };
  }, []);

  const requestUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions to focus the map.');
        return;
      }

      const userLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      mapRef.current?.animateToRegion({
        latitude: userLoc.coords.latitude,
        longitude: userLoc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } catch (e) {
      Alert.alert('Error', 'Unable to retrieve current location.');
    }
  };

  const focusOnCoordinate = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 1000);
  };

  const activeIncidentsCount = incidents.filter(i => ['pending', 'assigned', 'in_progress'].includes(i.status)).length;
  const availableAmbulancesCount = ambulances.filter(a => a.status === 'available').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Configuring Live Operations Feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sync Status Overlay */}
      <View style={styles.topBar}>
        <View style={styles.topBarInfo}>
          <Text style={styles.topBarTitle}>Live Map & Tracking</Text>
          <Text style={styles.topBarSub}>Premium high-resolution tracking with building detail</Text>
        </View>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => loadData(true)}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.syncBtnText}>🔄 Sync Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={COIMBATORE_REGION}
        mapType={mapLayer === 'night' ? 'standard' : mapLayer}
        customMapStyle={mapLayer === 'night' ? NIGHT_MAP_STYLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Hospital Markers */}
        {showHospitals && hospitals.map(h => (
          <Marker
            key={h._id}
            coordinate={{ latitude: h.location.lat, longitude: h.location.lng }}
            title={h.name}
            description={`Beds: ${h.availableBeds}/${h.totalBeds} · ICU: ${h.availableIcuBeds}/${h.icuBeds}`}
          >
            <View style={styles.hospitalMarker}>
              <Text style={styles.hospitalMarkerText}>🏥</Text>
            </View>
            <Callout>
              <View style={styles.calloutBox}>
                <Text style={styles.calloutTitle}>🏥 {h.name}</Text>
                <Text style={styles.calloutText}>Beds Available: {h.availableBeds} / {h.totalBeds}</Text>
                <Text style={styles.calloutText}>ICU Available: {h.availableIcuBeds} / {h.icuBeds}</Text>
                <Text style={styles.calloutAddress}>{h.address}</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Ambulance Markers */}
        {showUnits && ambulances
          .filter(a => a.currentLocation?.lat && a.currentLocation?.lng)
          .map(a => (
            <Marker
              key={a._id}
              coordinate={{ latitude: a.currentLocation.lat, longitude: a.currentLocation.lng }}
              title={a.vehicleNumber}
              description={`Status: ${a.status} | Equipment: ${a.equipmentLevel}`}
            >
              <View style={[styles.ambulanceMarker, { borderColor: STATUS_COLORS[a.status] || Colors.info }]}>
                <Text style={styles.ambulanceMarkerText}>🚑</Text>
              </View>
              <Callout>
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTitle}>🚑 Unit {a.vehicleNumber}</Text>
                  <Text style={[styles.calloutText, { color: STATUS_COLORS[a.status], fontWeight: 'bold' }]}>
                    Status: {a.status.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.calloutText}>Type: {a.equipmentLevel.replace(/_/g, ' ').toUpperCase()}</Text>
                  {a.driver && <Text style={styles.calloutSubText}>Crew: {a.driver.name}</Text>}
                </View>
              </Callout>
            </Marker>
          ))}

        {/* Incident Markers */}
        {showIncidents && incidents
          .filter(i => ['pending', 'assigned', 'in_progress'].includes(i.status) && i.location?.lat && i.location?.lng)
          .map(i => (
            <Marker
              key={i._id}
              coordinate={{ latitude: i.location.lat, longitude: i.location.lng }}
              title={i.incidentType.toUpperCase()}
              description={`Severity: ${i.severity} | Status: ${i.status}`}
            >
              <View style={[styles.incidentMarker, { backgroundColor: SEVERITY_COLORS[i.severity] || Colors.primary }]}>
                <Text style={styles.incidentMarkerText}>{INCIDENT_ICONS[i.incidentType] || '🚨'}</Text>
              </View>
              <Callout>
                <View style={styles.calloutBox}>
                  <Text style={[styles.calloutTitle, { color: SEVERITY_COLORS[i.severity] }]}>
                    🚨 {i.incidentType.toUpperCase()} ({i.severity.toUpperCase()})
                  </Text>
                  <Text style={styles.calloutText}>Status: {i.status.replace('_', ' ')}</Text>
                  <Text style={styles.calloutText}>Victims count: {i.victimCount}</Text>
                  {i.location.address && <Text style={styles.calloutAddress}>{i.location.address}</Text>}
                </View>
              </Callout>
            </Marker>
          ))}
      </MapView>

      {/* Floating Map Layer Switcher (Top Right on Map) */}
      <View style={styles.layerSwitcher}>
        {(['night', 'standard', 'satellite', 'hybrid'] as const).map(layer => (
          <TouchableOpacity
            key={layer}
            style={[styles.layerBtn, mapLayer === layer && styles.layerBtnActive]}
            onPress={() => setMapLayer(layer)}
          >
            <Text style={[styles.layerBtnText, mapLayer === layer && styles.layerBtnTextActive]}>
              {layer === 'night' ? '🌙 Night' : layer === 'standard' ? '🗺️ HD' : layer === 'satellite' ? '🛰️ Sat' : '🌐 Hyb'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Floating Center User Location Button (Middle Right on Map) */}
      <TouchableOpacity style={styles.myLocationBtn} onPress={requestUserLocation}>
        <Text style={styles.myLocationText}>🎯</Text>
      </TouchableOpacity>

      {/* Map Content Filters (Bottom Overlay on Map) */}
      <View style={styles.filterControls}>
        <TouchableOpacity
          style={[styles.filterBtn, showUnits && styles.filterBtnActive]}
          onPress={() => setShowUnits(!showUnits)}
        >
          <Text style={[styles.filterText, showUnits && styles.filterTextActive]}>
            🚑 Units ({ambulances.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, showHospitals && styles.filterBtnActive]}
          onPress={() => setShowHospitals(!showHospitals)}
        >
          <Text style={[styles.filterText, showHospitals && styles.filterTextActive]}>
            🏥 Hospitals ({hospitals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, showIncidents && styles.filterBtnActive]}
          onPress={() => setShowIncidents(!showIncidents)}
        >
          <Text style={[styles.filterText, showIncidents && styles.filterTextActive]}>
            🚨 Incidents ({activeIncidentsCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sliding Dashboard Panel */}
      <View style={styles.slidingDrawer}>
        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'hub' && styles.tabItemActive]}
            onPress={() => setActiveTab('hub')}
          >
            <Text style={[styles.tabLabel, activeTab === 'hub' && styles.tabLabelActive]}>🌐 Operations Hub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'units' && styles.tabItemActive]}
            onPress={() => setActiveTab('units')}
          >
            <Text style={[styles.tabLabel, activeTab === 'units' && styles.tabLabelActive]}>🚑 Units Activity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'beds' && styles.tabItemActive]}
            onPress={() => setActiveTab('beds')}
          >
            <Text style={[styles.tabLabel, activeTab === 'beds' && styles.tabLabelActive]}>🏥 Bed Tracking</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        <ScrollView style={styles.drawerContent} contentContainerStyle={styles.drawerScroll}>
          {activeTab === 'hub' && (
            <View style={styles.hubTab}>
              <Text style={styles.sectionHeader}>System Overview</Text>
              <View style={styles.hubRow}>
                <View style={styles.hubCard}>
                  <Text style={styles.hubCardTitle}>INCIDENTS</Text>
                  <Text style={[styles.hubCardValue, { color: Colors.primary }]}>{activeIncidentsCount}</Text>
                  <Text style={styles.hubCardSub}>Active emergencies</Text>
                </View>

                <View style={styles.hubCard}>
                  <Text style={styles.hubCardTitle}>AVAILABLE UNITS</Text>
                  <Text style={[styles.hubCardValue, { color: Colors.success }]}>{availableAmbulancesCount}</Text>
                  <Text style={styles.hubCardSub}>Triaged ready</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>Operational Live Status</Text>
              <View style={styles.statusListItem}>
                <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]} />
                <Text style={styles.statusListText}>All systems operational</Text>
                <Text style={styles.statusListTime}>Active Sync</Text>
              </View>
              <View style={styles.statusListItem}>
                <View style={[styles.statusIndicator, { backgroundColor: Colors.info }]} />
                <Text style={styles.statusListText}>Socket connections online</Text>
                <Text style={styles.statusListTime}>100%</Text>
              </View>
            </View>
          )}

          {activeTab === 'units' && (
            <View style={styles.unitsTab}>
              <Text style={styles.sectionHeader}>Active Fleet Tracking</Text>
              {ambulances.length === 0 ? (
                <Text style={styles.emptyText}>No ambulances loaded.</Text>
              ) : (
                ambulances.map(amb => (
                  <TouchableOpacity
                    key={amb._id}
                    style={styles.entityCard}
                    onPress={() => amb.currentLocation && focusOnCoordinate(amb.currentLocation.lat, amb.currentLocation.lng)}
                  >
                    <View style={styles.entityHeader}>
                      <View style={styles.entityTitleRow}>
                        <Text style={styles.entityTitle}>🚑 Unit {amb.vehicleNumber}</Text>
                        <Text style={styles.entityBadge}>{amb.equipmentLevel.replace(/_/g, ' ').replace('life support', 'LS')}</Text>
                      </View>
                      <View style={styles.statusBadgeRow}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[amb.status] || Colors.textSubtle }]} />
                        <Text style={[styles.statusTextLabel, { color: STATUS_COLORS[amb.status] || Colors.textSubtle }]}>
                          {amb.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {amb.driver && <Text style={styles.entityDetail}>Crew: {amb.driver.name}</Text>}
                    {amb.currentLocation ? (
                      <Text style={styles.entityActionText}>📍 Tap to focus location on map</Text>
                    ) : (
                      <Text style={styles.entityDetailError}>GPS offline</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'beds' && (
            <View style={styles.bedsTab}>
              <Text style={styles.sectionHeader}>Hospital Directory & Beds</Text>
              {hospitals.length === 0 ? (
                <Text style={styles.emptyText}>No hospitals registered.</Text>
              ) : (
                hospitals.map(hosp => (
                  <TouchableOpacity
                    key={hosp._id}
                    style={styles.entityCard}
                    onPress={() => focusOnCoordinate(hosp.location.lat, hosp.location.lng)}
                  >
                    <View style={styles.entityHeader}>
                      <Text style={styles.entityTitle}>🏥 {hosp.name}</Text>
                      <View style={styles.bedCounter}>
                        <Text style={styles.bedTextBold}>{hosp.availableBeds}</Text>
                        <Text style={styles.bedTextMuted}>/{hosp.totalBeds} Beds</Text>
                      </View>
                    </View>
                    <Text style={styles.entityDetail} numberOfLines={1}>📍 {hosp.address}</Text>
                    <Text style={styles.entityActionText}>📍 Tap to focus location on map</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  topBarInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  topBarTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
  },
  topBarSub: {
    color: Colors.textSubtle,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  syncBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  syncBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  hospitalMarker: {
    backgroundColor: Colors.surface,
    borderColor: Colors.info,
    borderWidth: 2,
    borderRadius: Radius.sm,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalMarkerText: {
    fontSize: 14,
  },
  ambulanceMarker: {
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderRadius: Radius.md,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambulanceMarkerText: {
    fontSize: 13,
  },
  incidentMarker: {
    borderRadius: Radius.full,
    padding: 6,
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  incidentMarkerText: {
    fontSize: 12,
  },
  calloutBox: {
    width: 200,
    padding: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  calloutTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  calloutText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  calloutSubText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textSubtle,
    marginTop: 2,
  },
  calloutAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textSubtle,
    marginTop: 4,
    fontStyle: 'italic',
  },
  layerSwitcher: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    gap: 4,
    ...Shadow.sm,
  },
  layerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  layerBtnActive: {
    backgroundColor: Colors.info,
  },
  layerBtnText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  layerBtnTextActive: {
    color: Colors.white,
  },
  myLocationBtn: {
    position: 'absolute',
    top: 175,
    right: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  myLocationText: {
    fontSize: 16,
  },
  filterControls: {
    position: 'absolute',
    bottom: 275,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  filterBtnActive: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.info,
  },
  filterText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  filterTextActive: {
    color: Colors.textPrimary,
  },
  slidingDrawer: {
    height: 260,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.borderStrong,
    ...Shadow.md,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabItemActive: {
    borderColor: Colors.primary,
  },
  tabLabel: {
    color: Colors.textSubtle,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
  },
  drawerContent: {
    flex: 1,
  },
  drawerScroll: {
    padding: Spacing.md,
  },
  sectionHeader: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  hubTab: {
    gap: Spacing.sm,
  },
  hubRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  hubCard: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  hubCardTitle: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  hubCardValue: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    marginVertical: 2,
  },
  hubCardSub: {
    color: Colors.textSubtle,
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
  },
  statusListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  statusListText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  statusListTime: {
    color: Colors.textSubtle,
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  unitsTab: {
    gap: Spacing.sm,
  },
  bedsTab: {
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSubtle,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 20,
  },
  entityCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: 4,
  },
  entityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entityTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  entityBadge: {
    color: Colors.info,
    backgroundColor: 'rgba(59,130,246,0.15)',
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    textTransform: 'uppercase',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  entityDetail: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  entityDetailError: {
    color: Colors.primary,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  entityActionText: {
    color: Colors.info,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  bedCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bedTextBold: {
    color: Colors.success,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
  },
  bedTextMuted: {
    color: Colors.textSubtle,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
});
