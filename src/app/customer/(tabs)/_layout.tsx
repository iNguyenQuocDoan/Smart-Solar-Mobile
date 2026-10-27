import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCustomerRequests } from '@/hooks/queries'
import { canBook } from '@/lib/status'
import { useAppTheme } from '@/theme/theme'

type Icon = ComponentProps<typeof Ionicons>['name']
function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />
  }
}

export default function CustomerTabs() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const requests = useCustomerRequests()
  const toBook = (requests.data ?? []).filter(canBook).length
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
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 7 + insets.bottom,
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
          tabBarBadge: toBook || undefined,
          tabBarBadgeStyle: { backgroundColor: theme.danger, color: theme.dark ? theme.canvas : theme.onBrand },
          tabBarAccessibilityLabel: toBook ? `Yêu cầu, ${toBook} yêu cầu cần đặt giờ khảo sát` : undefined,
        }}
      />
      <Tabs.Screen name="products" options={{ title: 'Sản phẩm', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
      {/* Opened from "Yêu cầu"; kept as a route but not as a tab. */}
      <Tabs.Screen name="assessment" options={{ title: 'Đánh giá', href: null }} />
    </Tabs>
  )
}
