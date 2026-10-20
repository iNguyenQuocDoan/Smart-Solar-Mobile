import { ApiError } from '@/lib/api/client'
import {
  MOCK_INTERVAL_MS,
  MOCK_OFFLINE_FOR_MS,
  MOCK_SITES,
  MOCK_STALE_FOR_MS,
  MOCK_UPTIME_AT_LAST_MS,
  type DemoConfig,
  type MockDevice,
} from '@/lib/monitoring/mockData'
import type { DeviceReading, DeviceStatus, MonitoringSource } from '@/lib/monitoring/types'

/** Deterministic value in [0, 1) so a refresh shows the same history plus newer samples. */
function unit(seed: string, n: number) {
  let hash = 2166136261
  for (const char of `${seed}:${n}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 10_000) / 10_000
}

function readingAt(device: MockDevice, tick: number, lastTick: number, config: DemoConfig): DeviceReading {
  const seconds = (tick * MOCK_INTERVAL_MS) / 1000
  const wave = 0.35 * Math.sin(seconds / 95 + device.phase) + 0.12 * Math.sin(seconds / 17 + device.phase * 2)
  const value = Math.round((device.baseA + wave + (unit(device.deviceId, tick) - 0.5) * 0.12) * 100) / 100
  // A few samples carry only the raw ADC value, as the firmware does before calibration.
  const sampleWithoutCurrent = unit(`${device.deviceId}:gap`, tick) < 0.04
  return {
    id: tick - 350_000_000,
    deviceId: device.deviceId,
    currentA: config.scenario === 'uncalibrated' || sampleWithoutCurrent ? null : value,
    adcRaw: Math.round(2048 + value * 66),
    isTest: config.scenario === 'test-data',
    uptimeMs: Math.max(0, MOCK_UPTIME_AT_LAST_MS - (lastTick - tick) * MOCK_INTERVAL_MS),
    receivedAtUtc: new Date(tick * MOCK_INTERVAL_MS + Math.floor(unit(`${device.deviceId}:jitter`, tick) * 400)).toISOString(),
  }
}

/** Status is decided by the scenario, standing in for a backend rule that does not exist yet. */
function timeline(deviceIndex: number, config: DemoConfig, now: number): { status: DeviceStatus; lastTick: number | null } {
  const nowTick = Math.floor(now / MOCK_INTERVAL_MS)
  if (config.scenario === 'unknown') return { status: 'unknown', lastTick: nowTick }
  if (deviceIndex > 0) return { status: 'live', lastTick: nowTick }
  if (config.scenario === 'offline') return { status: 'offline', lastTick: nowTick - MOCK_OFFLINE_FOR_MS / MOCK_INTERVAL_MS }
  if (config.scenario === 'stale') return { status: 'stale', lastTick: nowTick - MOCK_STALE_FOR_MS / MOCK_INTERVAL_MS }
  if (config.scenario === 'no-readings') return { status: 'unknown', lastTick: null }
  return { status: 'live', lastTick: nowTick }
}

function locate(deviceId: string) {
  for (const site of MOCK_SITES) {
    const index = site.devices.findIndex((device) => device.deviceId === deviceId)
    if (index >= 0) return { device: site.devices[index]!, index }
  }
  return null
}

/** The mock keeps its own scenario; `configure` changes what the next requests return. */
export function createMockSource(initial: DemoConfig): { source: MonitoringSource; configure: (next: Partial<DemoConfig>) => void } {
  let current = initial

  async function respond<T>(build: (config: DemoConfig, now: number) => T): Promise<T> {
    const config = current
    await new Promise((resolve) => setTimeout(resolve, config.fault === 'slow' ? 2500 : 300))
    if (config.fault === 'network') throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 0)
    if (config.fault === 'server') throw new ApiError('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.', 500)
    return build(config, Date.now())
  }

  const source: MonitoringSource = {
    listSites: () =>
      respond((config, now) => {
        if (config.scenario === 'no-sites') return []
        return MOCK_SITES.map((site) => ({
          siteId: site.siteId,
          name: site.name,
          address: site.address,
          devices:
            config.scenario === 'no-devices'
              ? []
              : site.devices.map((device, index) => {
                  const { status, lastTick } = timeline(index, config, now)
                  return {
                    deviceId: device.deviceId,
                    name: device.name,
                    status,
                    lastReading: lastTick == null ? null : readingAt(device, lastTick, lastTick, config),
                  }
                }),
        }))
      }),
    listReadings: (deviceId, limit) =>
      respond((config, now) => {
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError('limit phải là số nguyên từ 1 đến 100.', 400)
        const found = locate(deviceId)
        if (!found || config.scenario === 'no-sites' || config.scenario === 'no-devices') return []
        const { lastTick } = timeline(found.index, config, now)
        if (lastTick == null) return []
        return Array.from({ length: limit }, (_, offset) => readingAt(found.device, lastTick - offset, lastTick, config))
      }),
  }

  return {
    source,
    configure: (next) => {
      current = { ...current, ...next }
    },
  }
}
