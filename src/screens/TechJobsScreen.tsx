import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useOpenJobs, useTechJobs } from '@/hooks/queries'
import { PageHeader, QueryState, Screen, StateView } from '@/components/ui'
import { TechJobRow } from '@/components/TechJobRow'
import { TechOpenJobRow } from '@/components/TechOpenJobRow'
import { useAppTheme } from '@/theme/theme'

type Tab = 'open' | 'upcoming' | 'past'

const TAB_LABELS: Record<Tab, string> = { open: 'Chờ nhận', upcoming: 'Sắp tới', past: 'Đã qua' }

export function TechJobsScreen() {
  const theme = useAppTheme()
  const open = useOpenJobs()
  const mine = useTechJobs()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [now] = useState(() => Date.now())
  const openJobs = [...(open.data ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const all = mine.data ?? []
  const upcoming = all
    .filter((job) => new Date(job.endsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = all
    .filter((job) => new Date(job.endsAt).getTime() < now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const canTake = openJobs.filter((job) => job.canAccept).length
  // Mở sẵn mục "Chờ nhận" khi có lịch nhận được
  const tab: Tab = picked ?? (canTake > 0 ? 'open' : 'upcoming')
  const counts: Record<Tab, number> = { open: openJobs.length, upcoming: upcoming.length, past: past.length }
  const query = tab === 'open' ? open : mine
  const shown = tab === 'upcoming' ? upcoming : past

  return (
    <Screen
      refreshing={open.isRefetching || mine.isRefetching}
      onRefresh={() => void Promise.all([open.refetch(), mine.refetch()])}
    >
      <PageHeader
        eyebrow="Kỹ thuật viên"
        title="Việc của tôi"
        description={
          canTake
            ? `${canTake} lịch trong khu vực đang chờ người nhận.`
            : 'Các lịch khảo sát bạn đã nhận hoặc được phân công.'
        }
      />
      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: theme.surfaceMuted }]}>
        {(['open', 'upcoming', 'past'] as const).map((value) => {
          const active = tab === value
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setPicked(value)}
              style={[styles.tab, active && { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.tabText, { color: active ? theme.text : theme.textMuted }]}>
                {TAB_LABELS[value]} · {counts[value]}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {query.isPending || query.error ? null : tab === 'open' ? (
        openJobs.length === 0 ? (
          <StateView
            icon="calendar-clear-outline"
            title="Không có lịch nào đang chờ"
            description="Khi khách trong khu vực của bạn đặt giờ khảo sát, lịch sẽ hiện ở đây để bạn nhận."
          />
        ) : (
          <View style={[styles.list, { borderColor: theme.border }]}>
            {openJobs.map((job, index) => (
              <TechOpenJobRow key={job.appointmentId} job={job} last={index === openJobs.length - 1} />
            ))}
          </View>
        )
      ) : shown.length === 0 ? (
        <StateView
          icon="calendar-clear-outline"
          title={tab === 'upcoming' ? 'Chưa có lịch sắp tới' : 'Chưa có lịch đã qua'}
          description={tab === 'upcoming' ? 'Nhận lịch ở mục "Chờ nhận" thì lịch hiện ở đây.' : undefined}
        />
      ) : (
        <View style={[styles.list, { borderColor: theme.border }]}>
          {shown.map((job, index) => (
            <TechJobRow key={job.appointmentId} job={job} last={index === shown.length - 1} />
          ))}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 3, borderRadius: 6, gap: 3 },
  tab: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
})
