export type UserRole = 'customer' | 'technician' | 'sales' | 'manager' | 'admin'

export type AuthTokens = {
  userId?: string
  accessToken?: string | null
  accessTokenExpiresAt?: string
  refreshToken?: string | null
  refreshTokenExpiresAt?: string
  tokenType?: string | null
}

export type ApiEnvelope<T> = {
  isSuccess?: boolean
  traceId?: string | null
  data?: T
  error?: { code?: string | null; message?: string | null; details?: unknown } | null
}

export type CustomerAppointment = {
  appointmentId: string
  startsAt: string
  endsAt: string
  status: string
  /** Trạng thái khách thấy: WAITING_FOR_TECHNICIAN, NEEDS_STAFF, CONFIRMED, COMPLETED, CANCELLED */
  acceptanceStatus: string
  technicianAssigned: boolean
  assignedTechnicianName: string | null
  customerNote: string | null
  bookedAt: string
  canCustomerChange: boolean
}

export type CustomerRequest = {
  surveyRequestId: string
  preSurveyId: string
  propertySiteId: string
  propertyName: string
  status: string
  submittedAt: string
  scheduledAt: string | null
  appointment: CustomerAppointment | null
}

export type CustomerRequestDetail = {
  request: CustomerRequest
  history: {
    appointmentId: string
    startsAt: string
    endsAt: string
    status: string
    bookedAt: string
  }[]
}

export type SurveySlot = {
  startsAt: string
  endsAt: string
  startsAtUtc: string
  endsAtUtc: string
  canBook: boolean
  capacityStatus: string
  knownAvailableTechnicians: number
  status: string
}

export type ZoneView = { zoneId: string; code: string; name: string }

export type SurveySlots = {
  date: string
  timeZone: string
  appointmentDurationMinutes: number
  zone: ZoneView | null
  slots: SurveySlot[]
  note: string | null
  /** COVERED, hoặc lý do ngày đó không có giờ để đặt */
  coverageStatus: string
  dispatchAvailable: boolean
}

/** Việc đã xác nhận: tự nhận hoặc được phân công */
export type TechnicianAppointment = {
  appointmentId: string
  appointmentType: string
  startsAt: string
  endsAt: string
  status: string
  /** SELF_ACCEPTED hoặc do kinh doanh / quản lý phân công */
  assignmentSource: string | null
  propertyName: string
  province: string
  district: string | null
  assignedAt: string | null
}

/** Lịch đang chờ người nhận trong khu vực; địa chỉ cụ thể và liên hệ của khách chỉ có sau khi nhận */
export type OpenAppointment = {
  appointmentId: string
  surveyRequestId: string
  startsAt: string
  endsAt: string
  status: string
  acceptanceDeadlineAt: string | null
  /** Gửi lại làm expectedRevision khi nhận việc */
  revision: number
  zone: ZoneView | null
  propertyName: string
  province: string
  district: string | null
  ward: string | null
  installationSurfaceType: string | null
  totalAreaM2: number | null
  usableAreaM2: number | null
  /** Chỉ để gợi ý, lúc nhận việc backend kiểm tra lại */
  canAccept: boolean
  reason: string | null
  requiresHoldRehoming: boolean
}

export type AcceptResult = { appointmentId: string; appointmentStatus: string; changed: boolean; revision: number }

export type ReleaseResult = { appointmentId: string; appointmentStatus: string; hasNewHolder: boolean; message: string }

export type TechnicianJob = {
  appointmentId: string
  appointmentType: string
  startsAt: string
  endsAt: string
  status: string
  assignmentSource: string | null
  assignedAt: string | null
  acceptedAt: string | null
  customerNote: string | null
  surveyRequestId: string
  revision: number
  customer: { fullName: string; phone: string | null; email: string | null }
  property: {
    propertySiteId: string
    name: string
    province: string
    district: string | null
    ward: string | null
    streetLine: string | null
    latitude: number | null
    longitude: number | null
    installationSurfaceType: string | null
    surfaceMaterial: string | null
  }
  preSurvey: {
    preSurveyId: string
    totalAreaM2: number | null
    usableAreaM2: number | null
    surfaceLengthM: number | null
    surfaceWidthM: number | null
    surfaceTiltDegree: number | null
    surfaceAzimuthDegree: number | null
    hasObstruction: boolean | null
    obstacleCount: number
  }
}

export type ScheduleAppointment = {
  appointmentId: string
  appointmentType: string
  startsAt: string
  endsAt: string
  status: string
  isCapacityHold: boolean
  propertyName: string
  /** Lịch trước kết thúc cộng khoảng nghỉ vẫn muộn hơn giờ bắt đầu lịch này */
  potentialConflict: boolean
}

export type TechnicianSchedule = {
  technicianUserId: string
  date: string
  timeZone: string
  appointmentCount: number
  /** Khoảng nghỉ cố định giữa hai lịch, tính bằng phút */
  bufferBetweenAppointmentsMinutes: number
  conflictCount: number
  appointments: ScheduleAppointment[]
  note: string
}

export type Product = {
  id?: string
  sku?: string | null
  productType?: string | null
  category?: string | null
  name?: string | null
  brand?: string | null
  model?: string | null
  unit?: string | null
  unitPrice?: number
  currency?: string | null
  ratedPowerW?: number | null
  widthMm?: number | null
  heightMm?: number | null
  warrantyMonth?: number | null
  status?: string | null
  imageUrl?: string | null
}

export type ProductPage = {
  items?: Product[] | null
  page?: number
  pageSize?: number
  totalItems?: number
  totalPages?: number
}

export type AssessmentObstacle = {
  name: string
  xM: number
  yM: number
  widthM: number
  lengthM: number
  heightM: number | null
}

export type AssessmentSurface = {
  preSurveyId: string
  status: string
  revision: number
  geometryVersion: number
  surfaceDefined: boolean
  surfaceLengthM: number | null
  surfaceWidthM: number | null
  surfaceTiltDegree: number | null
  surfaceAzimuthDegree: number | null
  obstacles: AssessmentObstacle[]
  declared: {
    totalAreaM2: number | null
    usableAreaM2: number | null
    hasObstruction: boolean | null
    note: string
  }
  latitude: number | null
  longitude: number | null
  selectedSimulationId: string | null
}

/** Một phường, xã hoặc đặc khu đang hiệu lực (GET /api/administrative-units/communes) */
export type Commune = {
  /** 5 chữ số, giữ số 0 ở đầu */
  code: string
  name: string
  unitType: string
  provinceCode: string
}

export type AssessmentDraft = {
  propertySiteId: string
  preSurveyId?: string
  revision?: number
  site: {
    name: string
    ward: string
    /** Bản nháp lưu trước khi có danh mục phường thì không có mã */
    communeCode?: string
    streetLine: string
    installationSurfaceType: number
    surfaceMaterial: string
  }
}
