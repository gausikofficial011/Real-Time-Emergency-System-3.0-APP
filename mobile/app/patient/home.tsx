import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated,
  TextInput, Switch, Alert, ActivityIndicator, Modal, Platform, RefreshControl, Dimensions
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useAppStore } from '../../store/useAppStore';
import { emergency as emergencyApi } from '../../services/api';
import { socketService } from '../../services/socket';
import { Colors, Radius, Spacing, Shadow, INCIDENT_ICONS, STATUS_BG, STATUS_COLORS } from '../../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width } = Dimensions.get('window');

export default function PatientHome() {
  const router = useRouter();
  const { user, currentEmergency, setCurrentEmergency, logout } = useAppStore();
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [aiSheetVisible, setAiSheetVisible] = useState(false);
  
  // SOS Input fields
  const [incidentType, setIncidentType] = useState('medical');
  const [victimCount, setVictimCount] = useState('1');
  const [age, setAge] = useState('30');
  const [isHighway, setIsHighway] = useState(false);
  const [description, setDescription] = useState('');
  
  // Loading states
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [predictedResult, setPredictedResult] = useState<any>(null);
  
  // Dashboard Stats & History states
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userIncidents, setUserIncidents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, pending: 0 });

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Hold-to-SOS state variables
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<any>(null);

  // AI Gauge Animation
  const aiGaugeProgress = useRef(new Animated.Value(0)).current;

  // Run entrance animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for SOS outer rings
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Join user socket room
    if (user?._id) {
      socketService.connect();
      socketService.joinRoom(user._id, 'patient');
    }
  }, [user]);

  // Load history
  const fetchHistory = async (isRefreshing = false) => {
    if (!user?._id) return;
    if (isRefreshing) setRefreshing(true);
    else setHistoryLoading(true);

    try {
      const res = await emergencyApi.getAll();
      const allIncidents = res.data.emergencies || [];
      const filtered = allIncidents.filter((e: any) => {
        const reporterId = typeof e.reportedBy === 'string' ? e.reportedBy : e.reportedBy?._id;
        return reporterId === user._id;
      });
      setUserIncidents(filtered);

      const total = filtered.length;
      const active = filtered.filter((e: any) => ['pending', 'assigned', 'in_progress'].includes(e.status)).length;
      const resolved = filtered.filter((e: any) => e.status === 'resolved').length;
      const pending = filtered.filter((e: any) => e.status === 'pending').length;

      setStats({ total, active, resolved, pending });
    } catch (err) {
      console.error('Failed to load patient emergency history:', err);
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [user])
  );

  // Start SOS hold trigger
  const handleSosPressIn = () => {
    setIsHolding(true);
    // Start circular progress fill
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      // Triggered after 3 full seconds of holding
      setIsHolding(false);
      holdProgress.setValue(0);
      handleSosTriggered();
    }, 3000);
  };

  // Release SOS hold early
  const handleSosPressOut = () => {
    if (isHolding) {
      setIsHolding(false);
      // Reset holding state & timer
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      Animated.timing(holdProgress, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleSosTriggered = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to dispatch help.');
        return;
      }
      setSosModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Could not access GPS. Please check device location settings.');
    } finally {
      setLocating(false);
    }
  };

  const submitSos = async () => {
    if (!victimCount || isNaN(Number(victimCount)) || Number(victimCount) < 0) {
      Alert.alert('Invalid Input', 'Victim count must be a valid number.');
      return;
    }
    setSubmitting(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const geo = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const address = geo[0] 
        ? `${geo[0].streetNumber || ''} ${geo[0].street || ''}, ${geo[0].city || ''}, ${geo[0].region || ''}`.trim()
        : 'Unknown Address';

      const data = {
        incidentType,
        location: {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          address: address || 'GPS Location Triggered',
        },
        victimCount: parseInt(victimCount) || 1,
        age: parseInt(age) || 30,
        isHighway,
        description: description.trim(),
      };

      const res = await emergencyApi.create(data);
      const emergencyData = res.data.emergency;
      setCurrentEmergency(emergencyData);

      if (emergencyData.aiPrediction) {
        setPredictedResult(emergencyData.aiPrediction);
        setSosModalVisible(false);
        setAiSheetVisible(true);
        
        // Trigger AI gauge animation
        aiGaugeProgress.setValue(0);
        Animated.timing(aiGaugeProgress, {
          toValue: emergencyData.aiPrediction.confidence || 0.94,
          duration: 1500,
          useNativeDriver: false,
        }).start();
      } else {
        setSosModalVisible(false);
        router.push('/patient/track');
      }
    } catch (error: any) {
      console.error('SOS Dispatch failed', error?.response?.data || error);
      Alert.alert('Dispatch Failed', 'Failed to submit incident. Please check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return styles.severityCritical;
      case 'high': return styles.severityHigh;
      case 'medium': return styles.severityMedium;
      default: return styles.severityLow;
    }
  };

  // Interpolate hold animations
  const sosScale = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const progressStrokeDashoffset = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [2 * Math.PI * 75, 0], // Circumference for r=75 is 471.2
  });

  // Interpolate AI confidence circle
  const aiStrokeDashoffset = aiGaugeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [2 * Math.PI * 55, 0], // Circumference for r=55 is 345.5
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatarContainer}>
            <Ionicons name="pulse" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Stay Safe, {user?.name?.split(' ')[0] || 'Alex'}</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => {}}>
          <Feather name="bell" size={22} color={Colors.textPrimary} />
          <View style={styles.badgeDot} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        scrollEnabled={!isHolding}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHistory(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Medical Profile Incomplete Red Alert Bar */}
        {(!user?.healthProfile?.bloodGroup || user?.healthProfile?.bloodGroup === 'Unknown' || !user?.healthProfile?.emergencyContacts?.length) && (
          <TouchableOpacity
            style={styles.profileWarningCard}
            onPress={() => router.push('/patient/profile')}
          >
            <View style={styles.warningCardLeft}>
              <MaterialCommunityIcons name="folder-plus-outline" size={24} color="#ffffff" style={styles.warningIconStyle} />
              <Text style={styles.warningText}>🩺 Medical Profile Incomplete - Complete Now</Text>
            </View>
            <Feather name="arrow-right" size={20} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* SOS Hold Button Component */}
        <Animated.View style={[styles.sosWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sosOuterRingWrapper}>
            {/* Pulsing outer rings for emergency radar effect */}
            <Animated.View style={[styles.sosPulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.25], outputRange: [0.35, 0] }) }]} />
            <Animated.View style={[styles.sosPulseRing, { transform: [{ scale: Animated.multiply(pulseAnim, 0.85) }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.25], outputRange: [0.25, 0] }) }]} />
            
            {/* SVG Circular Progress Loader */}
            <Svg pointerEvents="none" width={180} height={180} style={styles.svgOverlay}>
              <Circle
                cx="90"
                cy="90"
                r="75"
                stroke="rgba(255, 90, 67, 0.08)"
                strokeWidth="6"
                fill="none"
              />
              <AnimatedCircle
                cx="90"
                cy="90"
                r="75"
                stroke={Colors.primary}
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 75}`}
                strokeDashoffset={progressStrokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
              />
            </Svg>

            {/* Active Hold Touchable Circle */}
            <Animated.View style={{ transform: [{ scale: sosScale }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.sosCircle, isHolding && styles.sosCircleHolding]}
                onPressIn={handleSosPressIn}
                onPressOut={handleSosPressOut}
              >
                {locating ? (
                  <ActivityIndicator color={Colors.white} size="large" />
                ) : (
                  <View style={styles.sosTextContainer}>
                    <Text style={styles.sosButtonText}>SOS</Text>
                    <Text style={styles.sosButtonSubtext}>
                      {isHolding ? 'HOLDING...' : 'HOLD 3 SECONDS'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Quick Action Navigation Grid */}
        <Animated.View style={[styles.actionGrid, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.actionCard} onPress={handleSosTriggered}>
            <Feather name="alert-circle" size={24} color={Colors.primary} style={styles.actionCardIcon} />
            <Text style={styles.actionCardTitle}>Report Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/patient/livemap')}>
            <Feather name="target" size={24} color={Colors.info} style={styles.actionCardIcon} />
            <Text style={styles.actionCardTitle}>Live GPS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/patient/livemap')}>
            <MaterialCommunityIcons name="plus-box-outline" size={24} color={Colors.success} style={styles.actionCardIcon} />
            <Text style={styles.actionCardTitle}>Hospitals</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Active emergency ongoing tracking block */}
        {currentEmergency && (
          <TouchableOpacity 
            style={styles.activeMissionCard}
            onPress={() => router.push('/patient/track')}
          >
            <View style={styles.activeMissionHeader}>
              <View style={styles.activeBadgeContainer}>
                <View style={styles.pulseDot} />
                <Text style={styles.activeBadgeText}>ACTIVE EMERGENCY DISPATCH</Text>
              </View>
              <Text style={[styles.severityBadge, getSeverityStyle(currentEmergency.severity)]}>
                {currentEmergency.severity?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.activeTypeText}>
              {INCIDENT_ICONS[currentEmergency.incidentType] || '🚨'} {currentEmergency.incidentType.toUpperCase()}
            </Text>
            <Text style={styles.activeAddressText} numberOfLines={1}>
              📍 {currentEmergency.location.address}
            </Text>
            <Text style={styles.activeRouteCTA}>Tap to view route & tracking updates →</Text>
          </TouchableOpacity>
        )}

        {/* Recent Incidents Section (Matching layout 1) */}
        <View style={styles.incidentsSection}>
          <Text style={styles.sectionHeaderTitle}>Recent Activity</Text>
          {historyLoading && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 10 }} />}

          {userIncidents.length === 0 ? (
            <View style={styles.emptyActivityCard}>
              <Text style={styles.emptyCardText}>No recent emergencies reported</Text>
            </View>
          ) : (
            userIncidents.slice(0, 4).map((incident) => {
              const formattedDate = new Date(incident.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const activeStatus = ['pending', 'assigned', 'in_progress'].includes(incident.status);
              
              // Custom colors based on incident status
              const sideIndicatorColor = incident.status === 'resolved' ? Colors.info : Colors.primary;
              
              return (
                <TouchableOpacity
                  key={incident._id}
                  style={[styles.activityRowCard, activeStatus && styles.activeRowHighlight]}
                  onPress={() => {
                    if (activeStatus) {
                      setCurrentEmergency(incident);
                      router.push('/patient/track');
                    }
                  }}
                  disabled={!activeStatus}
                >
                  {/* Left colorful side boundary accent */}
                  <View style={[styles.rowSideIndicator, { backgroundColor: sideIndicatorColor }]} />
                  
                  <View style={styles.activityRowContent}>
                    <View style={styles.activityAvatarCircle}>
                      {incident.incidentType === 'medical' ? (
                        <FontAwesome5 name="asterisk" size={16} color={Colors.textMuted} />
                      ) : (
                        <Ionicons name="shield-outline" size={18} color={Colors.textMuted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityCaseTitle}>
                        {incident.incidentType === 'medical' ? 'Medical Case' : 'Security Alert'}
                      </Text>
                      <Text style={styles.activityCaseMeta}>
                        {formattedDate} • {incident.location?.address?.split(',')[0] || 'Nearby'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activityRightBadge}>
                    <View style={[styles.statusItemBadge, { backgroundColor: STATUS_BG[incident.status] || 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[styles.statusItemText, { color: STATUS_COLORS[incident.status] || Colors.textMuted }]}>
                        {incident.status === 'in_progress' ? 'EN ROUTE' : incident.status?.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Extra Guides */}
        <View style={styles.secondaryMenuGrid}>
          <TouchableOpacity style={styles.secondaryMenuCard} onPress={() => router.push('/patient/firstaid')}>
            <Text style={styles.secondaryMenuIcon}>📚</Text>
            <View>
              <Text style={styles.secondaryMenuTitle}>First Aid Guide</Text>
              <Text style={styles.secondaryMenuSub}>Audio walkthroughs</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryMenuCard} onPress={() => router.push('/patient/profile')}>
            <Text style={styles.secondaryMenuIcon}>🩺</Text>
            <View>
              <Text style={styles.secondaryMenuTitle}>Health Card</Text>
              <Text style={styles.secondaryMenuSub}>Manage medical IDs</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* SOS Details Form Modal (Screenshot 2) */}
      <Modal
        visible={sosModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSosModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header with red asterisk */}
            <View style={styles.modalHeaderRow}>
              <FontAwesome5 name="asterisk" size={18} color={Colors.primary} />
              <Text style={styles.detailsModalTitle}>Emergency Details</Text>
            </View>
            <Text style={styles.modalTriageNotice}>Triage Notice: Provide exact context for rapid deployment.</Text>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInputLabel}>Incident Type</Text>
              
              {/* Grid Selector */}
              <View style={styles.incidentSelectorGrid}>
                {[
                  { id: 'medical', label: 'Medical', icon: 'stethoscope' },
                  { id: 'accident', label: 'Accident', icon: 'car-crash' },
                  { id: 'fire', label: 'Fire', icon: 'fire' },
                  { id: 'crime', label: 'Crime', icon: 'shield-alt' }
                ].map((item) => {
                  const isSelected = incidentType === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.gridIncidentBtn, isSelected && styles.gridIncidentBtnActive]}
                      onPress={() => setIncidentType(item.id)}
                    >
                      <FontAwesome5 name={item.icon} size={22} color={isSelected ? Colors.primary : Colors.textMuted} />
                      <Text style={[styles.gridIncidentLabel, isSelected && styles.gridIncidentLabelActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Rows with icons */}
              <View style={styles.modalRowInputs}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={styles.modalInputLabel}>Victim Count</Text>
                  <View style={styles.iconInputBox}>
                    <Feather name="users" size={16} color={Colors.textSubtle} style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.modalTextInput}
                      value={victimCount}
                      onChangeText={setVictimCount}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={Colors.textSubtle}
                    />
                  </View>
                </View>
                <View style={[styles.modalInputGroup, { flex: 1.2 }]}>
                  <Text style={styles.modalInputLabel}>Est. Age Group</Text>
                  <View style={styles.iconInputBox}>
                    <Feather name="calendar" size={16} color={Colors.textSubtle} style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.modalTextInput}
                      value={age}
                      onChangeText={setAge}
                      placeholder="e.g. Adult"
                      placeholderTextColor={Colors.textSubtle}
                    />
                  </View>
                </View>
              </View>

              {/* Highway Switch Banner style */}
              <View style={styles.switchBannerCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchBannerTitle}>Is Highway Incident?</Text>
                  <Text style={styles.switchBannerSub}>Requires specific routing</Text>
                </View>
                <Switch
                  value={isHighway}
                  onValueChange={setIsHighway}
                  trackColor={{ false: '#cbd5e1', true: Colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.modalInputLabel}>Landmarks / Context</Text>
                  <Text style={styles.optionalLabel}>Optional</Text>
                </View>
                <TextInput
                  style={[styles.modalTextInput, styles.modalTextArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe specific location details, notable buildings, or immediate hazards..."
                  placeholderTextColor={Colors.textSubtle}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            {/* Bottom Actions Row */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setSosModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitBtn} 
                onPress={submitSos}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Feather name="radio" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitBtnText}>DISPATCH NOW</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Triage Bottom Sheet Modal (Screenshot 3) */}
      <Modal
        visible={aiSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAiSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aiTriageCard}>
            <View style={styles.notchHandle} />
            
            {/* Title with robot emoji */}
            <View style={styles.aiTriageHeader}>
              <View style={styles.aiHeaderLeft}>
                <Text style={styles.robotEmojiStyle}>🤖</Text>
                <Text style={styles.aiTriageTitle}>AI Severity Prediction</Text>
              </View>
              {predictedResult && (
                <View style={[styles.aiSeverityBadgeContainer, getSeverityStyle(predictedResult.severity)]}>
                  <Feather name="alert-triangle" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.aiSeverityText}>{predictedResult.severity?.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {predictedResult && (
              <ScrollView style={styles.aiScrollContainer} showsVerticalScrollIndicator={false}>
                {/* Confidence circle ring overlay */}
                <View style={styles.confidenceCircleCard}>
                  <View style={styles.gaugeInnerContainer}>
                    <Svg width={120} height={120}>
                      <Circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                        fill="none"
                      />
                      <AnimatedCircle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke={Colors.primary}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={aiStrokeDashoffset}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                    </Svg>
                    <View style={styles.gaugeTextOverlay}>
                      <Text style={styles.gaugePercentageText}>
                        {(predictedResult.confidence * 100).toFixed(0)}%
                      </Text>
                      <Text style={styles.gaugeLabelText}>CONFIDENCE</Text>
                    </View>
                  </View>
                </View>

                {/* Recommended Protocol box */}
                <View style={styles.protocolCard}>
                  <View style={styles.protocolHeader}>
                    <MaterialCommunityIcons name="medical-bag" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.protocolTitle}>Recommended Protocol</Text>
                  </View>
                  <Text style={styles.protocolLabel}>Immediate Action Required:</Text>
                  <Text style={styles.protocolText}>{predictedResult.recommendation}</Text>
                  
                  {/* Stats line */}
                  <View style={styles.protocolMetaRow}>
                    <View style={styles.metaCol}>
                      <Feather name="clock" size={14} color={Colors.textSubtle} />
                      <Text style={styles.metaColText}>ETA: 4 mins</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Feather name="map-pin" size={14} color={Colors.textSubtle} />
                      <Text style={styles.metaColText}>1.2 miles</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Track route CTA button */}
            <TouchableOpacity 
              style={styles.aiTrackBtn}
              onPress={() => {
                setAiSheetVisible(false);
                router.push('/patient/track');
              }}
            >
              <MaterialCommunityIcons name={"route" as any} size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.aiTrackBtnText}>TRACK DISPATCH ROUTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 90, 67, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceElevated,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  profileWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#b91c1c', // Dark red card for profile warning
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  warningCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningIconStyle: {
    opacity: 0.9,
  },
  warningText: {
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  sosWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  sosOuterRingWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sosPulseRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: Colors.primary,
  },
  svgOverlay: {
    position: 'absolute',
    zIndex: 2,
  },
  sosCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    ...Shadow.red,
  },
  sosCircleHolding: {
    backgroundColor: Colors.primaryDark,
  },
  sosTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonText: {
    color: Colors.white,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 32,
    letterSpacing: 1.5,
  },
  sosButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: Spacing.xs,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  actionCardIcon: {
    marginBottom: Spacing.sm,
  },
  actionCardTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  activeMissionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    ...Shadow.md,
  },
  activeMissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  activeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  activeBadgeText: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    color: '#ffffff',
  },
  severityCritical: {
    backgroundColor: '#dc2626',
  },
  severityHigh: {
    backgroundColor: '#f59e0b',
  },
  severityMedium: {
    backgroundColor: '#3b82f6',
  },
  severityLow: {
    backgroundColor: '#10b981',
  },
  activeTypeText: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  activeAddressText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter_500Medium',
    marginBottom: Spacing.sm,
  },
  activeRouteCTA: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.info,
  },
  incidentsSection: {
    marginVertical: Spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyActivityCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyCardText: {
    color: Colors.textSubtle,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  activityRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    height: 64,
    ...Shadow.sm,
  },
  activeRowHighlight: {
    borderColor: Colors.borderStrong,
  },
  rowSideIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
  activityRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
  },
  activityAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCaseTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  activityCaseMeta: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.textMuted,
    marginTop: 2,
  },
  activityRightBadge: {
    paddingRight: 16,
  },
  statusItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusItemText: {
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.3,
  },
  secondaryMenuGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  secondaryMenuCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 10,
    ...Shadow.sm,
  },
  secondaryMenuIcon: {
    fontSize: 18,
  },
  secondaryMenuTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  secondaryMenuSub: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSubtle,
    marginTop: 1,
  },
  
  // Modal layout elements (Screenshot 2)
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '92%',
    ...Shadow.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
  },
  modalTriageNotice: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  modalScrollBody: {
    maxHeight: 380,
  },
  modalInputLabel: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  incidentSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  gridIncidentBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    height: 72,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridIncidentBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  gridIncidentLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
  },
  gridIncidentLabelActive: {
    color: Colors.primary,
  },
  modalRowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  modalInputGroup: {
    marginBottom: Spacing.md,
  },
  iconInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    height: 44,
  },
  inputLeftIcon: {
    paddingLeft: 12,
    paddingRight: 6,
  },
  modalTextInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    paddingHorizontal: 6,
  },
  switchBannerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchBannerTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  switchBannerSub: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSubtle,
    marginTop: 1,
  },
  optionalLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  modalSubmitBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.red,
  },
  modalSubmitBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  
  // AI Triage elements (Screenshot 3)
  aiTriageCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '94%',
    ...Shadow.lg,
  },
  notchHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHigh,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  aiTriageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  robotEmojiStyle: {
    fontSize: 22,
  },
  aiTriageTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
  },
  aiSeverityBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  aiSeverityText: {
    color: '#ffffff',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
  },
  aiScrollContainer: {
    maxHeight: 340,
  },
  confidenceCircleCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  gaugeInnerContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeTextOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePercentageText: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
  },
  gaugeLabelText: {
    fontSize: 8,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textSubtle,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  protocolCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  protocolTitle: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textPrimary,
  },
  protocolLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  protocolText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  protocolMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaColText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
  },
  aiTrackBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    ...Shadow.red,
  },
  aiTrackBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
