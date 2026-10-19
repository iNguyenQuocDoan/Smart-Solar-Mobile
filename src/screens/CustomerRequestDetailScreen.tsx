import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  useBookingMutation,
  useCancelBooking,
  useCustomerRequest,
  useSurveySlots,
} from '@/hooks/queries'
import { addDays, formatAppointment, formatDay, formatTimeRange, initialBookingDate, shortCode, todayVn } from '@/lib/format'
import { canBook, customerStatus } from '@/lib/status'
import { Badge, Button, Field, IconButton, KeyValue, PageHeader, Panel, QueryState, Screen, SectionTitle, StateView } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

function BookingForm({ requestId, propertySiteId, mode, onDone }: { requestId: string; propertySiteId: string; mode: 'book' | 'reschedule'; onDone: () => void }) {
  const theme = useAppTheme()
  const [date, setDate] = useState(initialBookingDate)
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const slots = useSurveySlots(propertySiteId, date, true)
  const mutation = useBookingMutation(requestId, mode)
  const firstDate = todayVn()
  const lastDate = addDays(firstDate, 29)

  function changeDate(next: string) {
    setSelected('')
    setDate(next)
  }

  async function submit() {
    if (!selected) return
    try {
      await mutation.mutateAsync({ startsAt: selected, note })
      onDone()
    } catch {
      // Error is rendered below the form so the selected slot remains visible.
    }
  }

  return (
    <Panel>
      <SectionTitle detail="Giờ Việt Nam">{mode === 'book' ? 'Chọn giờ khảo sát' : 'Đổi giờ khảo sát'}</SectionTitle>
      <View style={styles.dayNav}>
        <IconButton label="Ngày trước" icon="chevron-back" disabled={date <= firstDate} onPress={() => changeDate(addDays(date, -1))} />
        <Text style={[styles.dayText, { color: theme.text }]}>{formatDay(date)}</Text>
        <IconButton label="Ngày sau" icon="chevron-forward" disabled={date >= lastDate} onPress={() => changeDate(addDays(date, 1))} />
      </View>
      <QueryState loading={slots.isPending} error={slots.error} onRetry={() => void slots.refetch()} />
      {!slots.isPending && !slots.error ? (
        slots.data?.slots.length ? (
          <View style={styles.slotGrid}>
            {slots.data.slots.filter((slot) => slot.canBook).map((slot) => {
              const active = selected === slot.startsAt
              return (
                <Pressable
                  key={slot.startsAt}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(slot.startsAt)}
                  style={({ pressed }) => [
                    styles.slot,
                    { borderColor: active ? theme.brand : theme.border, backgroundColor: active ? theme.brandSoft : pressed ? theme.surfacePressed : theme.surface },
                  ]}
                >
                  <Text style={[styles.slotText, { color: active ? theme.brandText : theme.text }]}>{formatTimeRange(slot.startsAt, slot.endsAt)}</Text>
                </Pressable>
              )
            })}
          </View>
        ) : (
          <StateView icon="calendar-clear-outline" title="Ngày này không còn giờ trống" description={slots.data?.note ?? 'Chọn ngày khác để tiếp tục.'} />
        )
      ) : null}
      <Field label="Ghi chú cho kỹ thuật viên" value={note} onChangeText={setNote} placeholder="Ví dụ: gọi trước khi đến" multiline maxLength={300} />
      {mutation.error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{mutation.error.message}</Text> : null}
      <View style={styles.actions}>
        {mode === 'reschedule' ? <Button label="Giữ lịch cũ" variant="quiet" onPress={onDone} compact /> : null}
        <Button label={mode === 'book' ? 'Xác nhận đặt giờ' : 'Xác nhận giờ mới'} onPress={() => void submit()} disabled={!selected} loading={mutation.isPending} />
      </View>
    </Panel>
  )
}

