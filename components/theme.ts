export const AURA_COLORS = {
  surface: '#13121c',
  surfaceDim: '#13121c',
  surfaceBright: '#393843',
  surfaceContainerLowest: '#0d0d16',
  surfaceContainerLow: '#1b1b24',
  surfaceContainer: '#1f1f28',
  surfaceContainerHigh: '#292933',
  surfaceContainerHighest: '#34343e',
  surfaceVariant: '#34343e',
  onSurface: '#e4e1ee',
  onSurfaceVariant: '#cac3d8',
  outline: '#948ea1',
  outlineVariant: '#494455',
  primary: '#cdbdff',
  onPrimary: '#370095',
  primaryContainer: '#6c3ce9',
  onPrimaryContainer: '#e4daff',
  primaryFixed: '#e8deff',
  primaryFixedDim: '#cdbdff',
  secondary: '#dcfdff',
  onSecondary: '#00373a',
  secondaryContainer: '#00f1fd',
  onSecondaryContainer: '#006a6f',
  secondaryFixed: '#6ff6ff',
  secondaryFixedDim: '#00dce6',
  tertiary: '#d0bcff',
  onTertiary: '#3c0091',
  tertiaryContainer: '#7240db',
  onTertiaryContainer: '#e6d9ff',
  tertiaryFixed: '#e9ddff',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  pinkAccent: '#ec4899',
  blueAccent: '#3b82f6',
  skyAccent: '#38bdf8',
  voidDeep: '#06060c',
} as const;

export const AURA_FONTS = {
  sansRegular: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemiBold: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
} as const;

export const HEADER_CONTENT_HEIGHT = 64;
export const TAB_BAR_CONTENT_HEIGHT = 56;
export const TAB_BAR_HEIGHT = TAB_BAR_CONTENT_HEIGHT;

export function getTabBarBottomInset(insetsBottom: number): number {
  if (insetsBottom <= 0) return 8;
  return Math.max(insetsBottom - 16, 12);
}

export function getTabBarTotalHeight(insetsBottom: number): number {
  return TAB_BAR_CONTENT_HEIGHT + getTabBarBottomInset(insetsBottom);
}
