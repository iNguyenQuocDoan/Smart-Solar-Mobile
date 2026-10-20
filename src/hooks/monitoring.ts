import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useMonitoring } from '@/contexts/MonitoringContext'
import { monitoringKeys } from '@/lib/monitoring/keys'
import type { MonitoringSite } from '@/lib/monitoring/types'

export function useMonitoringSites() {
  const { source, scope } = useMonitoring()
  return useQuery({ queryKey: monitoringKeys.sites(scope), queryFn: source.listSites })
}

export function useDeviceReadings(deviceId: string | undefined, limit: number) {
  const { source, scope } = useMonitoring()
  return useQuery({
    queryKey: monitoringKeys.readings(scope, deviceId ?? '', limit),
    queryFn: () => source.listReadings(deviceId ?? '', limit),
    enabled: Boolean(deviceId),
    // Hold the previous frame only while changing the window of the same device.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === deviceId ? previous : undefined),
  })
}

/** Resolves the selected site and device, falling back to the first ones available. */
export function useMonitoringSelection(sites: MonitoringSite[] | undefined) {
  const { selectedSiteId, selectedDeviceId } = useMonitoring()
  const site = sites?.find((item) => item.siteId === selectedSiteId) ?? sites?.[0] ?? null
  const device = site?.devices.find((item) => item.deviceId === selectedDeviceId) ?? site?.devices[0] ?? null
  return { site, device }
}

/** Clock for relative times such as "8 giây trước". */
export function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
