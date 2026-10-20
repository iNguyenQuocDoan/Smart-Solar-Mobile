import { useLocalSearchParams, useRouter, type Href } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { ErrorBlock, LoadingBlock, RefreshNotice } from '@/components/monitoring/DataState'
import { DemoBanner } from '@/components/monitoring/DemoBanner'
import { DeviceMetricCard } from '@/components/monitoring/DeviceMetricCard'
import { Button, IconButton, KeyValue, PageHeader, Panel, Screen, SectionTitle, StateView } from '@/components/ui'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { useMonitoringSites, useNow } from '@/hooks/monitoring'
import { formatAdc, formatFullTimestamp, formatRelative, formatUptime } from '@/lib/monitoring/format'

export function DeviceDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { select } = useMonitoring()
  const now = useNow()
  const sites = useMonitoringSites()
  const refreshFailed = Boolean(sites.data && sites.error)
  const found = sites.data?.flatMap((site) => site.devices.map((device) => ({ site, device }))).find((item) => item.device.deviceId === id)

  let body: ReactNode
  if (sites.isPending) {
    body = <LoadingBlock />
  } else if (!sites.data) {
    body = sites.error ? <ErrorBlock error={sites.error} onRetry={() => void sites.refetch()} /> : null
  } else if (!found) {
    body = (
      <StateView
        icon="hardware-chip-outline"
        title="Không tìm thấy thiết bị"
        description="Thiết bị có thể đã được gỡ khỏi công trình."
        action={<Button label="Về danh sách thiết bị" variant="secondary" compact onPress={() => router.navigate('/customer/devices' as Href)} />}
      />
    )
  } else {
    const { site, device } = found
    const reading = device.lastReading
    body = (
      <>
        <PageHeader eyebrow={site.name} title={device.name} description={`Mã thiết bị ${device.deviceId}`} />
        <DemoBanner />
        {refreshFailed && sites.error ? (
          <RefreshNotice error={sites.error} updatedAt={sites.dataUpdatedAt} now={now} onRetry={() => void sites.refetch()} />
        ) : null}
        <DeviceMetricCard device={device} refreshFailed={refreshFailed} now={now} />
        {reading ? (
          <>
            <Panel>
              <SectionTitle detail="Các trường thiết bị gửi trong bản ghi gần nhất">Bản ghi gần nhất</SectionTitle>
              <KeyValue label="Thời điểm máy chủ nhận" value={`${formatFullTimestamp(reading.receivedAtUtc)} · ${formatRelative(reading.receivedAtUtc, now)}`} />
              <KeyValue label="Giá trị cảm biến thô (ADC)" value={reading.adcRaw == null ? 'Thiết bị không gửi' : formatAdc(reading.adcRaw)} />
              <KeyValue label="Thời gian thiết bị chạy liên tục" value={reading.uptimeMs == null ? 'Thiết bị không gửi' : formatUptime(reading.uptimeMs)} />
              <KeyValue label="Loại dữ liệu" value={reading.isTest ? 'Dữ liệu thử nghiệm' : 'Số đo thật'} />
            </Panel>
            <Button
              label="Xem lịch sử dữ liệu"
              icon="stats-chart-outline"
              variant="secondary"
              onPress={() => {
                select(site.siteId, device.deviceId)
                router.push('/customer/history' as Href)
              }}
            />
          </>
        ) : null}
      </>
    )
  }

  return (
    <Screen refreshing={sites.isRefetching} onRefresh={() => void sites.refetch()}>
      <View style={styles.back}>
        <IconButton label="Quay lại" icon="arrow-back" onPress={() => router.back()} />
      </View>
      {found ? null : <DemoBanner />}
      {body}
    </Screen>
  )
}

const styles = StyleSheet.create({ back: { marginLeft: -8, marginBottom: -12 } })
