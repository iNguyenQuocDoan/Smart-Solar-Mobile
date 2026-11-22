// Quy tắc mật khẩu giống web (smart-solar src/data/auth.ts), backend cũng kiểm lại

export const passwordRules = [
  { id: 'length', label: 'Tối thiểu 8 ký tự', test: (value: string) => value.length >= 8 },
  { id: 'upper', label: 'Ít nhất 1 chữ in hoa (A-Z)', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'number', label: 'Ít nhất 1 chữ số (0-9)', test: (value: string) => /\d/.test(value) },
  { id: 'special', label: 'Có ký tự đặc biệt (@, #, $...)', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const

export const isStrongPassword = (value: string) => passwordRules.every((rule) => rule.test(value))

export type PasswordDraft = { current: string; next: string; confirm: string }

/** Lỗi theo từng ô, rỗng là gửi được */
export function passwordErrors(d: PasswordDraft): Partial<Record<keyof PasswordDraft, string>> {
  const errors: Partial<Record<keyof PasswordDraft, string>> = {}
  if (!d.current) errors.current = 'Nhập mật khẩu hiện tại.'
  if (!isStrongPassword(d.next)) errors.next = 'Mật khẩu mới chưa đạt đủ 4 quy tắc.'
  if (!d.confirm) errors.confirm = 'Nhập lại mật khẩu mới.'
  else if (d.confirm !== d.next) errors.confirm = 'Mật khẩu nhập lại không khớp.'
  return errors
}
