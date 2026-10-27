import { useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { CurrentChart } from '@/components/monitoring/CurrentChart'
import { ErrorBlock, LoadingBlock, RefreshNotice } from '@/components/monitoring/DataState'
import { DemoBanner } from '@/components/monitoring/DemoBanner'
import { DeviceSwitcher } from '@/components/monitoring/DeviceSwitcher'
import { RangeSelector } from '@/components/monitoring/RangeSelector'
import { ReadingList } from '@/components/monitoring/ReadingList'
import { StatusPill, TestDataPill } from '@/components/monitoring/StatusPill'
import { IconButton, PageHeader, Panel, Screen, SectionTitle, StateView } from '@/components/ui'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { useDeviceReadings, useMonitoringSelection, useMonitoringSites, useNow } from '@/hooks/monitoring'
import { formatReceivedAt } from '@/lib/monitoring/format'
import { summarizeCurrent } from '@/lib/monitoring/stats'
import { deviceStatusView } from '@/lib/monitoring/status'
import { HISTORY_WINDOWS } from '@/lib/monitoring/types'

const DEFAULT_WINDOW = 'last-50'

export function MonitoringHistoryScreen() {
  const router = useRouter()
  const { select } = useMonitoring()
  const now = useNow()
  const sites = useMonitoringSites()
  const { site, device } = useMonitoringSelection(sites.data)
  const [windowId, setWindowId] = useState(DEFAULT_WINDOW)
  const selectedWindow = HISTORY_WINDOWS.find((item) => item.id === windowId)
  const limit = selectedWindow?.supported ? selectedWindow.limit : 50
  const readings = useDeviceReadings(device?.deviceId, limit)
  const sitesRefreshFailed = Boolean(sites.data && sites.error)
  const readingsRefreshFailed = Boolean(readings.data && readings.error)
  const summary = readings.data ? summarizeCurrent(readings.data) : null

  function refresh() {
    void sites.refetch()
    if (device) void readings.refetch()
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
        description="Lịch sử dữ liệu sẽ có sau khi công trình được lắp thiết bị đo."
      />
    )
  } else if (!device) {
    body = (
      <StateView
        icon="hardware-chip-outline"
        title="Công trình chưa có thiết bị giám sát"
        description="Chưa có thiết bị nào để xem lịch sử dữ liệu."
      />
    )
  } else {
    const status = deviceStatusView(device, sitesRefreshFailed)
    const refreshError = sitesRefreshFailed ? sites.error : readingsRefreshFailed ? readings.error : null
    body = (
      <>
        <DeviceSwitcher
          devices={site.devices}
          selectedId={device.deviceId}
          onSelect={(deviceId) => select(site.siteId, deviceId)}
        />
        <View style={styles.pills}>
          <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
          {device.lastReading?.isTest ? <TestDataPill /> : null}
        </View>
        <RangeSelector windows={HISTORY_WINDOWS} selectedId={windowId} onSelect={setWindowId} />
        {refreshError ? (
          <RefreshNotice
            error={refreshError}
            updatedAt={sitesRefreshFailed ? sites.dataUpdatedAt : readings.dataUpdatedAt}
            now={now}
            onRetry={refresh}
          />
        ) : null}
        {readings.isPending ? (
          <LoadingBlock label="Đang tải lịch sử…" />
        ) : !readings.data ? (
          readings.error ? (
            <ErrorBlock error={readings.error} onRetry={() => void readings.refetch()} />
          ) : null
        ) : readings.data.length === 0 || !summary ? (
          <StateView
            icon="hourglass-outline"
            title="Chưa nhận được dữ liệu"
            description="Thiết bị chưa gửi số đo nào lên hệ thống."
          />
        ) : (
          <>
            <Panel>
              <SectionTitle
                detail={[
                  `${summary.total} số đo`,
                  summary.from != null && summary.to != null
                    ? `${formatReceivedAt(summary.from, now)} – ${formatReceivedAt(summary.to, now)}`
                    : null,
                  summary.missing ? `${summary.missing} số đo không có giá trị` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                Dòng điện theo thời gian
              </SectionTitle>
              <CurrentChart readings={readings.data} plotHeight={200} dimmed={readings.isPlaceholderData} />
            </Panel>
            <View style={styles.section}>
              <SectionTitle detail="Mới nhất ở trên">Bản ghi</SectionTitle>
              <ReadingList readings={readings.data} />
            </View>
          </>
        )}
      </>
    )
  }

  return (
    <Screen refreshing={sites.isRefetching || readings.isRefetching} onRefresh={refresh}>
      <View style={styles.back}>
        <IconButton label="Quay lại" icon="arrow-back" onPress={() => router.back()} />
      </View>
      <PageHeader
        eyebrow={site?.name ?? 'Giám sát'}
        title="Lịch sử dữ liệu"
        description={device ? `${device.name} · Mã ${device.deviceId}` : undefined}
      />
      <DemoBanner />
      {body}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { marginLeft: -8, marginBottom: -12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { gap: 12 },
})
