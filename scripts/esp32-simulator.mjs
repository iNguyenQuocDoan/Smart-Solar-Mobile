// Giả lập ESP32 để thử trọn luồng giám sát: gửi dòng điện mỗi 10 giây như firmware. Chạy trên máy, KHÔNG nằm trong app (app
// không bao giờ gửi số đo và không giữ khoá thiết bị). Khoá thiết bị chỉ đọc từ biến môi trường, không in ra.
//
//   DEVICE_ID=ESP32-TEST-01 DEVICE_KEY=ssdk_... node scripts/esp32-simulator.mjs
//
// Biến tuỳ chọn:
//   IOT_API_ORIGIN   origin của backend, mặc định http://160.187.1.242:8080 (production phải là HTTPS)
//   CURRENT          gửi đúng một giá trị cố định (vd. -0.2145 để thử kẹp ngược chiều); bỏ trống thì gửi sóng quanh 0,8 A
//   NEGATIVE=1       đảo dấu mọi giá trị (thử số âm)
//   COUNT            số lần gửi rồi dừng; bỏ trống là chạy tới khi Ctrl+C
//   INTERVAL_SECONDS chu kỳ gửi, mặc định 10 (backend giới hạn 12 lần / phút / thiết bị)

const origin = (process.env.IOT_API_ORIGIN ?? 'http://160.187.1.242:8080').replace(/\/+$/, '')
const deviceId = process.env.DEVICE_ID?.trim()
const deviceKey = process.env.DEVICE_KEY?.trim()
const fixed = process.env.CURRENT === undefined || process.env.CURRENT === '' ? null : Number(process.env.CURRENT)
const sign = process.env.NEGATIVE === '1' ? -1 : 1
const count = process.env.COUNT ? Number(process.env.COUNT) : Infinity
const intervalMs = Math.max(5, Number(process.env.INTERVAL_SECONDS ?? 10)) * 1000

if (!deviceId || !deviceKey) {
  console.error(
    'Thiếu DEVICE_ID hoặc DEVICE_KEY. Lấy ở web /admin/iot-devices (secret chỉ hiện một lần lúc đăng ký / đổi key).',
  )
  process.exit(1)
}
if (fixed !== null && !Number.isFinite(fixed)) {
  console.error('CURRENT phải là một số.')
  process.exit(1)
}

const url = `${origin}/api/iot/devices/${encodeURIComponent(deviceId)}/readings`
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const vnTime = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 19)

function nextCurrent(i) {
  if (fixed !== null) return sign * fixed
  // Sóng chậm quanh 0,8 A, 4 chữ số lẻ như firmware (String(amps, 4))
  const value = 0.8 + 0.35 * Math.sin(i / 6) + (Math.random() - 0.5) * 0.04
  return sign * Number(value.toFixed(4))
}

async function send(current) {
  const body = JSON.stringify({ current })
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': deviceKey },
      body,
      signal: AbortSignal.timeout(5000),
    })
    const json = await response.json().catch(() => null)
    return { status: response.status, code: json?.error?.code ?? null, retryAfter: response.headers.get('Retry-After') }
  } catch (error) {
    return { status: -1, code: error?.name ?? 'NETWORK', retryAfter: null }
  }
}

console.log(
  `Gửi tới ${url} mỗi ${intervalMs / 1000} giây. Ctrl+C để dừng (dừng hơn 30 giây thì app phải báo Mất kết nối).`,
)
let nextAt = Date.now()
for (let i = 0; i < count; i++) {
  const wait = nextAt - Date.now()
  if (wait > 0) await sleep(wait)
  // Mốc cố định: chu kỳ không cộng dồn thời gian gửi
  nextAt += intervalMs
  const current = nextCurrent(i)
  const result = await send(current)
  console.log(`${vnTime()}  current=${current}  HTTP ${result.status}${result.code ? ` ${result.code}` : ''}`)
  if (result.status === 429) {
    const seconds = Number(result.retryAfter) || 60
    console.log(`  429: chờ ${seconds} giây rồi gửi tiếp, không gửi dồn`)
    await sleep(seconds * 1000)
    nextAt = Date.now() + intervalMs
  } else if (result.status === 401) console.log('  401: sai mã thiết bị / khoá, hoặc khoá đã được đổi')
  else if (result.status === 403) console.log('  403: thiết bị đang bị khoá')
  else if (result.status === 409) console.log('  409: thiết bị chưa được gắn vào công trình')
}
