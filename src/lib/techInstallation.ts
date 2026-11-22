import type { InstallationProject, Product } from '@/lib/api/types'
import type { Tone } from '@/lib/status'

// Công trình lắp đặt theo góc nhìn kỹ thuật viên phụ trách (phần của khách ở lib/installation.ts). Điều kiện bám kiểm tra của backend (RegisterAssetsAsync, ...),
// giống web: nhận / từ chối cần phân công PENDING; bắt đầu, ảnh, thiết bị, báo cáo cần phân công ACCEPTED

type View = InstallationProject

export const REASON_MAX = 500
export const REPORT_MAX = 8000
export const LOT_MAX = 10_000
export const WARRANTY_MAX_MONTHS = 600

const STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Chờ xếp kỹ thuật viên',
  PENDING_TECHNICIAN_ACCEPTANCE: 'Chờ bạn nhận việc',
  SCHEDULED: 'Đã nhận, chờ lắp đặt',
  IN_PROGRESS: 'Đang lắp đặt',
  PENDING_CUSTOMER_ACCEPTANCE: 'Chờ nghiệm thu nội bộ',
  REWORK_REQUIRED: 'Cần sửa lại',
  COMPLETED: 'Đã bàn giao',
  CANCELLED: 'Đã huỷ',
}

const STATUS_TONES: Record<string, Tone> = {
  PENDING_TECHNICIAN_ACCEPTANCE: 'danger',
  SCHEDULED: 'success',
  IN_PROGRESS: 'info',
  PENDING_CUSTOMER_ACCEPTANCE: 'info',
  REWORK_REQUIRED: 'danger',
}

export const ASSET_TYPES = [
  { value: 'PANEL', label: 'Tấm pin' },
  { value: 'INVERTER', label: 'Inverter' },
  { value: 'BATTERY', label: 'Pin lưu trữ' },
  { value: 'METER', label: 'Đồng hồ điện' },
  { value: 'OTHER', label: 'Thiết bị khác' },
] as const

const START_BLOCKED: Record<string, string> = {
  INSTALLATION_ASSIGNMENT_NOT_ACCEPTED: 'Nhận việc trước rồi mới bắt đầu lắp đặt được.',
  INSTALLATION_TOO_EARLY_TO_START: 'Chưa tới ngày lắp đặt.',
  INSTALLATION_SCHEDULE_EXPIRED: 'Đã hết khung giờ lắp đặt. Báo quản lý xếp lại lịch trước khi bắt đầu.',
  INSTALLATION_CHECKLIST_INCOMPLETE: 'Quản lý chưa hoàn tất các hạng mục trước thi công.',
}

/** Chờ mình trả lời. Công trình đang làm mà quản lý đổi sang mình thì trạng thái công trình vẫn là IN_PROGRESS */
export const awaitsAnswer = (v: Pick<View, 'myAssignmentStatus'>) => v.myAssignmentStatus === 'PENDING'

export function installationStatus(v: Pick<View, 'myAssignmentStatus' | 'status'>) {
  const status = awaitsAnswer(v) ? 'PENDING_TECHNICIAN_ACCEPTANCE' : v.status
  return { label: STATUS_LABELS[status] ?? status, tone: STATUS_TONES[status] ?? ('neutral' as Tone) }
}

export type InstallationGroup = 'pending' | 'active' | 'done'

export function installationGroup(v: Pick<View, 'myAssignmentStatus' | 'status'>): InstallationGroup {
  if (awaitsAnswer(v)) return 'pending'
  if (v.myAssignmentStatus === 'COMPLETED' || v.status === 'COMPLETED' || v.status === 'CANCELLED') return 'done'
  return 'active'
}

/** Việc kỹ thuật viên phải làm ngay: trả lời phân công, hoặc sửa lại theo yêu cầu */
export const needsAction = (v: Pick<View, 'myAssignmentStatus' | 'status'>) =>
  awaitsAnswer(v) || (v.myAssignmentStatus === 'ACCEPTED' && v.status === 'REWORK_REQUIRED')

/** Backend từ chối nhận việc khi khung giờ được giao đã qua */
export const assignmentEnded = (v: Pick<View, 'endsAt'>, now: number) => new Date(v.endsAt).getTime() <= now

export const awaitsStart = (v: View) => v.myAssignmentStatus === 'ACCEPTED' && v.status === 'SCHEDULED'

/** Đang làm: thêm ảnh, ghi thiết bị, gửi báo cáo */
export const canWork = (v: View) =>
  v.myAssignmentStatus === 'ACCEPTED' && (v.status === 'IN_PROGRESS' || v.status === 'REWORK_REQUIRED')

/** Hiện ảnh và thiết bị khi đã bắt đầu hoặc đã có dữ liệu */
export const showsWork = (v: View) => Boolean(v.startedAt) || v.evidence.length > 0 || v.assets.length > 0

export const roundPhotoCount = (v: View) => v.evidence.filter((e) => e.round === v.currentRound).length

export const startBlockedText = (code: string | null | undefined) =>
  code ? (START_BLOCKED[code] ?? 'Chưa bắt đầu lắp đặt được.') : null

