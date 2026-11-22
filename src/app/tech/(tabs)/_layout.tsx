import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs, usePathname } from 'expo-router'
import type { ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOpenJobs, useTechInstallations, useTechJobs } from '@/hooks/queries'
import { useTabAlert } from '@/hooks/tabAlert'
import type { InstallationProject, TechnicianAppointment } from '@/lib/api/types'
import { needsAction } from '@/lib/techInstallation'
import { useAppTheme } from '@/theme/theme'

type Icon = ComponentProps<typeof Ionicons>['name']
function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />
  }
}

// Số đỏ trên tab Khảo sát: lịch trong khu vực chờ người nhận, cộng việc của mình vừa đổi (khách huỷ, đổi giờ) mà chưa xem
const jobAlert = {
  key: (j: TechnicianAppointment) => j.appointmentId,
  sig: (j: TechnicianAppointment) => `${j.status}|${j.startsAt}`,
}

// Số đỏ trên tab Lắp đặt: việc chờ trả lời hoặc phải sửa lại, cộng công trình vừa đổi trạng thái mà chưa xem
const installationAlert = {
  key: (p: InstallationProject) => p.projectId,
  sig: (p: InstallationProject) => `${p.status}|${p.myAssignmentStatus}|${p.startsAt}`,
  todo: needsAction,
}

export default function TechTabs() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const waiting = (useOpenJobs().data ?? []).filter((job) => job.canAccept).length
  const viewingJobs = pathname === '/tech' || pathname.startsWith('/tech/job/')
  const changed = useTabAlert('tech-jobs', useTechJobs().data, viewingJobs, jobAlert)
  const alert = waiting + changed
  const viewingInstallations = pathname === '/tech/installations' || pathname.startsWith('/tech/installation/')
  const installations = useTabAlert(
    'tech-installations',
    useTechInstallations().data,
    viewingInstallations,
    installationAlert,
  )
  const badgeStyle = { backgroundColor: theme.danger, color: theme.dark ? theme.canvas : theme.onBrand }
  return (
    <Tabs
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Khảo sát',
          tabBarIcon: icon('clipboard-outline'),
          tabBarBadge: alert || undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarAccessibilityLabel: alert ? `Khảo sát, ${alert} cần xem` : undefined,
        }}
      />
      <Tabs.Screen
        name="installations"
        options={{
          title: 'Lắp đặt',
          tabBarIcon: icon('construct-outline'),
          tabBarBadge: installations || undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarAccessibilityLabel: installations ? `Lắp đặt, ${installations} cần xem` : undefined,
        }}
      />
      <Tabs.Screen name="schedule" options={{ title: 'Lịch', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="products" options={{ title: 'Sản phẩm', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  )
}
