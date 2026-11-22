import type { OnSiteSurveyView } from '@/lib/api/types'
import { formDiffers, type OnSiteSurveyForm } from './form.ts'

// Nháp biên bản trên máy: mất mạng hay tắt app giữa chừng thì số đo vẫn còn. Nháp ghi kèm `revision` của bản trên hệ
// thống lúc bắt đầu sửa, để biết bản trên hệ thống có đổi ở nơi khác sau đó hay không (không ghi đè im lặng)

export type SurveyDraft = {
  appointmentId: string
  /** `revision` của biên bản trên hệ thống mà nháp này sửa tiếp */
  revision: number
  form: OnSiteSurveyForm
  savedAt: string
}

/**
 * Mở lại màn khảo sát khi máy còn nháp:
 * - `none`: không có nháp, hoặc nháp giống hệt bản trên hệ thống (xoá nháp)
 * - `restore`: bản trên hệ thống chưa đổi kể từ khi sửa nháp, dùng lại nháp và báo "Chưa lưu lên hệ thống"
 * - `conflict`: bản trên hệ thống đã đổi ở nơi khác; hỏi người dùng giữ nháp hay lấy bản trên hệ thống
 */
export function draftChoice(
  draft: SurveyDraft | null | undefined,
  view: OnSiteSurveyView,
): 'none' | 'restore' | 'conflict' {
  if (!draft || draft.appointmentId !== view.appointmentId) return 'none'
  if (!formDiffers(draft.form, view)) return 'none'
  return draft.revision === view.revision ? 'restore' : 'conflict'
}

export const draftStorageKey = (appointmentId: string) => `onsite-survey-draft:${appointmentId}`

/** Đọc nháp đã lưu; chuỗi hỏng hoặc sai dạng thì coi như không có */
export function parseDraft(raw: string | null): SurveyDraft | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<SurveyDraft>
    if (typeof value?.appointmentId !== 'string' || typeof value.revision !== 'number' || !value.form) return null
    const form = value.form as Partial<OnSiteSurveyForm>
    if (!Array.isArray(form.obstacles) || !Array.isArray(form.materials) || !Array.isArray(form.serviceItems))
      return null
    return value as SurveyDraft
  } catch {
    return null
  }
}
