import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader, Building2, BedDouble, MapPin, Phone, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { hospital as hospitalApi } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { Hospital } from '@/types';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TREATMENT_COLORS: Record<string, string> = {
  Trauma: '#ef4444',
  Cardiology: '#f97316',
  Neurology: '#8b5cf6',
  Pediatrics: '#3b82f6',
  Orthopedics: '#22c55e',
  Oncology: '#f59e0b',
  Burns: '#ef4444',
  Toxicology: '#64748b',
};

interface HospitalFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  type: string;
  emergencyLevel: string;
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  treatmentTypes: string;
  lat: number;
  lng: number;
}

const defaultForm: HospitalFormData = {
  name: '',
  address: '',
  phone: '',
  email: '',
  type: 'General',
  emergencyLevel: 'Level-2',
  totalBeds: 200,
  availableBeds: 80,
  icuBeds: 20,
  availableIcuBeds: 8,
  treatmentTypes: 'Trauma, Cardiology',
  lat: 20.5937,
  lng: 78.9629,
};

export default function HospitalManager() {
  const { hospitals, addHospital, updateHospital, removeHospital } = useAppStore();
  const [showModal, setShowModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [editTarget, setEditTarget] = useState<Hospital | null>(null);
  const [formData, setFormData] = useState<HospitalFormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeHospitals = hospitals.filter((h) => h.isActive);
  const totalBeds = hospitals.reduce((sum, h) => sum + h.totalBeds, 0);
  const availBeds = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);
  const totalIcu = hospitals.reduce((sum, h) => sum + h.icuBeds, 0);
  const availIcu = hospitals.reduce((sum, h) => sum + h.availableIcuBeds, 0);

  const openAdd = () => {
    setFormData(defaultForm);
    setEditTarget(null);
    setShowModal('add');
  };

  const openEdit = (h: Hospital) => {
    setFormData({
      name: h.name,
      address: h.address,
      phone: h.phone || '',
      email: h.email || '',
      type: h.type,
      emergencyLevel: h.emergencyLevel,
      totalBeds: h.totalBeds,
      availableBeds: h.availableBeds,
      icuBeds: h.icuBeds,
      availableIcuBeds: h.availableIcuBeds,
      treatmentTypes: h.treatmentTypes.join(', '),
      lat: h.location.lat,
      lng: h.location.lng,
    });
    setEditTarget(h);
    setShowModal('edit');
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      toast.error('Name and address are required');
      return;
    }
    setLoading(true);
    const payload: Partial<Hospital> = {
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      type: formData.type,
      emergencyLevel: formData.emergencyLevel,
      totalBeds: formData.totalBeds,
      availableBeds: formData.availableBeds,
      icuBeds: formData.icuBeds,
      availableIcuBeds: formData.availableIcuBeds,
      treatmentTypes: formData.treatmentTypes.split(',').map((t) => t.trim()).filter(Boolean),
      location: { lat: formData.lat, lng: formData.lng },
      isActive: true,
    };

    try {
      if (showModal === 'add') {
        const res = await hospitalApi.create(payload);
        addHospital(res.data.hospital);
        toast.success(`${formData.name} added successfully`);
      } else if (showModal === 'edit' && editTarget) {
        const res = await hospitalApi.update(editTarget._id, payload);
        updateHospital(editTarget._id, res.data.hospital);
        toast.success('Hospital updated successfully');
      }
      setShowModal(null);
    } catch {
      toast.error('Operation failed. Check backend connection.');
      if (showModal === 'add') {
        const mockHosp: Hospital = {
          _id: `mock_${Date.now()}`,
          name: payload.name!,
          address: payload.address!,
          phone: payload.phone,
          email: payload.email,
          type: payload.type!,
          emergencyLevel: payload.emergencyLevel!,
          totalBeds: payload.totalBeds!,
          availableBeds: payload.availableBeds!,
          icuBeds: payload.icuBeds!,
          availableIcuBeds: payload.availableIcuBeds!,
          treatmentTypes: payload.treatmentTypes!,
          location: payload.location!,
          isActive: payload.isActive!,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addHospital(mockHosp);
        toast.success(`[Demo] ${formData.name} added`);
        setShowModal(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editTarget) return;
    setLoading(true);
    try {
      await hospitalApi.delete(editTarget._id);
      removeHospital(editTarget._id);
      toast.success('Hospital removed');
      setShowModal(null);
    } catch {
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const adjustBeds = async (h: Hospital, field: 'availableBeds' | 'availableIcuBeds', delta: number) => {
    const newVal = Math.max(0, Math.min(
      field === 'availableBeds' ? h.totalBeds : h.icuBeds,
      (h[field] || 0) + delta
    ));
    updateHospital(h._id, { [field]: newVal });
    try {
      await hospitalApi.update(h._id, { [field]: newVal });
    } catch {
      // silently fail, already updated locally
    }
  };

  const bedOccupancy = (avail: number, total: number) => total > 0 ? ((total - avail) / total) * 100 : 0;

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>Hospital Manager</h2>
          <div style={{ fontSize: 12, color: '#64748b' }}>Real-time bed availability and resource management</div>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus size={14} /> Add Hospital
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Hospitals', value: activeHospitals.length, color: '#3b82f6' },
          { label: 'Total / Available Beds', value: `${availBeds}/${totalBeds}`, color: '#22c55e' },
          { label: 'Total / Available ICU', value: `${availIcu}/${totalIcu}`, color: '#ef4444' },
          { label: 'Bed Utilization', value: `${totalBeds > 0 ? Math.round(((totalBeds - availBeds) / totalBeds) * 100) : 0}%`, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Hospital Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {hospitals.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#64748b' }}>
            <Building2 size={40} color="#64748b" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>No hospitals added yet</div>
          </div>
        ) : (
          hospitals.map((h) => {
            const isExpanded = expandedId === h._id;
            const bedPct = bedOccupancy(h.availableBeds, h.totalBeds);
            const icuPct = bedOccupancy(h.availableIcuBeds, h.icuBeds);

            return (
              <motion.div
                key={h._id}
                layout
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                }}
              >
                {/* Card Header */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: 'rgba(59,130,246,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Building2 size={14} color="#3b82f6" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{h.name}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{h.type} · {h.emergencyLevel}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} color="#64748b" />
                        <span style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.address}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button className="btn-icon" onClick={() => openEdit(h)} style={{ width: 28, height: 28, padding: 6 }}>
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => { setEditTarget(h); setShowModal('delete'); }}
                        style={{ width: 28, height: 28, padding: 6, color: '#ef4444' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Bed Progress */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BedDouble size={11} color="#22c55e" />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Beds</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => adjustBeds(h, 'availableBeds', -1)}
                          style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                        ><Minus size={10} /></button>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', minWidth: 50, textAlign: 'center' }}>
                          {h.availableBeds}/{h.totalBeds}
                        </span>
                        <button
                          onClick={() => adjustBeds(h, 'availableBeds', 1)}
                          style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(34,197,94,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}
                        ><Plus size={10} /></button>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${bedPct > 80 ? 'progress-fill-red' : bedPct > 60 ? 'progress-fill-amber' : 'progress-fill-green'}`}
                        style={{ width: `${bedPct}%` }}
                      />
                    </div>
                  </div>

                  {/* ICU Progress */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BedDouble size={11} color="#ef4444" />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>ICU</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => adjustBeds(h, 'availableIcuBeds', -1)}
                          style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                        ><Minus size={10} /></button>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', minWidth: 50, textAlign: 'center' }}>
                          {h.availableIcuBeds}/{h.icuBeds}
                        </span>
                        <button
                          onClick={() => adjustBeds(h, 'availableIcuBeds', 1)}
                          style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(34,197,94,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}
                        ><Plus size={10} /></button>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${icuPct > 80 ? 'progress-fill-red' : icuPct > 60 ? 'progress-fill-amber' : 'progress-fill-red'}`}
                        style={{ width: `${icuPct}%`, background: '#ef4444' }}
                      />
                    </div>
                  </div>

                  {/* Treatment Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {h.treatmentTypes.slice(0, 3).map((t) => (
                      <span key={t} style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: `${TREATMENT_COLORS[t] || '#64748b'}20`,
                        color: TREATMENT_COLORS[t] || '#94a3b8',
                        border: `1px solid ${TREATMENT_COLORS[t] || '#64748b'}40`,
                      }}>
                        {t}
                      </span>
                    ))}
                    {h.treatmentTypes.length > 3 && (
                      <span style={{ fontSize: 10, color: '#64748b' }}>+{h.treatmentTypes.length - 3}</span>
                    )}
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : h._id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '5px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    {isExpanded ? <><ChevronUp size={12} /> Less details</> : <><ChevronDown size={12} /> More details</>}
                  </button>
                </div>

                {/* Expanded Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Mini map */}
                        <div style={{ height: 150, borderRadius: 8, overflow: 'hidden', marginBottom: 10, marginTop: 12 }}>
                          <MapContainer
                            center={[h.location.lat, h.location.lng]}
                            zoom={14}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            scrollWheelZoom={false}
                          >
                            <LayersControl position="topright">
                              <LayersControl.BaseLayer checked name="Dark">
                                <TileLayer
                                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                  attribution="&copy; CartoDB"
                                />
                              </LayersControl.BaseLayer>
                              <LayersControl.BaseLayer name="Google Map">
                                <TileLayer
                                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                  attribution="&copy; Google"
                                />
                              </LayersControl.BaseLayer>
                              <LayersControl.BaseLayer name="Google Hybrid">
                                <TileLayer
                                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                  attribution="&copy; Google"
                                />
                              </LayersControl.BaseLayer>
                            </LayersControl>
                            <Marker position={[h.location.lat, h.location.lng]}>
                              <Popup>{h.name}</Popup>
                            </Marker>
                          </MapContainer>
                        </div>

                        {/* Details */}
                        {h.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Phone size={11} color="#64748b" />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{h.phone}</span>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          All treatments: {h.treatmentTypes.join(', ')}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showModal === 'add' || showModal === 'edit') && (
          <div className="modal-backdrop" onClick={() => setShowModal(null)}>
            <motion.div
              className="modal"
              style={{ maxWidth: 560 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="modal-header">
                <div className="modal-title">{showModal === 'add' ? 'Add Hospital' : 'Edit Hospital'}</div>
                <button className="btn-icon" onClick={() => setShowModal(null)}><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Hospital Name *</label>
                    <input className="form-input" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="General Hospital" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Address *</label>
                    <input className="form-input" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="123 Medical District, City" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="info@hospital.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={formData.type} onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}>
                      {['General', 'Specialty', 'Teaching', 'Trauma Center', 'Community'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Level</label>
                    <select className="form-select" value={formData.emergencyLevel} onChange={(e) => setFormData(p => ({ ...p, emergencyLevel: e.target.value }))}>
                      {['Level-1', 'Level-2', 'Level-3', 'Level-4'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Beds</label>
                    <input className="form-input" type="number" value={formData.totalBeds} onChange={(e) => setFormData(p => ({ ...p, totalBeds: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Available Beds</label>
                    <input className="form-input" type="number" value={formData.availableBeds} onChange={(e) => setFormData(p => ({ ...p, availableBeds: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total ICU Beds</label>
                    <input className="form-input" type="number" value={formData.icuBeds} onChange={(e) => setFormData(p => ({ ...p, icuBeds: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Available ICU Beds</label>
                    <input className="form-input" type="number" value={formData.availableIcuBeds} onChange={(e) => setFormData(p => ({ ...p, availableIcuBeds: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input className="form-input" type="number" step="0.0001" value={formData.lat} onChange={(e) => setFormData(p => ({ ...p, lat: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input className="form-input" type="number" step="0.0001" value={formData.lng} onChange={(e) => setFormData(p => ({ ...p, lng: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Treatment Types (comma-separated)</label>
                    <input className="form-input" value={formData.treatmentTypes} onChange={(e) => setFormData(p => ({ ...p, treatmentTypes: e.target.value }))} placeholder="Trauma, Cardiology, Neurology" />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader size={13} className="animate-spin" /> Saving...</> : showModal === 'add' ? 'Add Hospital' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showModal === 'delete' && editTarget && (
          <div className="modal-backdrop" onClick={() => setShowModal(null)}>
            <motion.div
              className="modal"
              style={{ maxWidth: 360 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="modal-header">
                <div className="modal-title" style={{ color: '#ef4444' }}>Remove Hospital</div>
                <button className="btn-icon" onClick={() => setShowModal(null)}><X size={16} /></button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>
                Remove <strong style={{ color: '#f8fafc' }}>{editTarget.name}</strong>? This action cannot be undone.
              </p>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                  {loading ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />} Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
