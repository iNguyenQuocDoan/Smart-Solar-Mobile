import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs, usePathname } from 'expo-router'
import type { ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOpenJobs, useTechJobs } from '@/hooks/queries'
import { useTabAlert } from '@/hooks/tabAlert'
import type { TechnicianAppointment } from '@/lib/api/types'
import { useAppTheme } from '@/theme/theme'

type Icon = ComponentProps<typeof Ionicons>['name']
function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />
  }
}

// Số đỏ trên tab Việc của tôi: lịch trong khu vực chờ người nhận, cộng việc của mình vừa đổi (khách huỷ, đổi giờ) mà chưa xem
const jobAlert = {
  key: (j: TechnicianAppointment) => j.appointmentId,
  sig: (j: TechnicianAppointment) => `${j.status}|${j.startsAt}`,
}

export default function TechTabs() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const waiting = (useOpenJobs().data ?? []).filter((job) => job.canAccept).length
  const viewingJobs = pathname === '/tech' || pathname.startsWith('/tech/job/')
  const changed = useTabAlert('tech-jobs', useTechJobs().data, viewingJobs, jobAlert)
  const alert = waiting + changed
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brandText,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 7 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Việc của tôi',
          tabBarIcon: icon('briefcase-outline'),
          tabBarBadge: alert || undefined,
          tabBarBadgeStyle: { backgroundColor: theme.danger, color: theme.dark ? theme.canvas : theme.onBrand },
          tabBarAccessibilityLabel: alert ? `Việc của tôi, ${alert} cần xem` : undefined,
        }}
      />
      <Tabs.Screen name="schedule" options={{ title: 'Lịch', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="products" options={{ title: 'Sản phẩm', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  )
}