/** Báo cáo cần ít nhất một tấm pin và một inverter (trừ khi công trình không bắt buộc) */
export const missingAssetTypes = (v: Pick<View, 'assets' | 'requiresPanelAndInverterAssets'>) =>
  v.requiresPanelAndInverterAssets === false
    ? []
    : ['PANEL', 'INVERTER'].filter((type) => !v.assets.some((a) => a.assetType === type))

/** Thiết bị lắp khác hợp đồng chưa được quản lý duyệt thì backend chưa nhận báo cáo */
export const awaitsSubstitutionApproval = (v: Pick<View, 'equipment'>) =>
  v.equipment?.status === 'SUBSTITUTION_APPROVAL_REQUIRED'

/** Lần sửa lại gần nhất */
export const latestRework = (v: Pick<View, 'acceptances'>) =>
  [...v.acceptances].reverse().find((a) => a.decision === 'REWORK_REQUESTED') ?? null

/** Việc tiếp theo của kỹ thuật viên, đỏ khi phải làm ngay */
/** Câu nhắc việc tiếp theo; chuỗi rỗng khi trạng thái và nút trên màn đã nói đủ */
export function nextStep(v: View, now: number): { text: string; tone: Tone } {
  if (awaitsAnswer(v))
    return assignmentEnded(v, now)
      ? { text: 'Quá khung giờ được giao, báo quản lý xếp lại hoặc từ chối.', tone: 'warning' }
      : { text: '', tone: 'danger' }
  if (v.status === 'SCHEDULED')
    return v.canStart
      ? { text: '', tone: 'danger' }
      : { text: startBlockedText(v.startBlockedReason) ?? 'Chưa bắt đầu được.', tone: 'info' }
  const ready = roundPhotoCount(v) > 0 && missingAssetTypes(v).length === 0
  if (canWork(v) && ready && awaitsSubstitutionApproval(v))
    return { text: 'Thiết bị chưa khớp hợp đồng: ghi đủ hoặc chờ quản lý duyệt.', tone: 'info' }
  if (v.status === 'REWORK_REQUIRED') {
    const rework = latestRework(v)
    const who = rework?.decidedBy === 'STAFF' ? 'Quản lý trả về' : 'Khách yêu cầu sửa'
    return {
      text: `${who}${rework?.reason ? `: ${rework.reason}` : ''}. Chụp ảnh lượt ${v.currentRound} rồi gửi lại báo cáo.`,
      tone: 'danger',
    }
  }
  return { text: '', tone: 'neutral' }
}

// Một lô thiết bị đã lắp: một sản phẩm danh mục và số lượng (backend bắt lô phải có productId), không ghi serial

export type AssetLot = { assetType: string; productId: string | null; quantity: string; warrantyMonths: string }
export type AssetLotErrors = Partial<Record<keyof AssetLot, string>>

const SERVICE_TYPES = new Set(['INSTALLATION_LABOR', 'TRANSPORT', 'OTHER_SERVICE'])

/** Sản phẩm hợp với loại thiết bị: tấm pin là SOLAR_PANEL, inverter là INVERTER, loại khác là hàng không phải dịch vụ */
export function productFitsAsset(assetType: string, productType: string | null | undefined) {
  const type = (productType ?? '').trim().toUpperCase()
  if (!type) return false
  if (assetType === 'PANEL') return type === 'SOLAR_PANEL'
  if (assetType === 'INVERTER') return type === 'INVERTER'
  return !SERVICE_TYPES.has(type)
}

/** Sản phẩm đang bán hợp loại, thiết bị trong hợp đồng lên đầu */
export function productsForAsset(products: readonly Product[], assetType: string, contractedIds: readonly string[]) {
  const contracted = new Set(contractedIds)
  return products
    .filter(
      (p) =>
        p.id && (!p.status || p.status.trim().toUpperCase() === 'ACTIVE') && productFitsAsset(assetType, p.productType),
    )
    .sort((a, b) => Number(!contracted.has(a.id!)) - Number(!contracted.has(b.id!)))
}

const wholeNumber = (text: string, max: number, min: number) => {
  const value = text.trim()
  return /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max ? Number(value) : null
}

export function validateLot(lot: AssetLot): AssetLotErrors {
  const errors: AssetLotErrors = {}
  if (!lot.productId) errors.productId = 'Chọn sản phẩm trong danh mục.'
  if (wholeNumber(lot.quantity, LOT_MAX, 1) === null)
    errors.quantity = `Nhập số lượng đã lắp (1 đến ${LOT_MAX.toLocaleString('vi-VN')}).`
  if (lot.warrantyMonths.trim() && wholeNumber(lot.warrantyMonths, WARRANTY_MAX_MONTHS, 0) === null)
    errors.warrantyMonths = `Nhập số tháng từ 0 đến ${WARRANTY_MAX_MONTHS}.`
  return errors
}

/** Thân lệnh ghi một lô; hãng và model lấy từ sản phẩm danh mục như web */
export function lotRequest(lot: AssetLot, product: Pick<Product, 'brand' | 'model' | 'name' | 'sku'>) {
  return {
    assetType: lot.assetType,
    productId: lot.productId,
    manufacturer: product.brand?.trim() || '',
    model: product.model?.trim() || product.name?.trim() || product.sku?.trim() || '',
    serialNumber: null,
    positionCode: null,
    warrantyMonths: lot.warrantyMonths.trim() ? Number(lot.warrantyMonths.trim()) : null,
    quantity: Number(lot.quantity.trim()),
  }
}
