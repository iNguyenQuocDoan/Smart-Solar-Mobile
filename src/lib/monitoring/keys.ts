export const monitoringKeys = {
  all: ['monitoring'] as const,
  sites: (scope: string) => ['monitoring', scope, 'sites'] as const,
  readings: (scope: string, deviceId: string, limit: number) => ['monitoring', scope, 'readings', deviceId, limit] as const,
}
