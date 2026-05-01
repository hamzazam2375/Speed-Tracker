// theme.js
// Centralized theme constants for consistent styling across the app

export const COLORS = {
  background: '#0a0a1a',
  surface: '#12122a',
  primary: '#00e5ff',
  primaryDim: 'rgba(0, 229, 255, 0.15)',
  accent: '#7c4dff',
  success: '#00e676',
  warning: '#ffab00',
  danger: '#ff1744',
  textPrimary: '#ffffff',
  textSecondary: '#aaaaaa',
  textMuted: '#555555',
  border: 'rgba(255, 255, 255, 0.08)',
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
  // TODO: Load custom fonts with expo-font if desired
};

export const SIZES = {
  speedDisplay: 96,
  unitDisplay: 24,
  heading: 22,
  body: 16,
  caption: 12,
  borderRadius: 16,
  padding: 16,
};

export const SPEED = {
  maxDisplaySpeed: 200, // Max speed for gauge (km/h)
  updateInterval: 1000, // GPS update interval in ms
  distanceFilter: 5,    // Minimum distance (meters) between GPS updates
};
