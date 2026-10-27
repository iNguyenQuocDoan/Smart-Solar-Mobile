import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { AuthTokens } from '@/lib/api/types'

const refreshKey = 'smart-solar.refresh-token'
let accessToken: string | null = null

function webStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function getAccessToken() {
  return accessToken
}

export async function getRefreshToken() {
  if (Platform.OS === 'web') return webStorage()?.getItem(refreshKey) ?? null
  return SecureStore.getItemAsync(refreshKey)
}

export async function saveTokens(tokens: AuthTokens) {
  if (!tokens.accessToken || !tokens.refreshToken) throw new Error('Chưa đăng nhập được. Vui lòng thử lại.')
  accessToken = tokens.accessToken
  if (Platform.OS === 'web') webStorage()?.setItem(refreshKey, tokens.refreshToken)
  else await SecureStore.setItemAsync(refreshKey, tokens.refreshToken)
}

export async function clearTokens() {
  accessToken = null
  if (Platform.OS === 'web') webStorage()?.removeItem(refreshKey)
  else await SecureStore.deleteItemAsync(refreshKey)
}
