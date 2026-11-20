// Kiểm luồng giám sát của khách trên backend thật, bằng đúng các endpoint app gọi. Tài khoản lấy từ biến môi trường, không ghi vào
// code và không in ra; token chỉ giữ trong bộ nhớ.
//
//   SMART_SOLAR_EMAIL=... SMART_SOLAR_PASSWORD=... node scripts/iot-smoke.mjs
//   ... node scripts/iot-smoke.mjs --watch 60     hỏi số đo mới nhất mỗi 10 giây trong 60 giây (xem ONLINE / OFFLINE, số âm)
//
//   IOT_API_ORIGIN  mặc định http://160.187.1.242:8080

const origin = (process.env.IOT_API_ORIGIN ?? 'http://160.187.1.242:8080').replace(/\/+$/, '')
const email = process.env.SMART_SOLAR_EMAIL?.trim()
const password = process.env.SMART_SOLAR_PASSWORD
const watchIndex = process.argv.indexOf('--watch')
const watchSeconds = watchIndex > 0 ? Number(process.argv[watchIndex + 1] ?? 60) : 0

if (!email || !password) {
  console.error('Đặt SMART_SOLAR_EMAIL và SMART_SOLAR_PASSWORD của tài khoản khách thử nghiệm rồi chạy lại.')
  process.exit(2)
}

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const vnTime = (iso) => (iso ? new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(11, 19) : '—')
let token = null

