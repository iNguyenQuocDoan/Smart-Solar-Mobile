import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CurrentChart } from '@/components/monitoring/CurrentChart'
import { ErrorBlock, LoadingBlock, RefreshNotice } from '@/components/monitoring/DataState'
import { DemoBanner } from '@/components/monitoring/DemoBanner'
import { DeviceMetricCard } from '@/components/monitoring/DeviceMetricCard'
import { DeviceSwitcher } from '@/components/monitoring/DeviceSwitcher'
import { MetricStrip } from '@/components/monitoring/MetricCard'
import { ShortcutList } from '@/components/monitoring/ShortcutList'
import { SitePicker } from '@/components/monitoring/SitePicker'
import { Button, Panel, Screen, SectionTitle, StateView } from '@/components/ui'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { useDeviceReadings, useMonitoringSelection, useMonitoringSites, useNow } from '@/hooks/monitoring'
import { formatAmpere } from '@/lib/monitoring/format'
import { summarizeCurrent } from '@/lib/monitoring/stats'
import { OVERVIEW_READING_LIMIT } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

export function MonitoringOverviewScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { select } = useMonitoring()
  const now = useNow()
  const sites = useMonitoringSites()
  const { site, device } = useMonitoringSelection(sites.data)
  const hasReadings = Boolean(device?.lastReading)
  const readings = useDeviceReadings(hasReadings ? device?.deviceId : undefined, OVERVIEW_READING_LIMIT)
  const sitesRefreshFailed = Boolean(sites.data && sites.error)
  const readingsRefreshFailed = Boolean(readings.data && readings.error)
  const summary = readings.data ? summarizeCurrent(readings.data) : null

  function refresh() {
    void sites.refetch()
    if (hasReadings) void readings.refetch()
  }

  let body: ReactNode
  if (sites.isPending) {
    body = <LoadingBlock />
  } else if (!sites.data) {
    body = sites.error ? <ErrorBlock error={sites.error} onRetry={refresh} /> : null
  } else if (!site) {
    body = (
      <StateView
        icon="sunny-outline"
        title="Chưa có hệ thống được giám sát"
        description="Công trình sẽ hiện ở đây sau khi lắp đặt xong."
        action={
          <Button
            label="Xem yêu cầu khảo sát"
            icon="calendar-outline"
            variant="secondary"
            compact
            onPress={() => router.navigate('/customer/requests')}
          />
        }
      />
    )
  } else if (!device) {
    body = (
      <StateView
        icon="hardware-chip-outline"
        title="Công trình chưa có thiết bị giám sát"
        description="Bộ đo sẽ xuất hiện tại đây sau khi kỹ thuật viên lắp đặt và kích hoạt."
      />
    )
  } else {
    const refreshError = sitesRefreshFailed ? sites.error : readingsRefreshFailed ? readings.error : null
    body = (
      <>
        {refreshError ? (
          <RefreshNotice
            error={refreshError}
            updatedAt={sitesRefreshFailed ? sites.dataUpdatedAt : readings.dataUpdatedAt}
            now={now}
            onRetry={refresh}
          />
        ) : null}
        <DeviceSwitcher
          devices={site.devices}
          selectedId={device.deviceId}
          onSelect={(deviceId) => select(site.siteId, deviceId)}
        />
        <DeviceMetricCard device={device} refreshFailed={sitesRefreshFailed} now={now} />
        {summary && summary.min != null && summary.max != null && summary.average != null ? (
          <MetricStrip
            items={[
              { label: 'Thấp nhất', value: `${formatAmpere(summary.min)} A` },
              { label: 'Trung bình', value: `${formatAmpere(summary.average)} A` },
              { label: 'Cao nhất', value: `${formatAmpere(summary.max)} A` },
            ]}
          />
        ) : null}
        {hasReadings ? (
          <Panel>
            <SectionTitle detail={`${OVERVIEW_READING_LIMIT} số đo gần nhất`}>Dòng điện gần đây</SectionTitle>
            {readings.isPending ? (
              <LoadingBlock label="Đang tải biểu đồ…" compact />
            ) : readings.data ? (
              <CurrentChart readings={readings.data} dimmed={readings.isPlaceholderData} />
            ) : readings.error ? (
              <ErrorBlock error={readings.error} onRetry={() => void readings.refetch()} />
            ) : null}
          </Panel>
        ) : null}
        <ShortcutList
          items={[
            {
              icon: 'hardware-chip-outline',
              title: 'Thiết bị',
              detail: `${site.devices.length} thiết bị tại ${site.name}`,
              onPress: () => router.navigate('/customer/devices' as Href),
            },
            {
              icon: 'stats-chart-outline',
              title: 'Lịch sử dữ liệu',
              detail: `Biểu đồ và bản ghi của ${device.name}`,
              onPress: () => router.push('/customer/history' as Href),
            },
          ]}
        />
        <View style={styles.footnote}>
          <Ionicons name="information-circle-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.footnoteText, { color: theme.textMuted }]}>
            Thiết bị hiện chỉ gửi số đo dòng điện (A). Công suất, điện năng và điện áp sẽ hiển thị khi thiết bị cung cấp
            các số liệu này.
          </Text>
        </View>
      </>
    )
  }

  return (
    <Screen refreshing={sites.isRefetching || readings.isRefetching} onRefresh={refresh}>
      <View style={styles.header}>
        {site && sites.data ? (
          <SitePicker sites={sites.data} site={site} onSelect={(siteId) => select(siteId, null)} />
        ) : (
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            Tổng quan
          </Text>
        )}
      </View>
      <DemoBanner />
      {body}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  footnote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footnoteText: { flex: 1, fontSize: 13, lineHeight: 19 },
})
