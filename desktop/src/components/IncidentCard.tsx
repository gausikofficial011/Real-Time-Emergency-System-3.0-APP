import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Flame, Car, Heart, CloudLightning, Shield, Users, MapPin, Clock, Zap, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Emergency } from '@/types';

interface Props {
  incident: Emergency;
  onSelect: (incident: Emergency) => void;
  isSelected: boolean;
}

const INCIDENT_ICONS: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  medical: Heart,
  accident: Car,
  fire: Flame,
  natural_disaster: CloudLightning,
  crime: Shield,
};

const INCIDENT_LABELS: Record<string, string> = {
  medical: 'Medical',
  accident: 'Accident',
  fire: 'Fire',
  natural_disaster: 'Natural Disaster',
  crime: 'Crime',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

export default function IncidentCard({ incident, onSelect, isSelected }: Props) {
  const [timeElapsed, setTimeElapsed] = useState('');

  const Icon = INCIDENT_ICONS[incident.incidentType] || AlertTriangle;
  const severityColor = SEVERITY_COLORS[incident.severity] || '#94a3b8';
  const isCritical = incident.severity === 'critical' && incident.status === 'pending';

  // Update time elapsed every minute
  useEffect(() => {
    const update = () => {
      setTimeElapsed(formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true }));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [incident.createdAt]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(incident)}
      style={{
        background: isSelected
          ? 'rgba(59,130,246,0.08)'
          : isCritical
          ? 'rgba(239,68,68,0.05)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isSelected ? 'rgba(59,130,246,0.4)' : isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderLeft: `4px solid ${severityColor}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        animation: isCritical ? 'critical-pulse 2s ease-in-out infinite' : 'none',
      }}
      whileHover={{ scale: 1.01, y: -1 }}
    >
      {/* Critical glow effect */}
      {isCritical && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 60,
          height: 60,
          background: 'radial-gradient(circle, rgba(239,68,68,0.15), transparent)',
          borderRadius: '0 10px 0 60px',
          pointerEvents: 'none',
        }} />
      )}

      {/* Top row: type icon + severity badge + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `${severityColor}20`,
            border: `1px solid ${severityColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={14} color={severityColor} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
              {INCIDENT_LABELS[incident.incidentType]}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
              #{incident.emergencyId}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`severity-badge severity-${incident.severity}`}>
            {incident.severity}
          </span>
          <span className={`status-badge status-${incident.status}`} style={{ fontSize: 9 }}>
            {STATUS_LABELS[incident.status]}
          </span>
        </div>
      </div>

      {/* Location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <MapPin size={11} color="#64748b" />
        <span style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
        </span>
      </div>

      {/* Bottom row: victims + time + AI badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
            <Users size={11} />
            <span style={{ fontSize: 11 }}>{incident.victimCount} victim{incident.victimCount !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <Clock size={11} />
            <span style={{ fontSize: 11 }}>{timeElapsed}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {incident.aiPrediction && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 4,
            }}>
              <Zap size={9} color="#8b5cf6" />
              <span style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 600 }}>
                AI {Math.round(incident.aiPrediction.confidence * 100)}%
              </span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(incident); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 5,
              color: '#3b82f6',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Eye size={10} />
            Select
          </button>
        </div>
      </div>
    </motion.div>
  );
}
