import Ionicons from '@expo/vector-icons/Ionicons'
import { usePathname, useRouter, type Href } from 'expo-router'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/auth/roles'
import { type IconName } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

// Sidebar trượt từ trái, mở bằng nút ☰ ở đầu mọi trang (kể cả trang chi tiết không có thanh tab). Thanh tab đáy vẫn giữ

export type MenuItem = {
  label: string
  icon: IconName
  href: string
  /** Số đỏ: việc đang chờ / chưa đọc */
  count?: number
  /** Đường dẫn được tính là đang ở mục này, mặc định chính href */
  match?: (pathname: string) => boolean
}

const OpenMenu = createContext<() => void>(() => undefined)

export function MenuButton() {
  const theme = useAppTheme()
  const open = useContext(OpenMenu)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mở menu"
      hitSlop={8}
      onPress={open}
      style={({ pressed }) => [styles.menuButton, pressed && { backgroundColor: theme.surfacePressed }]}
    >
      <Ionicons name="menu" size={26} color={theme.text} />
    </Pressable>
  )
}

const DURATION = 180

export function SideMenu({ items, children }: { items: MenuItem[]; children: ReactNode }) {
  const theme = useAppTheme()
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { session, logout } = useAuth()
  const { width } = useWindowDimensions()
  const panelWidth = Math.min(300, Math.round(width * 0.82))
  const [visible, setVisible] = useState(false)
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (visible) Animated.timing(progress, { toValue: 1, duration: DURATION, useNativeDriver: true }).start()
  }, [visible, progress])

  function close(then?: () => void) {
    Animated.timing(progress, { toValue: 0, duration: DURATION, useNativeDriver: true }).start(() => {
      setVisible(false)
      then?.()
    })
  }

  function go(href: string) {
    close(() => router.navigate(href as Href))
  }

  function confirmLogout() {
    close(() =>
      Alert.alert('Đăng xuất?', undefined, [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => void logout() },
      ]),
    )
  }

  const email = session?.email ?? ''
  return (
    <OpenMenu.Provider value={() => setVisible(true)}>
      {children}
      <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={() => close()}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Đóng menu" onPress={() => close()} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              width: panelWidth,
              backgroundColor: theme.canvas,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 8,
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }],
            },
          ]}
        >
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
              <Text style={[styles.initial, { color: theme.brandText }]}>{(email[0] ?? 'S').toUpperCase()}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.email, { color: theme.text }]} numberOfLines={1}>
                {email || 'Smart Solar'}
              </Text>
              {session ? (
                <Text style={[styles.role, { color: theme.textMuted }]}>{roleLabel[session.role]}</Text>
              ) : null}
            </View>
          </View>
          <ScrollView style={[styles.list, { borderTopColor: theme.border }]}>
            {items.map((item) => {
              const active = item.match ? item.match(pathname) : pathname === item.href
              return (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={item.count ? `${item.label}, ${item.count}` : item.label}
                  onPress={() => go(item.href)}
                  style={({ pressed }) => [
                    styles.item,
                    active && { backgroundColor: theme.brandSoft },
                    pressed && !active && { backgroundColor: theme.surfacePressed },
                  ]}
                >
                  <Ionicons name={item.icon} size={21} color={active ? theme.brandText : theme.textMuted} />
                  <Text style={[styles.itemLabel, { color: active ? theme.brandText : theme.text }]}>{item.label}</Text>
                  {item.count ? (
                    <View style={[styles.count, { backgroundColor: theme.danger }]}>
                      <Text style={[styles.countText, { color: theme.dark ? theme.canvas : theme.onBrand }]}>
                        {item.count > 99 ? '99+' : item.count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              )
            })}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
            onPress={confirmLogout}
            style={({ pressed }) => [
              styles.item,
              styles.logout,
              { borderTopColor: theme.border },
              pressed && { backgroundColor: theme.surfacePressed },
            ]}
          >
            <Ionicons name="log-out-outline" size={21} color={theme.danger} />
            <Text style={[styles.itemLabel, { color: theme.danger }]}>Đăng xuất</Text>
          </Pressable>
        </Animated.View>
      </Modal>
    </OpenMenu.Provider>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  menuButton: {
    width: 40,
    height: 40,
    marginLeft: -8,
    marginTop: -6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 23, 20, 0.45)' },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 19, lineHeight: 24, fontWeight: '700' },
  email: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  role: { fontSize: 13, lineHeight: 18 },
  list: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  item: {
    minHeight: 48,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 12, lineHeight: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  logout: { borderTopWidth: StyleSheet.hairlineWidth, borderRadius: 0, marginHorizontal: 0, paddingHorizontal: 20 },
})
