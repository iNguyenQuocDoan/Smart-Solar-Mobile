import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useCustomerRequests } from '@/hooks/queries'
import { canBook } from '@/lib/status'
import type { CustomerRequest } from '@/lib/api/types'
import { Button, Metric, PageHeader, Panel, QueryState, Screen, StateView } from '@/components/ui'
import { CustomerRequestRow } from '@/components/CustomerRequestRow'
import { useAppTheme } from '@/theme/theme'

function rank(request: CustomerRequest, now: number) {
  if (canBook(request)) return 0
  if (request.appointment && new Date(request.appointment.endsAt).getTime() >= now) return 1
  return 2
}

export function CustomerRequestsScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const query = useCustomerRequests()
  const [now] = useState(() => Date.now())
  const items = [...(query.data ?? [])].sort((a, b) => {
    const priority = rank(a, now) - rank(b, now)
    return priority || b.submittedAt.localeCompare(a.submittedAt)
  })
  const toBook = items.filter(canBook).length
  const upcoming = items.filter((item) => item.appointment && new Date(item.appointment.endsAt).getTime() >= now).length
  const completed = items.filter((item) => item.status === 'COMPLETED').length
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader
        eyebrow="Khảo sát"
        title="Yêu cầu của bạn"
        description={
          toBook ? `${toBook} yêu cầu đang chờ bạn chọn giờ khảo sát.` : 'Theo dõi lịch hẹn và người được phân công.'
        }
        action={
          <Button
            label="Đánh giá mới"
            icon="add"
            variant="secondary"
            compact
            onPress={() => router.push('./assessment')}
          />
        }
      />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {!query.isPending && !query.error && items.length === 0 ? (
        <StateView
          title="Chưa có yêu cầu khảo sát"
          description="Bắt đầu đánh giá sơ bộ để gửi thông tin công trình."
          action={<Button label="Bắt đầu đánh giá" onPress={() => router.push('./assessment')} compact />}
        />
      ) : null}
      {items.length > 0 ? (
        <>
          <Panel style={styles.metrics}>
            <Metric label="Tổng yêu cầu" value={String(items.length)} />
            <View style={[styles.metricRule, { backgroundColor: theme.border }]} />
            <Metric label="Lịch sắp tới" value={String(upcoming)} />
            <View style={[styles.metricRule, { backgroundColor: theme.border }]} />
            <Metric label="Đã khảo sát" value={String(completed)} />
          </Panel>
          <View style={[styles.list, { borderColor: theme.border }]}>
            {items.map((request, index) => (
              <CustomerRequestRow key={request.surveyRequestId} request={request} last={index === items.length - 1} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  metricRule: { width: StyleSheet.hairlineWidth },
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
})