export function CustomerRequestDetailScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const query = useCustomerRequest(id ?? '')
  const cancel = useCancelBooking(id ?? '')
  const [rescheduling, setRescheduling] = useState(false)
  const detail = query.data
  const request = detail?.request
  const status = request ? customerStatus(request) : null

  function confirmCancel() {
    Alert.alert('Huỷ lịch khảo sát?', 'Giờ đang giữ sẽ được trả lại cho hệ thống.', [
      { text: 'Giữ lịch', style: 'cancel' },
      { text: 'Huỷ lịch', style: 'destructive', onPress: () => void cancel.mutateAsync().catch(() => undefined) },
    ])
  }

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={styles.back}><IconButton label="Quay lại" icon="arrow-back" onPress={() => router.back()} /></View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {request && status ? (
        <>
          <View style={styles.metaRow}>
            <Badge tone={status.tone}>{status.label}</Badge>
            <Text style={[styles.code, { color: theme.textMuted }]}>Mã {shortCode(request.surveyRequestId)}</Text>
          </View>
          <PageHeader title={request.propertyName || 'Công trình chưa đặt tên'} description={canBook(request) ? 'Chọn ngày giờ để kỹ thuật viên tới khảo sát.' : 'Thông tin lịch khảo sát hiện tại.'} />
          {canBook(request) ? (
            <BookingForm requestId={request.surveyRequestId} propertySiteId={request.propertySiteId} mode="book" onDone={() => setRescheduling(false)} />
          ) : request.appointment ? (
            rescheduling && request.appointment.canCustomerChange ? (
              <BookingForm requestId={request.surveyRequestId} propertySiteId={request.propertySiteId} mode="reschedule" onDone={() => setRescheduling(false)} />
            ) : (
              <Panel>
                <SectionTitle>Lịch khảo sát</SectionTitle>
                <Text style={[styles.appointment, { color: theme.text }]}>{formatAppointment(request.appointment.startsAt, request.appointment.endsAt)}</Text>
                <KeyValue label="Kỹ thuật viên" value={request.appointment.assignedTechnicianName ?? 'Đang chờ phân công'} />
                <KeyValue label="Ghi chú của bạn" value={request.appointment.customerNote || '—'} />
                {request.appointment.canCustomerChange ? (
                  <View style={styles.actions}>
                    <Button label="Đổi giờ" icon="calendar-outline" variant="secondary" onPress={() => setRescheduling(true)} />
                    <Button label="Huỷ lịch" icon="calendar-clear-outline" variant="danger" onPress={confirmCancel} loading={cancel.isPending} />
                  </View>
                ) : null}
                {cancel.error ? <Text style={[styles.error, { color: theme.danger }]}>{cancel.error.message}</Text> : null}
              </Panel>
            )
          ) : (
            <StateView title="Yêu cầu không còn đặt lịch được" description="Liên hệ bộ phận kinh doanh nếu bạn cần khảo sát lại." />
          )}
          {detail.history.length > (request.appointment ? 1 : 0) ? (
            <Panel>
              <SectionTitle>Các lần đặt giờ</SectionTitle>
              {detail.history.map((item) => (
                <View key={item.appointmentId} style={[styles.history, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.historyTime, { color: theme.text }]}>{formatAppointment(item.startsAt, item.endsAt)}</Text>
                  <Text style={[styles.historyStatus, { color: theme.textMuted }]}>{item.status === 'CANCELLED' ? 'Đã huỷ hoặc đổi giờ' : item.status}</Text>
                </View>
              ))}
            </Panel>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { marginLeft: -8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  code: { fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dayText: { flex: 1, textAlign: 'center', fontSize: 15, lineHeight: 21, fontWeight: '700', textTransform: 'capitalize' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { minHeight: 44, minWidth: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  slotText: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  appointment: { fontSize: 20, lineHeight: 28, fontWeight: '800' },
  actions: { gap: 10 },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  history: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 3 },
  historyTime: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  historyStatus: { fontSize: 13, lineHeight: 18 },
})
