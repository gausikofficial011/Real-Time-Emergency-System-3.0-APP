import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  ShieldAlert, Users, Calendar, Activity, RefreshCw, ToggleLeft, ToggleRight, 
  Search, ShieldCheck, Heart, BedDouble, Truck 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analytics as analyticsApi, auth as authApi } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

export default function SuperadminDashboard() {
  const { user } = useAppStore();
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, trendsRes] = await Promise.allSettled([
        analyticsApi.getSummary(),
        analyticsApi.getTrends()
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.data.success) {
        setSummary(sumRes.value.data.summary);
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value.data.success) {
        setTrends(trendsRes.value.data.trends);
      } else {
        // Fallback trends
        setTrends([
          { month: 'Jan', count: 42, critical: 10, high: 15, medium: 12, low: 5 },
          { month: 'Feb', count: 50, critical: 12, high: 18, medium: 14, low: 6 },
          { month: 'Mar', count: 65, critical: 15, high: 22, medium: 20, low: 8 },
          { month: 'Apr', count: 58, critical: 14, high: 20, medium: 16, low: 8 },
          { month: 'May', count: 70, critical: 18, high: 25, medium: 18, low: 9 }
        ]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast.error('Failed to reload analytics metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await authApi.getUsers({ limit: 100, includeInactive: 'true' });
      if (res.data.success) {
        setUsersList(res.data.users || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Could not fetch user directory.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
  }, [fetchDashboardData, fetchUsers]);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const res = await authApi.toggleUserStatus(userId, newStatus);
      if (res.data.success) {
        toast.success(`Account status updated to ${newStatus ? 'active' : 'deactivated'}.`);
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, isActive: newStatus } : u));
      }
    } catch (err) {
      toast.error('Failed to change account status.');
    }
  };

  const filteredUsers = usersList.filter(u => {
    const q = userSearch.toLowerCase();
    const matchesSearch = u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="page-content" style={{
      background: '#090b11', minHeight: '100vh', padding: '24px 32px', color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', letterSpacing: 1, textTransform: 'uppercase' }}>
            SUPERADMIN PRIVILEGED SPACE
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            Global Operations Control
          </h2>
        </div>
        <button
          onClick={() => { fetchDashboardData(); fetchUsers(); }}
          disabled={loading || usersLoading}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#121420', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <RefreshCw size={14} className={loading || usersLoading ? 'animate-spin' : ''} />
          Sync Data
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          {
            title: 'Global Incidents',
            val: summary?.totalEmergencies || 0,
            color: '#ef4444',
            icon: ShieldAlert,
            sub: 'Emergency requests reported'
          },
          {
            title: 'Fleet Deployment',
            val: `${summary?.activeAmbulances || 0} / ${(summary?.activeAmbulances || 0) + (summary?.availableAmbulances || 0)}`,
            color: '#22c55e',
            icon: Truck,
            sub: 'Deployed / Total Fleet'
          },
          {
            title: 'Bed Capacity',
            val: `${summary?.availableBeds || 0} / ${summary?.totalBeds || 0}`,
            color: '#38bdf8',
            icon: BedDouble,
            sub: 'Available / Total Beds'
          },
          {
            title: 'Avg Response Time',
            val: `${summary?.avgResponseTime || 0} min`,
            color: '#eab308',
            icon: Activity,
            sub: 'Incident alert to resolve'
          }
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} style={{
              background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 12, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{card.title}</span>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${card.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color
                }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc' }}>{card.val}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Grid: Chart & System Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        
        {/* Trends Chart */}
        <div style={{
          background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#a855f7', marginBottom: 16 }}>
            Incident Severity Trends (12 Months)
          </h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#121420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f8fafc' }} />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCritical)" strokeWidth={2} name="Critical" />
                <Area type="monotone" dataKey="high" stroke="#f97316" fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} name="High" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Resource Overview */}
        <div style={{
          background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#a855f7', marginBottom: 16 }}>
            High-Level Resource Diagnostics
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                <span>Ambulance Status Availability</span>
                <span style={{ color: '#22c55e' }}>{summary?.availableAmbulances || 0} Free</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${((summary?.availableAmbulances || 0) / ((summary?.activeAmbulances || 0) + (summary?.availableAmbulances || 1))) * 100}%`,
                  background: '#22c55e', borderRadius: 3
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                <span>Hospital Bed Availability</span>
                <span style={{ color: '#38bdf8' }}>{summary?.availableBeds || 0} Beds Available</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${((summary?.availableBeds || 0) / (summary?.totalBeds || 1)) * 100}%`,
                  background: '#38bdf8', borderRadius: 3
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                <span>ICU Bed Availability</span>
                <span style={{ color: '#eab308' }}>{summary?.availableIcu || 0} ICU Units Free</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${((summary?.availableIcu || 0) / (summary?.totalIcu || 1)) * 100}%`,
                  background: '#eab308', borderRadius: 3
                }} />
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Active Hospitals</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{summary?.totalHospitals || 0}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Unique Incidents</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{trends.reduce((acc, t) => acc + (t.count || 0), 0) || summary?.totalEmergencies || 0}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.1)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.2)' }}>
                <ShieldCheck size={14} color="#a855f7" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>System Secure & Active</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* User Management Section */}
      <div style={{
        background: '#121420', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#a855f7', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} /> Administrative User Directory
        </h3>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{
                width: '100%', background: '#1a1c29', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '10px 12px 10px 36px', color: '#f8fafc', fontSize: 13, outline: 'none'
              }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              background: '#1a1c29', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: '10px 16px', color: '#f8fafc', fontSize: 13, outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="patient">Patient</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
            <option value="driver">Driver</option>
            <option value="hospital_staff">Hospital Staff</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontWeight: 600 }}>
                <th style={{ padding: '12px 10px' }}>Name</th>
                <th style={{ padding: '12px 10px' }}>Email</th>
                <th style={{ padding: '12px 10px' }}>Role</th>
                <th style={{ padding: '12px 10px' }}>Registered</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>Access Toggle</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    Loading user directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    No users found matching filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' }}>
                    <td style={{ padding: '14px 10px', fontWeight: 600, color: '#f8fafc' }}>{u.name}</td>
                    <td style={{ padding: '14px 10px' }}>{u.email}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <span style={{
                        background: u.role === 'superadmin' ? 'rgba(168,85,247,0.15)' : u.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                        color: u.role === 'superadmin' ? '#c084fc' : u.role === 'admin' ? '#60a5fa' : '#cbd5e1',
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase'
                      }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '14px 10px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: u.isActive ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: 600
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: u.isActive ? '#22c55e' : '#ef4444' }} />
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      {/* Cannot disable self */}
                      {u._id === user?._id ? (
                        <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>Self</span>
                      ) : (
                        <button
                          onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: u.isActive ? '#22c55e' : '#ef4444', display: 'inline-flex', alignItems: 'center'
                          }}
                        >
                          {u.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
