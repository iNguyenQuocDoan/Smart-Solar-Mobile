import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { OptionSheet } from '@/components/monitoring/OptionSheet'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { DEMO_FAULTS, DEMO_SCENARIOS } from '@/lib/monitoring/mockData'
import { useAppTheme } from '@/theme/theme'

/** Marks illustrative data and lets reviewers switch scenarios. Hidden once a real source is used. */
export function DemoBanner() {
  const theme = useAppTheme()
  const { demo } = useMonitoring()
  const [open, setOpen] = useState(false)
  if (!demo) return null

  const scenario = DEMO_SCENARIOS.find((item) => item.value === demo.scenario)
  const fault = demo.fault === 'none' ? null : DEMO_FAULTS.find((item) => item.value === demo.fault)

  return (
    <>
      <View style={[styles.banner, { backgroundColor: theme.infoSoft }]}>
        <Ionicons name="information-circle" size={22} color={theme.info} />
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.text }]}>Dữ liệu minh họa</Text>
          <Text style={[styles.body, { color: theme.text }]}>
            Chưa kết nối ESP32 thật. Kịch bản: {scenario?.label ?? demo.scenario}
            {fault ? ` · ${fault.label}` : ''}.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi kịch bản minh họa"
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.action, { borderColor: theme.border, backgroundColor: pressed ? theme.surfacePressed : theme.surface }]}
          >
            <Ionicons name="options-outline" size={18} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>Đổi kịch bản</Text>
          </Pressable>
        </View>
      </View>
      <OptionSheet
        visible={open}
        title="Kịch bản minh họa"
        onClose={() => setOpen(false)}
        sections={[
          {
            title: 'Dữ liệu',
            options: DEMO_SCENARIOS,
            selected: demo.scenario,
            onSelect: (value) => {
              const next = DEMO_SCENARIOS.find((item) => item.value === value)
              if (next) demo.setScenario(next.value)
            },
          },
          {
            title: 'Sự cố khi tải',
            options: DEMO_FAULTS,
            selected: demo.fault,
            onSelect: (value) => {
              const next = DEMO_FAULTS.find((item) => item.value === value)
              if (next) demo.setFault(next.value)
            },
          },
        ]}
      />
    </>
  )
}

const styles = StyleSheet.create({
  banner: { borderRadius: 6, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  action: { minHeight: 40, marginTop: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
})
