import { useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { CurrentChart } from '@/components/monitoring/CurrentChart'
import { ErrorBlock, LoadingBlock, RefreshNotice } from '@/components/monitoring/DataState'
import { DemoBanner } from '@/components/monitoring/DemoBanner'
import { DeviceSwitcher } from '@/components/monitoring/DeviceSwitcher'
import { RangeSelector } from '@/components/monitoring/RangeSelector'
import { ReadingList } from '@/components/monitoring/ReadingList'
import { BackButton, PageHeader, Panel, Screen, SectionTitle, StateView, StatusText } from '@/components/ui'
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
    body = <StateView title="Chưa có hệ thống được giám sát" />
  } else if (!device) {
    body = <StateView title="Công trình chưa có thiết bị giám sát" />
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
        <View style={styles.status}>
          <StatusText tone={status.tone}>{status.label}</StatusText>
          {device.lastReading?.isTest ? <StatusText tone="info">Dữ liệu thử</StatusText> : null}
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
          <StateView title="Chưa nhận được dữ liệu" />
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
                  .join(', ')}
              >
                Dòng điện theo thời gian
              </SectionTitle>
              <CurrentChart readings={readings.data} plotHeight={200} dimmed={readings.isPlaceholderData} />
            </Panel>
            <View style={styles.section}>
              <SectionTitle>Các lần đo</SectionTitle>
              <ReadingList readings={readings.data} />
            </View>
          </>
        )}
      </>
    )
  }

  return (
    <Screen refreshing={sites.isRefetching || readings.isRefetching} onRefresh={refresh}>
      <BackButton onPress={() => router.back()} />
      <PageHeader title="Lịch sử dữ liệu" description={device?.name} />
      <DemoBanner />
      {body}
    </Screen>
  )
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { gap: 8 },
})
