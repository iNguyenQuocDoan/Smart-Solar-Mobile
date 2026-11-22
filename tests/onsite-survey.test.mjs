import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bomErrorKey,
  bomErrors,
  bomGaps,
  bomRequest,
  newBomRow,
  readQuantity,
} from '../src/lib/onsiteSurvey/billOfMaterials.ts'
import { draftChoice, parseDraft } from '../src/lib/onsiteSurvey/draft.ts'
import {
  cabinetNoteBudget,
  composeCabinetNotes,
  emptyCabinetParts,
  parseCabinetNotes,
} from '../src/lib/onsiteSurvey/electricalCabinet.ts'
import { directionLabel, surveyStartOpensAt } from '../src/lib/onsiteSurvey/display.ts'
import {
  clearTouchedErrors,
  errorCountBySection,
  firstErrorKey,
  formDiffers,
  formFromView,
  newObstacleRow,
  obstacleErrorKey,
  sectionOfField,
  serverOnSiteSurveyErrors,
  toRequest,
  validateOnSiteSurvey,
} from '../src/lib/onsiteSurvey/form.ts'
import { parseDecimal, toInputText } from '../src/lib/onsiteSurvey/number.ts'

const view = (data = {}, extra = {}) => ({
  reportId: 'r1',
  surveyRequestId: 's1',
  appointmentId: 'a1',
  technicianUserId: 'u1',
  status: 'IN_PROGRESS',
  version: 0,
  revision: 3,
  startedAt: '2026-11-22T04:08:00Z',
  completedAt: null,
  data: {
    roofType: null,
    roofMaterial: null,
    roofLengthM: null,
    roofWidthM: null,
    usableAreaM2: null,
    tiltDegree: null,
    azimuthDegree: null,
    roofCondition: null,
    electricalCabinetNotes: null,
    electricalConnectionNotes: null,
    installationFeasibility: null,
    proposedInverterLocation: null,
    proposedPanelLayoutNotes: null,
    measuredLatitude: null,
    measuredLongitude: null,
    notes: null,
    obstacles: null,
    billOfMaterials: null,
    ...data,
  },
  obstacles: [],
  attachments: [],
  amendments: [],
  updatedAt: '2026-11-22T04:10:00Z',
  ...extra,
})

const fullForm = () => ({
  ...formFromView(view()),
  roofType: 'Mái bằng',
  roofMaterial: 'Bê tông',
  roofLengthM: '10',
  roofWidthM: '8,5',
  usableAreaM2: '60',
  tiltDegree: '0',
  azimuthDegree: '180',
  roofCondition: 'GOOD',
  installationFeasibility: 'FEASIBLE',
  electricalCabinetNotes: 'Vị trí: Nhà xe, gara',
})

test('ô số nhận cả dấu phẩy và dấu chấm', () => {
  assert.equal(parseDecimal('12,5'), 12.5)
  assert.equal(parseDecimal('12.5'), 12.5)
  assert.equal(parseDecimal('  '), null)
  assert.ok(Number.isNaN(parseDecimal('abc')))
  assert.equal(toInputText(1.2000000000000002), '1,2')
})

test('form ↔ request: số, chữ trống, vật cản, revision', () => {
  const form = fullForm()
  form.obstacles = [{ ...newObstacleRow(), kind: 'CHIMNEY', description: '  ', heightM: '1,5', areaM2: '' }]
  const body = toRequest(form, 3)
  assert.equal(body.revision, 3)
  assert.equal(body.roofWidthM, 8.5)
  assert.equal(body.notes, null)
  assert.deepEqual(body.obstacles, [{ kind: 'CHIMNEY', description: null, heightM: 1.5, areaM2: null }])
  assert.equal(body.billOfMaterials, undefined)
  assert.equal(toRequest(formFromView(null), null).revision, null)
})

