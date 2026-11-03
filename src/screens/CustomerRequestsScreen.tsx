import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useCustomerDispatches, useCustomerRequests } from '@/hooks/queries'
import { customerRequestTodo, isActiveDispatch } from '@/lib/status'
import type { CustomerDispatch, CustomerRequest } from '@/lib/api/types'
import { Button, Metric, PageHeader, Panel, QueryState, Screen, StateView } from '@/components/ui'
import { CustomerRequestRow } from '@/components/CustomerRequestRow'
import { useAppTheme } from '@/theme/theme'

type Item = { request: CustomerRequest; dispatch: CustomerDispatch | undefined }

// Việc của khách (đặt giờ, trả lời giờ đề xuất) lên đầu, rồi lịch sắp tới hoặc đang chờ xếp kỹ thuật viên
function rank({ request, dispatch }: Item, now: number) {
  if (customerRequestTodo(request, dispatch)) return 0
  if (isActiveDispatch(dispatch?.status)) return 1
  if (request.appointment && new Date(request.appointment.endsAt).getTime() >= now) return 1
  return 2
}

export function CustomerRequestsScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const query = useCustomerRequests()
  const { dispatches, pending } = useCustomerDispatches(query.data)
  const [now] = useState(() => Date.now())
  const items: Item[] = (pending ? [] : (query.data ?? []))
    .map((request) => ({ request, dispatch: dispatches.get(request.surveyRequestId) }))
    .sort((a, b) => {
      const priority = rank(a, now) - rank(b, now)
      return priority || b.request.submittedAt.localeCompare(a.request.submittedAt)
    })
  const toConfirm = items.filter(({ dispatch }) => dispatch?.status === 'PROPOSAL_PENDING').length
  const toBook = items.filter(({ request, dispatch }) => customerRequestTodo(request, dispatch)).length - toConfirm
  const upcoming = items.filter(
    ({ request }) => request.appointment && new Date(request.appointment.endsAt).getTime() >= now,
  ).length
  const completed = items.filter(({ request }) => request.status === 'COMPLETED').length
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader
        title="Yêu cầu khảo sát"
        description={
          toConfirm
            ? `${toConfirm} đề xuất giờ khảo sát chờ bạn xác nhận.`
            : toBook
              ? `${toBook} yêu cầu đang chờ bạn chọn giờ khảo sát.`
              : undefined
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
      <QueryState loading={query.isPending || pending} error={query.error} onRetry={() => void query.refetch()} />
      {!query.isPending && !pending && !query.error && items.length === 0 ? (
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
            {items.map(({ request, dispatch }, index) => (
              <CustomerRequestRow
                key={request.surveyRequestId}
                request={request}
                dispatch={dispatch}
                last={index === items.length - 1}
              />
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
