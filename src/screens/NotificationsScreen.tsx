import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useMarkNotificationRead, useNotifications } from '@/hooks/queries'
import type { CustomerNotification } from '@/lib/api/types'
import { formatMoment } from '@/lib/format'
import { notificationLabel, notificationTarget } from '@/lib/notifications'
import { BackButton, ListRow, PageHeader, QueryState, Screen, StateView } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

// Thông báo của khách, mới nhất trước. Bấm một dòng là đánh dấu đã đọc (từng dòng: lệnh ghi bị giới hạn số lần mỗi phút) và mở
// màn liên quan nếu app có; hợp đồng, thanh toán, bảo hành chỉ làm trên web nên chỉ đánh dấu đã đọc
export function NotificationsScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const query = useNotifications()
  const markRead = useMarkNotificationRead()
  const list = query.data ?? []
  const unread = list.filter((n) => !n.readAt).length

  function open(n: CustomerNotification) {
    if (!n.readAt) markRead.mutate(n.notificationId)
    const to = notificationTarget(n.type)
    if (to) router.navigate(to)
  }

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/customer'))} />
      <PageHeader title="Thông báo" alert={unread ? `${unread} thông báo chưa đọc` : undefined} />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {query.data && list.length === 0 ? <StateView title="Chưa có thông báo" /> : null}
      <View>
        {list.map((n, i) => {
          const isUnread = !n.readAt
          const label = notificationLabel(n.type)
          const linked = notificationTarget(n.type) !== null
          return (
            <ListRow
              key={n.notificationId}
              last={i === list.length - 1}
              onPress={linked || isUnread ? () => open(n) : undefined}
              accessibilityLabel={`${label}, ${formatMoment(n.createdAt)}${isUnread ? ', chưa đọc' : ''}`}
            >
              <View style={[styles.dot, isUnread && { backgroundColor: theme.info }]} />
              <View style={styles.copy}>
                <Text style={[styles.title, { color: theme.text }, isUnread && styles.unread]}>{label}</Text>
                <Text style={[styles.time, { color: theme.textMuted }]}>{formatMoment(n.createdAt)}</Text>
              </View>
              {linked ? <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} /> : null}
            </ListRow>
          )
        })}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  unread: { fontWeight: '700' },
  // Chấm xanh là chưa đọc; dòng đã đọc vẫn chừa chỗ để chữ thẳng hàng
  dot: { width: 8, height: 8, borderRadius: 4 },
  time: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
})
