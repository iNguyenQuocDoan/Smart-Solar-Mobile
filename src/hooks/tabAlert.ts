import * as SecureStore from 'expo-secure-store'
import { useEffect, useSyncExternalStore } from 'react'
import { Platform } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'

// Số đỏ trên tab: việc đang chờ người dùng, cộng mục mới hoặc đổi trạng thái kể từ lần xem trước.
// Lần xem trước lưu trên máy. Đang mở tab đó, hoặc thay đổi do chính người dùng vừa làm, thì coi như đã xem

type Seen = Record<string, string>

type Options<T> = {
  /** Mã của mục trong danh sách */
  key: (item: T) => string
  /** Những gì đổi thì đáng báo, vd. trạng thái + giờ hẹn */
  sig: (item: T) => string
  /** Mục đang chờ người dùng làm, luôn tính */
  todo?: (item: T) => boolean
}

// Thao tác của chính người dùng làm danh sách tải lại trong vài giây sau đó
const OWN_ACTION_MS = 15_000
let ownActionAt = 0

/** Gọi khi người dùng thao tác xong để thay đổi kéo theo không bị báo đỏ */
export function markOwnAction() {
  ownActionAt = Date.now()
}

// Bản đã đọc từ máy theo khoá; chưa có khoá là chưa đọc xong, null là chưa từng lưu
const cache = new Map<string, string | null>()
const loading = new Set<string>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const notify = () => listeners.forEach((listener) => listener())

async function get(storageKey: string) {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey)
  return SecureStore.getItemAsync(storageKey)
}

async function set(storageKey: string, raw: string) {
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(storageKey, raw)
  else if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, raw)
}

async function load(storageKey: string) {
  if (cache.has(storageKey) || loading.has(storageKey)) return
  loading.add(storageKey)
  const raw = await get(storageKey).catch(() => null)
  loading.delete(storageKey)
  cache.set(storageKey, raw)
  notify()
}

function save(storageKey: string, raw: string) {
  cache.set(storageKey, raw)
  notify()
  // Không lưu được thì chỉ mất phần "đã xem", số việc chờ vẫn đúng
  set(storageKey, raw).catch(() => undefined)
}

function parse(raw: string | null | undefined): Seen | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Seen
  } catch {
    return null
  }
}

/** `section`: tên ngắn của tab (chữ, số, dấu gạch); `viewing`: người dùng đang mở tab đó hoặc trang chi tiết của nó */
export function useTabAlert<T>(
  section: string,
  items: T[] | undefined,
  viewing: boolean,
  { key, sig, todo }: Options<T>,
) {
  const { session } = useAuth()
  const storageKey = session ? `smart-solar.seen.${session.userId}.${section}` : null
  const raw = useSyncExternalStore(subscribe, () => (storageKey ? cache.get(storageKey) : undefined))

  useEffect(() => {
    if (storageKey) load(storageKey)
  }, [storageKey])

  useEffect(() => {
    if (!items || !storageKey || raw === undefined) return
    // Lần đầu chỉ ghi nhận hiện trạng, không báo cả danh sách là mới
    if (raw !== null && !viewing && Date.now() - ownActionAt > OWN_ACTION_MS) return
    const current = JSON.stringify(Object.fromEntries(items.map((item) => [key(item), sig(item)])))
    if (current !== raw) save(storageKey, current)
  }, [items, storageKey, raw, viewing, key, sig])

  if (!items) return 0
  const seen = parse(raw)
  const changed = (item: T) => !viewing && seen !== null && seen[key(item)] !== sig(item)
  return items.filter((item) => todo?.(item) || changed(item)).length
}
