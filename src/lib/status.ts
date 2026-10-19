import type { CustomerRequest } from '@/lib/api/types'

export type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'info'

export function canBook(request: Pick<CustomerRequest, 'status' | 'appointment'>) {
  return !request.appointment && (request.status === 'PENDING' || request.status === 'ASSIGNED')
}

export function customerStatus(request: Pick<CustomerRequest, 'status' | 'appointment'>): { label: string; tone: Tone } {
  if (request.status === 'COMPLETED') return { label: 'Đã khảo sát xong', tone: 'neutral' }
  if (request.status === 'CANCELLED') return { label: 'Đã huỷ', tone: 'neutral' }
  if (!request.appointment) {
    return canBook(request)
      ? { label: 'Chưa đặt giờ khảo sát', tone: 'danger' }
      : { label: 'Chưa có lịch hẹn', tone: 'neutral' }
  }
  return appointmentStatus(request.appointment.status, 'customer')
}

export function appointmentStatus(status: string, viewer: 'customer' | 'technician'): { label: string; tone: Tone } {
  if (status === 'BOOKED') return { label: 'Đã đặt giờ, chờ phân công', tone: 'info' }
  if (status === 'ASSIGNED') {
    return viewer === 'technician'
      ? { label: 'Chờ bạn nhận việc', tone: 'danger' }
      : { label: 'Đã phân công', tone: 'success' }
  }
  if (status === 'ACKNOWLEDGED') return { label: 'Đã nhận việc', tone: 'success' }
  if (status === 'CANCELLED') return { label: 'Đã huỷ', tone: 'neutral' }
  return { label: status, tone: 'neutral' }
}

export function routingStatus(status: string): { label: string; tone: Tone } {
  if (status === 'OK') return { label: 'Đường đi đã kiểm tra', tone: 'success' }
  if (status === 'PENDING_RECALCULATION') return { label: 'Đang tính lại đường đi', tone: 'info' }
  if (status === 'STALE') return { label: 'Đường đi cần tính lại', tone: 'warning' }
  if (status === 'FAILED') return { label: 'Không tính được đường đi', tone: 'warning' }
  return { label: 'Chưa có ước tính đường đi', tone: 'neutral' }
}
