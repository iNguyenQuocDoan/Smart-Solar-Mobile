import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useOpenJobs, useTechInstallations, useTechJobs } from '@/hooks/queries'
import { formatAppointment } from '@/lib/format'
import { techTodos } from '@/lib/techTodo'
import { BackButton, ListRow, PageHeader, QueryState, Screen, StateView } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

// Mở từ chuông: việc đang chờ kỹ thuật viên, bấm một dòng là vào đúng việc đó
export function TechTodoScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const open = useOpenJobs()
  const mine = useTechJobs()
  const installations = useTechInstallations()
  const items = techTodos(open.data ?? [], mine.data ?? [], installations.data ?? [])
  const loading = open.isPending || mine.isPending || installations.isPending
  const error = open.error ?? mine.error ?? installations.error
  const refresh = () => void Promise.all([open.refetch(), mine.refetch(), installations.refetch()])

  return (
    <Screen refreshing={open.isRefetching || mine.isRefetching || installations.isRefetching} onRefresh={refresh}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/tech'))} />
      <PageHeader title="Việc cần làm" alert={items.length ? `${items.length} việc đang chờ bạn` : undefined} />
      <QueryState loading={loading} error={error} onRetry={refresh} />
      {!loading && !error && items.length === 0 ? <StateView title="Không có việc nào đang chờ" /> : null}
      <View>
        {items.map((item, i) => (
          <ListRow
            key={item.key}
            last={i === items.length - 1}
            onPress={() => router.push(item.href as Href)}
            accessibilityLabel={`${item.title}, ${item.place}`}
          >
            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {item.place}, {formatAppointment(item.startsAt, item.endsAt)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
          </ListRow>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
})
