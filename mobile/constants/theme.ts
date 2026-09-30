export const Colors = {
  primary: '#ff5a43', // Soft coral/salmon red as seen in screenshots but adapted for light theme highlights
  primaryDark: '#e0412b',
  primaryGlow: 'rgba(255, 90, 67, 0.15)',
  success: '#10b981', // Emerald green
  successGlow: 'rgba(16, 185, 129, 0.1)',
  info: '#0ea5e9', // Sky blue
  infoGlow: 'rgba(14, 165, 233, 0.1)',
  warning: '#f59e0b', // Amber
  warningGlow: 'rgba(245, 158, 11, 0.1)',
  purple: '#8b5cf6', // Violet
  purpleGlow: 'rgba(139, 92, 246, 0.1)',
  bg: '#f8fafc', // Light Slate 50 background
  surface: '#ffffff', // Pure White surface
  surfaceElevated: '#f1f5f9', // Slate 100
  surfaceHigh: '#e2e8f0', // Slate 200
  glass: 'rgba(15, 23, 42, 0.03)',
  glassStrong: 'rgba(15, 23, 42, 0.06)',
  border: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.14)',
  textPrimary: '#0f172a', // Slate 900 primary text
  textMuted: '#475569', // Slate 600 muted text
  textSubtle: '#94a3b8', // Slate 400 subtle text
  white: '#ffffff',
  black: '#0f172a',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Shadow = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  red: {
    shadowColor: '#ff5a43',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  green: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ff5a43',
  critical: '#dc2626',
};

export const SEVERITY_BG: Record<string, string> = {
  low: 'rgba(16, 185, 129, 0.1)',
  medium: 'rgba(245, 158, 11, 0.1)',
  high: 'rgba(255, 90, 67, 0.1)',
  critical: 'rgba(220, 38, 38, 0.15)',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#0ea5e9',
  in_progress: '#8b5cf6',
  resolved: '#10b981',
  cancelled: '#94a3b8',
  available: '#10b981',
  on_scene: '#8b5cf6',
  returning: '#0ea5e9',
  maintenance: '#94a3b8',
};

export const STATUS_BG: Record<string, string> = {
  pending: 'rgba(245, 158, 11, 0.1)',
  assigned: 'rgba(14, 165, 233, 0.1)',
  in_progress: 'rgba(139, 92, 246, 0.1)',
  resolved: 'rgba(16, 185, 129, 0.1)',
  cancelled: 'rgba(148, 163, 184, 0.1)',
  available: 'rgba(16, 185, 129, 0.1)',
  on_scene: 'rgba(139, 92, 246, 0.1)',
  returning: 'rgba(14, 165, 233, 0.1)',
  maintenance: 'rgba(148, 163, 184, 0.1)',
};

export const INCIDENT_ICONS: Record<string, string> = {
  medical: '🩺',
  accident: '🚗',
  fire: '🔥',
  crime: '🛡️',
  natural_disaster: '🌊',
};

export const INCIDENT_COLORS: Record<string, string> = {
  medical: '#ff5a43',
  accident: '#f59e0b',
  fire: '#ff7a3b',
  natural_disaster: '#0ea5e9',
  crime: '#8b5cf6',
};
