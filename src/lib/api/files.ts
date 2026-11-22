import { File } from 'expo-file-system'
import { ApiError, apiPost } from '@/lib/api/client'
import type { StoredFile, UploadTarget } from '@/lib/api/types'

// Backend không nhận nội dung tệp: app xin link PUT ký sẵn, tự PUT lên kho, rồi đăng ký. Lúc đăng ký backend đọc lại tệp
// trên kho để xác minh loại và cỡ; chỉ tệp VERIFIED mới gắn được vào biên bản, ảnh thi công…

export type PickedImage = { uri: string; mimeType?: string | null; fileName?: string | null }

const EXTENSIONS: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const VERIFY_RETRY_MS = 3000

/** Câu tiếng Anh của backend khi từ chối tệp, theo tiền tố */
const REJECTION_REASONS: Record<string, string> = {
  'The object does not exist in storage': 'Ảnh chưa tải lên xong. Thử lại.',
  'The object is larger than': 'Ảnh lớn hơn cỡ cho phép.',
  'The stored object size does not match': 'Ảnh tải lên chưa đủ, có thể bị ngắt giữa chừng. Thử lại.',
  'The stored content does not match an allowed file type':
    'Nội dung ảnh không đúng loại cho phép. Chụp lại hoặc chọn ảnh khác.',
  'A checksum could not be computed': 'Hệ thống chưa đọc được ảnh. Thử lại.',
  'The bucket must have versioning enabled': 'Hệ thống tạm thời chưa nhận ảnh. Báo quản trị hệ thống.',
}

/** Tên tệp có đuôi khớp loại, vì backend đối chiếu hai thứ này */
export function uploadName(image: PickedImage, contentType: string) {
  const base = (image.fileName?.trim() || `anh-${Date.now()}`).replace(/\.[a-z0-9]+$/i, '')
  return base + (EXTENSIONS[contentType] ?? '')
}

// Gửi ArrayBuffer chứ không gửi Blob: fetch của Expo đè Content-Type bằng loại của Blob, lệch với header đã ký nên S3 trả 403
async function putToStorage(target: UploadTarget, body: ArrayBuffer) {
  let response: Response
  try {
    response = await fetch(target.uploadUrl, { method: target.method, headers: target.headers ?? {}, body })
  } catch {
    throw new ApiError('Không tải được ảnh lên. Kiểm tra mạng rồi thử lại.', 0)
  }
  if (response.ok) return
  const text = await response.text().catch(() => '')
  if (response.status === 403 && !/expired/i.test(text))
    throw new ApiError('Hệ thống chưa được phép lưu loại ảnh này. Báo quản trị hệ thống.', 403)
  throw new ApiError('Chưa tải được ảnh lên. Thử lại sau ít phút.', response.status)
}

/** Tải một ảnh lên kho và đăng ký, trả mã tệp đã xác minh để gắn vào nghiệp vụ */
export async function uploadImage(image: PickedImage, purpose: string) {
  // fetch của Expo không đọc được file://, nên đọc tệp ảnh bằng expo-file-system
  const bytes = await new File(image.uri).arrayBuffer()
  const contentType = (image.mimeType || 'image/jpeg').toLowerCase()
  const fileName = uploadName(image, contentType)
  const target = await apiPost<UploadTarget>('/files/presigned-upload', {
    purpose,
    fileName,
    contentType,
    sizeBytes: bytes.byteLength,
  })
  await putToStorage(target, bytes)
  let file = await apiPost<StoredFile>('/files', {
    purpose,
    bucket: target.bucket,
    objectKey: target.objectKey,
    fileName,
    contentType,
    sizeBytes: bytes.byteLength,
    checksumSha256: null,
  })
  if (file.status === 'PENDING_VERIFICATION') {
    await new Promise((resolve) => setTimeout(resolve, VERIFY_RETRY_MS))
    file = await apiPost<StoredFile>(`/files/${encodeURIComponent(file.fileId)}/verify`)
  }
  if (file.status === 'PENDING_VERIFICATION')
    throw new ApiError('Hệ thống chưa kiểm tra được ảnh. Thử lại sau ít phút.', 503)
  if (file.status !== 'VERIFIED') {
    const reason = Object.entries(REJECTION_REASONS).find(([prefix]) => file.rejectionReason?.startsWith(prefix))
    throw new ApiError(reason?.[1] ?? 'Hệ thống không nhận ảnh này. Chụp lại hoặc chọn ảnh khác.', 422)
  }
  return file.fileId
}
