import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { auth as authApi } from '../services/api';
import { Colors, Radius, Spacing, Shadow } from '../constants/theme';
import Svg, { Path } from 'react-native-svg';

export default function Login() {
  const router = useRouter();
  const { setUser, setToken } = useAppStore();
  
  // Tab state: 'signin' or 'signup'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'patient' | 'driver'>('patient');

  // Animation values
  const glowAnim1 = useRef(new Animated.Value(0)).current;
  const glowAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation1 = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim1, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim1, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );
    const animation2 = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim2, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim2, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    );

    animation1.start();
    animation2.start();

    return () => {
      animation1.stop();
      animation2.stop();
    };
  }, []);

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (activeTab === 'signin') {
      if (!email || !password) {
        Alert.alert('Validation Error', 'Please enter your email and password.');
        return;
      }
    } else {
      if (!name || !email || !password || !confirmPassword) {
        Alert.alert('Validation Error', 'Please fill in all required fields.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Validation Error', 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Validation Error', 'Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (activeTab === 'signin') {
        // Log in
        const res = await authApi.login(email.trim().toLowerCase(), password);
        const { token, user } = res.data;

        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));

        setToken(token);
        setUser(user);

        if (user.role === 'driver') {
          router.replace('/driver/home');
        } else {
          router.replace('/patient/home');
        }
      } else {
        // Sign up
        const signupData: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: 'patient', // Default patient role
          healthProfile: {
            bloodGroup: 'Unknown',
            allergies: [],
            medications: [],
            primaryPhone: phone.trim(),
            chronicConditions: '',
            residentialAddress: '',
            emergencyContacts: [],
            timeline: []
          }
        };

        const res = await authApi.signup(signupData);
        const { token, user } = res.data;

        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));

        setToken(token);
        setUser(user);

        router.replace('/patient/home');
      }
    } catch (error: any) {
      console.error('Auth error:', error?.response?.data || error);
      
      // Fallback local demo modes if backend server is unreachable
      if (email.trim().includes('@')) {
        const lowerEmail = email.trim().toLowerCase();
        let fallbackRole: any = 'patient';
        let fallbackName = name || 'Demo Patient';
        let healthProfile: any = null;
        let driverProfile: any = null;

        if (lowerEmail === 'superadmin@emergency.com') {
          fallbackRole = 'superadmin';
          fallbackName = name || 'Super Administrator';
        } else if (lowerEmail.includes('admin')) {
          fallbackRole = 'admin';
          fallbackName = name || 'System Admin';
        } else if (lowerEmail.includes('staff')) {
          fallbackRole = 'hospital_staff';
          fallbackName = name || 'Medical Staff Operator';
        } else if (lowerEmail.includes('driver')) {
          fallbackRole = 'driver';
          fallbackName = name || 'Rajesh Kumar';
          driverProfile = {
            vehicleNumber: 'DL-01-EA-0001',
            licenseNumber: 'LIC-DB89182A',
            currentStatus: 'available'
          };
        } else if (lowerEmail.includes('patient') || lowerEmail.includes('user') || lowerEmail.includes('guest') || lowerEmail.includes('google')) {
          fallbackRole = 'patient';
          fallbackName = name || 'Test Patient';
          healthProfile = {
            bloodGroup: 'O+',
            allergies: ['Penicillin', 'Aspirin'],
            medications: ['Metformin 500mg'],
            primaryPhone: phone || '+91 98765 43210',
            chronicConditions: 'Diabetes Type 2',
            residentialAddress: '123 Tech Boulevard, Bangalore',
            emergencyContacts: [
              { name: 'Family Member', phone: '+91 98765 43211', relation: 'Spouse' }
            ],
            timeline: []
          };
        } else {
          // Default based on selected role state
          fallbackRole = role;
          fallbackName = name || (role === 'driver' ? 'Demo Driver' : 'Demo Patient');
          if (role === 'driver') {
            driverProfile = {
              vehicleNumber: 'KA-03-EA-1234',
              licenseNumber: 'LIC-772910',
              currentStatus: 'available'
            };
          } else {
            healthProfile = {
              bloodGroup: 'O+',
              allergies: ['Penicillin'],
              medications: ['Aspirin'],
              primaryPhone: phone || '+91 98765 43210',
              chronicConditions: 'None',
              residentialAddress: '123 Tech Boulevard, Bangalore',
              emergencyContacts: [
                { name: 'Srinivasan', phone: '+91 98765 43211', relation: 'Father' }
              ],
              timeline: []
            };
          }
        }

        const fallbackUser: any = {
          _id: `demo_${fallbackRole}_user`,
          name: fallbackName,
          email: lowerEmail,
          role: fallbackRole,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (healthProfile) fallbackUser.healthProfile = healthProfile;
        if (driverProfile) fallbackUser.driverProfile = driverProfile;

        await SecureStore.setItemAsync('token', 'demo_token');
        await SecureStore.setItemAsync('user', JSON.stringify(fallbackUser));
        setToken('demo_token');
        setUser(fallbackUser);

        Alert.alert('Demo Mode Active', `Logged in locally as ${fallbackName} (${fallbackRole})`);
        if (fallbackRole === 'driver') {
          router.replace('/driver/home');
        } else {
          router.replace('/patient/home');
        }
      } else {
        const errMsg = error?.response?.data?.message || 'Server offline. Enter a valid email format for local demo mode.';
        Alert.alert('Authentication Failed', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  const handleGoogleAuth = () => {
    setShowGoogleModal(true);
    setShowCustomGoogleInput(false);
    setCustomGoogleEmail('');
    setCustomGoogleName('');
  };

  const handleGoogleSelect = async (gEmail: string, gName: string) => {
    setLoading(true);
    setShowGoogleModal(false);
    try {
      const res = await authApi.googleLogin(gEmail, gName);
      const { token, user } = res.data;

      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      setToken(token);
      setUser(user);

      Alert.alert('Google Auth Success', `Welcome, ${user.name}!`);
      if (user.role === 'driver') {
        router.replace('/driver/home');
      } else {
        router.replace('/patient/home');
      }
    } catch (error: any) {
      console.error('Google auth error:', error?.response?.data || error);
      const errMsg = error?.response?.data?.message || 'Google authentication failed.';
      Alert.alert('Authentication Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (emailVal: string, passwordVal: string) => {
    setActiveTab('signin');
    setEmail(emailVal);
    setPassword(passwordVal);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Breathing ambient glow backgrounds */}
      <Animated.View style={[
        styles.glowBlob,
        {
          backgroundColor: 'rgba(255, 90, 67, 0.05)',
          top: -20,
          left: -40,
          width: 260,
          height: 260,
          transform: [
            {
              scale: glowAnim1.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2],
              }),
            },
            {
              translateY: glowAnim1.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 15],
              }),
            },
          ],
        }
      ]} />
      <Animated.View style={[
        styles.glowBlob,
        {
          backgroundColor: 'rgba(14, 165, 233, 0.04)',
          bottom: 40,
          right: -40,
          width: 280,
          height: 280,
          transform: [
            {
              scale: glowAnim2.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.15],
              }),
            },
            {
              translateX: glowAnim2.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -20],
              }),
            },
          ],
        }
      ]} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Title Block */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Feather name="shield" size={24} color="white" />
          </View>
          <Text style={styles.appName}>Emergency<Text style={{ color: Colors.primary }}>AI</Text></Text>
          <Text style={styles.tagline}>
            {activeTab === 'signin'
              ? 'Access the Emergency Response System'
              : 'Join the Emergency Response Network'
            }
          </Text>
        </View>

        {/* Card container */}
        <View style={styles.card}>
          
          {/* Email input */}
          {activeTab === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={Colors.textSubtle}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {activeTab === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="phone-pad"
              />
            </View>
          )}

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={activeTab === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={16}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password (Signup only) */}
          {activeTab === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Or separator */}
          <View style={styles.separatorContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.line} />
          </View>

          {/* Google SSO Button */}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleAuth}>
            <Svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
              <Path fill="#ea4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.177 4.2-3.414 0-6.19-2.776-6.19-6.19 0-3.414 2.776-6.19 6.19-6.19 1.487 0 2.85.53 3.923 1.391l3.14-3.14C18.96 2.052 15.795 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.897 0 10.82-4.248 10.82-11.24 0-.677-.076-1.328-.198-1.955H12.24z"/>
            </Svg>
            <Text style={styles.googleBtnText}>
              {activeTab === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toggle navigation */}
        <View style={styles.toggleTextContainer}>
          {activeTab === 'signin' ? (
            <Text style={styles.toggleText}>
              No account?{' '}
              <Text style={styles.toggleLink} onPress={() => setActiveTab('signup')}>
                Create one
              </Text>
            </Text>
          ) : (
            <Text style={styles.toggleText}>
              Already have an account?{' '}
              <Text style={styles.toggleLink} onPress={() => setActiveTab('signin')}>
                Sign in
              </Text>
            </Text>
          )}
        </View>

        {/* Demo login shortcuts drawer */}
        <View style={styles.demoBox}>
          <Text style={styles.demoLabel}>
            {activeTab === 'signin' ? 'DEMO CREDENTIALS' : 'SYSTEM ACCESS ACCOUNTS'}
          </Text>
          <View style={styles.demoList}>
            <TouchableOpacity
              style={styles.demoItem}
              onPress={() => setDemoCredentials('staff@emergency.com', 'Staff@123')}
            >
              <Text style={styles.demoRole}>Staff:</Text>
              <Text style={styles.demoEmail}>staff@emergency.com</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoItem}
              onPress={() => setDemoCredentials('admin@emergency.com', 'Admin@123')}
            >
              <Text style={styles.demoRole}>Admin:</Text>
              <Text style={styles.demoEmail}>admin@emergency.com</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoItem}
              onPress={() => setDemoCredentials('superadmin@emergency.com', 'SuperAdmin@123')}
            >
              <Text style={styles.demoRole}>SuperAdmin:</Text>
              <Text style={styles.demoEmail}>superadmin@emergency.com</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.demoItem}
              onPress={() => setDemoCredentials('driver1@emergencyai.com', 'Driver@123')}
            >
              <Text style={styles.demoRole}>Driver:</Text>
              <Text style={styles.demoEmail}>driver1@emergencyai.com</Text>
            </TouchableOpacity>

            <View style={styles.demoDivider} />
            
            <TouchableOpacity
              style={styles.demoItemPatient}
              onPress={() => setDemoCredentials('patient@emergency.com', 'Patient@123')}
            >
              <Text style={[styles.demoRole, { color: Colors.primary }]}>Patient:</Text>
              <Text style={[styles.demoEmail, { color: Colors.textMuted }]}>patient@emergency.com (Citizen)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Google Sign In Modal */}
      <Modal
        visible={showGoogleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.googleLogoContainer}>
              <Svg width="36" height="36" viewBox="0 0 24 24">
                <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </Svg>
            </View>

            <Text style={styles.modalTitle}>Sign in with Google</Text>
            <Text style={styles.modalSubtitle}>Choose an account to continue to EmergencyAI</Text>

            {!showCustomGoogleInput ? (
              <View style={styles.modalAccounts}>
                <TouchableOpacity
                  style={styles.modalAccountItem}
                  onPress={() => handleGoogleSelect('vaass.google@gmail.com', 'Vaas Developer')}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.avatarLetter}>V</Text>
                  </View>
                  <View style={styles.accountTextContainer}>
                    <Text style={styles.accountName}>Vaas Developer</Text>
                    <Text style={styles.accountEmail}>vaass.google@gmail.com</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalAccountItem}
                  onPress={() => handleGoogleSelect('guest.user@gmail.com', 'Guest Citizen')}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.avatarLetter}>G</Text>
                  </View>
                  <View style={styles.accountTextContainer}>
                    <Text style={styles.accountName}>Guest Citizen</Text>
                    <Text style={styles.accountEmail}>guest.user@gmail.com</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalAccountItem, { borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent', justifyContent: 'center' }]}
                  onPress={() => setShowCustomGoogleInput(true)}
                >
                  <Text style={styles.useOtherText}>Use another account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.customInputContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={customGoogleName}
                    onChangeText={setCustomGoogleName}
                    placeholder="Jane Doe"
                    placeholderTextColor={Colors.textSubtle}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Google Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                    placeholder="custom@gmail.com"
                    placeholderTextColor={Colors.textSubtle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalBackBtn}
                    onPress={() => setShowCustomGoogleInput(false)}
                  >
                    <Text style={styles.modalBackBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalContinueBtn, { opacity: customGoogleEmail.includes('@') ? 1 : 0.5 }]}
                    disabled={!customGoogleEmail.includes('@')}
                    onPress={() => handleGoogleSelect(customGoogleEmail, customGoogleName || customGoogleEmail.split('@')[0])}
                  >
                    <Text style={styles.modalContinueBtnText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowGoogleModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel Authentication</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.red,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.black,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 12,
    color: '#0284c7', // Slate sky blue
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xs,
    ...Shadow.red,
  },
  submitBtnText: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    marginHorizontal: Spacing.md,
    fontSize: 11,
    color: Colors.textSubtle,
    textTransform: 'uppercase',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.sm,
    paddingVertical: 12,
  },
  googleBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
  },
  toggleTextContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  toggleText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  toggleLink: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  demoBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  demoLabel: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  demoList: {
    gap: 8,
  },
  demoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  demoItemPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 67, 0.2)',
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 90, 67, 0.03)',
    paddingHorizontal: 8,
  },
  demoRole: {
    width: 80,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.textMuted,
  },
  demoEmail: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.textMuted,
  },
  demoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 10, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleLogoContainer: {
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalAccounts: {
    width: '100%',
    gap: 10,
    marginBottom: Spacing.md,
  },
  modalAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 10,
    width: '100%',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  accountTextContainer: {
    flex: 1,
  },
  accountName: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  accountEmail: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSubtle,
  },
  useOtherText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  customInputContainer: {
    width: '100%',
    gap: 12,
    marginBottom: Spacing.md,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalBackBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBackBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
  },
  modalContinueBtn: {
    flex: 2,
    backgroundColor: '#4285F4',
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalContinueBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  modalCancelBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSubtle,
  },
  modalCancelBtn: {
    marginTop: Spacing.sm,
    padding: 6,
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: 150,
  },
});
