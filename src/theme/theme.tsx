import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'
import { useColorScheme } from 'react-native'

const base = {
  brand: '#0D5C3A',
  brandPressed: '#08472D',
  onBrand: '#FFFFFF',
  danger: '#B42318',
  warning: '#8A5A00',
  success: '#16734B',
  info: '#175CD3',
  radius: 6,
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
} as const

export const lightTheme = {
  ...base,
  dark: false,
  canvas: '#F7F8F4',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1EB',
  surfacePressed: '#E4E9E1',
  text: '#141711',
  textMuted: '#5F675E',
  textSubtle: '#6F786E',
  border: '#D7DDD3',
  brandText: '#0D5C3A',
  brandSoft: '#E3F1E8',
  dangerSoft: '#FDEBE9',
  warningSoft: '#FFF3D4',
  successSoft: '#E5F4EA',
  infoSoft: '#E9F1FF',
} as const

export const darkTheme = {
  ...base,
  dark: true,
  danger: '#FF8A80',
  warning: '#F6C85F',
  success: '#6FD3A4',
  info: '#85B7FF',
  canvas: '#0E100D',
  surface: '#171A16',
  surfaceMuted: '#20251F',
  surfacePressed: '#2A3029',
  text: '#EEF1EC',
  textMuted: '#ABB2A8',
  textSubtle: '#8D968B',
  border: '#353C34',
  brandText: '#78C99D',
  brandSoft: '#173728',
  dangerSoft: '#3B201E',
  warningSoft: '#3A2E14',
  successSoft: '#173528',
  infoSoft: '#192D4A',
} as const

export type AppTheme = typeof lightTheme | typeof darkTheme

const ThemeContext = createContext<AppTheme>(lightTheme)

export function AppThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme()
  const value = useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
