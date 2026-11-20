import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useIsFocused } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { keys } from '@/hooks/queries'
import { installationService, iotService } from '@/lib/api/services'
import type { IotReadingHistory } from '@/lib/api/types'
import { IOT_DEFAULTS, isFinalReadError, nextHistoryCursor, nextLatestPollMs, vnDayEnd, vnDayStart } from '@/lib/iot'

// Giám sát IoT của một công trình. Mọi query key có projectId, và gcTime 0 để số của công trình đã rời đi không còn trong cache
// nên không bao giờ hiện nhầm sang công trình khác

export const iotKeys = {
  all: (projectId: string) => ['customer-projects', projectId, 'iot'] as const,
  device: (projectId: string) => ['customer-projects', projectId, 'iot', 'device'] as const,
  latest: (projectId: string) => ['customer-projects', projectId, 'iot', 'latest'] as const,
  history: (projectId: string, day: string | null) => ['customer-projects', projectId, 'iot', 'history', day] as const,
}

/** Lỗi 4xx (quyền, không tìm thấy, quá hạn mức, dữ liệu sai) không tự thử lại; mất mạng / 5xx thử lại một lần */
const retryRead = (count: number, error: Error) => !isFinalReadError(error) && count < 1

/** App đang ở trước mặt người dùng; xuống nền thì dừng hỏi số đo */
export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive')
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'))
    return () => sub.remove()
  }, [])
  return active
}

/** Đang xem: màn đang hiện và app không ở nền */
export function useLiveScreen() {
  const focused = useIsFocused()
  const appActive = useAppActive()
  return focused && appActive
}

/** Tổng quan (khối `simulated` và `measured`), tải một lần; dùng chung cache với màn Tổng quan */
export function useEnergyMonitoring(projectId: string) {
  return useQuery({
    queryKey: keys.energy(projectId),
    queryFn: () => installationService.getEnergy(projectId),
    retry: retryRead,
    refetchOnWindowFocus: false,
  })
}

/** Thiết bị đang gắn; null là công trình chưa gắn thiết bị (404 IOT_BINDING_NOT_FOUND) */
export function useProjectDevice(projectId: string) {
  return useQuery({
    queryKey: iotKeys.device(projectId),
    queryFn: () => iotService.getDevice(projectId),
    retry: retryRead,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}

/**
 * Số đo mới nhất, hỏi lại theo `expectedReportIntervalSeconds` (không nhanh hơn 10 giây; OFFLINE / NO_DATA khoảng 30 giây). Dừng
 * khi `enabled` tắt (rời màn, app xuống nền), khi thiết bị bị khoá hay đã tháo, hoặc gặp lỗi 4xx; 429 chờ theo Retry-After
 */
export function useLatestReading(
  projectId: string,
  { enabled, reportIntervalSeconds }: { enabled: boolean; reportIntervalSeconds: number | undefined },
) {
  return useQuery({
    queryKey: iotKeys.latest(projectId),
    queryFn: () => iotService.getLatest(projectId),
    enabled,
    retry: retryRead,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      nextLatestPollMs(
        { status: query.state.status, data: query.state.data, error: query.state.error },
        reportIntervalSeconds ?? IOT_DEFAULTS.reportIntervalSeconds,
      ),
  })
}

/**
 * Lịch sử theo trang con trỏ: trang sau gửi `before = nextBefore` của trang trước. Chỉ tải khi người dùng mở; không tự tải lại.
 * `day` (YYYY-MM-DD theo giờ Việt Nam) lọc một ngày, null là mọi ngày
 */
export function useReadingHistory(projectId: string, day: string | null, opened: boolean) {
  return useInfiniteQuery<
    IotReadingHistory,
    Error,
    InfiniteData<IotReadingHistory, string | undefined>,
    ReturnType<typeof iotKeys.history>,
    string | undefined
  >({
    queryKey: iotKeys.history(projectId, day),
    queryFn: ({ pageParam }) =>
      iotService.getHistory(projectId, {
        from: day ? vnDayStart(day) : undefined,
        to: day ? vnDayEnd(day) : undefined,
        before: pageParam,
        limit: IOT_DEFAULTS.historyPageSize,
      }),
    initialPageParam: undefined,
    getNextPageParam: nextHistoryCursor,
    enabled: opened,
    retry: retryRead,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/** "Làm mới" lịch sử: về lại trang đầu, không tải lại mọi trang đã mở */
export function useResetHistory(projectId: string, day: string | null) {
  const client = useQueryClient()
  return useCallback(() => client.resetQueries({ queryKey: iotKeys.history(projectId, day) }), [client, projectId, day])
}

/** Rời công trình: huỷ lệnh đang chạy và xoá số đo đã tải của công trình đó */
export function useDropProjectOnLeave(projectId: string) {
  const client = useQueryClient()
  useEffect(
    () => () => {
      void client.cancelQueries({ queryKey: iotKeys.all(projectId) })
      client.removeQueries({ queryKey: iotKeys.all(projectId) })
    },
    [client, projectId],
  )
}
