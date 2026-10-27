// Chạy app trên máy ảo Android: bật máy ảo nếu chưa có, dò backend đang chạy trên máy,
// rồi mở Expo như `expo start` bình thường nên vẫn có menu phím (a, r, m, j, ?)
//   npm run dev                  máy ảo + Expo, tự mở app trên máy ảo
//   npm run emulator             chỉ bật máy ảo
//   npm run emulator -- --cold   bật lại từ đầu khi máy ảo treo lúc khởi động
// Mặc định dùng máy ảo có tên Smart_Solar nếu có. Chọn máy ảo khác bằng biến ANDROID_AVD,
// cổng backend bằng API_PORT hoặc EXPO_PUBLIC_API_URL
import { execFile, spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import {
  emulatorApiUrl,
  freeKb,
  nextFreePort,
  parseAdbDevices,
  pickApiPort,
  pickAvd,
  readEnvValue,
} from './dev-helpers.mjs'

const run = promisify(execFile)
const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const BOOT_TIMEOUT_MS = 4 * 60_000
const STUCK_MS = 30_000

function fail(message) {
  console.error(`\n[dev] ${message}`)
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function sdkRoot() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
  ]
  const found = candidates.find((dir) => dir && existsSync(dir))
  if (!found) fail('Chưa thấy Android SDK. Cài Android Studio rồi đặt biến ANDROID_HOME trỏ tới thư mục SDK.')
  return found
}

function sdkTool(sdk, folder, name) {
  const file = path.join(sdk, folder, process.platform === 'win32' ? `${name}.exe` : name)
  if (!existsSync(file))
    fail(`Thiếu ${name} trong ${path.join(sdk, folder)}. Cài thêm bằng Android Studio > SDK Manager.`)
  return file
}

async function listDevices(adb) {
  const { stdout } = await run(adb, ['devices'])
  return parseAdbDevices(stdout)
}

/** "ready" khi Android chạy hẳn, "stuck" khi báo khởi động xong mà chưa có dịch vụ cài app, còn lại "booting" */
async function deviceState(adb, serial) {
  try {
    const { stdout } = await run(adb, ['-s', serial, 'shell', 'getprop sys.boot_completed; service check package'], {
      timeout: 10_000,
    })
    if (!/^1\s/.test(stdout)) return 'booting'
    return /package: found/.test(stdout) ? 'ready' : 'stuck'
  } catch {
    return 'booting'
  }
}

/** Thư mục khoá mà emulator giữ tới khi thoát hẳn */
function avdLock(name) {
  const home = process.env.ANDROID_AVD_HOME ?? path.join(os.homedir(), '.android', 'avd')
  const ini = path.join(home, `${name}.ini`)
  const dir = existsSync(ini) ? readEnvValue(readFileSync(ini, 'utf8'), 'path') : null
  return dir ? path.join(dir, 'hardware-qemu.ini.lock') : null
}

/** Tắt máy ảo và đợi nó lưu trạng thái, thoát hẳn thì mới bật lại được */
async function stopEmulator(adb, serial) {
  const name = await run(adb, ['-s', serial, 'emu', 'avd', 'name'], { timeout: 10_000 })
    .then(({ stdout }) => stdout.split(/\r?\n/)[0].trim())
    .catch(() => null)
  const lock = name ? avdLock(name) : null
  await run(adb, ['-s', serial, 'emu', 'kill'], { timeout: 10_000 }).catch(() => undefined)
  for (let i = 0; i < 60; i += 1) {
    const gone = !(await listDevices(adb)).some((d) => d.serial === serial)
    if (gone && !(lock && existsSync(lock))) return
    await sleep(1000)
  }
}

async function listAvds(emulator) {
  const { stdout } = await run(emulator, ['-list-avds'])
  // Bản emulator mới có thể in thêm dòng INFO, tên máy ảo không có khoảng trắng
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[\w.-]+$/.test(line))
}

