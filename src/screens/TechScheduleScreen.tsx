import { useRouter, type Href } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { useTechSchedule } from '@/hooks/queries'
import { addDays, formatDay, formatTimeRange, todayVn } from '@/lib/format'
import { appointmentStatus } from '@/lib/status'
import { IconButton, ListRow, PageHeader, QueryState, Screen, StateView, StatusText } from '@/components/ui'
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
          <Text style={[styles.summary, { color: theme.textMuted }]}>
            {schedule.appointmentCount} lịch, nghỉ {schedule.bufferBetweenAppointmentsMinutes} phút giữa hai lịch
          </Text>
          {schedule.conflictCount > 0 ? (
            <StatusText tone="warning">
              {schedule.conflictCount} lịch bắt đầu khi chưa đủ {schedule.bufferBetweenAppointmentsMinutes} phút nghỉ
              sau lịch trước
            </StatusText>
          ) : null}
          {items.length === 0 ? (
            <StateView title="Ngày này chưa có lịch" />
          ) : (
            <View>
              {items.map((item, index) => {
                const status = appointmentStatus(item.status, 'technician')
                return (
                  <ListRow
                    key={item.appointmentId}
                    accessibilityLabel={`Xem lịch ${item.propertyName}`}
                    onPress={() =>
                      router.push({ pathname: '/tech/job/[id]', params: { id: item.appointmentId } } as Href)
                    }
                    last={index === items.length - 1}
                    style={styles.row}
                  >
                    <Text style={[styles.time, { color: theme.text }]}>
                      {formatTimeRange(item.startsAt, item.endsAt)}
                    </Text>
                    <View style={styles.copy}>
                      <Text style={[styles.name, { color: theme.text }]}>{item.propertyName}</Text>
                      <StatusText tone={status.tone}>{status.label}</StatusText>
                      {item.potentialConflict ? <StatusText tone="warning">Sát giờ lịch trước</StatusText> : null}
                    </View>
                  </ListRow>
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
  date: { flex: 1, textAlign: 'center', fontSize: 15, lineHeight: 21, fontWeight: '700', textTransform: 'capitalize' },
  summary: { fontSize: 13, lineHeight: 18 },
  row: { alignItems: 'flex-start' },
  time: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  copy: { flex: 1, gap: 1 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
})
