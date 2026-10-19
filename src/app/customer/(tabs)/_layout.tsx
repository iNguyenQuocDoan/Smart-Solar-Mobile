import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useAppTheme } from '@/theme/theme'

type Icon = ComponentProps<typeof Ionicons>['name']
function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />
  }
}

export default function CustomerTabs() {
  const theme = useAppTheme()
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.brandText, tabBarInactiveTintColor: theme.textMuted, tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64, paddingTop: 6, paddingBottom: 7 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, sceneStyle: { backgroundColor: theme.canvas } }}>
      <Tabs.Screen name="index" options={{ title: 'Tổng quan', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="assessment" options={{ title: 'Đánh giá', tabBarIcon: icon('analytics-outline') }} />
      <Tabs.Screen name="requests" options={{ title: 'Yêu cầu', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="products" options={{ title: 'Sản phẩm', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  )
}
