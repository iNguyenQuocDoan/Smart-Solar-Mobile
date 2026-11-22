import AsyncStorage from '@react-native-async-storage/async-storage'
import { draftStorageKey, parseDraft, type SurveyDraft } from '@/lib/onsiteSurvey/draft'

// Nháp biên bản khảo sát nằm trong AsyncStorage, không dùng SecureStore (mỗi giá trị chỉ khoảng 2 KB, biên bản có vật
// cản và bảng vật tư dài hơn nhiều). Nháp không chứa token hay dữ liệu nhạy cảm

export async function loadSurveyDraft(appointmentId: string): Promise<SurveyDraft | null> {
  try {
    return parseDraft(await AsyncStorage.getItem(draftStorageKey(appointmentId)))
  } catch {
    return null
  }
}

export async function saveSurveyDraft(draft: SurveyDraft) {
  try {
    await AsyncStorage.setItem(draftStorageKey(draft.appointmentId), JSON.stringify(draft))
  } catch {
    // Máy đầy bộ nhớ: bỏ qua, số đo vẫn còn trên màn
  }
}

export async function clearSurveyDraft(appointmentId: string) {
  try {
    await AsyncStorage.removeItem(draftStorageKey(appointmentId))
  } catch {
    // Bỏ qua
  }
}
