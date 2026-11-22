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
  /** PENDING, SCHEDULED, COMPLETED, CANCELLED (khách rút), CLOSED (kinh doanh đóng) */
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
  surveyRequestId: string | null
  ward: string | null
  communeName: string | null
  /** Đã qua giờ kết thúc mà chưa khảo sát xong */
  isOverdue: boolean
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
  isOverdue: boolean
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
  /** Thông số tự do; inverter có ratedAcPowerW, maxDcInputPowerW, maxDcVoltageV, mpptCount, efficiencyPercent, phase */
  spec?: unknown
  status?: string | null
  /** Cũ: link ảnh chính, giữ cho dữ liệu chưa có `images` */
  imageUrl?: string | null
  images?: ProductImage[] | null
}

export type ProductImage = {
  id?: string
  url?: string | null
  altText?: string | null
  sortOrder?: number
  isPrimary?: boolean
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

export type PreferredWindow = { startsAt: string; endsAt: string }

/** Đề xuất giờ khảo sát Smart Solar gửi khi khu vực chưa có kỹ thuật viên nhận lịch */
export type CustomerProposal = {
  proposalId: string
  startsAt: string
  endsAt: string
  technicianName: string
  /** PROPOSED | ACCEPTED | DECLINED | EXPIRED | WITHDRAWN | FAILED */
  status: string
  expiresAt: string
  respondedAt: string | null
  /** Gửi lại làm expectedRevision khi trả lời */
  revision: number
}

/** Yêu cầu nhờ Smart Solar xếp kỹ thuật viên. `status`: OPEN | PROPOSAL_PENDING | ASSIGNED | UNSERVICEABLE | CLOSED */
export type CustomerDispatch = {
  dispatchRequestId: string
  surveyRequestId: string
  status: string
  reason: string
  createdAt: string
  /** Hạn nhân viên phản hồi */
  reviewDueAt: string
  customerNote: string | null
  preferredWindows: PreferredWindow[]
  liveProposal: CustomerProposal | null
  latestProposal: CustomerProposal | null
  /** ASSIGNED | UNSERVICEABLE | CLOSED_BY_STAFF | CANCELLED_BY_CUSTOMER */
  resolution: string | null
  resolutionReason: string | null
  resolvedAt: string | null
  appointmentId: string | null
  revision: number
  created: boolean
}

/** Địa điểm của khách (GET /customers/me/sites) */
export type CustomerSite = {
  siteId: string
  name: string
  province: string | null
  district: string | null
  ward: string | null
  streetLine: string | null
  provinceCode: string | null
  communeCode: string | null
  communeName: string | null
  latitude: number | null
  longitude: number | null
  /** Tên enum in hoa: ROOFTOP, GROUND... Địa điểm khai không chọn mặt lắp thì null */
  installationSurfaceType: string | null
  surfaceMaterial: string | null
  preSurveyCount: number
}

/** Bản đánh giá của khách (GET /customers/me/pre-surveys). `status`: DRAFT | SUBMITTED */
export type CustomerDraftItem = {
  preSurveyId: string
  propertySiteId: string
  siteName: string
  status: string
  revision: number
  totalAreaM2: number | null
  usableAreaM2: number | null
  selectedSimulationId: string | null
  surveyRequestId: string | null
  createdAt: string
  updatedAt: string
}

export type ListPage<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number }

/**
 * Thiết bị đã lắp ở công trình. `assetType`: PANEL | INVERTER | BATTERY | METER | OTHER. Một dòng là một thiết bị có số seri,
 * hoặc một lô ghi theo số lượng (`serialNumber` null, `quantity` là số thiết bị)
 */
export type ProjectAsset = {
  assetType: string
  manufacturer: string
  model: string
  serialNumber: string | null
  quantity: number
  positionCode: string | null
  warrantyMonths: number | null
  /** Chỉ có trong biên bản bàn giao */
  warrantyEndsOn?: string | null
}

/** Công trình lắp đặt của khách (GET /customers/me/installation-projects). Khách không thấy tên, địa chỉ công trình */
export type CustomerProject = {
  projectId: string
  contractId: string
  status: string
  scheduledStartsAt: string | null
  scheduledEndsAt: string | null
  technicianName: string | null
  completedAt: string | null
  handoverAt: string | null
  cancelledAt: string | null
  assets: ProjectAsset[]
}

