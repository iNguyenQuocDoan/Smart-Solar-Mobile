import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { DispatchOutcome, DispatchRequestForm, DispatchStatusPanel } from '@/components/CustomerDispatch'
import {
  useBookingMutation,
  useCancelBooking,
  useCustomerDispatch,
  useCustomerRequest,
  useSurveySlots,
  useWithdrawRequest,
} from '@/hooks/queries'
import { ApiError } from '@/lib/api/client'
import {
  addDays,
  formatAppointment,
  formatDay,
  formatTimeRange,
  initialBookingDate,
  shortCode,
  todayVn,
} from '@/lib/format'
import {
  DISPATCHABLE_CODES,
  canBook,
  canWithdraw,
  coverageText,
  customerDispatchStatus,
  customerStatus,
  historyStatusLabel,
  isActiveDispatch,
  isClosedRequest,
} from '@/lib/status'
import {
  BackButton,
  Button,
  Field,
  IconButton,
  KeyValue,
  PageHeader,
  Panel,
  QueryState,
  Screen,
  SectionTitle,
  StateView,
  StatusText,
} from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

function BookingForm({
  requestId,
  propertySiteId,
  mode,
  onDone,
  onRequestDispatch,
}: {
  requestId: string
  propertySiteId: string
  mode: 'book' | 'reschedule'
  onDone: () => void
  /** Chỉ khi đặt mới: khu vực không có người nhận thì nhờ Smart Solar xếp kỹ thuật viên */
  onRequestDispatch?: () => void
}) {
  const theme = useAppTheme()
  const [date, setDate] = useState(initialBookingDate)
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const slots = useSurveySlots(propertySiteId, date, true)
  const openSlots = slots.data?.slots.filter((slot) => slot.canBook) ?? []
  const mutation = useBookingMutation(requestId, mode)
  const firstDate = todayVn()
  const lastDate = addDays(firstDate, 29)
  // Đặt giờ bị từ chối vì khu vực không có người nhận: mời khách nhờ xếp kỹ thuật viên
  const bookingUncovered = mutation.error instanceof ApiError && DISPATCHABLE_CODES.includes(mutation.error.code ?? '')
  const dispatchButton = onRequestDispatch ? (
    <Button
      label="Nhờ xếp kỹ thuật viên"
      icon="people-outline"
      variant="secondary"
      onPress={onRequestDispatch}
      compact
    />
  ) : null

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
      <SectionTitle>{mode === 'book' ? 'Chọn giờ khảo sát' : 'Đổi giờ khảo sát'}</SectionTitle>
      <View style={styles.dayNav}>
        <IconButton
          label="Ngày trước"
          icon="chevron-back"
          disabled={date <= firstDate}
          onPress={() => changeDate(addDays(date, -1))}
        />
        <Text style={[styles.dayText, { color: theme.text }]}>{formatDay(date)}</Text>
        <IconButton
          label="Ngày sau"
          icon="chevron-forward"
          disabled={date >= lastDate}
          onPress={() => changeDate(addDays(date, 1))}
        />
      </View>
      <QueryState loading={slots.isPending} error={slots.error} onRetry={() => void slots.refetch()} />
      {!slots.isPending && !slots.error ? (
        openSlots.length ? (
          <View style={styles.slotGrid}>
            {openSlots.map((slot) => {
              const active = selected === slot.startsAt
              return (
                <Pressable
                  key={slot.startsAt}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(slot.startsAt)}
                  style={({ pressed }) => [
                    styles.slot,
                    {
                      borderColor: active ? theme.brand : theme.border,
                      backgroundColor: active ? theme.brandSoft : pressed ? theme.surfacePressed : theme.surface,
                    },
                  ]}
                >
                  <Text style={[styles.slotText, { color: active ? theme.brandText : theme.text }]}>
                    {formatTimeRange(slot.startsAt, slot.endsAt)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : (
          <StateView
            title="Ngày này không còn giờ trống"
            description={coverageText(slots.data?.coverageStatus) ?? 'Chọn ngày khác để tiếp tục.'}
            action={slots.data?.dispatchAvailable ? dispatchButton : undefined}
          />
        )
      ) : null}
      <Field
        label="Ghi chú cho kỹ thuật viên"
        value={note}
        onChangeText={setNote}
        placeholder="Ví dụ: gọi trước khi đến"
        multiline
        maxLength={300}
      />
      {mutation.error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
          {mutation.error.message}
        </Text>
      ) : null}
      {bookingUncovered ? dispatchButton : null}
      <View style={styles.actions}>
        {mode === 'reschedule' ? <Button label="Giữ lịch cũ" variant="quiet" onPress={onDone} compact /> : null}
        <Button
          label={mode === 'book' ? 'Xác nhận đặt giờ' : 'Xác nhận giờ mới'}
          onPress={() => void submit()}
          disabled={!selected}
          loading={mutation.isPending}
        />
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
  const withdraw = useWithdrawRequest(id ?? '')
  const [rescheduling, setRescheduling] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const detail = query.data
  const request = detail?.request
  // Chưa có lịch thì xem khách có đang nhờ Smart Solar xếp kỹ thuật viên không
  const bookable = request ? canBook(request) : false
  const dispatch = useCustomerDispatch(id ?? '', bookable)
  const activeDispatch = bookable && dispatch.data && isActiveDispatch(dispatch.data.status) ? dispatch.data : null
  // Nhân viên phân công thẳng: yêu cầu điều phối sang ASSIGNED trước khi yêu cầu khảo sát kịp tải lại lịch mới
  const assignedNow = bookable && dispatch.data?.status === 'ASSIGNED'
  const { refetch } = query
  useEffect(() => {
    if (assignedNow) void refetch()
  }, [assignedNow, refetch])
  const status = request
    ? activeDispatch
      ? customerDispatchStatus(activeDispatch.status)
      : customerStatus(request)
    : null

  function confirmCancel() {
    Alert.alert('Huỷ lịch khảo sát?', 'Giờ đang giữ sẽ được trả lại cho hệ thống.', [
      { text: 'Giữ lịch', style: 'cancel' },
      { text: 'Huỷ lịch', style: 'destructive', onPress: () => void cancel.mutateAsync().catch(() => undefined) },
    ])
  }

  function confirmWithdraw() {
    Alert.alert(
      'Rút yêu cầu khảo sát?',
      'Yêu cầu sẽ đóng hẳn, báo giá chưa trả lời cũng huỷ theo. Muốn khảo sát lại, bạn gửi đánh giá mới.',
      [
        { text: 'Giữ yêu cầu', style: 'cancel' },
        {
          text: 'Rút yêu cầu',
          style: 'destructive',
          onPress: () => void withdraw.mutateAsync().catch(() => undefined),
        },
      ],
    )
  }

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <BackButton onPress={() => router.back()} />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {request && status ? (
        <>
          <View style={styles.heading}>
            <PageHeader title={request.propertyName || 'Công trình chưa đặt tên'} />
            <View style={styles.metaRow}>
              <StatusText tone={status.tone}>{status.label}</StatusText>
              <Text style={[styles.code, { color: theme.textMuted }]}>Mã {shortCode(request.surveyRequestId)}</Text>
            </View>
          </View>
          {isClosedRequest(request) ? (
            <StateView
              title="Yêu cầu này đã đóng"
              description="Yêu cầu đã đóng không mở lại được. Muốn khảo sát lại, gửi đánh giá mới cho công trình."
              action={<Button label="Gửi đánh giá mới" onPress={() => router.push('/customer/assessment')} compact />}
            />
          ) : canBook(request) ? (
            dispatch.isPending || (assignedNow && query.isFetching) ? (
              <QueryState loading error={null} onRetry={() => void dispatch.refetch()} />
            ) : activeDispatch ? (
              <DispatchStatusPanel requestId={request.surveyRequestId} dispatch={activeDispatch} />
            ) : dispatching ? (
              <DispatchRequestForm
                requestId={request.surveyRequestId}
                onCancel={() => setDispatching(false)}
                onDone={() => setDispatching(false)}
              />
            ) : (
              <>
                {dispatch.data ? <DispatchOutcome dispatch={dispatch.data} /> : null}
                <BookingForm
                  requestId={request.surveyRequestId}
                  propertySiteId={request.propertySiteId}
                  mode="book"
                  onDone={() => setRescheduling(false)}
                  onRequestDispatch={() => setDispatching(true)}
                />
              </>
            )
          ) : request.appointment ? (
            rescheduling && request.appointment.canCustomerChange ? (
              <BookingForm
                requestId={request.surveyRequestId}
                propertySiteId={request.propertySiteId}
                mode="reschedule"
                onDone={() => setRescheduling(false)}
              />
            ) : (
              <Panel>
                <SectionTitle>Lịch khảo sát</SectionTitle>
                <Text style={[styles.appointment, { color: theme.text }]}>
                  {formatAppointment(request.appointment.startsAt, request.appointment.endsAt)}
                </Text>
                <KeyValue
                  label="Kỹ thuật viên"
                  value={request.appointment.assignedTechnicianName ?? 'Chưa có kỹ thuật viên nhận'}
                />
                <KeyValue label="Ghi chú của bạn" value={request.appointment.customerNote || '—'} />
                {request.appointment.canCustomerChange ? (
                  <View style={styles.actionRow}>
                    <Button
                      label="Đổi giờ"
                      icon="calendar-outline"
                      variant="secondary"
                      compact
                      onPress={() => setRescheduling(true)}
                    />
                    <Button
                      label="Huỷ lịch"
                      icon="calendar-clear-outline"
                      variant="danger"
                      compact
                      onPress={confirmCancel}
                      loading={cancel.isPending}
                    />
                  </View>
                ) : null}
                {cancel.error ? (
                  <Text style={[styles.error, { color: theme.danger }]}>{cancel.error.message}</Text>
                ) : null}
              </Panel>
            )
          ) : (
            <StateView
              title="Yêu cầu không còn đặt lịch được"
              description="Liên hệ bộ phận kinh doanh nếu bạn cần khảo sát lại."
            />
          )}
          {canWithdraw(request) ? (
            <View style={styles.actions}>
              <Button
                label="Rút yêu cầu"
                icon="close-circle-outline"
                variant="danger"
                compact
                onPress={confirmWithdraw}
                loading={withdraw.isPending}
              />
              {withdraw.error ? (
                <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
                  {withdraw.error.message}
                </Text>
              ) : null}
            </View>
          ) : null}
          {detail.history.length > (request.appointment ? 1 : 0) ? (
            <Panel>
              <SectionTitle>Các lần đặt giờ</SectionTitle>
              {detail.history.map((item) => (
                <View key={item.appointmentId} style={[styles.history, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.historyTime, { color: theme.text }]}>
                    {formatAppointment(item.startsAt, item.endsAt)}
                  </Text>
                  <Text style={[styles.historyStatus, { color: theme.textMuted }]}>
                    {historyStatusLabel(item.status)}
                  </Text>
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
  heading: { gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  code: { fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slot: {
    minHeight: 40,
    minWidth: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  slotText: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  appointment: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  actions: { gap: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  history: { paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 1 },
  historyTime: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  historyStatus: { fontSize: 13, lineHeight: 18 },
})
