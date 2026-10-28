import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assessmentService, customerService, productService, technicianService } from '@/lib/api/services'

export const keys = {
  customerRequests: ['customer-requests'] as const,
  customerRequest: (id: string) => ['customer-requests', id] as const,
  slots: (siteId: string, date: string) => ['survey-slots', siteId, date] as const,
  /** Gốc chung của việc chờ nhận, việc của tôi và lịch ngày */
  techJobs: ['technician-jobs'] as const,
  techMine: ['technician-jobs', 'mine'] as const,
  techOpen: ['technician-jobs', 'open'] as const,
  schedule: (date: string) => ['technician-jobs', 'schedule', date] as const,
  techJob: (id: string) => ['technician-job', id] as const,
  products: (search: string) => ['products', search] as const,
  product: (id: string) => ['products', 'detail', id] as const,
  communes: ['communes', '79'] as const,
}

/** Danh mục phường, xã ít đổi nên tải một lần mỗi lần mở app */
export function useHcmCommunes() {
  return useQuery({
    queryKey: keys.communes,
    queryFn: assessmentService.listCommunes,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Tự tải lại để số đỏ trên tab cập nhật khi kỹ thuật viên nhận lịch hay lịch đổi */
export function useCustomerRequests() {
  return useQuery({ queryKey: keys.customerRequests, queryFn: customerService.listRequests, refetchInterval: 60_000 })
}

export function useCustomerRequest(id: string) {
  return useQuery({
    queryKey: keys.customerRequest(id),
    queryFn: () => customerService.getRequest(id),
    enabled: Boolean(id),
  })
}

export function useSurveySlots(siteId: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.slots(siteId, date),
    queryFn: () => customerService.getSlots(siteId, date),
    enabled,
  })
}

export function useBookingMutation(id: string, mode: 'book' | 'reschedule') {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ startsAt, note }: { startsAt: string; note: string }) =>
      mode === 'book' ? customerService.book(id, startsAt, note) : customerService.reschedule(id, startsAt, note),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.customerRequests }),
        client.invalidateQueries({ queryKey: keys.customerRequest(id) }),
      ])
    },
  })
}

export function useCancelBooking(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => customerService.cancel(id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.customerRequests }),
        client.invalidateQueries({ queryKey: keys.customerRequest(id) }),
      ])
    },
  })
}

/** Lịch mới khách đặt hiện ra mà không cần kéo xuống tải lại */
const JOBS_REFRESH_MS = 60_000

export function useTechJobs() {
  return useQuery({
    queryKey: keys.techMine,
    queryFn: technicianService.listAppointments,
    refetchInterval: JOBS_REFRESH_MS,
  })
}

export function useOpenJobs() {
  return useQuery({ queryKey: keys.techOpen, queryFn: technicianService.listOpen, refetchInterval: JOBS_REFRESH_MS })
}

export function useTechJob(id: string) {
  return useQuery({
    queryKey: keys.techJob(id),
    queryFn: () => technicianService.getAppointment(id),
    enabled: Boolean(id),
  })
}

// Nhận hay trả việc đều đổi cả việc chờ nhận, việc của tôi và lịch ngày. Chi tiết việc vừa trả không tải lại vì đã hết quyền xem
function useRefreshTechJobs() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: keys.techJobs })
}

export function useAcceptJob() {
  const refresh = useRefreshTechJobs()
  return useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) => technicianService.accept(id, revision),
    onSettled: refresh,
  })
}

export function useReleaseJob(id: string) {
  const refresh = useRefreshTechJobs()
  return useMutation({ mutationFn: (reason: string) => technicianService.release(id, reason), onSettled: refresh })
}

export function useTechSchedule(date: string) {
  return useQuery({ queryKey: keys.schedule(date), queryFn: () => technicianService.schedule(date) })
}

export function useProducts(search: string) {
  return useQuery({ queryKey: keys.products(search), queryFn: () => productService.list(search) })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: keys.product(id), queryFn: () => productService.get(id), enabled: Boolean(id) })
}
