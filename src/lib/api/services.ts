import { apiGet, apiPost, apiPut } from '@/lib/api/client'
import type {
  AuthTokens,
  AssessmentObstacle,
  AssessmentSurface,
  Commune,
  CustomerAppointment,
  CustomerRequest,
  CustomerRequestDetail,
  Product,
  ProductPage,
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
}

export const technicianService = {
  listAppointments: () => apiGet<TechnicianAppointment[]>('/technicians/me/appointments'),
  getAppointment: (id: string) => apiGet<TechnicianJob>(`/technicians/me/appointments/${encode(id)}`),
  acknowledge: (id: string) =>
    apiPost<{ appointmentId: string; status: string; acknowledgedAt: string; alreadyAcknowledged: boolean }>(
      `/technicians/me/appointments/${encode(id)}/acknowledge`,
    ),
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
