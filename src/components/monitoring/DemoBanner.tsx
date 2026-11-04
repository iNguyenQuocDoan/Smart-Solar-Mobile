import { StyleSheet, Text } from 'react-native'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { useAppTheme } from '@/theme/theme'

/** Báo số liệu đang hiện là số mẫu, ẩn khi đã có số đo thật */
export function DemoBanner() {
  const theme = useAppTheme()
  const { demo } = useMonitoring()
  if (!demo) return null
  return <Text style={[styles.text, { color: theme.info }]}>Số liệu mẫu, chưa kết nối bộ đo</Text>
}

const styles = StyleSheet.create({
  text: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
})
