import Ionicons from '@expo/vector-icons/Ionicons'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Button, StateView } from '@/components/ui'
import { isNetworkError } from '@/lib/api/client'
import { formatReceivedAt } from '@/lib/monitoring/format'
import { useAppTheme } from '@/theme/theme'

export function LoadingBlock({
  label = 'Đang tải dữ liệu giám sát…',
  compact = false,
}: {
  label?: string
  compact?: boolean
}) {
  const theme = useAppTheme()
  return (
    <View
      style={[styles.loader, compact && styles.loaderCompact]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size="large" color={theme.brand} />
      <Text style={[styles.loaderText, { color: theme.textMuted }]}>{label}</Text>
    </View>
  )
}

/** Shown when nothing has loaded yet. */
export function ErrorBlock({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const network = isNetworkError(error)
  return (
    <StateView
      icon={network ? 'cloud-offline-outline' : 'alert-circle-outline'}
      title={network ? 'Không có kết nối mạng' : 'Không tải được dữ liệu'}
      description={network ? 'Kiểm tra Wi-Fi hoặc dữ liệu di động rồi thử lại.' : error.message}
      action={<Button label="Thử lại" icon="refresh" variant="secondary" compact onPress={onRetry} />}
    />
  )
}

/** Shown above data that is still on screen after a refresh failed. */
export function RefreshNotice({
  error,
  updatedAt,
  now,
  onRetry,
}: {
  error: Error
  updatedAt: number
  now: number
  onRetry: () => void
}) {
  const theme = useAppTheme()
  const network = isNetworkError(error)
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: theme.warningSoft }]}>
      <Ionicons name={network ? 'cloud-offline-outline' : 'alert-circle-outline'} size={22} color={theme.warning} />
      <View style={styles.noticeCopy}>
        <Text style={[styles.noticeTitle, { color: theme.text }]}>
          {network ? 'Mất kết nối mạng' : 'Không làm mới được dữ liệu'}
        </Text>
        <Text style={[styles.noticeBody, { color: theme.text }]}>
          Đang hiển thị số liệu đã tải lúc {formatReceivedAt(updatedAt, now)}, không phải dữ liệu trực tiếp.
        </Text>
        <Button label="Thử lại" icon="refresh" variant="secondary" compact onPress={onRetry} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loader: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderCompact: { minHeight: 180 },
  loaderText: { fontSize: 14, lineHeight: 20 },
  notice: { borderRadius: 6, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeCopy: { flex: 1, gap: 6 },
  noticeTitle: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  noticeBody: { fontSize: 14, lineHeight: 20 },
})