async function startEmulator(emulator, cold) {
  const avds = await listAvds(emulator)
  const wanted = process.env.ANDROID_AVD
  if (avds.length === 0) fail('Chưa có máy ảo nào. Tạo một máy ảo trong Android Studio > Device Manager rồi chạy lại.')
  if (wanted && !avds.includes(wanted)) fail(`Không có máy ảo tên ${wanted}. Đang có: ${avds.join(', ')}.`)
  const avd = pickAvd(avds, wanted)

  const log = path.join(root, '.expo', 'emulator.log')
  mkdirSync(path.dirname(log), { recursive: true })
  writeFileSync(log, '')
  launchDetached(emulator, ['-avd', avd, '-no-boot-anim', ...(cold ? ['-no-snapshot-load'] : [])], log)
  console.log(`[dev] Đang bật máy ảo ${avd}${cold ? ' từ đầu' : ''}...`)
  return log
}

// Máy ảo chạy tách khỏi lệnh này nên tắt Expo không tắt máy ảo, lần sau mở app nhanh hơn.
// Trên Windows phải chạy qua `start /b` trong một console ẩn: chạy detached thẳng thì emulator mở thêm
// một cửa sổ terminal, lỡ đóng cửa sổ đó là máy ảo tắt theo
function launchDetached(file, flags, log) {
  if (process.platform === 'win32') {
    const line = `/d /s /c "start "" /b "${file}" ${flags.join(' ')} >"${log}" 2>&1"`
    spawn(process.env.ComSpec ?? 'cmd.exe', [line], {
      windowsVerbatimArguments: true,
      windowsHide: true,
      stdio: 'ignore',
    })
    return
  }
  const out = openSync(log, 'a')
  spawn(file, flags, { detached: true, stdio: ['ignore', out, out] }).unref()
}

// Expo Go nặng hơn 200 MB, máy ảo đầy thì Expo cài không được và thoát luôn
async function warnLowStorage(adb, serial) {
  const { stdout } = await run(adb, ['-s', serial, 'shell', 'df -k /data'], { timeout: 10_000 }).catch(() => ({
    stdout: '',
  }))
  const free = freeKb(stdout)
  if (free !== null && free < 400 * 1024) {
    console.log(
      `[dev] Bộ nhớ trong của ${serial} chỉ còn ${Math.round(free / 1024)} MB, có thể không đủ cài Expo Go. ` +
        'Gỡ bớt app trên máy ảo hoặc chọn máy ảo khác bằng biến ANDROID_AVD.',
    )
  }
}