test('formFromView đọc lại đúng bản trên hệ thống, không coi là đã sửa', () => {
  const v = view(
    {
      roofLengthM: 12.25,
      roofCondition: 'FAIR',
      billOfMaterials: { materials: [{ productId: 'p1', quantity: 2.5 }], serviceItems: [], installationNotes: null },
    },
    { obstacles: [{ kind: 'VENT', description: 'Ống', heightM: 1, areaM2: null }] },
  )
  const form = formFromView(v)
  assert.equal(form.roofLengthM, '12,25')
  assert.equal(form.materials[0].quantity, '2,5')
  assert.equal(form.hadBom, true)
  assert.equal(form.obstacles[0].kind, 'VENT')
  assert.equal(formDiffers(form, v), false)
  assert.equal(formDiffers({ ...form, notes: 'mới' }, v), true)
})

test('lưu nháp chỉ kiểm khoảng giá trị; hoàn thành đòi đủ ô bắt buộc', () => {
  const empty = formFromView(view())
  assert.deepEqual(validateOnSiteSurvey(empty, { forCompletion: false }), {})
  const missing = validateOnSiteSurvey(empty, { forCompletion: true })
  assert.equal(Object.keys(missing).length, 10)
  assert.equal(missing.roofType, 'Ghi loại mái.')
  assert.deepEqual(validateOnSiteSurvey(fullForm(), { forCompletion: true }), {})
})

test('khoảng giá trị như backend', () => {
  const form = { ...fullForm(), roofLengthM: '0', tiltDegree: '91', azimuthDegree: '360', usableAreaM2: 'x' }
  const errors = validateOnSiteSurvey(form, { forCompletion: false })
  assert.equal(errors.roofLengthM, 'Từ trên 0 đến 500 m.')
  assert.equal(errors.tiltDegree, 'Từ 0 đến 90 độ. Mái bằng là 0.')
  assert.match(errors.azimuthDegree, /dưới 360/)
  assert.equal(errors.usableAreaM2, 'Nhập một số, ví dụ 12,5.')
  const tooBig = validateOnSiteSurvey({ ...fullForm(), usableAreaM2: '86' }, { forCompletion: false })
  assert.match(tooBig.usableAreaM2, /85 m²/)
  const obstacle = { ...fullForm(), obstacles: [{ ...newObstacleRow(), heightM: '101' }] }
  assert.ok(validateOnSiteSurvey(obstacle, { forCompletion: false })[obstacleErrorKey(0, 'heightM')])
})

test('lỗi theo ô từ server dùng câu tiếng Việt của FE', () => {
  const form = { ...fullForm(), roofType: '' }
  const errors = serverOnSiteSurveyErrors({ roofType: ['x'], 'billOfMaterials.materials[0]': ['y'], foo: ['z'] }, form)
  assert.equal(errors.roofType, 'Ghi loại mái.')
  assert.match(errors['billOfMaterials.materials[0]'], /không còn bán/)
  assert.equal(errors.foo, 'Giá trị chưa hợp lệ.')
})

test('sửa ô thì bỏ lỗi của ô đó, sửa vật cản bỏ lỗi mọi dòng vật cản', () => {
  const errors = { roofType: 'a', [obstacleErrorKey(1, 'areaM2')]: 'b', [bomErrorKey('materials', 0)]: 'c', notes: 'd' }
  assert.deepEqual(clearTouchedErrors(errors, ['roofType', 'obstacles', 'materials']), { notes: 'd' })
})

test('ô thiếu đầu tiên theo thứ tự phần trên màn, và phần chứa ô', () => {
  assert.equal(sectionOfField('azimuthDegree'), 'roof')
  assert.equal(sectionOfField('electricalCabinetNotes'), 'electric')
  assert.equal(sectionOfField(obstacleErrorKey(0, 'heightM')), 'obstacles')
  assert.equal(sectionOfField(bomErrorKey('serviceItems', 2)), 'bom')
  assert.equal(
    firstErrorKey({ installationFeasibility: 'x', electricalCabinetNotes: 'y', tiltDegree: 'z' }),
    'tiltDegree',
  )
  assert.equal(firstErrorKey({}), null)
  assert.deepEqual(errorCountBySection({ roofType: 'a', tiltDegree: 'b', notes: 'c' }), { roof: 2, location: 1 })
})

