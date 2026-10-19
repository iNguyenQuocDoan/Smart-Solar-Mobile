import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTechJobs } from '@/hooks/queries'
import { PageHeader, QueryState, Screen, StateView } from '@/components/ui'
import { TechJobRow } from '@/components/TechJobRow'
import { useAppTheme } from '@/theme/theme'

export function TechJobsScreen() {
  const theme = useAppTheme()
  const query = useTechJobs()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [now] = useState(() => Date.now())
  const all = query.data ?? []
  const upcoming = all.filter((job) => new Date(job.endsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = all.filter((job) => new Date(job.endsAt).getTime() < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const shown = tab === 'upcoming' ? upcoming : past
  const waiting = upcoming.filter((job) => job.status === 'ASSIGNED').length

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader eyebrow="Kỹ thuật viên" title="Việc của tôi" description={waiting ? `${waiting} lịch đang chờ bạn xác nhận nhận việc.` : 'Các lịch khảo sát được phân công cho bạn.'} />
      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: theme.surfaceMuted }]}>
        {(['upcoming', 'past'] as const).map((value) => {
          const active = tab === value
          const count = value === 'upcoming' ? upcoming.length : past.length
          return (
            <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setTab(value)} style={[styles.tab, active && { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.tabText, { color: active ? theme.text : theme.textMuted }]}>{value === 'upcoming' ? 'Sắp tới' : 'Đã qua'} · {count}</Text>
            </Pressable>
          )
        })}
      </View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {!query.isPending && !query.error && shown.length === 0 ? (
        <StateView icon="calendar-clear-outline" title={tab === 'upcoming' ? 'Chưa có lịch sắp tới' : 'Chưa có lịch đã qua'} description={tab === 'upcoming' ? 'Lịch được kinh doanh phân công sẽ xuất hiện tại đây.' : undefined} />
      ) : (
        <View style={[styles.list, { borderColor: theme.border }]}>
          {shown.map((job, index) => <TechJobRow key={job.appointmentId} job={job} last={index === shown.length - 1} />)}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 3, borderRadius: 6, gap: 3 },
  tab: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: 'transparent', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
})
