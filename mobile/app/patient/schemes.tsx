import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, ActivityIndicator, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';

interface Scheme {
  id: string;
  name: string;
  provider: string;
  coverage: string;
  status: 'active' | 'pending' | 'expired';
}

const MOCK_SCHEMES: Scheme[] = [
  { id: '1', name: 'Prime Health Plus', provider: 'Star Insurance', coverage: 'Full Emergency & ICU', status: 'active' },
  { id: '2', name: 'Ayushman Bharat', provider: 'Government of India', coverage: 'Secondary & Tertiary Care', status: 'active' },
];

export default function SchemesAndClaims() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'schemes' | 'claims'>('schemes');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // Claim Form State
  const [claimType, setClaimType] = useState('emergency');
  const [amount, setAmount] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [description, setDescription] = useState('');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const submitClaim = () => {
    if (!amount || !hospitalName) {
      Alert.alert('Missing Info', 'Please provide the claim amount and hospital name.');
      return;
    }
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Claim Submitted',
        'Your claim request has been logged. Our agents will verify the documents within 24-48 hours.',
        [{ text: 'Great', onPress: () => setActiveTab('schemes') }]
      );
      // Reset form
      setAmount('');
      setHospitalName('');
      setDescription('');
      setImage(null);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schemes & Claims</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schemes' && styles.activeTab]}
          onPress={() => setActiveTab('schemes')}
        >
          <Text style={[styles.tabText, activeTab === 'schemes' && styles.activeTabText]}>My Schemes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'claims' && styles.activeTab]}
          onPress={() => setActiveTab('claims')}
        >
          <Text style={[styles.tabText, activeTab === 'claims' && styles.activeTabText]}>Submit Claim</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'schemes' ? (
          <View style={styles.list}>
            <Text style={styles.sectionLabel}>ACTIVE MEDICAL SCHEMES</Text>
            {MOCK_SCHEMES.map((scheme) => (
              <View key={scheme.id} style={styles.schemeCard}>
                <View style={styles.schemeInfo}>
                  <Text style={styles.schemeName}>{scheme.name}</Text>
                  <Text style={styles.schemeProvider}>{scheme.provider}</Text>
                  <Text style={styles.schemeCoverage}>Coverage: {scheme.coverage}</Text>
                </View>
                <View style={[styles.statusBadge, scheme.status === 'active' ? styles.statusActive : styles.statusPending]}>
                  <Text style={styles.statusText}>{scheme.status.toUpperCase()}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addSchemeBtn}>
              <Text style={styles.addSchemeBtnText}>+ Link New Scheme / Insurance</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.claimForm}>
            <Text style={styles.sectionLabel}>NEW REIMBURSEMENT CLAIM</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hospital Name</Text>
              <TextInput
                style={styles.input}
                value={hospitalName}
                onChangeText={setHospitalName}
                placeholder="e.g. Apollo Hospital"
                placeholderTextColor={Colors.textSubtle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={Colors.textSubtle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Upload Bills / Receipts</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadText}>Tap to upload medical bills</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Details</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                placeholder="Mention specific emergency services received..."
                placeholderTextColor={Colors.textSubtle}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={submitClaim}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>SUBMIT CLAIM REQUEST</Text>
              )}
            </TouchableOpacity>
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.primary,
  },
  content: {
    padding: Spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textSubtle,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  list: {
    gap: Spacing.md,
  },
  schemeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.sm,
  },
  schemeInfo: {
    flex: 1,
    gap: 4,
  },
  schemeName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  schemeProvider: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter_500Medium',
  },
  schemeCoverage: {
    fontSize: 11,
    color: Colors.info,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  statusActive: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.success,
  },
  addSchemeBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  addSchemeBtnText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  claimForm: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadBox: {
    height: 120,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    color: Colors.textSubtle,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.red,
  },
  submitBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
});
