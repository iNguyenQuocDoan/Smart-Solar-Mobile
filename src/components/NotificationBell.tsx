import Ionicons from '@expo/vector-icons/Ionicons'
import { usePathname, useRouter, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNotifications, useOpenJobs, useTechInstallations, useTechJobs } from '@/hooks/queries'
import { techTodos } from '@/lib/techTodo'
import { useAppTheme } from '@/theme/theme'

/** Chuông ở cuối hàng tiêu đề, số đỏ; ẩn khi đang ở chính trang của chuông */
function HeaderBell({ count, label, href }: { count: number; label: string; href: Href & string }) {
  const theme = useAppTheme()
  const router = useRouter()
  const pathname = usePathname()
  if (pathname === href) return null
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      hitSlop={8}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.bell, pressed && { backgroundColor: theme.surfacePressed }]}
    >
      <Ionicons name="notifications-outline" size={24} color={theme.text} />
      {count ? (
        <View style={[styles.badge, { backgroundColor: theme.danger }]}>
          <Text style={[styles.badgeText, { color: theme.dark ? theme.canvas : theme.onBrand }]}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

/** Khách: số thông báo chưa đọc theo server */
export function CustomerBell() {
  const query = useNotifications()
  const unread = query.data?.filter((n) => !n.readAt).length ?? 0
  return <HeaderBell count={unread} label="Thông báo chưa đọc" href="/customer/notifications" />
}

/** Kỹ thuật viên: số việc đang chờ (backend không có thông báo cho nhân viên) */
export function TechBell() {
  const open = useOpenJobs()
  const mine = useTechJobs()
  const installations = useTechInstallations()
  const count = techTodos(open.data ?? [], mine.data ?? [], installations.data ?? []).length
  return <HeaderBell count={count} label="Việc cần làm" href="/tech/todo" />
}

const styles = StyleSheet.create({
  bell: { width: 40, height: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
})
