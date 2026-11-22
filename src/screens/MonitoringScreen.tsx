import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CurrentChart } from '@/components/CurrentChart'
import {
  BackButton,
  Button,
  IconButton,
  KeyValue,
  ListRow,
  PageHeader,
  Panel,
  QueryState,
  Screen,
  SectionTitle,
  StateView,
  StatusText,
} from '@/components/ui'
import {
  useDropProjectOnLeave,
  useEnergyMonitoring,
  useLatestReading,
  useLiveScreen,
  useProjectDevice,
  useReadingHistory,
  useResetHistory,
} from '@/hooks/iot'
import { useMyProjects } from '@/hooks/queries'
import type { EnergyMonitoring, IotLatestReading, IotProjectDevice } from '@/lib/api/types'
import { formatDay } from '@/lib/format'
import { formatKwhPerYear, formatKwp, projectStatus, projectTitle } from '@/lib/installation'
import {
  chartPoints,
  connectionMeta,
  formatAgo,
  formatAmps,
  formatReadingTime,
  IOT_DEFAULTS,
  iotErrorMessage,
  isFinalReadError,
  isMonitoringUnavailable,
  isStale,
  mergeHistory,
  MONITORING_UNAVAILABLE_TEXT,
  nextLatestPollMs,
  NOT_BOUND_TEXT,
  NOT_MEASURED_TEXT,
  quantityText,
  shiftDay,
  vnToday,
} from '@/lib/iot'
import { useAppTheme } from '@/theme/theme'

// Giám sát điện năng của khách: chọn công trình, xem dòng điện thiết bị đo được, trạng thái kết nối và lịch sử. Chỉ hiện số backend
// trả; công suất, điện năng, mua / bán điện chỉ hiện khi đã đo được, không tự tính từ dòng điện. Sản lượng dự kiến (mô phỏng) nằm ở
// phần riêng, không bao giờ lẫn với số đo

function ProjectPicker({
  projects,
  selected,
  onSelect,
}: {
  projects: { projectId: string; status: string }[]
  selected: string | null
  onSelect: (projectId: string) => void
}) {
  const theme = useAppTheme()
  return (
    <View>
      <SectionTitle>Chọn công trình</SectionTitle>
      {projects.map((p, index) => {
        const active = p.projectId === selected
        return (
          <ListRow
            key={p.projectId}
            last={index === projects.length - 1}
            onPress={() => onSelect(p.projectId)}
            accessibilityLabel={`${projectTitle(p.projectId)}${active ? ', đang xem' : ''}`}
          >
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={active ? theme.brandText : theme.textMuted}
            />
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{projectTitle(p.projectId)}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>{projectStatus(p.status).label}</Text>
            </View>
          </ListRow>
        )
      })}
    </View>
  )
}

function LatestBlock({
  device,
  latest,
  polling,
  onReload,
  reloading,
}: {
  device: IotProjectDevice
  latest: { data: IotLatestReading | null | undefined; error: Error | null; isError: boolean }
  polling: number | false
  onReload: () => void
  reloading: boolean
}) {
  const theme = useAppTheme()
  const status = latest.data?.connectionStatus ?? device.connectionStatus
  const meta = connectionMeta(status)
  const unavailable = latest.isError && isMonitoringUnavailable(latest.error)
  // Thiết bị bị khoá thì backend không trả số hiện tại; vẫn chặn ở đây để không hiện số cũ còn trong state
  const reading = status === 'DISABLED' || unavailable ? null : (latest.data?.reading ?? null)
  const stale = reading ? isStale(reading.receivedAt, device.offlineAfterSeconds) : false
  const lastAt = latest.data?.reading?.receivedAt ?? device.lastReadingAt

  return (
    <Panel>
      <View style={styles.spread}>
        <SectionTitle detail={device.displayName}>Dòng điện đo được</SectionTitle>
        <StatusText tone={meta.tone}>{meta.label}</StatusText>
      </View>
      <View style={styles.reading}>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {reading && !stale && status === 'ONLINE' ? 'Dòng điện hiện tại' : 'Dòng điện, lần đo gần nhất'}
        </Text>
        {status === 'DISABLED' ? (
          <Text style={[styles.placeholder, { color: theme.textMuted }]}>Không hiện khi thiết bị bị khoá</Text>
        ) : unavailable ? (
          <Text style={[styles.placeholder, { color: theme.textMuted }]}>{MONITORING_UNAVAILABLE_TEXT}</Text>
        ) : reading ? (
          <Text
            style={[styles.amps, { color: theme.text }]}
            accessibilityLabel={`Dòng điện ${formatAmps(reading.currentAmps)}`}
          >
            {formatAmps(reading.currentAmps)}
          </Text>
        ) : (
          <Text style={[styles.placeholder, { color: theme.textMuted }]}>Chưa có số đo</Text>
        )}
        {reading ? (
          <Text style={[styles.meta, styles.tnum, { color: theme.textMuted }]}>
            Đo lúc {formatReadingTime(reading.receivedAt)}
            {formatAgo(reading.receivedAt) ? ` (${formatAgo(reading.receivedAt)})` : ''}
          </Text>
        ) : null}
      </View>
      {!reading && lastAt && status !== 'DISABLED' ? (
        <Text style={[styles.meta, styles.tnum, { color: theme.textMuted }]}>
          Số đo cuối lúc {formatReadingTime(lastAt)}
        </Text>
      ) : null}
      {latest.isError && !unavailable ? (
        <Text style={[styles.body, { color: theme.danger }]}>{iotErrorMessage(latest.error)}</Text>
      ) : null}
      <View style={styles.spread}>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {polling ? `Tự cập nhật mỗi ${Math.round(polling / 1000)} giây` : 'Không tự cập nhật'}
        </Text>
        <Button label="Tải lại" icon="refresh" variant="secondary" compact loading={reloading} onPress={onReload} />
      </View>
    </Panel>
  )
}

