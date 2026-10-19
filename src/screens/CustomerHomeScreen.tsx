import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useCustomerRequests } from '@/hooks/queries'
import { canBook } from '@/lib/status'
import { Button, Metric, PageHeader, Panel, QueryState, Screen, SectionTitle, StateView } from '@/components/ui'
import { CustomerRequestRow } from '@/components/CustomerRequestRow'
import { useAppTheme } from '@/theme/theme'

export function CustomerHomeScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const query = useCustomerRequests()
  const [now] = useState(() => Date.now())
  const requests = query.data ?? []
  const needBooking = requests.filter(canBook)
  const upcoming = requests
    .filter((item) => item.appointment && new Date(item.appointment.endsAt).getTime() >= now)
    .sort((a, b) => a.appointment!.startsAt.localeCompare(b.appointment!.startsAt))
  const completed = requests.filter((item) => item.status === 'COMPLETED').length
  const priority = [...needBooking, ...upcoming.filter((item) => !needBooking.includes(item))].slice(0, 3)

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader eyebrow="Khách hàng" title="Tổng quan" description="Lịch khảo sát và tiến độ các yêu cầu của bạn." />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {!query.isPending && !query.error ? (
        <>
          {needBooking.length > 0 ? (
            <View style={[styles.attention, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
              <View style={styles.attentionCopy}>
                <Text style={[styles.attentionTitle, { color: theme.danger }]}>{needBooking.length} yêu cầu cần đặt giờ</Text>
                <Text style={[styles.attentionBody, { color: theme.text }]}>Chọn thời gian để kỹ thuật viên tới khảo sát công trình.</Text>
              </View>
              <Button label="Chọn giờ" variant="secondary" compact onPress={() => router.push({ pathname: '/customer/request/[id]', params: { id: needBooking[0]!.surveyRequestId } })} />
            </View>
          ) : null}
          <Panel style={styles.metrics}>
            <Metric label="Tổng yêu cầu" value={String(requests.length)} />
            <View style={[styles.metricRule, { backgroundColor: theme.border }]} />
            <Metric label="Lịch sắp tới" value={String(upcoming.length)} />
            <View style={[styles.metricRule, { backgroundColor: theme.border }]} />
            <Metric label="Đã khảo sát" value={String(completed)} />
          </Panel>
          <View style={styles.section}>
            <SectionTitle detail={priority.length ? 'Ưu tiên theo việc cần làm' : undefined}>Việc tiếp theo</SectionTitle>
            {priority.length ? (
              <View style={[styles.list, { borderColor: theme.border }]}>
                {priority.map((request, index) => <CustomerRequestRow key={request.surveyRequestId} request={request} last={index === priority.length - 1} />)}
              </View>
            ) : (
              <StateView title="Chưa có yêu cầu khảo sát" description="Bắt đầu đánh giá sơ bộ để gửi thông tin công trình." action={<Button label="Bắt đầu đánh giá" onPress={() => router.push('./assessment')} compact />} />
            )}
          </View>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  attention: { borderWidth: 1, borderRadius: 6, padding: 16, gap: 14 },
  attentionCopy: { gap: 4 },
  attentionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  attentionBody: { fontSize: 14, lineHeight: 20 },
  metrics: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  metricRule: { width: StyleSheet.hairlineWidth },
  section: { gap: 12 },
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
})
