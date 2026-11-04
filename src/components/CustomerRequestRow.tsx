import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import type { CustomerDispatch, CustomerRequest } from '@/lib/api/types'
import { customerRequestStatus } from '@/lib/status'
import { formatAppointment, formatMoment, shortCode } from '@/lib/format'
import { ListRow, StatusText } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function CustomerRequestRow({
  request,
  dispatch,
  last = false,
}: {
  request: CustomerRequest
  dispatch?: CustomerDispatch
  last?: boolean
}) {
  const theme = useAppTheme()
  const router = useRouter()
  const status = customerRequestStatus(request, dispatch)
  const live = dispatch?.status === 'PROPOSAL_PENDING' ? dispatch.liveProposal : null
  return (
    <ListRow
      accessibilityLabel={`Xem yêu cầu ${request.propertyName || shortCode(request.surveyRequestId)}`}
      onPress={() =>
        router.push({ pathname: '/customer/request/[id]', params: { id: request.surveyRequestId } } as Href)
      }
      last={last}
    >
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {request.propertyName || 'Công trình chưa đặt tên'}
        </Text>
        {request.appointment ? (
          <Text style={[styles.time, { color: theme.text }]}>
            {formatAppointment(request.appointment.startsAt, request.appointment.endsAt)}
          </Text>
        ) : null}
        {live ? (
          <Text style={[styles.time, { color: theme.text }]}>
            Đề xuất {formatAppointment(live.startsAt, live.endsAt)}, trả lời trước {formatMoment(live.expiresAt)}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <StatusText tone={status.tone}>{status.label}</StatusText>
          <Text style={[styles.code, { color: theme.textMuted }]}>{shortCode(request.surveyRequestId)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
    </ListRow>
  )
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 2 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  time: { fontSize: 13, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  code: { fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
})
