import { ApiError, apiGet, apiPost, apiPut } from '@/lib/api/client'
import type {
  AcceptResult,
  AuthTokens,
  AssessmentObstacle,
  AssessmentSurface,
  Commune,
  CustomerAppointment,
  CustomerDispatch,
  CustomerDraftItem,
  CustomerRequest,
  CustomerSite,
  CustomerRequestDetail,
  ListPage,
  OpenAppointment,
  PreferredWindow,
  Product,
  ProductPage,
  ReleaseResult,
  SurveySlots,
  TechnicianAppointment,
  TechnicianJob,
  TechnicianSchedule,
} from '@/lib/api/types'

const encode = encodeURIComponent
const collator = new Intl.Collator('vi')

/** TP.HCM, tỉnh duy nhất đang nhận công trình */
export const HCM_PROVINCE = { code: '79', name: 'Thành phố Hồ Chí Minh' } as const

export const authService = {
  login: (email: string, password: string) => apiPost<AuthTokens>('/auth/login', { email, password }),
  refresh: (refreshToken: string) => apiPost<AuthTokens>('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => apiPost<{ accepted?: boolean }>('/auth/logout', { refreshToken }),
}

export const customerService = {
  listRequests: () => apiGet<CustomerRequest[]>('/customers/me/survey-requests'),
  getRequest: (id: string) => apiGet<CustomerRequestDetail>(`/customers/me/survey-requests/${encode(id)}`),
  getSlots: (propertySiteId: string, date: string) =>
    apiGet<SurveySlots>(`/survey-slots?propertySiteId=${encode(propertySiteId)}&date=${encode(date)}`),
  book: (id: string, startsAt: string, note: string) =>
    apiPost(`/customers/me/survey-requests/${encode(id)}/booking`, { startsAt, note: note.trim() || null }),
  reschedule: (id: string, startsAt: string, note: string) =>
    apiPut(`/customers/me/survey-requests/${encode(id)}/booking`, { startsAt, note: note.trim() || null }),
  cancel: (id: string) =>
    apiPost<CustomerAppointment>(`/customers/me/survey-requests/${encode(id)}/booking/cancel`, {
      reason: 'Khách hàng hủy lịch trên ứng dụng di động.',
    }),
  /** Rút hẳn yêu cầu, không mở lại được. Còn lịch đang hẹn hoặc đã có hợp đồng thì bị từ chối (409) */
  withdraw: (id: string) => apiPost(`/customers/me/survey-requests/${encode(id)}/withdraw`, { reason: null }),
  /** Yêu cầu xếp kỹ thuật viên mới nhất; chưa từng gửi thì null */
  getDispatch: async (id: string) => {
    try {
      return await apiGet<CustomerDispatch>(`/customers/me/survey-requests/${encode(id)}/dispatch-request`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },
  /** Khu vực chưa có kỹ thuật viên nhận lịch: khách gửi tối đa 5 khung giờ tiện */
  createDispatch: (id: string, preferredWindows: PreferredWindow[], note: string) =>
    apiPost<CustomerDispatch>(`/customers/me/survey-requests/${encode(id)}/dispatch-request`, {
      preferredWindows,
      note: note.trim() || null,
    }),
  acceptProposal: (id: string, proposalId: string, revision: number) =>
    apiPost<CustomerDispatch>(
      `/customers/me/survey-requests/${encode(id)}/dispatch-request/proposals/${encode(proposalId)}/accept`,
      { expectedRevision: revision },
    ),
  declineProposal: (id: string, proposalId: string, revision: number) =>
    apiPost<CustomerDispatch>(
      `/customers/me/survey-requests/${encode(id)}/dispatch-request/proposals/${encode(proposalId)}/decline`,
      { reason: null, expectedRevision: revision },
    ),
  cancelDispatch: (id: string) =>
    apiPost<CustomerDispatch>(`/customers/me/survey-requests/${encode(id)}/dispatch-request/cancel`, {
      reason: null,
    }),
}

export const technicianService = {
  /** Gồm cả lịch quá giờ chưa khảo sát và lịch đã khảo sát xong */
  listAppointments: () => apiGet<TechnicianAppointment[]>('/technicians/me/appointments?includePast=true'),
  getAppointment: (id: string) => apiGet<TechnicianJob>(`/technicians/me/appointments/${encode(id)}`),
  /** Lịch khách đặt trong khu vực của mình đang chờ người nhận, ai nhận trước thì được */
  listOpen: () => apiGet<OpenAppointment[]>('/technicians/me/open-appointments'),
  /** Người khác nhận trước thì trả 409 APPOINTMENT_ALREADY_TAKEN */
  accept: (id: string, expectedRevision: number) =>
    apiPost<AcceptResult>(`/technicians/me/appointments/${encode(id)}/accept`, { expectedRevision }),
  /** Trả lại việc đã nhận, lịch quay về chờ kỹ thuật viên khác nhận */
  release: (id: string, reason: string) =>
    apiPost<ReleaseResult>(`/technicians/me/appointments/${encode(id)}/release`, { reason }),
  schedule: (date: string) => apiGet<TechnicianSchedule>(`/technicians/me/schedule?date=${encode(date)}`),
}

export const productService = {
  list: (search = '') =>
    apiGet<ProductPage>(
      `/products?Page=1&PageSize=50&SortBy=name&SortDirection=asc${search ? `&Search=${encode(search)}` : ''}`,
    ),
  get: (id: string) => apiGet<Product>(`/products/${encode(id)}`),
}

export const assessmentService = {
  /** Địa điểm đã khai, đọc được ở mọi máy */
  listSites: () => apiGet<ListPage<CustomerSite>>('/customers/me/sites?page=1&pageSize=100'),
  /** Bản nháp chưa gửi, sửa gần nhất trước */
  listDrafts: () =>
    apiGet<ListPage<CustomerDraftItem>>(
      '/customers/me/pre-surveys?status=DRAFT&sortBy=updatedAt&sortDirection=desc&page=1&pageSize=20',
    ),
  createProfile: (body: {
    customerType: 1 | 2
    companyName: string | null
    taxCode: string | null
    note: string | null
  }) => apiPost<{ customerId: string }>('/customers/me', body),
  createSite: (body: {
    name: string
    province: string
    provinceCode: string
    district: null
    ward: string
    communeCode: string
    streetLine: string | null
    latitude: number | null
    longitude: number | null
    installationSurfaceType: number
    surfaceMaterial: string | null
    note: null
  }) => apiPost<{ propertySiteId: string }>('/customers/me/sites', body),
  /** Phường, xã của TP.HCM, xếp theo tên */
  listCommunes: async () => {
    const communes = await apiGet<Commune[]>(`/administrative-units/communes?provinceCode=${HCM_PROVINCE.code}`)
    return [...communes].sort((a, b) => collator.compare(a.name, b.name))
  },
  createDraft: (propertySiteId: string) =>
    apiPost<{ preSurveyId: string }>('/pre-surveys', {
      propertySiteId,
      totalAreaM2: null,
      usableAreaM2: null,
      tiltDegree: null,
      azimuthDegree: null,
      hasObstruction: null,
    }),
  getSurface: (preSurveyId: string) => apiGet<AssessmentSurface>(`/pre-surveys/${encode(preSurveyId)}/surface`),
  saveSurface: (
    preSurveyId: string,
    body: {
      expectedRevision: number
      surfaceLengthM: number
      surfaceWidthM: number
      surfaceTiltDegree: number
      surfaceAzimuthDegree: number
      obstacles: AssessmentObstacle[]
    },
  ) => apiPut<{ revision: number; geometryVersion: number }>(`/pre-surveys/${encode(preSurveyId)}/surface`, body),
  updateDeclared: (
    preSurveyId: string,
    body: {
      totalAreaM2: number
      usableAreaM2: number
      tiltDegree: number
      azimuthDegree: number
      hasObstruction: boolean
    },
  ) => apiPut<unknown>(`/pre-surveys/${encode(preSurveyId)}`, body),
  submit: (preSurveyId: string) => apiPost<{ surveyRequestId: string }>(`/pre-surveys/${encode(preSurveyId)}/submit`),
}
