// Đọc số từ ô nhập, như utils/number.ts của web. Nhận cả dấu phẩy và dấu chấm thập phân: "12,5" và "12.5" đều là 12.5

/** Ô trống trả về null, gõ không phải số trả về NaN */
export function parseDecimal(text: string): number | null {
  const raw = text.trim().replace(',', '.')
  if (raw === '') return null
  return Number(raw)
}

/** Như parseDecimal nhưng trả về null cả khi gõ sai, để dùng thẳng trong tính toán */
export function readDecimal(text: string): number | null {
  const value = parseDecimal(text)
  if (value === null || !Number.isFinite(value)) return null
  return value
}

/** Làm tròn 3 chữ số thập phân (tới mm khi đơn vị là mét), tránh lỗi số thực như 1.2000000000000002 */
export function roundTo3Decimals(value: number) {
  return Math.round(value * 1000) / 1000
}

/** Số thành chữ để đặt vào ô nhập: 1.5 thành "1,5" */
export function toInputText(value: number) {
  return String(roundTo3Decimals(value)).replace('.', ',')
}