async function call(path, init = {}) {
  const response = await fetch(`${origin}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  })
  const body = await response.json().catch(() => null)
  return {
    status: response.status,
    ok: response.ok && body?.isSuccess !== false,
    data: body?.data,
    code: body?.error?.code ?? null,
    retryAfter: response.headers.get('Retry-After'),
    envelope: body !== null && typeof body === 'object' && 'isSuccess' in body,
  }
}

const base = (projectId) => `/customers/me/installation-projects/${encodeURIComponent(projectId)}/energy-monitoring`

const login = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
check('đăng nhập', login.ok && Boolean(login.data?.accessToken), login.ok ? '' : `HTTP ${login.status} ${login.code}`)
if (!login.ok) process.exit(1)
token = login.data.accessToken

const projects = await call('/customers/me/installation-projects')
check(
  'danh sách công trình',
  projects.ok && Array.isArray(projects.data),
  `HTTP ${projects.status} ${projects.code ?? ''}`,
)
if (!projects.ok) process.exit(1)
const list = projects.data.filter((p) => p.status !== 'CANCELLED')
console.log(`  ${list.length} công trình chưa huỷ`)

const readingIds = new Map()
let watchProject = null

for (const project of list) {
  const id = project.projectId
  console.log(`\nCông trình ${id.slice(0, 8).toUpperCase()} (${project.status})`)
  const energy = await call(base(id))
  check('tổng quan energy-monitoring', energy.ok && energy.envelope, `HTTP ${energy.status} ${energy.code ?? ''}`)
  const measured = energy.data?.measured ?? null
  if (energy.ok) {
    for (const key of ['powerWatts', 'energyProducedKwh', 'energyImportedKwh', 'energyExportedKwh']) {
      if (!measured) continue
      const q = measured[key]
      check(`${key} là NOT_AVAILABLE, value null`, q?.status === 'NOT_AVAILABLE' && q.value === null)
    }
    if (!measured) console.log('  measured = null (chưa gắn thiết bị)')
  }

  const device = await call(`${base(id)}/device`)
  const bound = device.ok
  if (bound) {
    check('thiết bị đang gắn', true, `${device.data.deviceId}, ${device.data.connectionStatus}`)
    check('measured có khi có thiết bị', measured !== null)
    watchProject ??= id
  } else {
    check(
      'chưa gắn: 404 IOT_BINDING_NOT_FOUND',
      device.status === 404 && device.code === 'IOT_BINDING_NOT_FOUND',
      `HTTP ${device.status} ${device.code}`,
    )
    check('chưa gắn: measured = null', measured === null)
  }

  const latest = await call(`${base(id)}/readings/latest`)
  if (bound) {
    check('số đo mới nhất', latest.ok, `HTTP ${latest.status} ${latest.code ?? ''}`)
    if (latest.ok) {
      const r = latest.data.reading
      console.log(
        `  ${latest.data.connectionStatus}, ${r ? `${r.currentAmps} A lúc ${vnTime(r.receivedAt)}` : 'reading = null'}`,
      )
      if (latest.data.connectionStatus === 'DISABLED') check('DISABLED: reading = null', r === null)
    }
  } else check('chưa gắn: latest 404 IOT_BINDING_NOT_FOUND', latest.code === 'IOT_BINDING_NOT_FOUND')

  const page1 = await call(`${base(id)}/readings?limit=5`)
  check('lịch sử trang đầu', page1.ok, `HTTP ${page1.status} ${page1.code ?? ''}`)
  if (!page1.ok) continue
  const items = page1.data.items
  console.log(`  ${items.length} số đo, hasMore=${page1.data.hasMore}`)
  const sorted = items.every((r, i) => i === 0 || Date.parse(items[i - 1].receivedAt) >= Date.parse(r.receivedAt))
  check('lịch sử mới nhất trước', sorted)
  readingIds.set(id, new Set(items.map((r) => r.readingId)))
  if (page1.data.hasMore && page1.data.nextBefore) {
    const page2 = await call(`${base(id)}/readings?limit=5&before=${encodeURIComponent(page1.data.nextBefore)}`)
    check('trang cũ hơn bằng nextBefore', page2.ok, `HTTP ${page2.status}`)
    if (page2.ok) {
      const overlap = page2.data.items.some((r) => readingIds.get(id).has(r.readingId))
      const older = page2.data.items.every((r) => Date.parse(r.receivedAt) < Date.parse(page1.data.nextBefore))
      check('trang cũ hơn không trùng và cũ hơn nextBefore', !overlap && older)
    }
  }
}

const invalid = list[0] ? await call(`${base(list[0].projectId)}/readings?limit=501`) : null
if (invalid)
  check('limit 501: 400 IOT_VALIDATION_FAILED', invalid.status === 400 && invalid.code === 'IOT_VALIDATION_FAILED')
const foreign = await call(`${base('00000000-0000-0000-0000-000000000001')}/device`)
check(
  'công trình không phải của mình: 404 INSTALLATION_PROJECT_NOT_FOUND',
  foreign.status === 404 && foreign.code === 'INSTALLATION_PROJECT_NOT_FOUND',
  `HTTP ${foreign.status} ${foreign.code}`,
)

const ids = [...readingIds.values()]
const shared = ids.some((a, i) => ids.some((b, j) => i !== j && [...a].some((x) => b.has(x))))
if (ids.length > 1) check('hai công trình không chung số đo nào', !shared)

if (watchSeconds > 0 && watchProject) {
  console.log(`\nTheo dõi ${watchSeconds} giây, mỗi 10 giây (công trình ${watchProject.slice(0, 8).toUpperCase()})`)
  const end = Date.now() + watchSeconds * 1000
  while (Date.now() < end) {
    const latest = await call(`${base(watchProject)}/readings/latest`)
    if (latest.status === 429) {
      const seconds = Number(latest.retryAfter) || 60
      console.log(`  429, chờ ${seconds} giây`)
      await sleep(seconds * 1000)
      continue
    }
    const r = latest.data?.reading
    console.log(
      `  ${vnTime(new Date().toISOString())}  ${latest.data?.connectionStatus ?? `HTTP ${latest.status} ${latest.code}`}  ` +
        `${r ? `${r.currentAmps} A (đo ${vnTime(r.receivedAt)})` : 'reading = null'}`,
    )
    await sleep(10_000)
  }
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed} pass, ${failed} fail`)
process.exit(failed ? 1 : 0)
