import { MetricCard } from '@/components/monitoring/MetricCard'
import { StatusPill, TestDataPill } from '@/components/monitoring/StatusPill'
import { formatAdc, formatAmpere, formatReceivedAt, formatRelative } from '@/lib/monitoring/format'
import { deviceStatusView } from '@/lib/monitoring/status'
import type { MonitoringDevice } from '@/lib/monitoring/types'

/** Headline current of one device, with its status, receive time and anything the reader must know. */
export function DeviceMetricCard({ device, refreshFailed, now }: { device: MonitoringDevice; refreshFailed: boolean; now: number }) {
  const status = deviceStatusView(device, refreshFailed)
  const reading = device.lastReading
  const missingCurrent =
    reading && reading.currentA == null
      ? reading.adcRaw != null
        ? `Bản ghi chỉ có giá trị cảm biến thô (ADC ${formatAdc(reading.adcRaw)}), chưa được quy đổi sang ampe.`
        : 'Bản ghi này không có số đo dòng điện.'
      : null
  const notes = [status.note, missingCurrent].filter((note): note is string => Boolean(note))
  const caption = reading
    ? `${status.current ? 'Cập nhật' : 'Nhận'} lúc ${formatReceivedAt(reading.receivedAtUtc, now)} · ${formatRelative(reading.receivedAtUtc, now)}`
    : null

  return (
    <MetricCard
      label="Dòng điện"
      qualifier={reading && !status.current ? 'số đo cuối' : undefined}
      value={reading?.currentA ?? null}
      unit="A"
      unitSpoken="ampe"
      formatValue={formatAmpere}
      emptyText={reading ? 'Chưa có số đo dòng điện' : 'Chưa nhận được dữ liệu'}
      caption={caption}
      current={status.current}
      notes={notes}
      pills={
        <>
          <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
          {reading?.isTest ? <TestDataPill /> : null}
        </>
      }
    />
  )
}
