import { Stack } from 'expo-router'
import { MonitoringProvider } from '@/contexts/MonitoringContext'

export default function CustomerLayout() {
  return (
    <MonitoringProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MonitoringProvider>
  )
}