/** Bản phần cứng V1 chỉ đo dòng điện: đại lượng chưa đo được thì không hiện dòng, không tự tính từ dòng điện */
function OtherQuantities({ energy }: { energy: EnergyMonitoring | undefined }) {
  const m = energy?.measured
  const rows = (
    [
      ['Công suất', m?.powerWatts],
      ['Điện năng tạo ra', m?.energyProducedKwh],
      ['Điện mua từ lưới', m?.energyImportedKwh],
      ['Điện bán lên lưới', m?.energyExportedKwh],
    ] as const
  ).filter(([, q]) => quantityText(q) !== NOT_MEASURED_TEXT)
  if (rows.length === 0) return null
  return (
    <Panel>
      {rows.map(([label, q]) => (
        <KeyValue key={label} label={label} value={quantityText(q)} />
      ))}
    </Panel>
  )
}

function History({ projectId, maxGapMs }: { projectId: string; maxGapMs: number }) {
  const theme = useAppTheme()
  const [opened, setOpened] = useState(false)
  const [day, setDay] = useState<string | null>(null)
  const query = useReadingHistory(projectId, day, opened)
  const reset = useResetHistory(projectId, day)
  const today = vnToday()

  if (!opened)
    return (
      <Panel>
        <Button
          label="Xem lịch sử số đo"
          icon="time-outline"
          variant="secondary"
          compact
          onPress={() => setOpened(true)}
        />
      </Panel>
    )

  const readings = mergeHistory(query.data?.pages ?? [])
  const points = chartPoints(readings)

  return (
    <Panel>
      <View style={styles.spread}>
        <SectionTitle>Lịch sử số đo</SectionTitle>
        <Button
          label="Làm mới"
          icon="refresh"
          variant="quiet"
          compact
          loading={query.isFetching && !query.isFetchingNextPage}
          onPress={() => void reset()}
        />
      </View>
      <View style={styles.dayRow}>
        <IconButton
          label="Ngày trước"
          icon="chevron-back"
          onPress={() => setDay((d) => shiftDay(d ?? today, d ? -1 : 0))}
        />
        <Text style={[styles.dayLabel, { color: theme.text }]}>{day ? formatDay(day) : 'Mọi ngày'}</Text>
        <IconButton
          label="Ngày sau"
          icon="chevron-forward"
          disabled={!day || day >= today}
          onPress={() => setDay((d) => (d ? shiftDay(d, 1) : d))}
        />
      </View>
      <View style={styles.actions}>
        <Button label="Hôm nay" variant="quiet" compact onPress={() => setDay(today)} disabled={day === today} />
        <Button label="Mọi ngày" variant="quiet" compact onPress={() => setDay(null)} disabled={day === null} />
      </View>

      {query.isPending ? (
        <QueryState loading error={null} onRetry={() => undefined} />
      ) : query.isError && readings.length === 0 ? (
        <StateView
          title="Không tải được lịch sử số đo"
          description={iotErrorMessage(query.error)}
          action={<Button label="Thử lại" variant="secondary" compact onPress={() => void reset()} />}
        />
      ) : readings.length === 0 ? (
        <Text style={[styles.body, { color: theme.textMuted }]}>
          {day ? 'Không có số đo nào trong ngày này.' : 'Công trình chưa có số đo nào.'}
        </Text>
      ) : (
        <>
          <CurrentChart points={points} maxGapMs={maxGapMs} />
          <View>
            {readings.map((r, index) => (
              <ListRow
                key={r.readingId}
                last={index === readings.length - 1}
                accessibilityLabel={`${formatReadingTime(r.receivedAt)}, ${formatAmps(r.currentAmps)}`}
              >
                <Text style={[styles.flex, styles.body, styles.tnum, { color: theme.text }]}>
                  {formatReadingTime(r.receivedAt)}
                </Text>
                <Text style={[styles.body, styles.tnum, styles.strong, { color: theme.text }]}>
                  {formatAmps(r.currentAmps)}
                </Text>
              </ListRow>
            ))}
          </View>
          {query.isError ? (
            <Text style={[styles.body, { color: theme.danger }]}>{iotErrorMessage(query.error)}</Text>
          ) : null}
          {query.hasNextPage ? (
            <Button
              label="Tải cũ hơn"
              icon="arrow-down"
              variant="secondary"
              compact
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </Panel>
  )
}

/** Sản lượng dự kiến theo mô phỏng trước khi lắp: không phải số đo, nằm riêng một phần; chưa có thì không hiện */
function Simulated({ energy }: { energy: EnergyMonitoring | undefined }) {
  const s = energy?.simulated
  if (!s || s.installedCapacityKwp == null) return null
  return (
    <Panel>
      <SectionTitle>Sản lượng dự kiến (mô phỏng)</SectionTitle>
      <KeyValue label="Công suất lắp" value={formatKwp(s.installedCapacityKwp)} />
      {s.panelCount != null ? <KeyValue label="Số tấm pin" value={`${s.panelCount} tấm`} /> : null}
      {s.annualEnergyKwh != null ? (
        <KeyValue label="Dự kiến" value={`khoảng ${formatKwhPerYear(s.annualEnergyKwh)}`} />
      ) : null}
    </Panel>
  )
}

function ProjectMonitoring({ projectId }: { projectId: string }) {
  const theme = useAppTheme()
  const live = useLiveScreen()
  useDropProjectOnLeave(projectId)
  const energy = useEnergyMonitoring(projectId)
  const device = useProjectDevice(projectId)
  const bound = device.data != null
  const interval = device.data?.expectedReportIntervalSeconds
  const latest = useLatestReading(projectId, { enabled: live && bound, reportIntervalSeconds: interval })
  // Tháo thiết bị trong lúc đang xem: số đo mới nhất trả 404 IOT_BINDING_NOT_FOUND (null)
  const unbound = device.data === null || latest.data === null
  const polling = live && bound && !unbound ? nextLatestPollMs(latest, interval) : false
  const maxGapMs = (device.data?.offlineAfterSeconds ?? IOT_DEFAULTS.offlineAfterSeconds) * 1000

  const reload = () => {
    void device.refetch()
    if (bound) void latest.refetch()
  }

  return (
    <>
      {device.isPending ? (
        <QueryState loading error={null} onRetry={() => undefined} />
      ) : device.isError ? (
        <StateView
          title={isMonitoringUnavailable(device.error) ? MONITORING_UNAVAILABLE_TEXT : 'Không tải được thiết bị đo'}
          description={isMonitoringUnavailable(device.error) ? undefined : iotErrorMessage(device.error)}
          action={<Button label="Thử lại" variant="secondary" compact onPress={() => void device.refetch()} />}
        />
      ) : unbound ? (
        <Panel>
          <Text style={[styles.placeholder, { color: theme.textMuted }]}>{NOT_BOUND_TEXT}</Text>
          <Button label="Tải lại" icon="refresh" variant="secondary" compact onPress={reload} />
        </Panel>
      ) : device.data ? (
        <>
          <LatestBlock
            device={device.data}
            latest={latest}
            polling={polling}
            onReload={reload}
            reloading={latest.isFetching || device.isFetching}
          />
          <OtherQuantities energy={energy.data} />
        </>
      ) : null}
      {/* Lịch sử vẫn xem được khi đã tháo thiết bị: số đo cũ của công trình không mất */}
      {!device.isPending &&
      !(device.isError && (isMonitoringUnavailable(device.error) || isFinalReadError(device.error))) ? (
        <History projectId={projectId} maxGapMs={maxGapMs} />
      ) : null}
      <Simulated energy={energy.data} />
    </>
  )
}

export function MonitoringScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ projectId?: string }>()
  const projects = useMyProjects()
  const list = (projects.data ?? []).filter((p) => p.status !== 'CANCELLED')
  const [picked, setPicked] = useState<string | null>(null)
  const wanted = picked ?? params.projectId ?? null
  // Chỉ một công trình thì chọn sẵn; mã trên đường dẫn không thuộc danh sách thì bỏ qua
  const selected = list.some((p) => p.projectId === wanted) ? wanted : list.length === 1 ? list[0]!.projectId : null

  return (
    <Screen refreshing={projects.isRefetching} onRefresh={() => void projects.refetch()}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/customer'))} />
      <PageHeader title="Giám sát điện năng" />
      <QueryState
        loading={projects.isPending}
        error={projects.error ? new Error(iotErrorMessage(projects.error)) : null}
        onRetry={() => void projects.refetch()}
      />
      {projects.data && list.length === 0 ? <StateView title="Chưa có công trình lắp đặt" /> : null}
      {list.length > 1 ? <ProjectPicker projects={list} selected={selected} onSelect={setPicked} /> : null}
      {list.length === 1 && selected ? <SectionTitle>{projectTitle(selected)}</SectionTitle> : null}
      {list.length > 1 && !selected ? <StateView title="Chọn một công trình để xem số đo" /> : null}
      {/* key: đổi công trình thì dựng lại từ đầu, polling cũ dừng và số của công trình trước không còn hiện */}
      {selected ? <ProjectMonitoring key={selected} projectId={selected} /> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reading: { gap: 2 },
  amps: { fontSize: 36, lineHeight: 44, fontWeight: '700', fontVariant: ['tabular-nums'] },
  placeholder: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13, lineHeight: 18 },
  strong: { fontWeight: '700' },
  tnum: { fontVariant: ['tabular-nums'] },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
})
