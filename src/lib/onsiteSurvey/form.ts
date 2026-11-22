import type { OnSiteSurveyRequest, OnSiteSurveyView } from '@/lib/api/types'
import { BOM_ERROR_KEY, bomErrors, bomRequest, rowsFromItems, type BomRow } from './billOfMaterials.ts'
import { parseDecimal, toInputText } from './number.ts'
import { ONSITE_SURVEY_LIMITS as LIMITS } from './vocabulary.ts'

// Form biên bản khảo sát tại công trình. Luật kiểm tra bám OnSiteSurveyHandlers.Validate của backend:
// lưu nháp chỉ kiểm tra khoảng giá trị, hoàn thành thì thêm các ô bắt buộc.
// Port từ features/onsite-survey/onSiteSurveyForm.ts của web, giữ nguyên hành vi; thêm phần chia ô theo phần của màn mobile

export type ObstacleRow = { key: string; kind: string; description: string; heightM: string; areaM2: string }

export type OnSiteSurveyForm = {
  roofType: string
  roofMaterial: string
  roofLengthM: string
  roofWidthM: string
  usableAreaM2: string
  tiltDegree: string
  azimuthDegree: string
  roofCondition: string
  installationFeasibility: string
  electricalCabinetNotes: string
  electricalConnectionNotes: string
  proposedInverterLocation: string
  proposedPanelLayoutNotes: string
  notes: string
  measuredLatitude: number | null
  measuredLongitude: number | null
  obstacles: ObstacleRow[]
  materials: BomRow[]
  serviceItems: BomRow[]
  installationNotes: string
  /** Biên bản trên hệ thống đã có bảng vật tư */
  hadBom: boolean
}

/** Ô của bảng vật tư: đổi ô nào thì xoá mọi lỗi `billOfMaterials…` */
export const BOM_FIELDS: readonly string[] = ['materials', 'serviceItems', 'installationNotes']

export type ObstacleField = 'heightM' | 'areaM2'
/** Khoá là tên ô, vật cản dùng `obstacle-<chỉ số>-<ô>` */
export type OnSiteSurveyErrors = Partial<Record<string, string>>

/** Bỏ lỗi của các ô vừa sửa; sửa danh sách vật cản / bảng vật tư thì bỏ lỗi của mọi dòng trong đó */
export function clearTouchedErrors(errors: OnSiteSurveyErrors, touched: string[]) {
  const next = { ...errors }
  for (const key of Object.keys(next)) {
    if (
      touched.includes(key) ||
      (touched.includes('obstacles') && key.startsWith('obstacle-')) ||
      (touched.some((t) => BOM_FIELDS.includes(t)) && key.startsWith(BOM_ERROR_KEY))
    )
      delete next[key]
  }
  return next
}

export const obstacleErrorKey = (index: number, field: ObstacleField) => `obstacle-${index}-${field}`

let keySeed = 0
export function newObstacleRow(): ObstacleRow {
  keySeed += 1
  return { key: `o${keySeed}`, kind: 'WATER_TANK', description: '', heightM: '', areaM2: '' }
}

const text = (value: string | null | undefined) => value ?? ''
const numberText = (value: number | null | undefined) => (value == null ? '' : toInputText(value))

export function formFromView(view: OnSiteSurveyView | null | undefined): OnSiteSurveyForm {
  const d = view?.data
  return {
    roofType: text(d?.roofType),
    roofMaterial: text(d?.roofMaterial),
    roofLengthM: numberText(d?.roofLengthM),
    roofWidthM: numberText(d?.roofWidthM),
    usableAreaM2: numberText(d?.usableAreaM2),
    tiltDegree: numberText(d?.tiltDegree),
    azimuthDegree: numberText(d?.azimuthDegree),
    roofCondition: text(d?.roofCondition),
    installationFeasibility: text(d?.installationFeasibility),
    electricalCabinetNotes: text(d?.electricalCabinetNotes),
    electricalConnectionNotes: text(d?.electricalConnectionNotes),
    proposedInverterLocation: text(d?.proposedInverterLocation),
    proposedPanelLayoutNotes: text(d?.proposedPanelLayoutNotes),
    notes: text(d?.notes),
    measuredLatitude: d?.measuredLatitude ?? null,
    measuredLongitude: d?.measuredLongitude ?? null,
    obstacles: (view?.obstacles ?? []).map((o) => ({
      ...newObstacleRow(),
      kind: o.kind,
      description: text(o.description),
      heightM: numberText(o.heightM),
      areaM2: numberText(o.areaM2),
    })),
    materials: rowsFromItems(d?.billOfMaterials?.materials),
    serviceItems: rowsFromItems(d?.billOfMaterials?.serviceItems),
    installationNotes: text(d?.billOfMaterials?.installationNotes),
    hadBom: Boolean(d?.billOfMaterials),
  }
}

