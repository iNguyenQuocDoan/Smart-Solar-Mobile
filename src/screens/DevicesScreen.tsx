import { useRouter, type Href } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ErrorBlock, LoadingBlock, RefreshNotice } from '@/components/monitoring/DataState'
import { DemoBanner } from '@/components/monitoring/DemoBanner'
import { DeviceRow } from '@/components/monitoring/DeviceRow'
import { SitePicker } from '@/components/monitoring/SitePicker'
import { Button, PageHeader, Screen, StateView } from '@/components/ui'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { useMonitoringSelection, useMonitoringSites, useNow } from '@/hooks/monitoring'
import { deviceStatusView } from '@/lib/monitoring/status'
import type { MonitoringDevice } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

function statusSummary(devices: MonitoringDevice[], refreshFailed: boolean) {
  const counts = new Map<string, number>()
  for (const device of devices) {
    const label = deviceStatusView(device, refreshFailed).label
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [`${devices.length} thiết bị`, ...[...counts].map(([label, count]) => `${count} ${label.toLowerCase()}`)].join(
    ' · ',
  )
}

export function DevicesScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { select } = useMonitoring()
  const now = useNow()
  const sites = useMonitoringSites()
  const { site } = useMonitoringSelection(sites.data)
  const refreshFailed = Boolean(sites.data && sites.error)

  let body: ReactNode
  if (sites.isPending) {
    body = <LoadingBlock />
  } else if (!sites.data) {
    body = sites.error ? <ErrorBlock error={sites.error} onRetry={() => void sites.refetch()} /> : null
  } else if (!site) {
    body = (
      <StateView
        icon="sunny-outline"
        title="Chưa có hệ thống được giám sát"
        description="Thiết bị đo sẽ xuất hiện sau khi công trình được lắp đặt."
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
  } else {
    body = (
      <>
        <SitePicker variant="field" sites={sites.data} site={site} onSelect={(siteId) => select(siteId, null)} />
        {refreshFailed && sites.error ? (
          <RefreshNotice
            error={sites.error}
            updatedAt={sites.dataUpdatedAt}
            now={now}
            onRetry={() => void sites.refetch()}
          />
        ) : null}
        {site.devices.length === 0 ? (
          <StateView
            icon="hardware-chip-outline"
            title="Công trình chưa có thiết bị giám sát"
            description="Bộ đo ESP32 sẽ xuất hiện tại đây sau khi kỹ thuật viên lắp đặt và kích hoạt."
          />
        ) : (
          <View style={styles.section}>
            <Text style={[styles.summary, { color: theme.textMuted }]}>
              {statusSummary(site.devices, refreshFailed)}
            </Text>
            <View style={[styles.list, { borderColor: theme.border }]}>
              {site.devices.map((device, index) => (
                <DeviceRow
                  key={device.deviceId}
                  device={device}
                  now={now}
                  refreshFailed={refreshFailed}
                  last={index === site.devices.length - 1}
                  onPress={() => {
                    select(site.siteId, device.deviceId)
                    router.push({ pathname: '/customer/device/[id]', params: { id: device.deviceId } } as Href)
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </>
    )
  }

  return (
    <Screen refreshing={sites.isRefetching} onRefresh={() => void sites.refetch()}>
      <PageHeader eyebrow="Giám sát" title="Thiết bị" description="Bộ đo ESP32 gắn với công trình của bạn." />
      <DemoBanner />
      {body}
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  summary: { fontSize: 14, lineHeight: 20 },
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
})
