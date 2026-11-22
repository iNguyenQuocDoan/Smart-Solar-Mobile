import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ListRow, PageHeader, QueryState, Screen, StateView, StatusText, TabBar } from '@/components/ui'
import { useTechInstallations } from '@/hooks/queries'
import type { InstallationProject } from '@/lib/api/types'
import { dateOf, formatShortDate } from '@/lib/format'
import { installationGroup, installationStatus, needsAction, type InstallationGroup } from '@/lib/techInstallation'
import { useAppTheme } from '@/theme/theme'

const TABS: { value: InstallationGroup; label: string }[] = [
  { value: 'pending', label: 'Chờ trả lời' },
  { value: 'active', label: 'Đang làm' },
  { value: 'done', label: 'Đã xong' },
]

export function TechInstallationsScreen() {
  const query = useTechInstallations()
  const [picked, setPicked] = useState<InstallationGroup | null>(null)
  const all = [...(query.data ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const groups: Record<InstallationGroup, InstallationProject[]> = { pending: [], active: [], done: [] }
  for (const project of all) groups[installationGroup(project)].push(project)
  groups.done.reverse()
  // Mở sẵn mục có việc chờ trả lời
  const tab = picked ?? (groups.pending.length > 0 ? 'pending' : 'active')
  const todo = all.filter(needsAction).length
  const shown = groups[tab]

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader title="Lắp đặt" alert={todo ? `${todo} công trình cần bạn xử lý` : undefined} />
      <TabBar
        tabs={TABS.map((t) => ({ value: t.value, label: `${t.label} ${groups[t.value].length}` }))}
        value={tab}
        onChange={setPicked}
      />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {query.isSuccess && shown.length === 0 ? (
        <StateView
          title={
            tab === 'pending'
              ? 'Không có việc lắp đặt nào chờ bạn trả lời'
              : tab === 'active'
                ? 'Chưa có công trình nào đang làm'
                : 'Chưa có công trình đã xong'
          }
        />
      ) : null}
      <View>
        {shown.map((project, i) => (
          <InstallationRow key={project.projectId} project={project} last={i === shown.length - 1} />
        ))}
      </View>
    </Screen>
  )
}

function InstallationRow({ project, last }: { project: InstallationProject; last: boolean }) {
  const theme = useAppTheme()
  const router = useRouter()
  const status = installationStatus(project)
  const name = project.site?.propertyName ?? 'Công trình lắp đặt'
  const start = formatShortDate(dateOf(project.startsAt))
  const end = formatShortDate(dateOf(project.endsAt))
  return (
    <ListRow
      accessibilityLabel={`Xem công trình ${name}`}
      onPress={() => router.push({ pathname: '/tech/installation/[id]', params: { id: project.projectId } } as Href)}
      last={last}
    >
      <View style={styles.dates}>
        <Text style={[styles.date, { color: theme.text }]}>{start}</Text>
        {end !== start ? <Text style={[styles.until, { color: theme.textMuted }]}>đến {end}</Text> : null}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.address, { color: theme.textMuted }]} numberOfLines={1}>
          {[project.site?.ward ?? project.site?.district, project.zoneName].filter(Boolean).join(', ')}
        </Text>
        <StatusText tone={status.tone}>{status.label}</StatusText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
    </ListRow>
  )
}

const styles = StyleSheet.create({
  dates: { flexShrink: 0, alignSelf: 'flex-start', gap: 1, minWidth: 48 },
  date: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  until: { fontSize: 12, lineHeight: 16 },
  copy: { flex: 1, gap: 1 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  address: { fontSize: 13, lineHeight: 18 },
})