const textOrNull = (value: string) => (value.trim() === '' ? null : value.trim())
/** Ô số gõ sai đã bị chặn ở validate, nên ở đây chỉ còn số hoặc trống */
const numberOrNull = (value: string) => {
  const n = parseDecimal(value)
  return n === null || !Number.isFinite(n) ? null : n
}

/** Thân PUT. `revision` null khi chưa có biên bản trên hệ thống */
export function toRequest(form: OnSiteSurveyForm, revision: number | null): OnSiteSurveyRequest {
  return {
    revision,
    roofType: textOrNull(form.roofType),
    roofMaterial: textOrNull(form.roofMaterial),
    roofLengthM: numberOrNull(form.roofLengthM),
    roofWidthM: numberOrNull(form.roofWidthM),
    usableAreaM2: numberOrNull(form.usableAreaM2),
    tiltDegree: numberOrNull(form.tiltDegree),
    azimuthDegree: numberOrNull(form.azimuthDegree),
    roofCondition: textOrNull(form.roofCondition),
    installationFeasibility: textOrNull(form.installationFeasibility),
    electricalCabinetNotes: textOrNull(form.electricalCabinetNotes),
    electricalConnectionNotes: textOrNull(form.electricalConnectionNotes),
    proposedInverterLocation: textOrNull(form.proposedInverterLocation),
    proposedPanelLayoutNotes: textOrNull(form.proposedPanelLayoutNotes),
    notes: textOrNull(form.notes),
    measuredLatitude: form.measuredLatitude,
    measuredLongitude: form.measuredLongitude,
    obstacles: form.obstacles.map((o) => ({
      kind: o.kind,
      description: textOrNull(o.description),
      heightM: numberOrNull(o.heightM),
      areaM2: numberOrNull(o.areaM2),
    })),
    billOfMaterials: bomRequest(form.materials, form.serviceItems, form.installationNotes, form.hadBom) ?? undefined,
  }
}

/** Form khác bản đã lưu trên hệ thống */
export function formDiffers(form: OnSiteSurveyForm, view: OnSiteSurveyView | null | undefined) {
  return JSON.stringify(toRequest(form, null)) !== JSON.stringify(toRequest(formFromView(view), null))
}

export function validateOnSiteSurvey(
  form: OnSiteSurveyForm,
  { forCompletion, units }: { forCompletion: boolean; units?: Record<string, string | null | undefined> },
) {
  const errors: OnSiteSurveyErrors = { ...bomErrors(form.materials, form.serviceItems, form.installationNotes, units) }

  function checkRange(field: keyof OnSiteSurveyForm, ok: (n: number) => boolean, message: string) {
    const n = parseDecimal(form[field] as string)
    if (n === null) return null
    if (!Number.isFinite(n)) {
      errors[field] = 'Nhập một số, ví dụ 12,5.'
      return null
    }
    if (!ok(n)) errors[field] = message
    return n
  }

  const length = checkRange('roofLengthM', (n) => n > 0 && n <= LIMITS.maxSideM, `Từ trên 0 đến ${LIMITS.maxSideM} m.`)
  const width = checkRange('roofWidthM', (n) => n > 0 && n <= LIMITS.maxSideM, `Từ trên 0 đến ${LIMITS.maxSideM} m.`)
  const maxArea = length !== null && width !== null && !errors.roofLengthM && !errors.roofWidthM ? length * width : null
  checkRange(
    'usableAreaM2',
    (n) => n > 0 && (maxArea === null || n <= maxArea + 1e-9),
    maxArea === null ? 'Phải lớn hơn 0.' : `Phải lớn hơn 0 và không quá dài × rộng (${toInputText(maxArea)} m²).`,
  )
  checkRange('tiltDegree', (n) => n >= 0 && n <= 90, 'Từ 0 đến 90 độ. Mái bằng là 0.')
  checkRange('azimuthDegree', (n) => n >= 0 && n < 360, 'Từ 0 đến dưới 360 độ (0 là Bắc, 90 là Đông).')

  form.obstacles.forEach((o, i) => {
    const height = parseDecimal(o.heightM)
    if (height !== null && (!Number.isFinite(height) || height < 0 || height > LIMITS.maxObstacleHeightM))
      errors[obstacleErrorKey(i, 'heightM')] = `Từ 0 đến ${LIMITS.maxObstacleHeightM} m.`
    const area = parseDecimal(o.areaM2)
    if (area !== null && (!Number.isFinite(area) || area < 0 || area > LIMITS.maxObstacleAreaM2))
      errors[obstacleErrorKey(i, 'areaM2')] = `Từ 0 đến ${LIMITS.maxObstacleAreaM2.toLocaleString('vi-VN')} m².`
  })

  if (forCompletion) {
    for (const [field, message] of REQUIRED_FIELDS) {
      if (!errors[field] && String(form[field]).trim() === '') errors[field] = message
    }
  }
  return errors
}

