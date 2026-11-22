import type { InstallationProject, OpenAppointment, TechnicianAppointment } from '@/lib/api/types'

// Chuông của kỹ thuật viên: backend không có thông báo cho nhân viên nên chuông đếm việc đang chờ, lấy từ chính các danh sách
// của tab Khảo sát và Lắp đặt. Không có "đã đọc": làm xong việc thì dòng tự mất

export type TechTodo = {
  key: string
  title: string
  /** Tên công trình */
  place: string
  /** Giờ của việc, để hiện kèm */
  startsAt: string
  endsAt: string
  href: string
}

export function techTodos(
  open: readonly Pick<OpenAppointment, 'appointmentId' | 'propertyName' | 'startsAt' | 'endsAt' | 'canAccept'>[],
  mine: readonly Pick<TechnicianAppointment, 'appointmentId' | 'propertyName' | 'startsAt' | 'endsAt' | 'isOverdue'>[],
  installations: readonly Pick<
    InstallationProject,
    'projectId' | 'status' | 'myAssignmentStatus' | 'startsAt' | 'endsAt' | 'site'
  >[],
): TechTodo[] {
  const items: TechTodo[] = []
  for (const p of installations) {
    const place = p.site?.propertyName ?? 'Công trình lắp đặt'
    const href = `/tech/installation/${p.projectId}`
    // Chờ nhận, giống awaitsAnswer của techInstallation (không import để node --test chạy được file này)
    if (p.myAssignmentStatus === 'PENDING')
      items.push({ key: `i-${p.projectId}`, title: 'Được giao lắp đặt, chờ bạn nhận', place, ...times(p), href })
    else if (p.myAssignmentStatus === 'ACCEPTED' && p.status === 'REWORK_REQUIRED')
      items.push({ key: `r-${p.projectId}`, title: 'Công trình bị trả về, cần làm lại', place, ...times(p), href })
  }
  for (const j of mine)
    if (j.isOverdue)
      items.push({
        key: `o-${j.appointmentId}`,
        title: 'Quá giờ hẹn, chưa khảo sát',
        place: j.propertyName,
        ...times(j),
        href: `/tech/job/${j.appointmentId}`,
      })
  for (const j of open)
    if (j.canAccept)
      items.push({
        key: `a-${j.appointmentId}`,
        title: 'Lịch khảo sát chờ người nhận',
        place: j.propertyName,
        ...times(j),
        href: '/tech',
      })
  return items
}

const times = (x: { startsAt: string; endsAt: string }) => ({ startsAt: x.startsAt, endsAt: x.endsAt })