/** Biên bản bàn giao, có hạn bảo hành từng thiết bị (chỉ công trình đã bàn giao) */
export type ProjectHandover = {
  projectId: string
  handoverAt: string
  technicianName: string | null
  assets: ProjectAsset[]
}

// ---------- Giám sát điện năng IoT ----------
// Viết tay theo record C# của backend 7d27054 (Modules.IotMonitoring.IotViews, Installations.EnergyMonitoringView). Thời gian là
// chuỗi ISO-8601 có múi giờ. Không có view nào ở phía khách chứa khoá thiết bị

/** Tính lúc đọc: DISABLED > UNASSIGNED > NO_DATA > ONLINE / OFFLINE. UNASSIGNED không xảy ra ở phía khách */
export type IotConnectionStatus = 'ONLINE' | 'OFFLINE' | 'NO_DATA' | 'UNASSIGNED' | 'DISABLED' | (string & {})

/** Thiết bị đang gắn với công trình (GET …/energy-monitoring/device) */
export type IotProjectDevice = {
  bindingId: string
  /** Mã firmware, vd. ESP32-001 */
  deviceId: string
  displayName: string
  sensorModel: string | null
  maxCurrentAmps: number
  /** ACTIVE | DISABLED */
  deviceStatus: string
  connectionStatus: IotConnectionStatus
  boundAt: string
  lastReadingAt: string | null
  offlineAfterSeconds: number
  expectedReportIntervalSeconds: number
}

/** `currentAmps` giữ nguyên dấu như cảm biến đo (âm khi kẹp ngược chiều). `receivedAt` là giờ server nhận */
export type IotReading = {
  readingId: string
  deviceId: string
  receivedAt: string
  currentAmps: number
}

/** `reading` null khi chưa có số đo, và luôn null khi thiết bị DISABLED */
export type IotLatestReading = {
  connectionStatus: IotConnectionStatus
  reading: IotReading | null
}

/** Mới nhất trước. `nextBefore` là mốc thời gian (không phải số trang): gửi lại làm `before` để lấy trang cũ hơn */
export type IotReadingHistory = {
  items: IotReading[]
  limit: number
  hasMore: boolean
  nextBefore: string | null
  from: string | null
  to: string | null
}

/** MEASURED: phần cứng đo được; NOT_AVAILABLE: không đo, `value` luôn null (không bao giờ là 0) */
export type IotMeasuredQuantity = {
  status: 'MEASURED' | 'NOT_AVAILABLE' | (string & {})
  value: number | null
  unit: string
}

/** Khối `measured`: bản phần cứng V1 chỉ đo dòng điện (A); công suất, điện năng, mua / bán điện luôn NOT_AVAILABLE */
export type IotMeasuredMonitoring = {
  source: string
  device: IotProjectDevice
  latest: IotReading | null
  currentAmps: IotMeasuredQuantity
  powerWatts: IotMeasuredQuantity
  energyProducedKwh: IotMeasuredQuantity
  energyImportedKwh: IotMeasuredQuantity
  energyExportedKwh: IotMeasuredQuantity
  /** Câu tiếng Anh của backend: không hiện nguyên văn */
  notice: string
}

/**
 * Sản lượng của công trình (GET …/energy-monitoring). Hai nguồn tách hẳn: `simulated` là sản lượng dự kiến theo mô phỏng khách đã
 * chọn (không bao giờ là số đo), `measured` là số đo của thiết bị đang gắn (null khi công trình không có thiết bị).
 * `measuredDataAvailable` chỉ true khi thiết bị đang gắn đã có số đo và không bị khoá
 */
export type EnergyMonitoring = {
  projectId: string
  projectStatus?: string
  measuredDataAvailable: boolean
  /** MEASURED_DATA_AVAILABLE | NO_MEASURED_DATA | SIMULATION_UNAVAILABLE */
  status?: string
  simulated: {
    panelCount: number | null
    installedCapacityKwp: number | null
    annualEnergyKwh: number | null
  } | null
  /** IOT_DEVICE khi có thiết bị đang gắn */
  measuredDataSource?: string | null
  measured?: IotMeasuredMonitoring | null
}

