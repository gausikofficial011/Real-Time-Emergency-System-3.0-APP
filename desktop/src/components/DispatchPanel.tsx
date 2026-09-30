import { useState } from 'react';
import { Truck, Navigation, CheckCircle, Loader, Building2 as HospitalIcon, AlertCircle, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ambulance as ambulanceApi } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { Emergency, NearestAmbulance, Hospital } from '@/types';

interface Props {
  selectedIncident: Emergency | null;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
  critical_care: 'Critical Care',
};

const EQUIPMENT_COLORS: Record<string, string> = {
  basic: '#22c55e',
  advanced: '#3b82f6',
  critical_care: '#ef4444',
};

export default function DispatchPanel({ selectedIncident }: Props) {
  const navigate = useNavigate();
  const { hospitals, updateAmbulance, updateEmergency } = useAppStore();
  const [nearestAmbulances, setNearestAmbulances] = useState<NearestAmbulance[]>([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState<NearestAmbulance | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const activeHospitals = hospitals.filter((h) => h.isActive);

  const findNearestAmbulances = async () => {
    if (!selectedIncident) return;
    setSearching(true);
    setNearestAmbulances([]);
    setSelectedAmbulance(null);
    try {
      const res = await ambulanceApi.getNearest(
        selectedIncident.location.lat,
        selectedIncident.location.lng,
        selectedIncident.severity === 'critical' ? 'critical_care' : undefined
      );
      const ambulances = res.data.ambulances || [];
      setNearestAmbulances(ambulances);
      if (ambulances.length === 0) {
        toast.error('No available ambulances found nearby');
      } else {
        toast.success(`Found ${ambulances.length} available ambulance${ambulances.length > 1 ? 's' : ''}`);
      }
    } catch (err) {
      toast.error('Failed to find ambulances. Check backend connection.');
      // Mock data for demo
      setNearestAmbulances([
        { _id: 'amb1', vehicleNumber: 'AMB-001', equipmentLevel: 'advanced', status: 'available', distance: 2.3, isActive: true, registrationNumber: 'REG001', specifications: { capacity: 2 } },
        { _id: 'amb2', vehicleNumber: 'AMB-007', equipmentLevel: 'critical_care', status: 'available', distance: 4.1, isActive: true, registrationNumber: 'REG007', specifications: { capacity: 1 } },
        { _id: 'amb3', vehicleNumber: 'AMB-015', equipmentLevel: 'basic', status: 'available', distance: 5.8, isActive: true, registrationNumber: 'REG015', specifications: { capacity: 2 } },
      ] as NearestAmbulance[]);
    } finally {
      setSearching(false);
    }
  };

  const handleDispatch = async () => {
    if (!selectedIncident || !selectedAmbulance) {
      toast.error('Select an incident and ambulance first');
      return;
    }
    setLoading(true);
    try {
      await ambulanceApi.assign({
        ambulanceId: selectedAmbulance._id,
        emergencyId: selectedIncident._id,
        hospitalId: selectedHospital || undefined,
      });
      setDispatched(true);
      updateAmbulance(selectedAmbulance._id, { status: 'dispatched', currentEmergency: selectedIncident._id });
      updateEmergency(selectedIncident._id, { status: 'assigned', assignedAmbulance: selectedAmbulance._id });
      toast.success(`✅ ${selectedAmbulance.vehicleNumber} dispatched successfully!`);
      setTimeout(() => {
        setDispatched(false);
        setNearestAmbulances([]);
        setSelectedAmbulance(null);
        setSelectedHospital('');
      }, 3000);
    } catch {
      toast.error('Dispatch failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedIncident) {
    return (
      <div style={{
        width: 300,
        flexShrink: 0,
        background: 'rgba(26,26,46,0.95)',
        backdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Truck size={28} color="#3b82f6" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
            Dispatch Panel
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Select an incident from the map or incident list to dispatch resources
          </div>
        </div>
      </div>
    );
  }

  const incidentHospital = typeof selectedIncident.assignedHospital === 'object'
    ? (selectedIncident.assignedHospital as Hospital)
    : null;

  return (
    <div style={{
      width: 300,
      flexShrink: 0,
      background: 'rgba(26,26,46,0.95)',
      backdropFilter: 'blur(12px)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>
          Dispatch Control
        </div>

        {/* Incident info */}
        <div style={{
          padding: 12,
          background: `${selectedIncident.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'}`,
          border: `1px solid ${selectedIncident.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize' }}>
              {selectedIncident.incidentType.replace('_', ' ')}
            </span>
            <span className={`severity-badge severity-${selectedIncident.severity}`}>
              {selectedIncident.severity}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
            <MapPin size={11} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {selectedIncident.location.address || `${selectedIncident.location.lat.toFixed(4)}, ${selectedIncident.location.lng.toFixed(4)}`}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            #{selectedIncident.emergencyId} · {selectedIncident.victimCount} victim(s)
          </div>
          {selectedIncident.aiPrediction && (
            <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(139,92,246,0.1)', borderRadius: 6, border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 600, marginBottom: 2 }}>
                AI Recommendation ({Math.round(selectedIncident.aiPrediction.confidence * 100)}% confidence)
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {selectedIncident.aiPrediction.recommendation}
              </div>
            </div>
          )}
          {selectedIncident.reportedBy && (
            <button
              onClick={() => {
                const uid = typeof selectedIncident.reportedBy === 'object' 
                  ? selectedIncident.reportedBy._id 
                  : selectedIncident.reportedBy;
                navigate(`/medical-dossier/${uid}`);
              }}
              style={{
                width: '100%',
                marginTop: 10,
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: '#38bdf8',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }}
            >
              🔍 View Patient Dossier
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Find Ambulances */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            Ambulance Selection
          </div>
          <button
            onClick={findNearestAmbulances}
            disabled={searching}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {searching ? (
              <><Loader size={14} className="animate-spin" /> Searching...</>
            ) : (
              <><Navigation size={14} /> Find Nearest Ambulances</>
            )}
          </button>

          {/* Ambulance List */}
          {nearestAmbulances.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nearestAmbulances.map((amb) => (
                <div
                  key={amb._id}
                  onClick={() => setSelectedAmbulance(amb)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${selectedAmbulance?._id === amb._id ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    background: selectedAmbulance?._id === amb._id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Truck size={13} color={EQUIPMENT_COLORS[amb.equipmentLevel]} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{amb.vehicleNumber}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
                      {amb.distance.toFixed(1)} km
                    </span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: EQUIPMENT_COLORS[amb.equipmentLevel],
                      background: `${EQUIPMENT_COLORS[amb.equipmentLevel]}20`,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}>
                      {EQUIPMENT_LABELS[amb.equipmentLevel]}
                    </span>
                    {amb.estimatedArrival && (
                      <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>
                        ETA: ~{amb.estimatedArrival}min
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hospital Selector */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            Target Hospital
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <HospitalIcon size={13} color="#3b82f6" />
            <select
              className="form-select"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            >
              <option value="">Auto-select nearest hospital</option>
              {activeHospitals.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.availableBeds} beds)
                </option>
              ))}
            </select>
          </div>
          {incidentHospital && (
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Previously assigned: {incidentHospital.name}
            </div>
          )}
        </div>

        {/* Validation */}
        {nearestAmbulances.length > 0 && !selectedAmbulance && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
            <AlertCircle size={13} color="#f59e0b" />
            <span style={{ fontSize: 11, color: '#f59e0b' }}>Select an ambulance from the list</span>
          </div>
        )}
      </div>

      {/* Dispatch Button */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {dispatched ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px',
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 10,
            color: '#22c55e',
            fontSize: 14,
            fontWeight: 700,
          }}>
            <CheckCircle size={18} />
            Dispatched Successfully!
          </div>
        ) : (
          <button
            onClick={handleDispatch}
            disabled={loading || !selectedAmbulance || dispatched}
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14 }}
          >
            {loading ? (
              <><Loader size={15} className="animate-spin" /> Dispatching...</>
            ) : (
              <><Truck size={15} /> Confirm Dispatch</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
