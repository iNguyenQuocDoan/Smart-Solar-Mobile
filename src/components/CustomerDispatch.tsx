import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Field, IconButton, KeyValue, Panel, SectionTitle } from '@/components/ui'
import { useAnswerProposal, useCancelDispatch, useCreateDispatch } from '@/hooks/queries'
import type { CustomerDispatch, PreferredWindow } from '@/lib/api/types'
import {
  addDays,
  dateOf,
  formatAppointment,
  formatDay,
  formatMoment,
  formatTimeRange,
  initialBookingDate,
  todayVn,
} from '@/lib/format'
import { DISPATCH_SESSIONS, previousProposalText, type DispatchSession } from '@/lib/status'
import { useAppTheme } from '@/theme/theme'

// Khu vực của công trình chưa có kỹ thuật viên nhận lịch: khách chọn vài khung giờ tiện,
// Smart Solar xếp người rồi phân công thẳng hoặc gửi đề xuất giờ để khách đồng ý

const MAX_WINDOWS = 5

type WindowDraft = { key: number; date: string; session: DispatchSession }

let lastKey = 0

function toWindow(w: WindowDraft): PreferredWindow {
  const session = DISPATCH_SESSIONS.find((s) => s.value === w.session) ?? DISPATCH_SESSIONS[0]
  return { startsAt: `${w.date}T${session.from}:00+07:00`, endsAt: `${w.date}T${session.to}:00+07:00` }
}

/** Lỗi của từng dòng: trùng nhau hoặc buổi đã bắt đầu */
function problemsOf(windows: WindowDraft[]) {
  const seen = new Set<string>()
  const now = Date.now()
  return windows.map((w) => {
    const id = `${w.date}|${w.session}`
    const duplicate = seen.has(id)
    seen.add(id)
    if (duplicate) return 'Khung giờ này đã chọn ở trên.'
    if (new Date(toWindow(w).startsAt).getTime() <= now) return 'Buổi này đã bắt đầu, chọn buổi hoặc ngày sau.'
    return null
  })
}

