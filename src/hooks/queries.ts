import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import {
  assessmentService,
  customerService,
  installationService,
  productService,
  technicianService,
} from '@/lib/api/services'
import type {
  CustomerDispatch,
  CustomerProject,
  CustomerProposal,
  CustomerRequest,
  PreferredWindow,
  ProjectHandover,
} from '@/lib/api/types'
import { canBook, isActiveDispatch } from '@/lib/status'

export const keys = {
  customerRequests: ['customer-requests'] as const,
  customerRequest: (id: string) => ['customer-requests', id] as const,
  dispatch: (id: string) => ['customer-requests', id, 'dispatch'] as const,
  mySites: ['assessment', 'sites'] as const,
  myDrafts: ['assessment', 'drafts'] as const,
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
  projects: ['customer-projects'] as const,
  handover: (id: string) => ['customer-projects', id, 'handover'] as const,
  energy: (id: string) => ['customer-projects', id, 'energy'] as const,
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

export function useWithdrawRequest(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => customerService.withdraw(id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.customerRequests }),
        client.invalidateQueries({ queryKey: keys.customerRequest(id) }),
      ])
    },
  })
}

/**
 * Địa điểm và bản nháp lưu trên tài khoản, để mở tiếp việc làm ở máy khác. Màn đánh giá tạo địa điểm, bản nháp
 * mà không qua cache nên mỗi lần hiện danh sách đều tải lại
 */
export function useMySites(enabled: boolean) {
  return useQuery({ queryKey: keys.mySites, queryFn: assessmentService.listSites, enabled, staleTime: 0 })
}

export function useMyDrafts(enabled: boolean) {
  return useQuery({ queryKey: keys.myDrafts, queryFn: assessmentService.listDrafts, enabled, staleTime: 0 })
}

/** Yêu cầu xếp kỹ thuật viên của khách; đề xuất có hạn trả lời nên tải lại mỗi phút */
export function useCustomerDispatch(id: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.dispatch(id),
    queryFn: () => customerService.getDispatch(id),
    enabled: Boolean(id) && enabled,
    refetchInterval: 60_000,
  })
}

// Hàm cố định để useQueries chỉ dựng lại Map khi dữ liệu đổi
function byRequest(results: UseQueryResult<CustomerDispatch | null>[]) {
  const dispatches = new Map<string, CustomerDispatch>()
  for (const r of results) if (r.data) dispatches.set(r.data.surveyRequestId, r.data)
  return { dispatches, pending: results.some((r) => r.isPending) }
}

/**
 * Yêu cầu xếp kỹ thuật viên của các yêu cầu chưa có lịch, cho danh sách và số đỏ (danh sách chưa có trạng thái này).
 * Dùng chung cache với màn chi tiết; chỉ tự tải lại khi đang chờ nhân viên hoặc chờ khách trả lời
 */
export function useCustomerDispatches(requests: CustomerRequest[] | undefined) {
  return useQueries({
    queries: (requests ?? []).filter(canBook).map((r) => ({
      queryKey: keys.dispatch(r.surveyRequestId),
      queryFn: () => customerService.getDispatch(r.surveyRequestId),
      refetchInterval: (query: { state: { data?: CustomerDispatch | null } }) =>
        isActiveDispatch(query.state.data?.status) ? 60_000 : false,
    })),
    combine: byRequest,
  })
}

/** Mọi thao tác điều phối (kể cả lỗi) tải lại yêu cầu vì nhân viên cũng đang sửa */
function useDispatchMutation<Vars>(id: string, action: (vars: Vars) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.customerRequests }),
        client.invalidateQueries({ queryKey: keys.customerRequest(id) }),
      ])
    },
  })
}

export function useCreateDispatch(id: string) {
  return useDispatchMutation(id, ({ windows, note }: { windows: PreferredWindow[]; note: string }) =>
    customerService.createDispatch(id, windows, note),
  )
}

export function useAnswerProposal(id: string) {
  return useDispatchMutation(id, ({ proposal, accept }: { proposal: CustomerProposal; accept: boolean }) =>
    accept
      ? customerService.acceptProposal(id, proposal.proposalId, proposal.revision)
      : customerService.declineProposal(id, proposal.proposalId, proposal.revision),
  )
}

export function useCancelDispatch(id: string) {
  return useDispatchMutation(id, () => customerService.cancelDispatch(id))
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

export function useMyProjects() {
  return useQuery({ queryKey: keys.projects, queryFn: installationService.listProjects })
}

/** Biên bản bàn giao của mọi công trình đã bàn giao, theo mã công trình */
export function useHandovers(projects: CustomerProject[] | undefined) {
  const done = (projects ?? []).filter((p) => p.status === 'COMPLETED')
  return useQueries({
    queries: done.map((p) => ({
      queryKey: keys.handover(p.projectId),
      queryFn: () => installationService.getHandover(p.projectId),
    })),
    combine: (results) => ({
      handovers: new Map(
        results.flatMap((r) => (r.data ? [[r.data.projectId, r.data] as [string, ProjectHandover]] : [])),
      ),
      pending: results.some((r) => r.isPending),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  })
}

/** Sản lượng chỉ có cho công trình đã bàn giao */
export function useEnergy(project: CustomerProject) {
  return useQuery({
    queryKey: keys.energy(project.projectId),
    queryFn: () => installationService.getEnergy(project.projectId),
    enabled: project.status === 'COMPLETED',
  })
}