function readLog(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

/** Serial của máy ảo / điện thoại đã chạy hẳn; chưa có thì bật máy ảo */
async function ensureDevice(cold) {
  const sdk = sdkRoot()
  const adb = sdkTool(sdk, 'platform-tools', 'adb')
  await run(adb, ['start-server'])

  for (const device of (await listDevices(adb)).filter((d) => d.state === 'device')) {
    if ((await deviceState(adb, device.serial)) === 'ready') {
      console.log(`[dev] Dùng thiết bị đang mở: ${device.serial}`)
      await warnLowStorage(adb, device.serial)
      return device.serial
    }
  }

  const running = (await listDevices(adb)).some((d) => d.serial.startsWith('emulator-'))
  let log = running ? null : await startEmulator(sdkTool(sdk, 'emulator', 'emulator'), cold)
  let since = Date.now()
  let stuckSince = null
  while (Date.now() - since < BOOT_TIMEOUT_MS) {
    const fatal = log ? /^(?:FATAL|PANIC).*$/m.exec(readLog(log))?.[0] : null
    if (fatal) fail(`Máy ảo không bật được: ${fatal}\nXem thêm ở ${log}`)
    const device = (await listDevices(adb)).find((d) => d.state === 'device' && d.serial.startsWith('emulator-'))
    const state = device ? await deviceState(adb, device.serial) : 'booting'
    if (state === 'ready') {
      if (process.stdout.isTTY) process.stdout.write('\n')
      console.log(`[dev] Máy ảo sẵn sàng sau ${Math.round((Date.now() - since) / 1000)} giây (${device.serial}).`)
      await warnLowStorage(adb, device.serial)
      return device.serial
    }
    // Bản lưu của lần khởi động nhanh trước bị hỏng: Android báo đã khởi động nhưng hệ thống cứ chạy lại từ đầu
    stuckSince = state === 'stuck' ? (stuckSince ?? Date.now()) : null
    if (stuckSince && Date.now() - stuckSince > STUCK_MS && !cold) {
      console.log('\n[dev] Máy ảo khởi động nhanh bị lỗi, tắt đi rồi bật lại từ đầu...')
      await stopEmulator(adb, device.serial)
      cold = true
      log = await startEmulator(sdkTool(sdk, 'emulator', 'emulator'), true)
      since = Date.now()
      stuckSince = null
    }
    if (process.stdout.isTTY)
      process.stdout.write(`\r[dev] Chờ máy ảo khởi động... ${Math.round((Date.now() - since) / 1000)} giây`)
    await sleep(1500)
  }
  const tail = log ? `\n${readLog(log).trim().split(/\r?\n/).slice(-15).join('\n')}` : ''
  fail(`Máy ảo chưa khởi động xong sau 4 phút. Đóng cửa sổ máy ảo rồi chạy "npm run emulator -- --cold".${tail}`)
}

/** "api" nếu cổng trả JSON như backend, "free" nếu chưa có gì chạy, "other" nếu chương trình khác chiếm */
async function probePort(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/products?Page=1&PageSize=1`, {
      signal: AbortSignal.timeout(2500),
    })
    return (response.headers.get('content-type') ?? '').includes('json') ? 'api' : 'other'
  } catch (error) {
    return error?.cause?.code === 'ECONNREFUSED' ? 'free' : 'other'
  }
}

async function resolveApi() {
  if (process.env.EXPO_PUBLIC_API_URL) return { url: process.env.EXPO_PUBLIC_API_URL, note: 'theo biến môi trường' }
  // Cùng thứ tự ưu tiên Expo dùng khi đọc file .env lúc chạy dev
  for (const file of ['.env.development.local', '.env.local', '.env.development', '.env']) {
    const full = path.join(root, file)
    const url = existsSync(full) ? readEnvValue(readFileSync(full, 'utf8'), 'EXPO_PUBLIC_API_URL') : null
    if (url) return { url, note: `theo ${file}` }
  }
  const ports = process.env.API_PORT ? [Number(process.env.API_PORT)] : [8080, 8081]
  const probes = await Promise.all(ports.map(async (port) => ({ port, status: await probePort(port) })))
  const port = pickApiPort(probes)
  const found = probes.find((p) => p.port === port)?.status === 'api'
  return {
    url: emulatorApiUrl(port),
    note: found ? 'tự dò được' : 'chưa thấy backend chạy, bật backend rồi bấm r để tải lại app',
  }
}

function portTaken(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => server.close(() => resolve(false)))
    server.listen(port)
  })
}

/** Metro mặc định dùng 8081, trùng cổng backend khi chạy API_HOST_PORT=8081 */
async function pickMetroPort(apiUrl) {
  const taken = new Set([Number(new URL(apiUrl).port) || 80])
  let port = nextFreePort(8081, taken)
  while (await portTaken(port)) {
    taken.add(port)
    port = nextFreePort(port, taken)
  }
  return port
}

const serial = await ensureDevice(args.includes('--cold'))
if (args.includes('--emulator-only')) process.exit(0)

const api = await resolveApi()
const port = await pickMetroPort(api.url)
console.log(`
[dev] Thiết bị : ${serial}
[dev] Backend  : ${api.url} (${api.note})
[dev] Metro    : cổng ${port}
[dev] Menu của Expo ở bên dưới: a mở app trên Android, r tải lại, m menu trong app, j gỡ lỗi, ? xem hết
`)

// Cờ khác (vd. --clear) chuyển nguyên cho Expo
const expoArgs = args.filter((arg) => arg !== '--cold')
const expoCli = createRequire(import.meta.url).resolve('expo/bin/cli')
const expo = spawn(process.execPath, [expoCli, 'start', '--android', '--port', String(port), ...expoArgs], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_API_URL: api.url },
})
// Ctrl+C tới cả Expo; script đợi Expo thoát xong rồi mới thoát theo
process.on('SIGINT', () => {})
expo.on('exit', (code) => process.exit(code ?? 0))
