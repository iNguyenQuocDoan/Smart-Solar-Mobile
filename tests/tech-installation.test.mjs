import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  installationGroup,
  lotRequest,
  missingAssetTypes,
  needsAction,
  nextStep,
  productsForAsset,
  validateLot,
} from '../src/lib/techInstallation.ts'

const base = {
  status: 'IN_PROGRESS',
  myAssignmentStatus: 'ACCEPTED',
  startsAt: '2026-11-20T08:00:00+07:00',
  endsAt: '2026-11-21T17:00:00+07:00',
  startedAt: '2026-11-20T08:10:00+07:00',
  currentRound: 1,
  canStart: false,
  startBlockedReason: null,
  evidence: [],
  assets: [],
  acceptances: [],
  equipment: null,
}

test('nhóm và việc cần làm theo phân công của mình', () => {
  assert.equal(installationGroup({ ...base, myAssignmentStatus: 'PENDING' }), 'pending')
  assert.equal(installationGroup(base), 'active')
  assert.equal(installationGroup({ ...base, status: 'COMPLETED' }), 'done')
  assert.equal(needsAction({ ...base, myAssignmentStatus: 'PENDING' }), true)
  assert.equal(needsAction({ ...base, status: 'REWORK_REQUIRED' }), true)
  assert.equal(needsAction(base), false)
})

test('báo cáo cần tấm pin và inverter, trừ khi công trình không bắt buộc', () => {
  assert.deepEqual(missingAssetTypes(base), ['PANEL', 'INVERTER'])
  assert.deepEqual(missingAssetTypes({ ...base, assets: [{ assetType: 'PANEL' }] }), ['INVERTER'])
  assert.deepEqual(missingAssetTypes({ ...base, requiresPanelAndInverterAssets: false }), [])
})

test('việc tiếp theo: nhận việc quá hạn, sửa lại kèm lý do', () => {
  const late = nextStep({ ...base, myAssignmentStatus: 'PENDING' }, Date.parse('2026-11-22T00:00:00+07:00'))
  assert.equal(late.tone, 'warning')
  const rework = nextStep(
    {
      ...base,
      status: 'REWORK_REQUIRED',
      currentRound: 2,
      acceptances: [{ decision: 'REWORK_REQUESTED', decidedBy: 'STAFF', reason: 'thiếu ảnh tủ điện' }],
    },
    0,
  )
  assert.match(rework.text, /thiếu ảnh tủ điện/)
  assert.match(rework.text, /lượt 2/)
})

test('lô thiết bị: chọn sản phẩm đúng loại, số lượng nguyên, hãng và model lấy từ danh mục', () => {
  const products = [
    { id: 'inv', productType: 'INVERTER', status: 'ACTIVE' },
    { id: 'p1', productType: 'SOLAR_PANEL', status: 'ACTIVE' },
    { id: 'p2', productType: 'SOLAR_PANEL', status: 'ACTIVE' },
    { id: 'p3', productType: 'SOLAR_PANEL', status: 'INACTIVE' },
    { id: 'lab', productType: 'INSTALLATION_LABOR', status: 'ACTIVE' },
  ]
  assert.deepEqual(
    productsForAsset(products, 'PANEL', ['p2']).map((p) => p.id),
    ['p2', 'p1'],
  )
  assert.deepEqual(
    productsForAsset(products, 'OTHER', []).map((p) => p.id),
    ['inv', 'p1', 'p2'],
  )
  assert.ok(validateLot({ assetType: 'PANEL', productId: null, quantity: '', warrantyMonths: '' }).productId)
  assert.ok(validateLot({ assetType: 'PANEL', productId: 'p1', quantity: '1,5', warrantyMonths: '' }).quantity)
  assert.ok(validateLot({ assetType: 'PANEL', productId: 'p1', quantity: '2', warrantyMonths: '601' }).warrantyMonths)
  const lot = { assetType: 'PANEL', productId: 'p1', quantity: '24', warrantyMonths: '144' }
  assert.deepEqual(validateLot(lot), {})
  assert.deepEqual(lotRequest(lot, { brand: ' JA ', model: null, name: 'Tấm JA 600W', sku: 'JA' }), {
    assetType: 'PANEL',
    productId: 'p1',
    manufacturer: 'JA',
    model: 'Tấm JA 600W',
    serialNumber: null,
    positionCode: null,
    warrantyMonths: 144,
    quantity: 24,
  })
})
