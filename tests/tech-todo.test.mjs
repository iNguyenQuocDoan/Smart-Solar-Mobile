import assert from 'node:assert/strict'
import { test } from 'node:test'
import { techTodos } from '../src/lib/techTodo.ts'

const at = { startsAt: '2026-11-21T08:00:00+07:00', endsAt: '2026-11-21T09:30:00+07:00' }

test('chuông kỹ thuật viên: đếm việc đang chờ từ các danh sách thật', () => {
  const items = techTodos(
    [
      { appointmentId: 'o1', propertyName: 'Kho A', canAccept: true, ...at },
      { appointmentId: 'o2', propertyName: 'Kho B', canAccept: false, ...at },
    ],
    [
      { appointmentId: 'm1', propertyName: 'Xưởng C', isOverdue: true, ...at },
      { appointmentId: 'm2', propertyName: 'Xưởng D', isOverdue: false, ...at },
    ],
    [
      { projectId: 'p1', status: 'SCHEDULED', myAssignmentStatus: 'PENDING', site: { propertyName: 'Shop' }, ...at },
      { projectId: 'p2', status: 'REWORK_REQUIRED', myAssignmentStatus: 'ACCEPTED', site: null, ...at },
      { projectId: 'p3', status: 'IN_PROGRESS', myAssignmentStatus: 'ACCEPTED', site: null, ...at },
    ],
  )
  assert.deepEqual(
    items.map((i) => i.href),
    ['/tech/installation/p1', '/tech/installation/p2', '/tech/job/m1', '/tech'],
  )
  assert.equal(items[1].place, 'Công trình lắp đặt')
})