export function DispatchRequestForm({
  requestId,
  onCancel,
  onDone,
}: {
  requestId: string
  onCancel: () => void
  onDone: () => void
}) {
  const theme = useAppTheme()
  const firstDate = todayVn()
  const lastDate = addDays(firstDate, 29)
  const [windows, setWindows] = useState<WindowDraft[]>(() => [
    { key: ++lastKey, date: initialBookingDate(), session: 'morning' },
  ])
  const [note, setNote] = useState('')
  const create = useCreateDispatch(requestId)
  const problems = problemsOf(windows)

  const update = (key: number, change: Partial<WindowDraft>) =>
    setWindows((all) => all.map((w) => (w.key === key ? { ...w, ...change } : w)))

  async function submit() {
    if (problems.some(Boolean)) return
    try {
      await create.mutateAsync({ windows: windows.map(toWindow), note })
      onDone()
    } catch {
      // Lỗi hiện ngay dưới form để khách sửa khung giờ
    }
  }

  return (
    <Panel>
      <SectionTitle>Nhờ Smart Solar xếp kỹ thuật viên</SectionTitle>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Chọn tối đa {MAX_WINDOWS} khung giờ bạn tiện, nhân viên sẽ xếp người và báo lại.
      </Text>
      {windows.map((w, index) => (
        <View key={w.key} style={[styles.window, { borderColor: theme.border }]}>
          <View style={styles.dayNav}>
            <IconButton
              label="Ngày trước"
              icon="chevron-back"
              disabled={w.date <= firstDate}
              onPress={() => update(w.key, { date: addDays(w.date, -1) })}
            />
            <Text style={[styles.dayText, { color: theme.text }]}>{formatDay(w.date)}</Text>
            <IconButton
              label="Ngày sau"
              icon="chevron-forward"
              disabled={w.date >= lastDate}
              onPress={() => update(w.key, { date: addDays(w.date, 1) })}
            />
          </View>
          <View style={styles.sessions}>
            {DISPATCH_SESSIONS.map((s) => {
              const active = w.session === s.value
              return (
                <Pressable
                  key={s.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${s.label}, ${s.from} đến ${s.to}`}
                  onPress={() => update(w.key, { session: s.value })}
                  style={({ pressed }) => [
                    styles.session,
                    {
                      borderColor: active ? theme.brand : theme.border,
                      backgroundColor: active ? theme.brandSoft : pressed ? theme.surfacePressed : theme.surface,
                    },
                  ]}
                >
                  <Text style={[styles.sessionLabel, { color: active ? theme.brandText : theme.text }]}>{s.label}</Text>
                  <Text style={[styles.sessionTime, { color: active ? theme.brandText : theme.textMuted }]}>
                    {s.from}–{s.to}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {problems[index] ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
              {problems[index]}
            </Text>
          ) : null}
          {windows.length > 1 ? (
            <Button
              label="Bỏ khung giờ này"
              icon="trash-outline"
              variant="quiet"
              compact
              onPress={() => setWindows((all) => all.filter((x) => x.key !== w.key))}
            />
          ) : null}
        </View>
      ))}
      {windows.length < MAX_WINDOWS ? (
        <Button
          label="Thêm khung giờ"
          icon="add"
          variant="secondary"
          compact
          onPress={() =>
            setWindows((all) => {
              // Ngày sau khung cuối, không quá ngày cuối được đặt
              const next = addDays(all[all.length - 1]?.date ?? firstDate, 1)
              return [...all, { key: ++lastKey, date: next > lastDate ? lastDate : next, session: 'morning' }]
            })
          }
        />
      ) : null}
      <Field
        label="Ghi chú"
        value={note}
        onChangeText={setNote}
        placeholder="Ví dụ: giờ ra vào nhà xưởng, người liên hệ"
        multiline
        maxLength={1000}
      />
      {create.error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
          {create.error.message}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label="Thôi" variant="quiet" onPress={onCancel} compact />
        <Button
          label="Gửi yêu cầu"
          icon="send"
          onPress={() => void submit()}
          disabled={problems.some(Boolean)}
          loading={create.isPending}
        />
      </View>
    </Panel>
  )
}

/** Khách đã nhờ xếp kỹ thuật viên: chờ nhân viên, hoặc trả lời đề xuất giờ */
export function DispatchStatusPanel({ requestId, dispatch: d }: { requestId: string; dispatch: CustomerDispatch }) {
  const theme = useAppTheme()
  const answer = useAnswerProposal(requestId)
  const cancel = useCancelDispatch(requestId)
  const live = d.liveProposal
  const previous = !live && d.latestProposal ? previousProposalText(d.latestProposal.status) : null
  // Lỗi trả lời chỉ hiện dưới đúng đề xuất vừa bấm, đề xuất mới gửi tới không mang lỗi cũ
  const answerError = live && answer.variables?.proposal.proposalId === live.proposalId ? answer.error : null
  const error = answerError ?? cancel.error

  function confirmDecline() {
    if (!live) return
    Alert.alert('Không hợp giờ đề xuất?', 'Smart Solar sẽ gửi giờ khác cho bạn.', [
      { text: 'Quay lại', style: 'cancel' },
      {
        text: 'Xin giờ khác',
        style: 'destructive',
        onPress: () => void answer.mutateAsync({ proposal: live, accept: false }).catch(() => undefined),
      },
    ])
  }

  function confirmCancel() {
    Alert.alert('Huỷ yêu cầu xếp kỹ thuật viên?', 'Yêu cầu khảo sát vẫn giữ, bạn đặt giờ hoặc nhờ xếp lại được.', [
      { text: 'Quay lại', style: 'cancel' },
      { text: 'Huỷ yêu cầu', style: 'destructive', onPress: () => void cancel.mutateAsync().catch(() => undefined) },
    ])
  }

  return (
    <Panel>
      <SectionTitle>{live ? 'Smart Solar đề xuất giờ khảo sát' : 'Đang xếp kỹ thuật viên'}</SectionTitle>
      {live ? (
        <>
          <Text style={[styles.proposalDay, { color: theme.text }]}>{formatDay(dateOf(live.startsAt))}</Text>
          <Text style={[styles.proposalTime, { color: theme.text }]}>
            {formatTimeRange(live.startsAt, live.endsAt)}
          </Text>
          <KeyValue label="Kỹ thuật viên" value={live.technicianName} />
          <KeyValue label="Trả lời trước" value={formatMoment(live.expiresAt)} />
          <View style={styles.actions}>
            <Button
              label="Đồng ý giờ này"
              icon="checkmark-circle-outline"
              onPress={() => void answer.mutateAsync({ proposal: live, accept: true }).catch(() => undefined)}
              loading={answer.isPending}
            />
            <Button
              label="Không hợp, xin giờ khác"
              icon="time-outline"
              variant="secondary"
              onPress={confirmDecline}
              disabled={answer.isPending}
            />
          </View>
        </>
      ) : (
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Smart Solar sẽ phản hồi trước {formatMoment(d.reviewDueAt)}.
        </Text>
      )}
      {previous ? <Text style={[styles.body, { color: theme.text }]}>{previous}</Text> : null}
      <KeyValue
        label="Khung giờ bạn tiện"
        value={
          d.preferredWindows.length
            ? d.preferredWindows.map((w) => formatAppointment(w.startsAt, w.endsAt)).join('\n')
            : 'Không chọn'
        }
      />
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
          {error.message}
        </Text>
      ) : null}
      <Button
        label="Huỷ yêu cầu xếp lịch"
        icon="close-circle-outline"
        variant="danger"
        compact
        onPress={confirmCancel}
        loading={cancel.isPending}
      />
    </Panel>
  )
}

/** Yêu cầu xếp kỹ thuật viên trước đó kết thúc mà không có lịch: nói rõ trước khi khách đặt lại */
export function DispatchOutcome({ dispatch: d }: { dispatch: CustomerDispatch }) {
  const theme = useAppTheme()
  let text: string | null = null
  if (d.resolution === 'UNSERVICEABLE')
    text = `Smart Solar chưa phục vụ được công trình này${d.resolutionReason ? `: ${d.resolutionReason}` : '.'}`
  if (d.resolution === 'CLOSED_BY_STAFF')
    text = `Smart Solar đã đóng yêu cầu xếp kỹ thuật viên${d.resolutionReason ? `: ${d.resolutionReason}` : '.'}`
  if (!text) return null
  return <Text style={[styles.body, { color: theme.text }]}>{text}</Text>
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20 },
  window: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 6 },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sessions: { flexDirection: 'row', gap: 6 },
  session: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  sessionLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  sessionTime: { fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
  proposalDay: { fontSize: 15, lineHeight: 21, fontWeight: '700', textTransform: 'capitalize' },
  proposalTime: { fontSize: 18, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  actions: { gap: 8 },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
})
