/**
 * RentaFlow design tokens — light, corporate, limited accent.
 * Avoid purple/glow; teal accent on white/slate surfaces.
 */
export const colors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F5',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  primary: '#0F766E',
  primaryPressed: '#0D5F59',
  primarySoft: '#CCFBF1',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  success: '#059669',
  successSoft: '#D1FAE5',
  info: '#0284C7',
  infoSoft: '#E0F2FE',

  status: {
    AVAILABLE: '#059669',
    RENTED: '#0284C7',
    MAINTENANCE: '#D97706',
    INACTIVE: '#94A3B8',
  } as const,

  payment: {
    PAID: '#059669',
    PARTIALLY_PAID: '#D97706',
    UNPAID: '#DC2626',
  } as const,

  overlay: 'rgba(15, 23, 42, 0.45)',
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  hero: { fontSize: 28, lineHeight: 34, fontFamily: 'Outfit_700Bold' },
  title: { fontSize: 24, lineHeight: 30, fontFamily: 'Outfit_700Bold' },
  subtitle: { fontSize: 18, lineHeight: 24, fontFamily: 'Outfit_600SemiBold' },
  kpi: { fontSize: 24, lineHeight: 28, fontFamily: 'Outfit_700Bold' },
  body: { fontSize: 15, lineHeight: 22, fontFamily: 'DMSans_400Regular' },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontFamily: 'DMSans_500Medium' },
  label: { fontSize: 13, lineHeight: 18, fontFamily: 'DMSans_500Medium' },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: 'DMSans_400Regular' },
  button: { fontSize: 16, lineHeight: 22, fontFamily: 'DMSans_600SemiBold' },
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
