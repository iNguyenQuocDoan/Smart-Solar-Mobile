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
    <View accessibilityRole="alert" style={styles.notice}>
      <Text style={[styles.noticeTitle, { color: theme.warning }]}>
        {network ? 'Mất kết nối mạng' : 'Không làm mới được dữ liệu'}
      </Text>
      <Text style={[styles.noticeBody, { color: theme.text }]}>
        Đang hiển thị số liệu đã tải lúc {formatReceivedAt(updatedAt, now)}, không phải dữ liệu trực tiếp.
      </Text>
      <Button label="Thử lại" icon="refresh" variant="secondary" compact onPress={onRetry} />
    </View>
  )
}

const styles = StyleSheet.create({
  loader: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loaderCompact: { minHeight: 100 },
  loaderText: { fontSize: 13, lineHeight: 18 },
  notice: { gap: 4 },
  noticeTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  noticeBody: { fontSize: 13, lineHeight: 18 },
})
