import { useRouter, type Href } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CurrentChart } from '@/components/monitoring/CurrentChart'
import { ErrorBlock, LoadingBlock, RefreshNotice } from '@/components/monitoring/DataState'
import { DemoBanner } from '@/components/monitoring/DemoBanner'
import { DeviceFigure } from '@/components/monitoring/DeviceFigure'
import { DeviceSwitcher } from '@/components/monitoring/DeviceSwitcher'
import { SitePicker } from '@/components/monitoring/SitePicker'
import { Button, KeyValue, Panel, Screen, SectionTitle, StateView } from '@/components/ui'
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
        title="Chưa có hệ thống được giám sát"
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
    body = <StateView title="Công trình chưa có thiết bị giám sát" />
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
        <DeviceFigure device={device} refreshFailed={sitesRefreshFailed} now={now} />
        {summary && summary.min != null && summary.max != null && summary.average != null ? (
          <View>
            <KeyValue label="Thấp nhất" value={`${formatAmpere(summary.min)} A`} />
            <KeyValue label="Trung bình" value={`${formatAmpere(summary.average)} A`} />
            <KeyValue label="Cao nhất" value={`${formatAmpere(summary.max)} A`} />
          </View>
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
        <Button
          label="Xem lịch sử dữ liệu"
          icon="stats-chart-outline"
          variant="secondary"
          compact
          onPress={() => router.push('/customer/history' as Href)}
        />
      </>
    )
  }

  return (
    <Screen refreshing={sites.isRefetching || readings.isRefetching} onRefresh={refresh}>
      {site && sites.data ? (
        <SitePicker sites={sites.data} site={site} onSelect={(siteId) => select(siteId, null)} />
      ) : (
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          Tổng quan
        </Text>
      )}
      <DemoBanner />
      {body}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
})
