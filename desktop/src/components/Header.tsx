import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Wifi, WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { socketService } from '../services/socket';
import { format } from 'date-fns';

const pageTitles: Record<string, string> = {
  '/dispatch': 'Live Dispatch Map',
  '/analytics': 'Analytics Dashboard',
  '/fleet': 'Fleet Manager',
  '/hospitals': 'Hospital Manager',
  '/diagnostics': 'System Diagnostics',
};

const severityColors: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e'
};

export default function Header() {
  const location = useLocation();
  const { notifications, markNotificationRead, clearNotifications } = useAppStore();
  const [time, setTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const title = pageTitles[location.pathname] || 'EmergencyAI';
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setIsConnected(socketService.isConnected);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: 60, flexShrink: 0,
      background: 'rgba(26,26,46,0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 20,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>{title}</h1>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
          {format(time, 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Live Clock */}
        <div style={{
          fontFamily: 'monospace', fontSize: 15, fontWeight: 700,
          color: '#3b82f6', letterSpacing: 1,
          background: 'rgba(59,130,246,0.1)', padding: '4px 12px',
          borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)',
        }}>
          {format(time, 'HH:mm:ss')}
        </div>

        {/* Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isConnected ? (
            <>
              <div className="dot dot-green" />
              <Wifi size={15} color="#22c55e" />
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>LIVE</span>
            </>
          ) : (
            <>
              <div className="dot dot-red" />
              <WifiOff size={15} color="#ef4444" />
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>OFFLINE</span>
            </>
          )}
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: showNotifications ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
              color: '#94a3b8', position: 'relative',
            }}
          >
            <Bell size={16} />
            {unread > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 18, height: 18, borderRadius: 9,
                background: '#ef4444', fontSize: 10, fontWeight: 800,
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse-red 2s infinite',
              }}>{unread > 9 ? '9+' : unread}</div>
            )}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  width: 360, maxHeight: 480, overflowY: 'auto',
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  zIndex: 1000,
                }}
              >
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                    Notifications {unread > 0 && <span style={{ color: '#ef4444' }}>({unread} new)</span>}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' }}
                      >Clear all</button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    ><X size={14} /></button>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: n.read ? 'transparent' : 'rgba(59,130,246,0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        borderLeft: n.severity ? `3px solid ${severityColors[n.severity] || '#3b82f6'}` : '3px solid transparent',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#f8fafc', marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                        {format(new Date(n.timestamp), 'HH:mm:ss')}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
