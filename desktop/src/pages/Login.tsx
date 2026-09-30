import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { auth as authApi } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import worldMapBg from '@/assets/world_map_bg.png';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setToken, user } = useAppStore();
  
  // Tab state: 'signin' or 'signup'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@emergencyai.com');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'patient' || user.role === 'user') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/dispatch', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setError('');
    setPassword('');
    setConfirmPassword('');
    if (tab === 'signin') {
      setEmail('admin@emergencyai.com');
    } else {
      setEmail('');
      setName('');
      setPhone('');
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
      const { token: jwtToken, user: userData } = res.data;
      setToken(jwtToken);
      setUser(userData);
      toast.success(`Google authentication successful! Welcome, ${userData.name}`);
      if (userData.role === 'patient' || userData.role === 'user') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/dispatch', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Google SSO failed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setActiveTab('signin');
    setEmail(roleEmail);
    setPassword(rolePass);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'signin') {
      if (!email || !password) {
        setError('Email and password are required');
        return;
      }
      setLoading(true);
      try {
        const res = await authApi.login(email, password);
        const { token: jwtToken, user: userData } = res.data;
        setToken(jwtToken);
        setUser(userData);
        toast.success(`Welcome back, ${userData.name}!`);
        if (userData.role === 'patient' || userData.role === 'user') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/dispatch', { replace: true });
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
        
        // Demo fallback if backend is offline or incorrect credentials
        if (email.includes('@')) {
          let role: any = 'admin';
          let displayName = 'System Admin';
          let healthProfile: any = null;
          let driverProfile: any = null;
          
          const lowerEmail = email.toLowerCase();
          if (lowerEmail === 'superadmin@emergency.com') {
            role = 'superadmin';
            displayName = 'Super Administrator';
          } else if (lowerEmail.includes('patient') || lowerEmail.includes('user') || lowerEmail.includes('guest') || lowerEmail.includes('google')) {
            role = lowerEmail.includes('patient') ? 'patient' : 'user';
            displayName = lowerEmail.includes('patient') ? 'Test Patient' : 'Demo Patient';
            healthProfile = {
              bloodGroup: 'O+',
              allergies: ['Penicillin', 'Aspirin'],
              medications: ['Metformin 500mg'],
              primaryPhone: '+91 98765 43210',
              chronicConditions: 'Diabetes Type 2',
              residentialAddress: '123 Tech Park, Sector 4, Bangalore',
              emergencyContacts: [
                { name: 'Family Member', phone: '+91 98765 43211', relation: 'Spouse' }
              ],
              timeline: [
                { category: 'Medication Log', notes: 'Took regular prescription dose.', createdAt: new Date().toISOString() }
              ]
            };
          } else if (lowerEmail.includes('staff')) {
            role = 'hospital_staff';
            displayName = 'Medical Staff Operator';
          } else if (lowerEmail.includes('driver')) {
            role = 'driver';
            displayName = 'Rajesh Kumar';
            driverProfile = {
              vehicleNumber: 'DL-01-EA-0001',
              licenseNumber: 'LIC-DB89182A',
              currentStatus: 'available'
            };
          } else if (lowerEmail === 'admin@emergencyai.com') {
            role = 'admin';
            displayName = 'System Admin AI';
          } else if (lowerEmail === 'admin@emergency.com') {
            role = 'admin';
            displayName = 'System Admin';
          }

          const demoUser: any = {
            _id: `demo_${role}_user`,
            name: displayName,
            email,
            role,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (healthProfile) {
            demoUser.healthProfile = healthProfile;
          }
          if (driverProfile) {
            demoUser.driverProfile = driverProfile;
          }

          setToken('demo_token_12345');
          setUser(demoUser);
          toast.success(`Demo Mode — logged in as ${displayName}`);
          if (role === 'patient' || role === 'user') {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/dispatch', { replace: true });
          }
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Sign Up flow
      if (!name || !email || !password || !confirmPassword) {
        setError('All fields except phone number are required');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      setLoading(true);
      try {
        const payload = {
          name,
          email,
          password,
          role: 'user',
          healthProfile: {
            bloodGroup: 'Unknown',
            allergies: [],
            medications: [],
            primaryPhone: phone || '',
            chronicConditions: '',
            residentialAddress: '',
            emergencyContacts: [],
            timeline: []
          }
        };
        const res = await authApi.signup(payload);
        const { token: jwtToken, user: userData } = res.data;
        setToken(jwtToken);
        setUser(userData);
        toast.success(`Account created successfully! Welcome, ${userData.name}`);
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Registration failed. Try again.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      background: '#090b11',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      padding: windowWidth >= 900 ? '16px 20px' : '12px 10px',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Premium Background Effects */}
      <div className="premium-grid-bg" />
      <div className="premium-radial-glow glow-red" style={{ top: '10%', left: '15%', width: 600, height: 600 }} />
      <div className="premium-radial-glow glow-blue" style={{ bottom: '10%', right: '15%', width: 700, height: 700 }} />

      {/* Header logo/brand (Only shown on mobile/stacked view, hidden when side-by-side to avoid duplication) */}
      {windowWidth < 900 && (
        <div style={{ textAlign: 'center', marginBottom: 24, zIndex: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 8
          }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(220,38,38,0.3)',
            }}>
              <Shield size={22} color="white" />
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
              Emergency<span style={{ color: '#dc2626' }}>AI</span>
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#38bdf8', fontWeight: 500 }}>
            {activeTab === 'signin' 
              ? 'Access the Emergency Response System' 
              : 'Join the Emergency Response Network'
            }
          </p>
        </div>
      )}

      {/* Main Layout Grid */}
      <div style={{
        display: 'flex',
        flexDirection: windowWidth >= 900 ? 'row' : 'column',
        alignItems: windowWidth >= 900 ? 'stretch' : 'center',
        justifyContent: 'center',
        gap: windowWidth >= 900 ? 32 : 24,
        width: '100%',
        maxWidth: windowWidth >= 900 ? 1100 : 440,
        zIndex: 10,
        margin: '0 auto'
      }}>
        {/* Left Card: System Status, World Map, Logo, Telemetry (Desktop/Laptop only) */}
        {windowWidth >= 900 && (
          <div style={{
            flex: 1.1,
            background: '#0c0e17',
            backgroundImage: `linear-gradient(rgba(12, 14, 23, 0.8), rgba(12, 14, 23, 0.9)), url(${worldMapBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            borderRadius: 16,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            overflow: 'hidden'
          }}>
            {/* Top section: Large Logo and Subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 10 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 8
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(220,38,38,0.3)',
                }}>
                  <Shield size={24} color="white" />
                </div>
                <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1.5px' }}>
                  Emergency<span style={{ color: '#dc2626' }}>AI</span>
                </span>
              </div>
              <p style={{ fontSize: 14, color: '#38bdf8', fontWeight: 600, letterSpacing: '0.5px' }}>
                Access the Emergency Response System
              </p>
            </div>

            {/* Bottom section: Telemetry information */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 24 }}>
              {/* Left Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>System Status</span>
                  <div style={{
                    border: '1px solid rgba(220, 38, 38, 0.4)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    background: 'rgba(220, 38, 38, 0.1)',
                    display: 'inline-block'
                  }}>
                    <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 800, letterSpacing: '0.5px' }}>OPERATIONAL</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 24, color: '#dc2626', fontWeight: 900, display: 'block', lineHeight: 1 }}>24/7</span>
                  <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Monitoring</span>
                </div>
              </div>

              {/* Right Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  background: 'rgba(18, 20, 32, 0.65)',
                  minWidth: 120,
                  textAlign: 'left'
                }}>
                  <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>Active Alerts</span>
                  <span style={{ fontSize: 24, color: '#dc2626', fontWeight: 900 }}>12</span>
                </div>
                <div style={{
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  background: 'rgba(18, 20, 32, 0.65)',
                  minWidth: 120,
                  textAlign: 'left'
                }}>
                  <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Response Time</span>
                  <span style={{ fontSize: 24, color: '#dc2626', fontWeight: 900 }}>2.4s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Stack: Login Card and Demo Credentials Card */}
        <div style={{
          flex: 1,
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {/* Card container */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            style={{
              width: '100%',
              background: '#121420',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '20px 24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              zIndex: 10
            }}
          >
            {/* Header info */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>
                {activeTab === 'signin' 
                  ? 'Sign in to your EmergencyAI account' 
                  : 'Join the Emergency Response Network'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'rgba(220,38,38,0.1)',
                  border: '1px solid rgba(220,38,38,0.3)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#f87171'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {activeTab === 'signup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    background: '#1a1c29',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: '#f8fafc',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>

              {activeTab === 'signup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Phone Number <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="text"
                    placeholder="+91 98765-43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={activeTab === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '12px 40px 12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {activeTab === 'signup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      background: '#1a1c29',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 8,
                  background: '#dc2626',
                  border: 'none',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                  boxShadow: '0 4px 15px rgba(220,38,38,0.2)',
                  transition: 'background 0.2s'
                }}
              >
                {loading ? (
                  <><Loader size={16} className="animate-spin" /> Processing...</>
                ) : (
                  activeTab === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '8px 0',
                color: '#475569',
                fontSize: 11
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#f8fafc',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                {/* Google Colorful G SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#ea4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.177 4.2-3.414 0-6.19-2.776-6.19-6.19 0-3.414 2.776-6.19 6.19-6.19 1.487 0 2.85.53 3.923 1.391l3.14-3.14C18.96 2.052 15.795 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.897 0 10.82-4.248 10.82-11.24 0-.677-.076-1.328-.198-1.955H12.24z"/>
                </svg>
                <span>{activeTab === 'signin' ? 'Continue with Google' : 'Sign up with Google'}</span>
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
              {activeTab === 'signin' ? (
                <span style={{ color: '#94a3b8' }}>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('signup')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Create one
                  </button>
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('signin')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </motion.div>

          {/* Demo Credentials Drawer */}
          <div style={{
            width: '100%',
            background: '#11131c',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: '12px 16px'
          }}>
            <h3 style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              {activeTab === 'signin' ? 'Demo Credentials' : 'System Access Accounts'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                onClick={() => fillCredentials('staff@emergency.com', 'Staff@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  padding: '4px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.01)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
              >
                <span><strong style={{ color: '#38bdf8' }}>Staff:</strong> staff@emergency.com</span>
                <span style={{ color: '#64748b', fontSize: 9 }}>Auto-fill</span>
              </div>
              <div
                onClick={() => fillCredentials('admin@emergency.com', 'Admin@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  padding: '4px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.01)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
              >
                <span><strong style={{ color: '#3b82f6' }}>Admin:</strong> admin@emergency.com</span>
                <span style={{ color: '#64748b', fontSize: 9 }}>Auto-fill</span>
              </div>
              <div
                onClick={() => fillCredentials('superadmin@emergency.com', 'SuperAdmin@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  padding: '4px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.01)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
              >
                <span><strong style={{ color: '#a855f7' }}>SuperAdmin:</strong> superadmin@emergency.com</span>
                <span style={{ color: '#64748b', fontSize: 9 }}>Auto-fill</span>
              </div>
              
              <div
                onClick={() => fillCredentials('driver1@emergencyai.com', 'Driver@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  padding: '4px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.01)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
              >
                <span><strong style={{ color: '#22c55e' }}>Driver:</strong> driver1@emergencyai.com</span>
                <span style={{ color: '#64748b', fontSize: 9 }}>Auto-fill</span>
              </div>
              
              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '2px 0' }} />
              
              {/* Add test patient credentials to easily test Citizen Portal */}
              <div
                onClick={() => fillCredentials('patient@emergency.com', 'Patient@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  padding: '4px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'rgba(220,38,38,0.05)',
                  border: '1px dashed rgba(220,38,38,0.2)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.05)')}
              >
                <span><strong style={{ color: '#f87171' }}>Citizen:</strong> patient@emergency.com</span>
                <span style={{ color: '#f87171', fontSize: 9, fontWeight: 600 }}>Test Citizen</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sign In Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(5, 6, 10, 0.85)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{
                width: '100%',
                maxWidth: 400,
                background: '#121420',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '32px 28px',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
                textAlign: 'center',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {/* Google colorful G logo */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="40" height="40" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Sign in with Google</h2>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Choose a Patient/Citizen account to continue to <span style={{ color: '#ef4444', fontWeight: 600 }}>EmergencyAI</span></p>
              
              <div style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11,
                color: '#60a5fa',
                marginBottom: 18,
                textAlign: 'left',
                lineHeight: '1.4'
              }}>
                ℹ️ <strong>Google Sign-In:</strong> Only available for Citizen/Patient accounts. Staff, Drivers, and Administrators must sign in using their email and password credentials.
              </div>

              {!showCustomGoogleInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 20 }}>
                  <div
                    onClick={() => handleGoogleSelect('vaass.google@gmail.com', 'Vaas Developer')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>V</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Vaas Developer</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>vaass.google@gmail.com</div>
                    </div>
                  </div>

                  <div
                    onClick={() => handleGoogleSelect('patient@emergency.com', 'Test Patient')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>P</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Test Patient</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>patient@emergency.com</div>
                    </div>
                  </div>

                  <div
                    onClick={() => handleGoogleSelect('guest.user@gmail.com', 'Guest Citizen')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>G</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Guest Citizen</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>guest.user@gmail.com</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setShowCustomGoogleInput(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                  >
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textAlign: 'center', width: '100%' }}>Use another account</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Full Name</label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      style={{
                        background: '#1a1c29',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        color: '#f8fafc',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Google Email Address</label>
                    <input
                      type="email"
                      placeholder="custom@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      style={{
                        background: '#1a1c29',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        color: '#f8fafc',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: '#94a3b8',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGoogleSelect(customGoogleEmail, customGoogleName || customGoogleEmail.split('@')[0])}
                      disabled={!customGoogleEmail.includes('@')}
                      style={{
                        flex: 2,
                        padding: '10px',
                        borderRadius: 8,
                        background: '#4285F4',
                        border: 'none',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: !customGoogleEmail.includes('@') ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 12,
                  cursor: 'pointer',
                  marginTop: 8
                }}
              >
                Cancel Authentication
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
