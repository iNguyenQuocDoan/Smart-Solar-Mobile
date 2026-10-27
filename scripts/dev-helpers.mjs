// Phần không đụng tới máy ảo hay mạng của scripts/dev.mjs, tách riêng để test

/** Các dòng "serial<TAB>trạng thái" của `adb devices`, bỏ dòng tiêu đề và dòng báo của adb */
export function parseAdbDevices(output) {
  return output.split(/\r?\n/).flatMap((line) => {
    const match = /^(\S+)\t(\S+)/.exec(line)
    return match ? [{ serial: match[1], state: match[2] }] : []
  })
}

/** Cổng đầu tiên từ `start` trở đi chưa nằm trong `taken` */
export function nextFreePort(start, taken) {
  let port = start
  while (taken.has(port)) port += 1
  return port
}

/** Cổng đang có backend trước, rồi tới cổng còn trống (backend chưa bật), không thì lấy cổng đầu */
export function pickApiPort(probes) {
  return (probes.find((p) => p.status === 'api') ?? probes.find((p) => p.status === 'free') ?? probes[0]).port
}

/** ANDROID_AVD nếu có, không thì máy ảo dành riêng cho Smart Solar, không có nữa thì máy ảo đầu tiên */
export function pickAvd(avds, wanted) {
  return wanted ?? avds.find((name) => /smart.?solar/i.test(name)) ?? avds[0] ?? null
}

/** Cột Available (KB) ở dòng cuối của `df -k` */
export function freeKb(output) {
  const last = output.trim().split(/\r?\n/).pop() ?? ''
  const available = Number(last.trim().split(/\s+/)[3])
  return Number.isFinite(available) ? available : null
}

/** Từ máy ảo Android, máy tính đang chạy backend có địa chỉ 10.0.2.2 */
export function emulatorApiUrl(port) {
  return `http://10.0.2.2:${port}/api`
}

/** Giá trị của `key` trong nội dung một file .env; để trống thì coi như không khai */
export function readEnvValue(text, key) {
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`)
  for (const line of text.split(/\r?\n/)) {
    const match = pattern.exec(line)
    if (!match) continue
    const value = match[1].trim().replace(/^(['"])(.*)\1$/, '$2')
    return value || null
  }
  return null
}
