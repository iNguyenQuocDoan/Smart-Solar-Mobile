import { useRouter, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { useTechSchedule } from '@/hooks/queries'
import { addDays, formatDay, formatTimeRange, todayVn } from '@/lib/format'
import { appointmentStatus } from '@/lib/status'
import { Badge, IconButton, Metric, PageHeader, Panel, QueryState, Screen, StateView } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function TechScheduleScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const [date, setDate] = useState(todayVn())
  const query = useTechSchedule(date)
  const schedule = query.data
  // Lịch riêng của kỹ thuật viên không kèm chỗ giữ tạm, lọc thêm cho chắc
  const items = schedule?.appointments.filter((item) => !item.isCapacityHold) ?? []
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader title="Lịch làm việc" />
      <View style={styles.dayNav}>
        <IconButton label="Ngày trước" icon="chevron-back" onPress={() => setDate((value) => addDays(value, -1))} />
        <Text style={[styles.date, { color: theme.text }]}>{formatDay(date)}</Text>
        <IconButton label="Ngày sau" icon="chevron-forward" onPress={() => setDate((value) => addDays(value, 1))} />
      </View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {schedule ? (
        <>
          <Panel style={styles.metrics}>
            <Metric label="Lịch hẹn" value={String(schedule.appointmentCount)} />
            <View style={[styles.rule, { backgroundColor: theme.border }]} />
            <Metric label="Nghỉ giữa hai lịch" value={`${schedule.bufferBetweenAppointmentsMinutes} phút`} />
            <View style={[styles.rule, { backgroundColor: theme.border }]} />
            <Metric label="Sát giờ" value={String(schedule.conflictCount)} />
          </Panel>
          {schedule.conflictCount > 0 ? (
            <View style={[styles.warning, { backgroundColor: theme.warningSoft }]}>
              <Text style={[styles.warningText, { color: theme.warning }]}>
                {schedule.conflictCount} lịch bắt đầu khi chưa đủ {schedule.bufferBetweenAppointmentsMinutes} phút nghỉ
                sau lịch trước.
              </Text>
            </View>
          ) : null}
          {items.length === 0 ? (
            <StateView icon="calendar-clear-outline" title="Ngày này chưa có lịch" />
          ) : (
            <View style={[styles.list, { borderColor: theme.border }]}>
              {items.map((item, index) => {
                const status = appointmentStatus(item.status, 'technician')
                return (
                  <Pressable
                    key={item.appointmentId}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem lịch ${item.propertyName}`}
                    onPress={() =>
                      router.push({ pathname: '/tech/job/[id]', params: { id: item.appointmentId } } as Href)
                    }
                    style={({ pressed }) => [
                      styles.item,
                      {
                        backgroundColor: pressed ? theme.surfacePressed : theme.surface,
                        borderBottomColor: theme.border,
                      },
                      index === items.length - 1 && styles.last,
                    ]}
                  >
                    <Text style={[styles.time, { color: theme.text }]}>
                      {formatTimeRange(item.startsAt, item.endsAt)}
                    </Text>
                    <Text style={[styles.name, { color: theme.text }]}>{item.propertyName}</Text>
                    <View style={styles.badges}>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {item.potentialConflict ? <Badge tone="warning">Sát giờ lịch trước</Badge> : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 22, fontWeight: '700', textTransform: 'capitalize' },
  metrics: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  rule: { width: StyleSheet.hairlineWidth },
  warning: { borderRadius: 6, padding: 14 },
  warningText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  item: { padding: 16, gap: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  last: { borderBottomWidth: 0 },
  time: { fontSize: 17, lineHeight: 23, fontWeight: '800', fontVariant: ['tabular-nums'] },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
})
