import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, X, Loader, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ambulance as ambulanceApi } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { Ambulance, AmbulanceStatus, EquipmentLevel } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  dispatched: 'Dispatched',
  on_scene: 'On Scene',
  returning: 'Returning',
  maintenance: 'Maintenance',
};

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

interface AmbulanceFormData {
  vehicleNumber: string;
  registrationNumber: string;
  equipmentLevel: EquipmentLevel;
  hospital: string;
  driver: string;
  capacity: number;
}

const defaultForm: AmbulanceFormData = {
  vehicleNumber: '',
  registrationNumber: '',
  equipmentLevel: 'basic',
  hospital: '',
  driver: '',
  capacity: 2,
};

export default function FleetManager() {
  const { ambulances, hospitals, addAmbulance, updateAmbulance, removeAmbulance } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [editTarget, setEditTarget] = useState<Ambulance | null>(null);
  const [formData, setFormData] = useState<AmbulanceFormData>(defaultForm);
  const [loading, setLoading] = useState(false);

  const filtered = ambulances.filter((a) => {
    const matchesSearch =
      !search ||
      a.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.registrationNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: ambulances.length,
    available: ambulances.filter((a) => a.status === 'available').length,
    dispatched: ambulances.filter((a) => a.status === 'dispatched').length,
    maintenance: ambulances.filter((a) => a.status === 'maintenance').length,
    on_scene: ambulances.filter((a) => a.status === 'on_scene').length,
  };

  const openAdd = () => {
    setFormData(defaultForm);
    setEditTarget(null);
    setShowModal('add');
  };

  const openEdit = (amb: Ambulance) => {
    setFormData({
      vehicleNumber: amb.vehicleNumber,
      registrationNumber: amb.registrationNumber,
      equipmentLevel: amb.equipmentLevel,
      hospital: typeof amb.hospital === 'object' ? (amb.hospital as { _id: string })._id : (amb.hospital || ''),
      driver: typeof amb.driver === 'object' ? (amb.driver as { _id: string })._id : (amb.driver || ''),
      capacity: amb.specifications?.capacity || 2,
    });
    setEditTarget(amb);
    setShowModal('edit');
  };

  const handleSubmit = async () => {
    if (!formData.vehicleNumber || !formData.registrationNumber) {
      toast.error('Vehicle number and registration are required');
      return;
    }
    setLoading(true);
    try {
      if (showModal === 'add') {
        const res = await ambulanceApi.create({
          vehicleNumber: formData.vehicleNumber,
          registrationNumber: formData.registrationNumber,
          equipmentLevel: formData.equipmentLevel,
          hospital: formData.hospital || undefined,
          isActive: true,
          specifications: { capacity: formData.capacity },
        });
        addAmbulance(res.data.ambulance);
        toast.success(`Ambulance ${formData.vehicleNumber} added successfully`);
      } else if (showModal === 'edit' && editTarget) {
        const res = await ambulanceApi.update(editTarget._id, {
          vehicleNumber: formData.vehicleNumber,
          registrationNumber: formData.registrationNumber,
          equipmentLevel: formData.equipmentLevel,
          hospital: formData.hospital || undefined,
          specifications: { capacity: formData.capacity },
        });
        updateAmbulance(editTarget._id, res.data.ambulance);
        toast.success(`Ambulance updated successfully`);
      }
      setShowModal(null);
    } catch {
      toast.error('Operation failed. Check backend connection.');
      // For demo: optimistically update
      if (showModal === 'add') {
        const mockAmb: Ambulance = {
          _id: `mock_${Date.now()}`,
          vehicleNumber: formData.vehicleNumber,
          registrationNumber: formData.registrationNumber,
          equipmentLevel: formData.equipmentLevel,
          status: 'available',
          isActive: true,
          specifications: { capacity: formData.capacity },
          totalTrips: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addAmbulance(mockAmb);
        toast.success(`[Demo] Ambulance ${formData.vehicleNumber} added`);
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
      await ambulanceApi.delete(editTarget._id);
      removeAmbulance(editTarget._id);
      toast.success('Ambulance removed from fleet');
      setShowModal(null);
    } catch {
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: AmbulanceStatus) => {
    try {
      await ambulanceApi.updateStatus(id, newStatus);
      updateAmbulance(id, { status: newStatus });
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
    } catch {
      updateAmbulance(id, { status: newStatus });
    }
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>Fleet Manager</h2>
          <div style={{ fontSize: 12, color: '#64748b' }}>Manage ambulance fleet and assignments</div>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus size={14} /> Add Ambulance
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Fleet', value: stats.total, color: '#f8fafc' },
          { label: 'Available', value: stats.available, color: '#22c55e' },
          { label: 'Dispatched', value: stats.dispatched, color: '#ef4444' },
          { label: 'On Scene', value: stats.on_scene, color: '#f97316' },
          { label: 'Maintenance', value: stats.maintenance, color: '#64748b' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={13} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 30, fontSize: 12 }}
            placeholder="Search by vehicle or registration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 160, fontSize: 12 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle #</th>
              <th>Registration</th>
              <th>Equipment Level</th>
              <th>Status</th>
              <th>Hospital</th>
              <th>Last Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  No ambulances found
                </td>
              </tr>
            ) : (
              filtered.map((amb) => {
                const hospitalName = typeof amb.hospital === 'object'
                  ? (amb.hospital as { name: string }).name
                  : hospitals.find((h) => h._id === amb.hospital)?.name || '—';

                return (
                  <tr key={amb._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 30,
                          height: 30,
                          borderRadius: 7,
                          background: 'rgba(59,130,246,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Truck size={14} color="#3b82f6" />
                        </div>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{amb.vehicleNumber}</span>
                      </div>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{amb.registrationNumber}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `${EQUIPMENT_COLORS[amb.equipmentLevel]}20`,
                        color: EQUIPMENT_COLORS[amb.equipmentLevel],
                        border: `1px solid ${EQUIPMENT_COLORS[amb.equipmentLevel]}40`,
                      }}>
                        {EQUIPMENT_LABELS[amb.equipmentLevel]}
                      </span>
                    </td>
                    <td>
                      <select
                        value={amb.status}
                        onChange={(e) => handleStatusChange(amb._id, e.target.value as AmbulanceStatus)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: amb.status === 'available' ? '#22c55e' : amb.status === 'dispatched' ? '#ef4444' : '#f59e0b',
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v} style={{ background: '#1a1a2e', color: '#f8fafc' }}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{hospitalName}</td>
                    <td style={{ color: '#64748b', fontSize: 12 }}>
                      {amb.currentLocation
                        ? `${amb.currentLocation.lat.toFixed(4)}, ${amb.currentLocation.lng.toFixed(4)}`
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openEdit(amb)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => { setEditTarget(amb); setShowModal('delete'); }}
                          className="btn-icon"
                          title="Delete"
                          style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showModal === 'add' || showModal === 'edit') && (
          <div className="modal-backdrop" onClick={() => setShowModal(null)}>
            <motion.div
              className="modal"
              style={{ maxWidth: 480 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="modal-header">
                <div className="modal-title">
                  {showModal === 'add' ? 'Add New Ambulance' : 'Edit Ambulance'}
                </div>
                <button className="btn-icon" onClick={() => setShowModal(null)}><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Number *</label>
                    <input
                      className="form-input"
                      placeholder="AMB-001"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData((p) => ({ ...p, vehicleNumber: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Number *</label>
                    <input
                      className="form-input"
                      placeholder="REG-ABC-001"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData((p) => ({ ...p, registrationNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Equipment Level</label>
                    <select
                      className="form-select"
                      value={formData.equipmentLevel}
                      onChange={(e) => setFormData((p) => ({ ...p, equipmentLevel: e.target.value as EquipmentLevel }))}
                    >
                      {Object.entries(EQUIPMENT_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capacity</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.capacity}
                      onChange={(e) => setFormData((p) => ({ ...p, capacity: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Base Hospital</label>
                  <select
                    className="form-select"
                    value={formData.hospital}
                    onChange={(e) => setFormData((p) => ({ ...p, hospital: e.target.value }))}
                  >
                    <option value="">Select hospital...</option>
                    {hospitals.filter(h => h.isActive).map((h) => (
                      <option key={h._id} value={h._id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader size={13} className="animate-spin" /> Saving...</> : <><CheckCircle size={13} /> {showModal === 'add' ? 'Add Ambulance' : 'Save Changes'}</>}
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
              style={{ maxWidth: 380 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="modal-header">
                <div className="modal-title" style={{ color: '#ef4444' }}>Confirm Removal</div>
                <button className="btn-icon" onClick={() => setShowModal(null)}><X size={16} /></button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>
                Remove <strong style={{ color: '#f8fafc' }}>{editTarget.vehicleNumber}</strong> from the fleet?
                This action cannot be undone.
              </p>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                  {loading ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