// ---------- Khảo sát tại công trình (kỹ thuật viên) ----------
// Chép từ types/req/technicianOnSiteSurveyReq.ts và types/res/technicianOnSiteSurveyRes.ts của web

export type OnSiteSurveyObstacleRequest = {
  kind?: string | null
  description?: string | null
  heightM?: number | null
  areaM2?: number | null
}

export type BillOfMaterialsRequest = {
  materials?: { productId: string; quantity: number }[] | null
  serviceItems?: { productId: string; quantity: number }[] | null
  installationNotes?: string | null
}

/** Thân PUT …/onsite-survey; cũng là `changes` của một lần bổ sung (ô null giữ nguyên) */
export type OnSiteSurveyRequest = {
  /** null khi chưa có biên bản trên hệ thống */
  revision?: number | null
  roofType?: string | null
  roofMaterial?: string | null
  roofLengthM?: number | null
  roofWidthM?: number | null
  usableAreaM2?: number | null
  tiltDegree?: number | null
  azimuthDegree?: number | null
  roofCondition?: string | null
  electricalCabinetNotes?: string | null
  electricalConnectionNotes?: string | null
  installationFeasibility?: string | null
  proposedInverterLocation?: string | null
  proposedPanelLayoutNotes?: string | null
  measuredLatitude?: number | null
  measuredLongitude?: number | null
  notes?: string | null
  obstacles?: OnSiteSurveyObstacleRequest[] | null
  billOfMaterials?: BillOfMaterialsRequest
}

export type OnSiteSurveyAttachmentRequest = { fileId: string; category: string; caption?: string | null }

export type OnSiteSurveyAmendmentRequest = {
  revision: number
  reason: string
  changes: OnSiteSurveyRequest
  additionalFileIds?: string[] | null
}

export type OnSiteSurveyBillOfMaterials = {
  materials: { productId: string; quantity: number }[] | null
  serviceItems: { productId: string; quantity: number }[] | null
  installationNotes: string | null
}

export type OnSiteSurveyObstacleView = {
  /** CHIMNEY | WATER_TANK | SKYLIGHT | ANTENNA | VENT | TREE_SHADE | BUILDING_SHADE | OTHER */
  kind: string
  description: string | null
  heightM: number | null
  areaM2: number | null
}

export type OnSiteSurveyData = {
  roofType: string | null
  roofMaterial: string | null
  roofLengthM: number | null
  roofWidthM: number | null
  usableAreaM2: number | null
  tiltDegree: number | null
  azimuthDegree: number | null
  /** GOOD | FAIR | POOR */
  roofCondition: string | null
  electricalCabinetNotes: string | null
  electricalConnectionNotes: string | null
  /** FEASIBLE | FEASIBLE_WITH_CONDITIONS | NOT_FEASIBLE */
  installationFeasibility: string | null
  proposedInverterLocation: string | null
  proposedPanelLayoutNotes: string | null
  measuredLatitude: number | null
  measuredLongitude: number | null
  notes: string | null
  obstacles: OnSiteSurveyObstacleView[] | null
  billOfMaterials: OnSiteSurveyBillOfMaterials | null
}

export type OnSiteSurveyAttachmentView = {
  attachmentId: string
  fileId: string
  /** ROOF | ELECTRICAL | OBSTACLE | SITE | DOCUMENT */
  category: string
  caption: string | null
  addedAt: string
  /** Có khi tệp được gắn qua một lần bổ sung sau khi đã hoàn thành */
  amendmentId: string | null
}

export type OnSiteSurveyAmendmentView = {
  amendmentNumber: number
  authorUserId: string
  reason: string
  /** { tênTrường: { old, new } } */
  changes: unknown
  createdAt: string
}

/** GET/PUT …/onsite-survey, start, attachments, complete, amendments đều trả bản này */
export type OnSiteSurveyView = {
  reportId: string
  surveyRequestId: string
  appointmentId: string
  technicianUserId: string
  /** DRAFT | IN_PROGRESS | COMPLETED */
  status: string
  /** 0 khi chưa hoàn thành, 1 khi hoàn thành, tăng mỗi lần bổ sung */
  version: number
  /** Gửi làm `revision` khi lưu / hoàn thành */
  revision: number
  startedAt: string | null
  completedAt: string | null
  data: OnSiteSurveyData
  obstacles: OnSiteSurveyObstacleView[]
  attachments: OnSiteSurveyAttachmentView[]
  amendments: OnSiteSurveyAmendmentView[]
  updatedAt: string
}

