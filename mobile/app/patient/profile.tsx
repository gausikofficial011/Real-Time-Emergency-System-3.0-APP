import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Modal, FlatList, Image, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { auth as authApi, hospital as hospitalApi } from '../../services/api';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

export default function PatientProfile() {
  const router = useRouter();
  const { user, setUser, logout } = useAppStore();
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Identity
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.healthProfile?.primaryPhone || '');

  // Vitals & Conditions
  const [bloodGroup, setBloodGroup] = useState(user?.healthProfile?.bloodGroup || 'Unknown');
  const [allergiesText, setAllergiesText] = useState(user?.healthProfile?.allergies?.join(', ') || '');
  const [medicationsText, setMedicationsText] = useState(user?.healthProfile?.medications?.join(', ') || '');
  const [chronicConditions, setChronicConditions] = useState(user?.healthProfile?.chronicConditions || '');

  // Logistics
  const [preferredHospital, setPreferredHospital] = useState(user?.healthProfile?.preferredHospital || '');
  const [residentialAddress, setResidentialAddress] = useState(user?.healthProfile?.residentialAddress || '');
  const [hospitalsList, setHospitalsList] = useState<any[]>([]);

  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>(user?.healthProfile?.emergencyContacts || []);

  // Append record states
  const [recordCategory, setRecordCategory] = useState('Medication Log');
  const [recordNotes, setRecordNotes] = useState('');
  const [fileName, setFileName] = useState('');

  // Voice dictation modal states
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string>('');
  const [dictatedText, setDictatedText] = useState('');
  const [isDictating, setIsDictating] = useState(false);

  // QR Code presentation
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    // Load hospital directory
    const fetchHospitals = async () => {
      try {
        const res = await hospitalApi.getAll();
        setHospitalsList(res.data.hospitals || []);
      } catch (e) {
        console.log('Failed to fetch hospital list on mobile profile', e);
      }
    };
    fetchHospitals();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name,
        healthProfile: {
          bloodGroup,
          allergies: allergiesText.split(',').map((x) => x.trim()).filter(Boolean),
          medications: medicationsText.split(',').map((x) => x.trim()).filter(Boolean),
          primaryPhone: phone,
          chronicConditions,
          residentialAddress,
          preferredHospital,
          emergencyContacts,
          timeline: user?.healthProfile?.timeline || []
        },
      };

      const res = await authApi.updateProfile(data);
      const updatedUser = res.data.user;
      setUser(updatedUser);
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      Alert.alert('Profile Secured', 'Your Advanced Health Profile has been synchronized.');
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error Saving', e?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      { name: '', phone: '', relation: '' }
    ]);
  };

  const handleRemoveContact = (index: number) => {
    const updated = [...emergencyContacts];
    updated.splice(index, 1);
    setEmergencyContacts(updated);
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    const updated = [...emergencyContacts];
    updated[index][field] = value;
    setEmergencyContacts(updated);
  };

  // Commit timeline record
  const handleCommitRecord = async () => {
    if (!recordNotes.trim()) {
      Alert.alert('Validation Error', 'Please enter notes or observations.');
      return;
    }
    setCommitting(true);
    try {
      const newEvent = {
        category: recordCategory,
        notes: recordNotes,
        attachmentUrl: fileName ? `/uploads/${fileName}` : '',
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
      const updatedUser = res.data.user;
      setUser(updatedUser);
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      setRecordNotes('');
      setFileName('');
      Alert.alert('Timeline Updated', 'Timeline record committed successfully.');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to commit record to database.');
    } finally {
      setCommitting(false);
    }
  };

  // Simulated Voice dictation
  const startVoiceDictation = (fieldKey: string) => {
    setActiveVoiceField(fieldKey);
    setDictatedText('');
    setVoiceModalVisible(true);
    setIsDictating(true);

    // Typing simulation phrases
    const phrases: Record<string, string> = {
      Allergies: "Penicillin allergy, seasonal asthma, peanut warning.",
      Medications: "Insulin 10mg morning, Metformin 500mg post-lunch.",
      Conditions: "Diagnosed with hypertension and type-2 diabetes.",
      Address: "Apartment 4B, Emerald Heights, MG Road, Bangalore.",
      Hospital: "Manipal Hospital HAL road.",
      Notes: "Regular blood pressure check captured 125 over 80."
    };

    setTimeout(() => {
      setIsDictating(false);
      setDictatedText(phrases[fieldKey] || "Simulated microphone captured voice.");
    }, 2500);
  };

  const confirmVoiceDictation = () => {
    const setters: Record<string, (v: string) => void> = {
      Allergies: setAllergiesText,
      Medications: setMedicationsText,
      Conditions: setChronicConditions,
      Address: setResidentialAddress,
      Hospital: setPreferredHospital,
      Notes: setRecordNotes
    };
    
    if (setters[activeVoiceField]) {
      setters[activeVoiceField](dictatedText);
    }
    setVoiceModalVisible(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const qrDataStr = JSON.stringify({
    name: user?.name || '',
    bloodGroup,
    allergies: allergiesText.split(',').map((x) => x.trim()).filter(Boolean),
    medications: medicationsText.split(',').map((x) => x.trim()).filter(Boolean),
    phone
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* DB Sync Banner */}
      <View style={styles.syncHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.syncTitle}>Advanced Health Profile</Text>
          <Text style={styles.syncSub}>MongoDB Database Synchronization</Text>
        </View>
        <View style={styles.syncBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.syncBadgeText}>SYNCED</Text>
        </View>
      </View>

      {/* SECTION: Identity & Verification */}
      <Text style={styles.sectionTitle}>• IDENTITY & VERIFICATION</Text>
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            placeholderTextColor={Colors.textSubtle}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Primary Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Primary contact phone"
            placeholderTextColor={Colors.textSubtle}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* SECTION: Critical Vitals & Conditions */}
      <Text style={styles.sectionTitle}>• CRITICAL VITALS & CONDITIONS</Text>
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.bloodSelector}>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((group) => (
              <TouchableOpacity
                key={group}
                style={[styles.bloodBtn, bloodGroup === group && styles.bloodBtnActive]}
                onPress={() => setBloodGroup(group)}
              >
                <Text style={[styles.bloodBtnText, bloodGroup === group && styles.bloodBtnTextActive]}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelHeader}>
            <Text style={styles.label}>Known Allergies</Text>
            <TouchableOpacity onPress={() => startVoiceDictation('Allergies')} style={styles.voiceBtn}>
              <FontAwesome name="microphone" size={12} color={Colors.info} />
              <Text style={styles.voiceBtnText}>USE VOICE</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={allergiesText}
            onChangeText={setAllergiesText}
            placeholder="e.g. Penicillin, Peanuts (Comma separated)"
            placeholderTextColor={Colors.textSubtle}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelHeader}>
            <Text style={styles.label}>Ongoing Medications</Text>
            <TouchableOpacity onPress={() => startVoiceDictation('Medications')} style={styles.voiceBtn}>
              <FontAwesome name="microphone" size={12} color={Colors.info} />
              <Text style={styles.voiceBtnText}>USE VOICE</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={medicationsText}
            onChangeText={setMedicationsText}
            placeholder="e.g. Insulin, Metformin (Comma separated)"
            placeholderTextColor={Colors.textSubtle}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelHeader}>
            <Text style={styles.label}>Chronic Conditions / treatment History</Text>
            <TouchableOpacity onPress={() => startVoiceDictation('Conditions')} style={styles.voiceBtn}>
              <FontAwesome name="microphone" size={12} color={Colors.info} />
              <Text style={styles.voiceBtnText}>USE VOICE</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            value={chronicConditions}
            onChangeText={setChronicConditions}
            placeholder="Detailed medical background..."
            placeholderTextColor={Colors.textSubtle}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* SECTION: Logistics & Preferred Facilities */}
      <Text style={styles.sectionTitle}>• LOGISTICS & PREFERRED FACILITIES</Text>
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <View style={styles.labelHeader}>
            <Text style={styles.label}>Preferred Hospital / Facility</Text>
          </View>
          <View style={styles.pickerWrapper}>
            <TextInput
              style={styles.input}
              value={preferredHospital}
              onChangeText={setPreferredHospital}
              placeholder="Ex: Manipal Hospital HAL road"
              placeholderTextColor={Colors.textSubtle}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelHeader}>
            <Text style={styles.label}>Permanent Residential Address</Text>
            <TouchableOpacity onPress={() => startVoiceDictation('Address')} style={styles.voiceBtn}>
              <FontAwesome name="microphone" size={12} color={Colors.info} />
              <Text style={styles.voiceBtnText}>USE VOICE</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            value={residentialAddress}
            onChangeText={setResidentialAddress}
            placeholder="Full address for ambulance GPS routing..."
            placeholderTextColor={Colors.textSubtle}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* SECTION: Emergency Contacts */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>• EMERGENCY CONTACTS</Text>
        <TouchableOpacity style={styles.addContactBtn} onPress={handleAddContact}>
          <Feather name="plus" size={12} color="white" />
          <Text style={styles.addContactBtnText}>ADD CONTACT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {emergencyContacts.length === 0 ? (
          <Text style={styles.emptyContactsText}>No emergency contacts added yet.</Text>
        ) : (
          emergencyContacts.map((contact, idx) => (
            <View key={idx} style={styles.contactItemCard}>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.input, { flex: 2, marginRight: 6 }]}
                  value={contact.name}
                  onChangeText={(val) => handleContactChange(idx, 'name', val)}
                  placeholder="Name"
                  placeholderTextColor={Colors.textSubtle}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 6 }]}
                  value={contact.relation}
                  onChangeText={(val) => handleContactChange(idx, 'relation', val)}
                  placeholder="Relation"
                  placeholderTextColor={Colors.textSubtle}
                />
                <TouchableOpacity
                  style={styles.deleteContactBtn}
                  onPress={() => handleRemoveContact(idx)}
                >
                  <Feather name="trash-2" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={contact.phone}
                onChangeText={(val) => handleContactChange(idx, 'phone', val)}
                placeholder="Phone number"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="phone-pad"
              />
            </View>
          ))
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveBtnText}>SECURE & SAVE HEALTH PROFILE</Text>
        )}
      </TouchableOpacity>

      {/* SECTION: Append Timeline Record */}
      <Text style={styles.sectionTitle}>• APPEND NEW RECORD</Text>
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Record Category</Text>
          <View style={styles.categorySelectRow}>
            {['Medication Log', 'Vaccine', 'Lab Report', 'Diagnosis'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catTab, recordCategory === cat && styles.catTabActive]}
                onPress={() => setRecordCategory(cat)}
              >
                <Text style={[styles.catTabText, recordCategory === cat && styles.catTabTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelHeader}>
            <Text style={styles.label}>Notes / Observations</Text>
            <TouchableOpacity onPress={() => startVoiceDictation('Notes')} style={styles.voiceBtn}>
              <FontAwesome name="microphone" size={12} color={Colors.info} />
              <Text style={styles.voiceBtnText}>USE VOICE</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={recordNotes}
            onChangeText={setRecordNotes}
            placeholder="Record symptoms, observations, or dosage..."
            placeholderTextColor={Colors.textSubtle}
            multiline
          />
        </View>

        {/* Upload Doc placeholder */}
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => setFileName('lab_report_scan_2026.pdf')}
        >
          <Feather name="upload" size={16} color={Colors.textMuted} />
          <Text style={styles.uploadBoxText}>
            {fileName ? `Attached: ${fileName}` : 'CLICK TO UPLOAD SCAN / LAB REPORT'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commitBtn}
          onPress={handleCommitRecord}
          disabled={committing}
        >
          {committing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.commitBtnText}>COMMIT TO TIMELINE</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* SECTION: Lifetime Timeline events */}
      <Text style={styles.sectionTitle}>• MEDICAL DOSSIER HISTORY (LIFETIME)</Text>
      <View style={styles.card}>
        {(!user?.healthProfile?.timeline || user.healthProfile.timeline.length === 0) ? (
          <Text style={styles.emptyTimelineText}>NO EVENTS LOGGED</Text>
        ) : (
          <View style={styles.timelineList}>
            {user.healthProfile.timeline.map((event: any, idx: number) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={styles.timelineDot} />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineCategory}>{event.category}</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(event.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.timelineNotes}>{event.notes}</Text>
                  {event.attachmentUrl ? (
                    <Text style={styles.timelineAttachment}>📎 scan_attachment.pdf</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* QR Code Presentation */}
      <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQr(!showQr)}>
        <Text style={styles.qrBtnText}>
          {showQr ? 'HIDE EMERGENCY SCAN QR' : 'GENERATE EMERGENCY QR CARD'}
        </Text>
      </TouchableOpacity>

      {showQr && (
        <View style={styles.qrCard}>
          <Text style={styles.qrHeader}>PARAMEDIC EMERGENCY ID</Text>
          <Text style={styles.qrSub}>Allows first responders to fetch your health records offline.</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={qrDataStr}
              size={160}
              backgroundColor={Colors.white}
              color={Colors.black}
            />
          </View>

          <Text style={styles.qrName}>{user?.name?.toUpperCase()}</Text>
          <Text style={styles.qrBlood}>BLOOD GROUP: {bloodGroup}</Text>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Logout Account</Text>
      </TouchableOpacity>

      {/* VOICE DICTATION DIALOG MODAL */}
      <Modal
        visible={voiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎙️ Speech-to-Text Dictation</Text>
            
            {isDictating ? (
              <View style={styles.listeningBox}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.listeningText}>Listening to mic...</Text>
              </View>
            ) : (
              <View style={styles.capturedBox}>
                <Text style={styles.capturedLabel}>Captured Transcript:</Text>
                <TextInput
                  style={styles.capturedInput}
                  value={dictatedText}
                  onChangeText={setDictatedText}
                  multiline
                />
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setVoiceModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={confirmVoiceDictation}
                disabled={isDictating}
              >
                <Text style={styles.modalConfirmText}>Insert Text</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  syncTitle: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.black,
  },
  syncSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successGlow,
    borderWidth: 1,
    borderColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  syncBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.success,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textSubtle,
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  labelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceBtnText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.info,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  bloodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bloodBtn: {
    width: 52,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  bloodBtnActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  bloodBtnText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  bloodBtnTextActive: {
    color: Colors.primary,
  },
  pickerWrapper: {
    marginTop: 2,
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    gap: 4,
  },
  addContactBtnText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: 'white',
  },
  emptyContactsText: {
    textAlign: 'center',
    padding: 16,
    color: Colors.textSubtle,
    fontSize: 13,
  },
  contactItemCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteContactBtn: {
    width: 32,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.red,
  },
  saveBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  categorySelectRow: {
    flexDirection: 'row',
    gap: 6,
  },
  catTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  catTabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
  },
  catTabText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
  },
  catTabTextActive: {
    color: '#8b5cf6',
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    backgroundColor: 'rgba(15, 23, 42, 0.01)',
    padding: 16,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  uploadBoxText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    marginTop: 6,
  },
  commitBtn: {
    backgroundColor: '#5b21b6',
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  commitBtnText: {
    color: 'white',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  emptyTimelineText: {
    textAlign: 'center',
    padding: 24,
    color: Colors.textSubtle,
    fontSize: 13,
  },
  timelineList: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLine: {
    width: 12,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.purple,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 8,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCategory: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.purple,
  },
  timelineDate: {
    fontSize: 10,
    color: Colors.textSubtle,
  },
  timelineNotes: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  timelineAttachment: {
    fontSize: 11,
    color: Colors.info,
    marginTop: 4,
  },
  qrBtn: {
    backgroundColor: Colors.info,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  qrBtnText: {
    color: 'white',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  qrCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  qrHeader: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.primary,
  },
  qrSub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: 4,
  },
  qrContainer: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 12,
  },
  qrName: {
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.black,
  },
  qrBlood: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  logoutBtnText: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  listeningBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  listeningText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
  },
  capturedBox: {
    gap: 6,
  },
  capturedLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
  },
  capturedInput: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.sm,
    padding: 10,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: Colors.black,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: Spacing.md,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  modalConfirm: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
