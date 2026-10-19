import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { AssessmentDraft } from '@/lib/api/types'

const draftKey = (account: string) => `smart-solar.assessment.${account}`
const profileKey = (account: string) => `smart-solar.customer-profile.${account}`

function webStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

async function get(key: string) {
  return Platform.OS === 'web' ? webStorage()?.getItem(key) ?? null : SecureStore.getItemAsync(key)
}

async function set(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value === null) webStorage()?.removeItem(key)
    else webStorage()?.setItem(key, value)
    return
  }
  if (value === null) await SecureStore.deleteItemAsync(key)
  else await SecureStore.setItemAsync(key, value)
}

export async function readAssessmentDraft(account: string): Promise<AssessmentDraft | null> {
  const raw = await get(draftKey(account))
  if (!raw) return null
  try {
    return JSON.parse(raw) as AssessmentDraft
  } catch {
    await set(draftKey(account), null)
    return null
  }
}

export function saveAssessmentDraft(account: string, draft: AssessmentDraft) {
  return set(draftKey(account), JSON.stringify(draft))
}

export function clearAssessmentDraft(account: string) {
  return set(draftKey(account), null)
}

export async function hasCustomerProfile(account: string) {
  return (await get(profileKey(account))) === '1'
}

export function rememberCustomerProfile(account: string) {
  return set(profileKey(account), '1')
}
