import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map, BarChart2, Truck, Building2, Activity,
  Shield, ChevronLeft, ChevronRight, LogOut, User,
  Lock, X, Check, Key
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { auth as authApi } from '../services/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dispatch', icon: Map, label: 'Dispatch Map', color: '#ef4444' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics', color: '#3b82f6' },
  { to: '/fleet', icon: Truck, label: 'Fleet Manager', color: '#22c55e' },
  { to: '/hospitals', icon: Building2, label: 'Hospitals', color: '#8b5cf6' },
  { to: '/diagnostics', icon: Activity, label: 'Diagnostics', color: '#f59e0b' },
];

export default function Sidebar() {
  const { user, setUser, sidebarCollapsed, toggleSidebar, logout, notifications } = useAppStore();
  const navigate = useNavigate();
  const unread = notifications.filter(n => !n.read).length;

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.driverProfile?.vehicleNumber || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.driverProfile?.licenseNumber || '');
  const [currentStatus, setCurrentStatus] = useState<any>(user?.driverProfile?.currentStatus || 'available');

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [updating, setUpdating] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  React.useEffect(() => {
    if (showProfileModal && user) {
      setEditName(user.name || '');
      setVehicleNumber(user.driverProfile?.vehicleNumber || '');
      setLicenseNumber(user.driverProfile?.licenseNumber || '');
      setCurrentStatus(user.driverProfile?.currentStatus || 'available');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [showProfileModal, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }
    setUpdating(true);
    try {
      // 1. Update general profile
      const res = await authApi.updateProfile({ name: editName });
      let updatedUser = res.data.user;

      // 2. If user is driver or admin, update vehicle details
      if ((user?.role === 'driver' || user?.role === 'admin') && (vehicleNumber || licenseNumber)) {
        const driverRes = await authApi.updateProfileDriver({
          vehicleNumber,
          licenseNumber,
          currentStatus
        });
        updatedUser = driverRes.data.user;
      }

      setUser(updatedUser);
      toast.success('Profile updated successfully!', {
        style: { background: '#121420', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
      });
      setShowProfileModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setChangingPass(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully!', {
        style: { background: '#121420', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AD';
  const roleColors: Record<string, string> = {
    admin: '#ef4444', hospital_staff: '#8b5cf6', driver: '#22c55e', patient: '#3b82f6', user: '#3b82f6', superadmin: '#a855f7'
  };

  const items = [...navItems];
  if (user?.role === 'superadmin') {
    items.push({ to: '/superadmin', icon: Shield, label: 'Superadmin Hub', color: '#a855f7' });
  }

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: 'rgba(26,26,46,0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: sidebarCollapsed ? '20px 16px' : '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(239,68,68,0.4)',
          }}>
            <Shield size={22} color="white" />
          </div>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>EmergencyAI</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Operations Hub</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: sidebarCollapsed ? '10px 14px' : '10px 14px',
                borderRadius: 10,
                background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                color: isActive ? '#f8fafc' : '#64748b',
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.15s',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                position: 'relative',
              }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLElement).style.color = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = '#64748b';
                }}
              >
                <Icon size={18} color={isActive ? color : 'currentColor'} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && <span>{label}</span>}
                {sidebarCollapsed && (
                  <div style={{
                    position: 'absolute', left: '100%', marginLeft: 8,
                    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600,
                    color: '#f8fafc', whiteSpace: 'nowrap', pointerEvents: 'none',
                    opacity: 0, transition: 'opacity 0.15s', zIndex: 200,
                  }} className="tooltip">{label}</div>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 10px' }}>
        {user && (
          <div 
            onClick={() => setShowProfileModal(true)}
            title="Account Profile Settings"
            style={{
              display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 10,
              padding: sidebarCollapsed ? '8px' : '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 10, marginBottom: 8,
              cursor: 'pointer',
              transition: 'background 0.2s',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg, ${roleColors[user.role] || '#3b82f6'}, rgba(0,0,0,0.3))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white',
            }}>{initials}</div>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                  color: roleColors[user.role] || '#3b82f6',
                }}>{user.role}</div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: sidebarCollapsed ? '10px 14px' : '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', borderRadius: 10,
            color: '#64748b', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget).style.color = '#ef4444'; }}
          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#64748b'; }}
        >
          <LogOut size={17} style={{ flexShrink: 0 }} />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          style={{
            width: '100%', padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', borderRadius: 10,
            color: '#64748b', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget).style.color = '#94a3b8'; }}
          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#64748b'; }}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>

      {/* Profile Settings Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div style={{
            position: 'fixed',
            left: 0, top: 0, right: 0, bottom: 0,
            background: 'rgba(5, 5, 10, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: '#121420',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(139, 92, 246, 0.1)',
                color: '#f8fafc',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#a78bfa'
                  }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800 }}>Profile Settings</h3>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>View and update your operations account profile</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  style={{
                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                    width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Two Forms (Profile, Password) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Form 1: General Info */}
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#3b82f6',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(59,130,246,0.15)', paddingBottom: 4
                  }}>
                    • Edit Personal Info
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Email Address (Read-only)</label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      style={{
                        background: '#1a1c29', border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 8, padding: '8px 10px', color: '#64748b', fontSize: 13,
                        cursor: 'not-allowed', outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{
                        background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Driver fields if applicable */}
                  {(user?.role === 'driver' || user?.role === 'admin') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: '#22c55e',
                        letterSpacing: '0.5px', textTransform: 'uppercase',
                        borderBottom: '1px solid rgba(34,197,94,0.15)', paddingBottom: 4
                      }}>
                        • Paramedical & Fleet Credentials
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Vehicle Number</label>
                          <input
                            type="text"
                            placeholder="Ex: AMB-001"
                            value={vehicleNumber}
                            onChange={e => setVehicleNumber(e.target.value)}
                            style={{
                              background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13,
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>License Number</label>
                          <input
                            type="text"
                            placeholder="Ex: LIC12345"
                            value={licenseNumber}
                            onChange={e => setLicenseNumber(e.target.value)}
                            style={{
                              background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13,
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>

                      {user?.role === 'driver' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Active Dispatch Status</label>
                          <select
                            value={currentStatus}
                            onChange={e => setCurrentStatus(e.target.value)}
                            style={{
                              background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13,
                              outline: 'none'
                            }}
                          >
                            <option value="available">Available</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="returning">Returning</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={updating}
                    style={{
                      background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 8,
                      padding: '10px 14px', fontWeight: 700, fontSize: 12, cursor: updating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      marginTop: 6, transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if(!updating) e.currentTarget.style.background = '#1e40af'; }}
                    onMouseLeave={e => { if(!updating) e.currentTarget.style.background = '#1d4ed8'; }}
                  >
                    {updating ? 'Saving Profile...' : 'Save General Settings'}
                  </button>
                </form>

                {/* Form 2: Change Password */}
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#ef4444',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(239,68,68,0.15)', paddingBottom: 4
                  }}>
                    • Update Password
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      style={{
                        background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>New Password</label>
                      <input
                        type="password"
                        placeholder="Min 6 chars"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={{
                          background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Confirm New</label>
                      <input
                        type="password"
                        placeholder="Min 6 chars"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{
                          background: '#1a1c29', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8, padding: '8px 10px', color: '#f8fafc', fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changingPass}
                    style={{
                      background: '#b91c1c', color: 'white', border: 'none', borderRadius: 8,
                      padding: '10px 14px', fontWeight: 700, fontSize: 12, cursor: changingPass ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      marginTop: 6, transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if(!changingPass) e.currentTarget.style.background = '#991b1b'; }}
                    onMouseLeave={e => { if(!changingPass) e.currentTarget.style.background = '#b91c1c'; }}
                  >
                    {changingPass ? 'Changing Password...' : 'Update Account Password'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
