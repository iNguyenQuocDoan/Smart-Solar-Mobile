import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { useAppTheme } from '@/theme/theme'

/** Báo số liệu đang hiện là số mẫu, ẩn khi đã có số đo thật */
export function DemoBanner() {
  const theme = useAppTheme()
  const { demo } = useMonitoring()
  if (!demo) return null

  return (
    <View style={[styles.banner, { backgroundColor: theme.infoSoft }]}>
      <Ionicons name="information-circle" size={22} color={theme.info} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text }]}>Số liệu mẫu</Text>
        <Text style={[styles.body, { color: theme.text }]}>
          Số đo thật sẽ hiện ở đây khi bộ đo của công trình được kết nối.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { borderRadius: 6, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
})