export type OnSiteSurveyAttachmentUrlView = {
  id: string
  url: string
  expiresAt: string
  /** inline | attachment */
  disposition: string
  contentType: string
  fileName: string
}

// ---------- Tệp (Modules.Files) ----------

export type PresignedUploadRequest = { purpose: string; fileName: string; contentType: string; sizeBytes: number }

export type RegisterFileRequest = {
  purpose: string
  bucket: string
  objectKey: string
  fileName: string
  contentType: string
  sizeBytes: number
  checksumSha256: string | null
}

/** Link PUT ký sẵn. Ai giữ link cũng tải được nên không lưu, không ghi log */
export type UploadUrlView = {
  uploadUrl: string
  /** Luôn "PUT" */
  method: string
  bucket: string
  objectKey: string
  /** Header phải gửi kèm PUT: Content-Type đã được ký vào link */
  headers: Record<string, string>
  expiresAt: string
}

export type FileView = {
  fileId: string
  purpose: string
  bucket: string
  objectKey: string
  originalFileName: string
  /** PENDING_VERIFICATION | VERIFIED | REJECTED */
  status: string
  /** Câu tiếng Anh của backend khi REJECTED */
  rejectionReason: string | null
  contentType: string | null
  sizeBytes: number | null
  checksumSha256: string | null
  objectVersionId: string | null
  verifiedAt: string | null
  createdAt: string
}

/** Thông báo của khách, mới nhất trước (tối đa 100); `readAt` null là chưa đọc */
export type CustomerNotification = {
  notificationId: string
  type: string
  message: string
  requestId: string | null
  subscriptionId: string | null
  createdAt: string
  readAt: string | null
}

export type SignedFileUrl = { url: string; expiresAt: string; contentType: string; fileName: string }

export type UploadTarget = {
  method: string
  uploadUrl: string
  headers: Record<string, string> | null
  bucket: string
  objectKey: string
}

export type StoredFile = {
  fileId: string
  /** PENDING_VERIFICATION | VERIFIED | REJECTED */
  status: string
  rejectionReason: string | null
}

/** Công trình lắp đặt theo góc nhìn kỹ thuật viên phụ trách; mọi thao tác trả lại bản mới */
export type InstallationProject = {
  projectId: string
  /** SCHEDULED | IN_PROGRESS | PENDING_CUSTOMER_ACCEPTANCE | REWORK_REQUIRED | COMPLETED | CANCELLED ... */
  status: string
  /** PENDING | ACCEPTED | DECLINED | REPLACED | COMPLETED | CANCELLED */
  myAssignmentStatus: string
  startsAt: string
  endsAt: string
  zoneName: string | null
  /** null sau khi từ chối */
  site: {
    propertyName: string
    province: string
    district: string | null
    ward: string | null
    streetLine: string | null
    customerName: string
    customerPhone: string | null
  } | null
  startedAt: string | null
  acceptanceRequestedAt: string | null
  completedAt: string | null
  /** Khách / quản lý yêu cầu sửa lại thì sang lượt mới và cần ảnh mới */
  currentRound: number
  revision: number
  canStart: boolean
  startBlockedReason: string | null
  evidence: { evidenceId: string; fileId: string; round: number; caption: string | null; addedAt: string }[]
  assets: (ProjectAsset & { assetId: string; productId: string | null })[]
  acceptances: {
    round: number
    requestedAt: string
    completionReport: string
    /** PENDING | ACCEPTED | REWORK_REQUESTED */
    decision: string
    decidedAt: string | null
    reason: string | null
    decidedBy: string | null
  }[]
  equipment?: {
    /** MATCHES | SUBSTITUTION_APPROVAL_REQUIRED | SUBSTITUTION_APPROVED | ... */
    status: string
    differences: {
      productId: string
      productType: string
      name: string | null
      contractedQuantity: number
      installedQuantity: number
    }[]
  } | null
  requiresPanelAndInverterAssets?: boolean
}
