// Illustrative data only. Nothing here comes from a real ESP32; every screen that shows it
// must also show the "Dữ liệu minh họa" banner.

export type DemoScenario =
  | 'normal'
  | 'offline'
  | 'stale'
  | 'unknown'
  | 'uncalibrated'
  | 'test-data'
  | 'no-readings'
  | 'no-devices'
  | 'no-sites'

export type DemoFault = 'none' | 'network' | 'server' | 'slow'

export type DemoConfig = { scenario: DemoScenario; fault: DemoFault }

export const DEMO_SCENARIOS: { value: DemoScenario; label: string; description: string }[] = [
  { value: 'normal', label: 'Bình thường', description: 'Các thiết bị đang gửi số đo đều đặn.' },
  { value: 'offline', label: 'Thiết bị mất kết nối', description: 'Thiết bị đầu tiên của mỗi công trình mất kết nối, giữ số đo cuối cùng.' },
  { value: 'stale', label: 'Dữ liệu cũ', description: 'Thiết bị đầu tiên chưa gửi số đo mới từ một lúc trước.' },
  { value: 'unknown', label: 'Chưa có quy tắc trạng thái', description: 'Máy chủ chưa xác định được kết nối, như khi nối API thật hiện nay.' },
  { value: 'uncalibrated', label: 'Cảm biến chưa hiệu chuẩn', description: 'Chỉ có giá trị ADC thô, chưa có dòng điện (A).' },
  { value: 'test-data', label: 'Dữ liệu thử nghiệm', description: 'Số đo được thiết bị đánh dấu là dữ liệu thử.' },
  { value: 'no-readings', label: 'Chưa nhận dữ liệu', description: 'Thiết bị đầu tiên đã được gắn nhưng chưa gửi số đo nào.' },
  { value: 'no-devices', label: 'Chưa có thiết bị', description: 'Công trình chưa được gắn thiết bị giám sát.' },
  { value: 'no-sites', label: 'Chưa có công trình', description: 'Tài khoản chưa có hệ thống nào được giám sát.' },
]

export const DEMO_FAULTS: { value: DemoFault; label: string; description: string }[] = [
  { value: 'none', label: 'Không có sự cố', description: 'Tải dữ liệu bình thường.' },
  { value: 'network', label: 'Mất mạng', description: 'Các lần tải tiếp theo thất bại; số liệu đã tải vẫn được giữ.' },
  { value: 'server', label: 'Lỗi máy chủ', description: 'Máy chủ trả lỗi 500 cho các lần tải tiếp theo.' },
  { value: 'slow', label: 'Mạng chậm', description: 'Mỗi lần tải mất khoảng 2,5 giây để xem trạng thái đang tải.' },
]

export type MockDevice = { deviceId: string; name: string; baseA: number; phase: number }
export type MockSite = { siteId: string; name: string; address: string; devices: MockDevice[] }

export const MOCK_SITES: MockSite[] = [
  {
    siteId: 'demo-site-thu-duc',
    name: 'Nhà phố Thủ Đức',
    address: 'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    devices: [
      { deviceId: 'esp32-01', name: 'Bộ đo chuỗi pin mái trước', baseA: 4.2, phase: 0 },
      { deviceId: 'esp32-02', name: 'Bộ đo chuỗi pin mái sau', baseA: 3.1, phase: 1.7 },
    ],
  },
  {
    siteId: 'demo-site-binh-duong',
    name: 'Xưởng may Bình Dương',
    address: 'Phường Phú Hoà, TP. Thủ Dầu Một, Bình Dương',
    devices: [{ deviceId: 'esp32-07', name: 'Bộ đo chuỗi pin mái tôn', baseA: 6.4, phase: 0.6 }],
  },
]

// Same cadence as the IoT simulator default (SIMULATOR_INTERVAL_MS).
export const MOCK_INTERVAL_MS = 5_000
export const MOCK_OFFLINE_FOR_MS = (2 * 60 + 17) * 60_000
export const MOCK_STALE_FOR_MS = 26 * 60_000
export const MOCK_UPTIME_AT_LAST_MS = (2 * 60 + 14) * 60_000