test('tủ điện: ghép và đọc ngược về đúng từng ô', () => {
  const parts = { location: 'Nhà xe, gara', phase: '3 pha', mainBreaker: '63 A', spareSpace: '', note: 'Dây cũ' }
  const text = composeCabinetNotes(parts)
  assert.equal(text, 'Vị trí: Nhà xe, gara\nNguồn điện: 3 pha\nAptomat tổng: 63 A\nGhi chú: Dây cũ')
  assert.deepEqual(parseCabinetNotes(text), parts)
  assert.deepEqual(parseCabinetNotes('Ghi tự do kiểu cũ'), { ...emptyCabinetParts(), note: 'Ghi tự do kiểu cũ' })
  assert.equal(composeCabinetNotes({ ...emptyCabinetParts(), location: 'Ngoài ' }), 'Vị trí: Ngoài ')
  assert.equal(cabinetNoteBudget(emptyCabinetParts(), 2000), 2000)
  assert.equal(
    cabinetNoteBudget({ ...emptyCabinetParts(), phase: '1 pha' }, 2000),
    2000 - 'Nguồn điện: 1 pha'.length - 1 - 'Ghi chú: '.length,
  )
})

test('bảng vật tư: số lượng, trùng sản phẩm, đơn vị đếm nguyên', () => {
  assert.equal(readQuantity('2,5'), 2.5)
  assert.ok(Number.isNaN(readQuantity('-1')))
  const rows = [newBomRow('p1', '2,5'), newBomRow('p1', '1'), newBomRow('', ''), newBomRow('p2', '0')]
  const errors = bomErrors(rows, [], '', { p1: 'PCS' })
  assert.equal(errors[bomErrorKey('materials', 0)], 'Đếm theo PCS: nhập số nguyên.')
  assert.match(errors[bomErrorKey('materials', 1)], /đã có ở dòng trên/)
  assert.equal(errors[bomErrorKey('materials', 2)], 'Chọn sản phẩm hoặc xoá dòng này.')
  assert.match(errors[bomErrorKey('materials', 3)], /từ trên 0/)
})

test('bảng vật tư: null khi chưa từng có, bảng rỗng khi xoá hết dòng của bảng cũ', () => {
  assert.equal(bomRequest([], [], '  ', false), null)
  assert.deepEqual(bomRequest([], [], '', true), { materials: [], serviceItems: [], installationNotes: null })
  assert.deepEqual(bomRequest([newBomRow('p1', '3'), newBomRow('', '1')], [newBomRow('s1', '1')], ' Lắp ', false), {
    materials: [{ productId: 'p1', quantity: 3 }],
    serviceItems: [{ productId: 's1', quantity: 1 }],
    installationNotes: 'Lắp',
  })
  const types = { p1: 'SOLAR_PANEL', s1: 'TRANSPORT' }
  assert.deepEqual(
    bomGaps([newBomRow('p1', '1')], [newBomRow('s1', '1')], (id) => types[id]),
    ['inverter', 'nhân công lắp đặt'],
  )
})

test('nháp trên máy: dùng lại khi bản trên hệ thống chưa đổi, hỏi khi đã đổi', () => {
  const v = view()
  const changed = { ...formFromView(v), notes: 'đo dở' }
  const draft = { appointmentId: 'a1', revision: 3, form: changed, savedAt: '2026-11-22T05:00:00Z' }
  assert.equal(draftChoice(null, v), 'none')
  assert.equal(draftChoice(draft, v), 'restore')
  assert.equal(draftChoice({ ...draft, revision: 2 }, v), 'conflict')
  assert.equal(draftChoice({ ...draft, form: formFromView(v) }, v), 'none')
  assert.equal(draftChoice({ ...draft, appointmentId: 'khác' }, v), 'none')
  assert.deepEqual(parseDraft(JSON.stringify(draft)), draft)
  assert.equal(parseDraft('{hỏng'), null)
  assert.equal(parseDraft(JSON.stringify({ appointmentId: 'a1', revision: 1, form: {} })), null)
})

test('bắt đầu khảo sát mở từ 2 giờ trước giờ hẹn; hướng mái', () => {
  assert.equal(surveyStartOpensAt('2026-11-22T09:00:00Z').toISOString(), '2026-11-22T07:00:00.000Z')
  assert.equal(directionLabel(185), 'Nam')
  assert.equal(directionLabel(-45), 'Tây Bắc')
})
