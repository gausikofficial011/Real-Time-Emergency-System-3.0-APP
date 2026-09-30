import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { RefreshCw, TrendingUp, Clock, Truck, BedDouble } from 'lucide-react';
import { analytics as analyticsApi } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import type { MonthlyData, ResponseTimeData } from '@/types';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

const TYPE_COLORS = {
  medical: '#3b82f6',
  accident: '#f59e0b',
  fire: '#ef4444',
  natural_disaster: '#8b5cf6',
  crime: '#64748b',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {label && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{label}</div>}
        {payload.map((p) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
            <span style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{p.name}:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Mock data generators
function generateMockMonthly(): MonthlyData[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month) => ({
    month,
    critical: Math.floor(Math.random() * 30) + 5,
    high: Math.floor(Math.random() * 50) + 15,
    medium: Math.floor(Math.random() * 80) + 30,
    low: Math.floor(Math.random() * 60) + 20,
    total: 0,
  })).map(d => ({ ...d, total: d.critical + d.high + d.medium + d.low }));
}

function generateMockResponseTimes(): ResponseTimeData[] {
  return [
    { type: 'Medical', avgMinutes: 8.2 },
    { type: 'Accident', avgMinutes: 11.5 },
    { type: 'Fire', avgMinutes: 6.8 },
    { type: 'Natural Disaster', avgMinutes: 18.4 },
    { type: 'Crime', avgMinutes: 9.1 },
  ];
}

export default function Analytics() {
  const { analyticsSummary, emergencies } = useAppStore();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyRes, responseRes] = await Promise.allSettled([
        analyticsApi.getMonthly(),
        analyticsApi.getResponseTimes(),
      ]);
      if (monthlyRes.status === 'fulfilled') {
        setMonthlyData(monthlyRes.value.data.monthly || generateMockMonthly());
      } else {
        setMonthlyData(generateMockMonthly());
      }
      if (responseRes.status === 'fulfilled') {
        setResponseTimeData(responseRes.value.data.responseTimes || generateMockResponseTimes());
      } else {
        setResponseTimeData(generateMockResponseTimes());
      }
      setLastRefresh(new Date());
    } catch {
      setMonthlyData(generateMockMonthly());
      setResponseTimeData(generateMockResponseTimes());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // Build pie data from store
  const bySeverityData = analyticsSummary?.bySeverity
    ? Object.entries(analyticsSummary.bySeverity).map(([name, value]) => ({ name, value }))
    : [
        { name: 'critical', value: emergencies.filter(e => e.severity === 'critical').length || 23 },
        { name: 'high', value: emergencies.filter(e => e.severity === 'high').length || 47 },
        { name: 'medium', value: emergencies.filter(e => e.severity === 'medium').length || 85 },
        { name: 'low', value: emergencies.filter(e => e.severity === 'low').length || 62 },
      ];

  const byTypeData = analyticsSummary?.byType
    ? Object.entries(analyticsSummary.byType).map(([name, value]) => ({ name, value }))
    : [
        { name: 'medical', value: 94 },
        { name: 'accident', value: 67 },
        { name: 'fire', value: 38 },
        { name: 'natural_disaster', value: 15 },
        { name: 'crime', value: 3 },
      ];

  const summaryCards = [
    {
      label: 'Total Emergencies',
      value: analyticsSummary?.totalEmergencies || emergencies.length || 217,
      icon: TrendingUp,
      color: '#3b82f6',
      sub: 'All time',
    },
    {
      label: 'Avg Response Time',
      value: `${analyticsSummary?.avgResponseTime?.toFixed(1) || '9.4'} min`,
      icon: Clock,
      color: '#22c55e',
      sub: 'Last 30 days',
    },
    {
      label: 'Active Ambulances',
      value: analyticsSummary?.activeAmbulances || 12,
      icon: Truck,
      color: '#f59e0b',
      sub: 'Currently deployed',
    },
    {
      label: 'Available Beds',
      value: `${analyticsSummary?.availableBeds || 1247}/${analyticsSummary?.totalBeds || 2800}`,
      icon: BedDouble,
      color: '#8b5cf6',
      sub: 'Across all hospitals',
    },
  ];

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>Analytics Dashboard</h2>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="btn btn-ghost"
          style={{ gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${card.color}20`,
                border: `1px solid ${card.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <card.icon size={18} color={card.color} />
              </div>
            </div>
            <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Incident Type Distribution */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
            Incident Distribution by Type
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={byTypeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {byTypeData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={TYPE_COLORS[entry.name as keyof typeof TYPE_COLORS] || '#64748b'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
                    {value.replace('_', ' ')}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Donut */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
            Severity Breakdown
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={bySeverityData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
              >
                {bySeverityData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || '#64748b'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Response Times */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
            Avg Response Time by Incident Type (minutes)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={responseTimeData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgMinutes" name="Avg Minutes" radius={[4, 4, 0, 0]}>
                {responseTimeData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e'][index % 5]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trends */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
            Monthly Emergency Trends (12 months)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{value}</span>
                )}
              />
              {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={color}
                  fill={`url(#gradient-${key})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
