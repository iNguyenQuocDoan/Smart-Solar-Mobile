import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { monitoringKeys } from '@/lib/monitoring/keys'
import type { DemoConfig, DemoFault, DemoScenario } from '@/lib/monitoring/mockData'
import { createMockSource } from '@/lib/monitoring/mockSource'
import type { MonitoringSource } from '@/lib/monitoring/types'

type DemoControls = DemoConfig & {
  setScenario: (scenario: DemoScenario) => void
  setFault: (fault: DemoFault) => void
}

type MonitoringValue = {
  source: MonitoringSource
  /** Part of every query key, so switching source or demo scenario never mixes cached data. */
  scope: string
  /** Present only while the illustrative mock source is in use. */
  demo: DemoControls | null
  selectedSiteId: string | null
  selectedDeviceId: string | null
  select: (siteId: string, deviceId: string | null) => void
}

const MonitoringContext = createContext<MonitoringValue | null>(null)

// There is no customer-facing IoT API yet (the IoT service only accepts device keys), so the
// mock source is always active. Swap it for an API-backed MonitoringSource when one exists.
export function MonitoringProvider({ children }: PropsWithChildren) {
  const client = useQueryClient()
  const [scenario, setScenarioState] = useState<DemoScenario>('normal')
  const [fault, setFaultState] = useState<DemoFault>('none')
  const [mock] = useState(() => createMockSource({ scenario: 'normal', fault: 'none' }))
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  const setScenario = useCallback(
    (next: DemoScenario) => {
      mock.configure({ scenario: next })
      setScenarioState(next)
    },
    [mock],
  )

  // Faults are not part of the query key: cached data stays on screen while the refetch fails.
  const setFault = useCallback(
    (next: DemoFault) => {
      mock.configure({ fault: next })
      setFaultState(next)
      void client.invalidateQueries({ queryKey: monitoringKeys.all })
    },
    [client, mock],
  )

  const select = useCallback((siteId: string, deviceId: string | null) => {
    setSelectedSiteId(siteId)
    setSelectedDeviceId(deviceId)
  }, [])

  const value = useMemo<MonitoringValue>(
    () => ({
      source: mock.source,
      scope: `demo:${scenario}`,
      demo: { scenario, fault, setScenario, setFault },
      selectedSiteId,
      selectedDeviceId,
      select,
    }),
    [mock, scenario, fault, setScenario, setFault, selectedSiteId, selectedDeviceId, select],
  )
  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}

export function useMonitoring() {
  const value = useContext(MonitoringContext)
  if (!value) throw new Error('useMonitoring phải nằm trong MonitoringProvider.')
  return value
}
