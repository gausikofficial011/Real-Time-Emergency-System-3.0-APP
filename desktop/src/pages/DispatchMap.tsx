import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Filter, RefreshCw, Layers, Locate } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import IncidentCard from '@/components/IncidentCard';
import DispatchPanel from '@/components/DispatchPanel';
import type { Emergency, Ambulance, Hospital } from '@/types';
import toast from 'react-hot-toast';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TILE_LAYERS = {
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB',
  },
  standard: {
    label: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
  googleRoad: {
    label: 'Google Map',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '© Google',
  },
  googleHybrid: {
    label: 'Google Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '© Google',
  },
};

// Create custom SVG icons
function createSeverityIcon(severity: string, isPulsing = false) {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#22c55e',
  };
  const color = colors[severity] || '#94a3b8';
  const pulse = isPulsing
    ? `<circle cx="16" cy="16" r="14" fill="none" stroke="${color}" stroke-width="2" opacity="0.4">
        <animate attributeName="r" from="10" to="20" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
       </circle>`
    : '';

  return L.divIcon({
    className: '',
    html: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      ${pulse}
      <circle cx="16" cy="16" r="10" fill="${color}" stroke="white" stroke-width="2" opacity="0.95"/>
      <circle cx="16" cy="16" r="4" fill="white" opacity="0.9"/>
    </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createAmbulanceIcon(status: string) {
  const colors: Record<string, string> = {
    available: '#22c55e',
    dispatched: '#ef4444',
    on_scene: '#f97316',
    returning: '#3b82f6',
    maintenance: '#64748b',
  };
  const color = colors[status] || '#94a3b8';

  return L.divIcon({
    className: '',
    html: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="${color}" stroke="white" stroke-width="2" opacity="0.95"/>
      <text x="14" y="19" text-anchor="middle" fill="white" font-size="14" font-weight="bold">🚑</text>
    </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function createHospitalIcon() {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="26" height="26" rx="6" fill="#1a1a2e" stroke="#3b82f6" stroke-width="2"/>
      <text x="15" y="21" text-anchor="middle" fill="#3b82f6" font-size="16" font-weight="bold">H</text>
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function createUserLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.4">
        <animate attributeName="r" from="8" to="17" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="18" cy="18" r="7" fill="#3b82f6" stroke="white" stroke-width="2" opacity="0.95"/>
      <circle cx="18" cy="18" r="2.5" fill="white" opacity="0.9"/>
    </svg>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function MapController({ center }: { center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1 });
    }
  }, [center, map]);
  return null;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function DispatchMap() {
  const { emergencies, ambulances, hospitals } = useAppStore();
  const [selectedIncident, setSelectedIncident] = useState<Emergency | null>(null);
  const [activeLayer, setActiveLayer] = useState<keyof typeof TILE_LAYERS>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [deviceLocation, setDeviceLocation] = useState<[number, number] | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const requestDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your device.');
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setDeviceLocation(coords);
        setMapCenter(coords);
        setLoadingLocation(false);
        toast.success('Located device position successfully.');
      },
      (error) => {
        console.error('Error fetching device geolocation:', error);
        let errorMsg = 'Failed to get device location.';
        if (error.code === 1) {
          errorMsg = 'Location permission denied by user/device.';
        } else if (error.code === 2) {
          errorMsg = 'Location position is unavailable.';
        } else if (error.code === 3) {
          errorMsg = 'Location request timed out.';
        }
        toast.error(errorMsg);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestDeviceLocation();
  }, [requestDeviceLocation]);

  const filteredIncidents = emergencies
    .filter((e) => {
      if (statusFilter === 'active') return ['pending', 'assigned', 'in_progress'].includes(e.status);
      if (statusFilter === 'pending') return e.status === 'pending';
      if (statusFilter === 'resolved') return e.status === 'resolved';
      return true;
    })
    .filter((e) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.incidentType.includes(q) ||
        e.emergencyId?.toLowerCase().includes(q) ||
        e.location.address?.toLowerCase().includes(q) ||
        e.severity.includes(q)
      );
    })
    .sort((a, b) => (SEVERITY_ORDER[a.severity] || 3) - (SEVERITY_ORDER[b.severity] || 3));

  const handleSelectIncident = useCallback((incident: Emergency) => {
    setSelectedIncident(incident);
    setMapCenter([incident.location.lat, incident.location.lng]);
  }, []);

  // Default map center: India
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const currentLayer = TILE_LAYERS[activeLayer];

  // Get dispatch polylines for dispatched ambulances
  const dispatchLines = ambulances
    .filter((a) => a.status === 'dispatched' && a.currentLocation && a.currentEmergency)
    .map((amb) => {
      const relatedEmergency = emergencies.find((e) => e._id === amb.currentEmergency);
      if (!relatedEmergency || !amb.currentLocation) return null;
      return {
        key: amb._id,
        points: [
          [amb.currentLocation.lat, amb.currentLocation.lng] as [number, number],
          [relatedEmergency.location.lat, relatedEmergency.location.lng] as [number, number],
        ],
      };
    })
    .filter(Boolean);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: Incident Feed */}
      <div style={{
        width: 320,
        flexShrink: 0,
        background: 'rgba(26,26,46,0.95)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              Incident Feed
              <span style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                padding: '1px 7px',
                borderRadius: 10,
              }}>
                {filteredIncidents.filter(e => e.status === 'pending').length} pending
              </span>
            </div>
            <RefreshCw size={14} color="#64748b" style={{ cursor: 'pointer' }} />
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={13} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 30, fontSize: 12, padding: '7px 10px 7px 30px' }}
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['active', 'pending', 'all', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                  background: statusFilter === f ? 'rgba(59,130,246,0.15)' : 'transparent',
                  borderColor: statusFilter === f ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)',
                  color: statusFilter === f ? '#3b82f6' : '#64748b',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Incident List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {filteredIncidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <div style={{ fontSize: 13 }}>No incidents found</div>
              </div>
            ) : (
              filteredIncidents.map((incident) => (
                <IncidentCard
                  key={incident._id}
                  incident={incident}
                  onSelect={handleSelectIncident}
                  isSelected={selectedIncident?._id === incident._id}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Center: Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Locate Me button */}
        <button
          onClick={requestDeviceLocation}
          disabled={loadingLocation}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(26,26,46,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
          title="Locate My Device"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59,130,246,0.15)';
            e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(26,26,46,0.95)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          {loadingLocation ? (
            <RefreshCw size={16} className="animate-spin" color="#3b82f6" />
          ) : (
            <Locate size={16} color="#3b82f6" />
          )}
        </button>

        {/* Layer switcher */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          gap: 4,
          background: 'rgba(26,26,46,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: 4,
        }}>
          <Layers size={14} color="#64748b" style={{ margin: '4px 6px' }} />
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <button
              key={key}
              onClick={() => setActiveLayer(key as keyof typeof TILE_LAYERS)}
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: activeLayer === key ? '#3b82f6' : 'transparent',
                color: activeLayer === key ? 'white' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Stats overlay */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {[
            { label: 'Active Incidents', value: emergencies.filter(e => ['pending','assigned','in_progress'].includes(e.status)).length, color: '#ef4444' },
            { label: 'Available Ambulances', value: ambulances.filter(a => a.status === 'available').length, color: '#22c55e' },
            { label: 'Hospitals', value: hospitals.filter(h => h.isActive).length, color: '#3b82f6' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'rgba(26,26,46,0.92)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color }} />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{stat.label}:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: stat.color }}>{stat.value}</span>
            </div>
          ))}
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={5}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <MapController center={mapCenter} />
          <TileLayer url={currentLayer.url} attribution={currentLayer.attribution} />

          {/* Device Current Location Marker */}
          {deviceLocation && (
            <Marker position={deviceLocation} icon={createUserLocationIcon()}>
              <Popup>
                <div style={{ textAlign: 'center', minWidth: 120 }}>
                  <div style={{ fontWeight: 700, color: '#3b82f6', marginBottom: 2 }}>Your Location</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {deviceLocation[0].toFixed(4)}, {deviceLocation[1].toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Emergency Markers */}
          {emergencies
            .filter(e => ['pending', 'assigned', 'in_progress'].includes(e.status))
            .map((e) => (
              <Marker
                key={e._id}
                position={[e.location.lat, e.location.lng]}
                icon={createSeverityIcon(e.severity, e.severity === 'critical' && e.status === 'pending')}
                eventHandlers={{ click: () => handleSelectIncident(e) }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>
                      {e.incidentType.replace('_', ' ')} — <span style={{ textTransform: 'capitalize' }}>{e.severity}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                      #{e.emergencyId}
                    </div>
                    <div style={{ fontSize: 12 }}>{e.location.address || `${e.location.lat.toFixed(4)}, ${e.location.lng.toFixed(4)}`}</div>
                    <div style={{ fontSize: 11, marginTop: 4, color: '#94a3b8' }}>
                      Victims: {e.victimCount} · Status: {e.status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Ambulance Markers */}
          {ambulances
            .filter(a => a.currentLocation && a.isActive)
            .map((a) => (
              <Marker
                key={a._id}
                position={[a.currentLocation!.lat, a.currentLocation!.lng]}
                icon={createAmbulanceIcon(a.status)}
              >
                <Popup>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.vehicleNumber}</div>
                    <div style={{ fontSize: 12 }}>
                      Status: <span style={{ textTransform: 'capitalize' }}>{a.status.replace('_', ' ')}</span>
                    </div>
                    <div style={{ fontSize: 12 }}>Equipment: {a.equipmentLevel.replace('_', ' ')}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Hospital Markers */}
          {hospitals
            .filter(h => h.isActive)
            .map((h) => (
              <Marker
                key={h._id}
                position={[h.location.lat, h.location.lng]}
                icon={createHospitalIcon()}
              >
                <Popup>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{h.name}</div>
                    <div style={{ fontSize: 12 }}>Beds: {h.availableBeds}/{h.totalBeds}</div>
                    <div style={{ fontSize: 12 }}>ICU: {h.availableIcuBeds}/{h.icuBeds}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.address}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Dispatch route lines */}
          {dispatchLines.map((line) => line && (
            <Polyline
              key={line.key}
              positions={line.points}
              color="#3b82f6"
              weight={3}
              opacity={0.8}
              dashArray="10 6"
              pathOptions={{
                lineCap: 'round',
                lineJoin: 'round',
                className: 'animated-polyline',
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Right: Dispatch Panel */}
      <DispatchPanel selectedIncident={selectedIncident} />
    </div>
  );
}