/** Ô bắt buộc khi hoàn thành, theo thứ tự trên form */
export const REQUIRED_FIELDS: [keyof OnSiteSurveyForm, string][] = [
  ['roofType', 'Ghi loại mái.'],
  ['roofMaterial', 'Ghi vật liệu mái.'],
  ['roofLengthM', 'Nhập chiều dài mái.'],
  ['roofWidthM', 'Nhập chiều rộng mái.'],
  ['usableAreaM2', 'Nhập diện tích lắp được.'],
  ['tiltDegree', 'Nhập độ dốc mái.'],
  ['azimuthDegree', 'Nhập hướng mái.'],
  ['roofCondition', 'Chọn tình trạng mái.'],
  ['installationFeasibility', 'Chọn khả năng lắp đặt.'],
  ['electricalCabinetNotes', 'Ghi vị trí và tình trạng tủ điện.'],
]

/** Lỗi theo ô từ backend (VALIDATION_FAILED / ONSITE_SURVEY_INCOMPLETE): dùng câu tiếng Việt của FE cho đúng ô đó */
export function serverOnSiteSurveyErrors(fieldErrors: Record<string, unknown>, form: OnSiteSurveyForm) {
  const local = validateOnSiteSurvey(form, { forCompletion: true })
  const errors: OnSiteSurveyErrors = {}
  for (const field of Object.keys(fieldErrors)) {
    errors[field] =
      local[field] ??
      (field.startsWith(`${BOM_ERROR_KEY}.`)
        ? 'Sản phẩm này không còn bán hoặc sai loại (thiết bị / dịch vụ). Chọn sản phẩm khác.'
        : 'Giá trị chưa hợp lệ.')
  }
  return errors
}

// ---------- Chia form theo phần trên màn điện thoại ----------

export type SurveySection = 'roof' | 'electric' | 'plan' | 'bom' | 'obstacles' | 'location' | 'photos'

export const SURVEY_SECTIONS: { key: SurveySection; label: string }[] = [
  { key: 'roof', label: 'Mái' },
  { key: 'electric', label: 'Điện' },
  { key: 'plan', label: 'Phương án' },
  { key: 'bom', label: 'Vật tư' },
  { key: 'obstacles', label: 'Vật cản' },
  { key: 'location', label: 'Vị trí' },
  { key: 'photos', label: 'Ảnh' },
]

const SECTION_OF_FIELD: Record<string, SurveySection> = {
  roofType: 'roof',
  roofMaterial: 'roof',
  roofLengthM: 'roof',
  roofWidthM: 'roof',
  usableAreaM2: 'roof',
  tiltDegree: 'roof',
  azimuthDegree: 'roof',
  roofCondition: 'roof',
  electricalCabinetNotes: 'electric',
  electricalConnectionNotes: 'electric',
  installationFeasibility: 'plan',
  proposedInverterLocation: 'plan',
  proposedPanelLayoutNotes: 'plan',
  measuredLatitude: 'location',
  measuredLongitude: 'location',
  notes: 'location',
}

/** Phần chứa một ô (khoá lỗi): vật cản `obstacle-…`, bảng vật tư `billOfMaterials…` */
export function sectionOfField(key: string): SurveySection {
  if (key.startsWith('obstacle')) return 'obstacles'
  if (key.startsWith(BOM_ERROR_KEY) || BOM_FIELDS.includes(key)) return 'bom'
  return SECTION_OF_FIELD[key] ?? 'location'
}

/** Thứ tự các ô trên màn, để "còn thiếu" nhảy tới ô đầu tiên */
const FIELD_ORDER = [
  ...REQUIRED_FIELDS.map(([field]) => field as string),
  'electricalConnectionNotes',
  'proposedInverterLocation',
  'proposedPanelLayoutNotes',
  'notes',
]

/** Ô lỗi đầu tiên theo thứ tự phần rồi thứ tự ô trên màn */
export function firstErrorKey(errors: OnSiteSurveyErrors): string | null {
  const keys = Object.keys(errors).filter((k) => errors[k])
  if (keys.length === 0) return null
  const sectionIndex = (k: string) => SURVEY_SECTIONS.findIndex((s) => s.key === sectionOfField(k))
  const fieldIndex = (k: string) => {
    const i = FIELD_ORDER.indexOf(k)
    return i < 0 ? FIELD_ORDER.length : i
  }
  return [...keys].sort(
    (a, b) => sectionIndex(a) - sectionIndex(b) || fieldIndex(a) - fieldIndex(b) || a.localeCompare(b),
  )[0]!
}

/** Số lỗi theo phần, để hiện trên thanh chuyển phần */
export function errorCountBySection(errors: OnSiteSurveyErrors) {
  const counts: Partial<Record<SurveySection, number>> = {}
  for (const key of Object.keys(errors)) {
    if (!errors[key]) continue
    const section = sectionOfField(key)
    counts[section] = (counts[section] ?? 0) + 1
  }
  return counts
}
