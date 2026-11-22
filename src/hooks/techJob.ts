import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '@/hooks/queries'
import { isStaleRevisionError } from '@/lib/api/errors'
import { onsiteSurveyService, productService } from '@/lib/api/services'
import type { OnSiteSurveyRequest, OnSiteSurveyView } from '@/lib/api/types'

// Hook của luồng làm việc tại công trình: khảo sát, ảnh, báo giá, thu tiền. Cùng kiểu với hooks/queries.ts

export const techJobKeys = {
  survey: (appointmentId: string) => ['onsite-survey', appointmentId] as const,
  catalog: ['products', 'catalog'] as const,
}

/** Biên bản của lịch đã nhận; null khi chưa bắt đầu hay lưu lần nào */
export function useOnsiteSurvey(appointmentId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: techJobKeys.survey(appointmentId),
    queryFn: () => onsiteSurveyService.get(appointmentId),
    enabled: enabled && Boolean(appointmentId),
  })
}

/** Danh mục để chọn vật tư và dòng báo giá. Ít đổi trong một buổi khảo sát nên giữ 5 phút */
export function useCatalog() {
  return useQuery({ queryKey: techJobKeys.catalog, queryFn: productService.catalog, staleTime: 5 * 60_000 })
}

// Mọi lệnh ghi trả lại cả biên bản: đặt thẳng vào cache. Biên bản đã đổi ở nơi khác (revision cũ) thì tải lại;
// màn hình báo người dùng và giữ phần đang nhập, không gửi lại lệnh cũ
function useSurveyMutation<TVars>(
  appointmentId: string,
  mutationFn: (vars: TVars) => Promise<OnSiteSurveyView>,
  { refreshJob = false }: { refreshJob?: boolean } = {},
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (view) => client.setQueryData(techJobKeys.survey(appointmentId), view),
    onError: (error) => {
      if (isStaleRevisionError(error)) void client.invalidateQueries({ queryKey: techJobKeys.survey(appointmentId) })
    },
    // Bắt đầu / hoàn thành đổi trạng thái lịch hẹn nên tải lại việc của kỹ thuật viên
    onSettled: refreshJob
      ? () => {
          void client.invalidateQueries({ queryKey: keys.techJobs })
          void client.invalidateQueries({ queryKey: keys.techJob(appointmentId) })
        }
      : undefined,
  })
}

export function useStartSurvey(appointmentId: string) {
  return useSurveyMutation<void>(appointmentId, () => onsiteSurveyService.start(appointmentId), { refreshJob: true })
}

export function useSaveSurvey(appointmentId: string) {
  return useSurveyMutation<OnSiteSurveyRequest>(appointmentId, (body) => onsiteSurveyService.save(appointmentId, body))
}

export function useCompleteSurvey(appointmentId: string) {
  return useSurveyMutation<number>(appointmentId, (revision) => onsiteSurveyService.complete(appointmentId, revision), {
    refreshJob: true,
  })
}

export function useRemoveSurveyFile(appointmentId: string) {
  return useSurveyMutation<string>(appointmentId, (attachmentId) =>
    onsiteSurveyService.removeAttachment(appointmentId, attachmentId),
  )
}
