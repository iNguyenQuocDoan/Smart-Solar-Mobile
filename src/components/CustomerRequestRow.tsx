import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { CustomerRequest } from '@/lib/api/types'
import { customerStatus } from '@/lib/status'
import { formatAppointment, shortCode } from '@/lib/format'
import { Badge } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function CustomerRequestRow({ request, last = false }: { request: CustomerRequest; last?: boolean }) {
  const theme = useAppTheme()
  const router = useRouter()
  const status = customerStatus(request)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem yêu cầu ${request.propertyName || shortCode(request.surveyRequestId)}`}
      onPress={() => router.push({ pathname: '/customer/request/[id]', params: { id: request.surveyRequestId } } as Href)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.surfacePressed : theme.surface, borderBottomColor: theme.border },
        last && styles.last,
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{request.propertyName || 'Công trình chưa đặt tên'}</Text>
        <Text style={[styles.code, { color: theme.textMuted }]}>Mã {shortCode(request.surveyRequestId)}</Text>
        {request.appointment ? (
          <Text style={[styles.time, { color: theme.text }]}>{formatAppointment(request.appointment.startsAt, request.appointment.endsAt)}</Text>
        ) : null}
        <Badge tone={status.tone}>{status.label}</Badge>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: 112, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  last: { borderBottomWidth: 0 },
  copy: { flex: 1, alignItems: 'flex-start', gap: 5 },
  name: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  code: { fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] },
  time: { fontSize: 14, lineHeight: 20 },
})
