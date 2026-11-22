import { useState } from 'react'
import { View } from 'react-native'
import { useOpenJobs, useTechJobs } from '@/hooks/queries'
import { isUpcomingJob } from '@/lib/status'
import { PageHeader, QueryState, Screen, StateView, TabBar } from '@/components/ui'
import { TechJobRow } from '@/components/TechJobRow'
import { TechOpenJobRow } from '@/components/TechOpenJobRow'

type Tab = 'open' | 'upcoming' | 'past'

const TAB_LABELS: Record<Tab, string> = { open: 'Chờ nhận', upcoming: 'Đã nhận', past: 'Đã qua' }

/** Lịch chưa kết thúc hoặc đã quá giờ mà chưa khảo sát xong vẫn là việc phải làm */

export function TechJobsScreen() {
  const open = useOpenJobs()
  const mine = useTechJobs()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [now] = useState(() => Date.now())
  const openJobs = [...(open.data ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const all = mine.data ?? []
  const upcoming = all.filter((job) => isUpcomingJob(job, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = all.filter((job) => !isUpcomingJob(job, now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
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
      <PageHeader title="Khảo sát" alert={canTake ? `${canTake} lịch đang chờ người nhận` : undefined} />
      <TabBar
        tabs={(['open', 'upcoming', 'past'] as const).map((value) => ({
          value,
          label: `${TAB_LABELS[value]} ${counts[value]}`,
        }))}
        value={tab}
        onChange={setPicked}
      />
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
