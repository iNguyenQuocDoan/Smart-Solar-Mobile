import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs, usePathname } from 'expo-router'
import { useMemo, type ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCustomerDispatches, useCustomerRequests } from '@/hooks/queries'
import { useTabAlert } from '@/hooks/tabAlert'
import type { CustomerDispatch, CustomerRequest } from '@/lib/api/types'
import { customerRequestTodo } from '@/lib/status'
import { useAppTheme } from '@/theme/theme'

type Icon = ComponentProps<typeof Ionicons>['name']
function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />
  }
}

// Số đỏ trên tab Yêu cầu: yêu cầu chưa đặt giờ hoặc có giờ đề xuất chờ trả lời, cộng yêu cầu vừa đổi
// (kỹ thuật viên nhận lịch, lịch bị huỷ) mà chưa xem
type RequestItem = { request: CustomerRequest; dispatch: CustomerDispatch | undefined }
const requestAlert = {
  key: ({ request: r }: RequestItem) => r.surveyRequestId,
  // Phần điều phối chỉ thêm khi có, để dấu "đã xem" của yêu cầu không nhờ xếp kỹ thuật viên vẫn giữ nguyên
  sig: ({ request: r, dispatch: d }: RequestItem) => {
    const base = [r.status, r.appointment?.appointmentId, r.appointment?.status, r.appointment?.acceptanceStatus]
    return (d ? [...base, d.status, d.liveProposal?.proposalId] : base).join('|')
  },
  todo: ({ request, dispatch }: RequestItem) => customerRequestTodo(request, dispatch),
}

export default function CustomerTabs() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const requests = useCustomerRequests()
  const { dispatches, pending } = useCustomerDispatches(requests.data)
  const items = useMemo(
    () =>
      requests.data && !pending
        ? requests.data.map((request) => ({ request, dispatch: dispatches.get(request.surveyRequestId) }))
        : undefined,
    [requests.data, dispatches, pending],
  )
  const viewingRequests = pathname === '/customer/requests' || pathname.startsWith('/customer/request/')
  const alert = useTabAlert('customer-requests', items, viewingRequests, requestAlert)
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brandText,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 54 + insets.bottom,
          paddingTop: 4,
          paddingBottom: 4 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tổng quan', tabBarIcon: icon('sunny-outline') }} />
      <Tabs.Screen name="devices" options={{ title: 'Thiết bị', tabBarIcon: icon('hardware-chip-outline') }} />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Yêu cầu',
          tabBarIcon: icon('calendar-outline'),
          tabBarBadge: alert || undefined,
          tabBarBadgeStyle: { backgroundColor: theme.danger, color: theme.dark ? theme.canvas : theme.onBrand },
          tabBarAccessibilityLabel: alert ? `Yêu cầu, ${alert} cần xem` : undefined,
        }}
      />
      <Tabs.Screen name="products" options={{ title: 'Sản phẩm', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
      {/* Opened from "Yêu cầu"; kept as a route but not as a tab. */}
      <Tabs.Screen name="assessment" options={{ title: 'Đánh giá', href: null }} />
    </Tabs>
  )
}
