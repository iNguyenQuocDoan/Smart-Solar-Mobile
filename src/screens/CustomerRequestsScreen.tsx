import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useCustomerRequests } from '@/hooks/queries'
import { canBook } from '@/lib/status'
import type { CustomerRequest } from '@/lib/api/types'
import { Button, PageHeader, QueryState, Screen, StateView } from '@/components/ui'
import { CustomerRequestRow } from '@/components/CustomerRequestRow'
import { useAppTheme } from '@/theme/theme'

function rank(request: CustomerRequest) {
  if (canBook(request)) return 0
  if (request.appointment && new Date(request.appointment.endsAt).getTime() >= Date.now()) return 1
  return 2
}

export function CustomerRequestsScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const query = useCustomerRequests()
  const items = [...(query.data ?? [])].sort((a, b) => {
    const priority = rank(a) - rank(b)
    return priority || b.submittedAt.localeCompare(a.submittedAt)
  })
  const toBook = items.filter(canBook).length
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader eyebrow="Khảo sát" title="Yêu cầu của bạn" description={toBook ? `${toBook} yêu cầu đang chờ bạn chọn giờ khảo sát.` : 'Theo dõi lịch hẹn và người được phân công.'} action={<Button label="Đánh giá mới" icon="add" variant="secondary" compact onPress={() => router.push('./assessment')} />} />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {!query.isPending && !query.error && items.length === 0 ? (
        <StateView title="Chưa có yêu cầu khảo sát" description="Yêu cầu đã gửi từ cổng khách hàng sẽ xuất hiện tại đây." />
      ) : (
        <View style={[styles.list, { borderColor: theme.border }]}>
          {items.map((request, index) => <CustomerRequestRow key={request.surveyRequestId} request={request} last={index === items.length - 1} />)}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({ list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' } })
