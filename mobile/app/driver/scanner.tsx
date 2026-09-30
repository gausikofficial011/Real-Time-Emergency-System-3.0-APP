import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';

export default function QRScanner() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    try {
      const parsed = JSON.parse(data);
      if (parsed.bloodGroup || parsed.name) {
        setPatientData(parsed);
        setShowDetailModal(true);
      } else {
        Alert.alert('Scan Failed', 'Scanned QR code does not contain valid EmergencyAI Medical ID data.', [
          { text: 'Scan Again', onPress: () => setScanned(false) }
        ]);
      }
    } catch (e) {
      Alert.alert('Scan Failed', 'Could not parse medical ID QR payload.', [
        { text: 'Scan Again', onPress: () => setScanned(false) }
      ]);
    }
  };

  // Mock scan button for demo purpose inside simulator/emulators
  const triggerMockScan = () => {
    const mockData = {
      name: 'Rahul Sharma',
      bloodGroup: 'B+',
      allergies: ['Aspirin', 'Sulfa Drugs'],
      medications: ['Atorvastatin 10mg'],
      contacts: [
        { name: 'Dr. Alok Sharma', phone: '+91 98765 43210', relation: 'Father / Emergency Contact' }
      ]
    };
    setPatientData(mockData);
    setShowDetailModal(true);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.infoText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.infoText}>Camera access denied. Please enable camera in settings.</Text>
        <TouchableOpacity style={styles.mockBtn} onPress={triggerMockScan}>
          <Text style={styles.mockBtnText}>Simulate Patient Scan (Demo Mode)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={styles.overlay}>
          <View style={styles.scannerOutline}>
            <View style={styles.scannerLaser} />
          </View>
          <Text style={styles.scanInstruction}>
            Align patient's Medical ID QR inside the frame
          </Text>

          {/* Direct Simulator/Demo bypass button */}
          <TouchableOpacity style={styles.demoShortcut} onPress={triggerMockScan}>
            <Text style={styles.demoShortcutText}>Bypass with Demo Patient Profile</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Patient Profile Decoded Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setScanned(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>🪪 PATIENT MEDICAL RECORD</Text>
            
            {patientData && (
              <ScrollView style={styles.scroll}>
                <View style={styles.profileSection}>
                  <Text style={styles.label}>Patient Name</Text>
                  <Text style={styles.patientName}>{patientData.name}</Text>
                </View>

                <View style={styles.bloodSection}>
                  <Text style={styles.label}>Blood Type</Text>
                  <Text style={styles.bloodValue}>{patientData.bloodGroup}</Text>
                </View>

                <View style={styles.recordSection}>
                  <Text style={styles.label}>Allergies</Text>
                  {patientData.allergies?.length > 0 ? (
                    patientData.allergies.map((a: string, i: number) => (
                      <Text key={i} style={styles.allergyItem}>• {a}</Text>
                    ))
                  ) : (
                    <Text style={styles.noneText}>None reported</Text>
                  )}

                  <Text style={[styles.label, { marginTop: Spacing.md }]}>Active Medications</Text>
                  {patientData.medications?.length > 0 ? (
                    patientData.medications.map((m: string, i: number) => (
                      <Text key={i} style={styles.medItem}>• {m}</Text>
                    ))
                  ) : (
                    <Text style={styles.noneText}>None reported</Text>
                  )}
                </View>

                <View style={styles.contactsSection}>
                  <Text style={styles.label}>Emergency Contact</Text>
                  {patientData.contacts?.map((c: any, i: number) => (
                    <View key={i} style={styles.contactItem}>
                      <Text style={styles.contactName}>{c.name} ({c.relation})</Text>
                      <Text style={styles.contactPhone}>{c.phone}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.closeBtn}
              onPress={() => {
                setShowDetailModal(false);
                setScanned(false);
              }}
            >
              <Text style={styles.closeBtnText}>CLOSE MEDICAL RECORD</Text>
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
    backgroundColor: Colors.black,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  infoText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerOutline: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.info,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  scannerLaser: {
    height: 2,
    backgroundColor: Colors.primary,
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  scanInstruction: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  demoShortcut: {
    marginTop: Spacing.xl,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  demoShortcutText: {
    color: Colors.info,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  mockBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.sm,
  },
  mockBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.md,
    maxHeight: '80%',
    ...Shadow.lg,
  },
  modalHeader: {
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  scroll: {
    marginBottom: Spacing.md,
  },
  profileSection: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  patientName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
  },
  bloodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
    borderWidth: 1,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  bloodValue: {
    color: Colors.primary,
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    marginLeft: 8,
  },
  recordSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  allergyItem: {
    color: '#ef4444',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginLeft: 6,
  },
  medItem: {
    color: '#ef4444',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginLeft: 6,
  },
  noneText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  contactsSection: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  contactItem: {
    marginTop: 4,
  },
  contactName: {
    color: Colors.textPrimary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  contactPhone: {
    color: Colors.info,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    ...Shadow.red,
  },
  closeBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
