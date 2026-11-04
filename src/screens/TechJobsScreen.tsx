import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useOpenJobs, useTechJobs } from '@/hooks/queries'
import type { TechnicianAppointment } from '@/lib/api/types'
import { PageHeader, QueryState, SCREEN_PADDING, Screen, StateView } from '@/components/ui'
import { TechJobRow } from '@/components/TechJobRow'
import { TechOpenJobRow } from '@/components/TechOpenJobRow'
import { useAppTheme } from '@/theme/theme'

type Tab = 'open' | 'upcoming' | 'past'

const TAB_LABELS: Record<Tab, string> = { open: 'Chờ nhận', upcoming: 'Đã nhận', past: 'Đã qua' }

/** Lịch chưa kết thúc hoặc đã quá giờ mà chưa khảo sát xong vẫn là việc phải làm */
const isActive = (job: TechnicianAppointment, now: number) => job.isOverdue || new Date(job.endsAt).getTime() >= now

export function TechJobsScreen() {
  const theme = useAppTheme()
  const open = useOpenJobs()
  const mine = useTechJobs()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [now] = useState(() => Date.now())
  const openJobs = [...(open.data ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const all = mine.data ?? []
  const upcoming = all.filter((job) => isActive(job, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = all.filter((job) => !isActive(job, now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
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
      <PageHeader title="Việc của tôi" alert={canTake ? `${canTake} lịch đang chờ người nhận` : undefined} />
      <View accessibilityRole="tablist" style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {(['open', 'upcoming', 'past'] as const).map((value) => {
          const active = tab === value
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setPicked(value)}
              style={[styles.tab, active && { borderBottomColor: theme.brand }]}
            >
              <Text style={[styles.tabText, { color: active ? theme.text : theme.textMuted }]}>
                {TAB_LABELS[value]} {counts[value]}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {query.isPending || query.error ? null : tab === 'open' ? (
        openJobs.length === 0 ? (
          <StateView title="Không có lịch nào đang chờ" />
        ) : (
          <View>
            {openJobs.map((job, index) => (
              <TechOpenJobRow key={job.appointmentId} job={job} last={index === openJobs.length - 1} />
            ))}
          </View>
        )
      ) : shown.length === 0 ? (
        <StateView title={tab === 'upcoming' ? 'Chưa có lịch nào cần làm' : 'Chưa có lịch đã qua'} />
      ) : (
        <View>
          {shown.map((job, index) => (
            <TechJobRow key={job.appointmentId} job={job} last={index === shown.length - 1} />
          ))}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 16,
    marginHorizontal: -SCREEN_PADDING,
    paddingHorizontal: SCREEN_PADDING,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { minHeight: 40, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
})
