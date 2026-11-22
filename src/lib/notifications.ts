// Thông báo của khách (GET /customers/me/after-sales/notifications), nhãn giống web (smart-solar src/common/afterSales.ts).
// `message` của backend là tiếng Anh nên chỉ hiện nhãn theo `type`

const TYPES: Record<string, string> = {
  VISIT_SCHEDULED: 'Đã có lịch hẹn kỹ thuật viên',
  VISIT_MISSED: 'Buổi bảo trì chưa làm được, bạn đặt lại được',
  COVERAGE_DECIDED: 'Đã xét xong lỗi nào được bảo hành',
  CLAIM_DECIDED: 'Đã có kết quả xét hỗ trợ thiên tai',
  QUOTATION_ISSUED: 'Có báo giá mới chờ bạn duyệt',
  QUOTATION_PAID: 'Đã nhận tiền báo giá',
  QUOTATION_EXPIRED: 'Báo giá đã hết hạn',
  NO_FAULT_FOUND: 'Kỹ thuật viên không thấy lỗi, mời bạn xác nhận',
  ACCEPTANCE_REQUESTED: 'Đã làm xong, mời bạn nghiệm thu',
  ACCEPTANCE_REMINDER: 'Nhắc nghiệm thu kết quả',
  DISPUTE_REVIEWED: 'Đã xem ý kiến của bạn về kết quả',
  REQUEST_DUPLICATE: 'Yêu cầu đã được gộp vào yêu cầu khác',
  CANCELLATION_APPROVED: 'Yêu cầu huỷ đã được duyệt',
  CANCELLATION_REJECTED: 'Yêu cầu huỷ không được duyệt',
  WORK_STOPPED: 'Việc sửa chữa đã dừng',
  SERVICE_NOT_FULFILLED: 'Smart Solar chưa xếp được lịch, yêu cầu đã huỷ',
  PACKAGE_PAID: 'Đã nhận tiền gói dịch vụ',
  PACKAGE_ACTIVE: 'Gói dịch vụ bắt đầu hiệu lực',
  PACKAGE_EXPIRING: 'Gói dịch vụ sắp hết hạn',
  MAINTENANCE_DUE: 'Tới tháng bảo trì, mời bạn đặt lịch',
  SURVEY_APPOINTMENT_BOOKED: 'Đã đặt lịch khảo sát',
  SURVEY_APPOINTMENT_CONFIRMED: 'Đã có kỹ thuật viên nhận lịch khảo sát',
  SURVEY_APPOINTMENT_RESCHEDULED: 'Lịch khảo sát đã được đổi giờ',
  SURVEY_TECHNICIAN_RELEASED: 'Kỹ thuật viên trả lại lịch khảo sát, đang tìm người khác',
  SURVEY_APPOINTMENT_CANCELLED: 'Lịch khảo sát đã bị huỷ',
  INSTALLATION_QUOTATION_ISSUED: 'Có báo giá lắp đặt',
  CONTRACT_CREATED_AFTER_PAYMENT: 'Đã nhận đủ tiền, hợp đồng đã được lập',
  CONTRACT_READY_FOR_PREVIEW: 'Hợp đồng đã lập, mời bạn đọc trước khi trả 30%',
  CONTRACT_DEPOSIT_RECEIVED: 'Đã nhận khoản 30%',
  CONTRACT_PAPER_SIGNED: 'Hợp đồng giấy đã ký, sẵn sàng thi công',
  INSTALLATION_ACCEPTANCE_REQUESTED: 'Công trình đã lắp xong, mời bạn nghiệm thu',
  CONTRACT_BALANCE_DUE: 'Khoản 70% đã đến hạn',
  CONTRACT_BALANCE_OVERDUE: 'Khoản 70% đã quá hạn',
  CONTRACT_FULLY_PAID: 'Đã trả đủ 100% hợp đồng',
  CONTRACT_AWAITING_SIGNATURE: 'Hợp đồng đã sẵn sàng, mời bạn ký',
  CONTRACT_SIGNED: 'Bản ký hợp đồng đã được duyệt, mời bạn thanh toán',
  CONTRACT_SIGNATURE_REJECTED: 'Bản ký hợp đồng chưa được duyệt, mời bạn ký lại',
  INSTALLATION_SCHEDULE_PLANNED: 'Kỹ thuật viên đã ghi ngày thi công dự kiến',
  INSTALLATION_SCHEDULE_CHANGED: 'Ngày thi công dự kiến đã đổi',
  INSTALLATION_SCHEDULE_RESCHEDULE_REQUIRED: 'Ngày thi công không xác nhận được, sẽ hẹn lại',
  INSTALLATION_SCHEDULE_CANCELLED: 'Lịch thi công dự kiến đã bị huỷ',
  INSTALLATION_SLOTS_OFFERED: 'Kỹ thuật viên đề xuất ngày thi công',
  INSTALLATION_SCHEDULED: 'Công trình đã có lịch lắp đặt',
  INSTALLATION_STARTED: 'Kỹ thuật viên đã bắt đầu lắp đặt',
  INSTALLATION_ACCEPTANCE_REQUIRED: 'Lắp đặt xong',
  INSTALLATION_COMPLETION_REPORTED: 'Kỹ thuật viên đã báo hoàn thành',
  INSTALLATION_COMPLETED: 'Công trình đã nghiệm thu và bàn giao',
  INSTALLATION_REWORK_REQUIRED: 'Công trình được làm lại theo yêu cầu',
  INSTALLATION_CANCELLED: 'Công trình lắp đặt đã bị huỷ',
  EQUIPMENT_SUBSTITUTION_APPROVAL_REQUIRED: 'Có đề xuất đổi thiết bị',
  EQUIPMENT_SUBSTITUTION_RECORDED: 'Thiết bị lắp khác hợp đồng đã được Smart Solar duyệt',
}

export const notificationLabel = (type: string) => TYPES[type] ?? 'Có cập nhật mới'

/**
 * Màn trong app mở được từ thông báo; null là việc chỉ làm trên web (hợp đồng, thanh toán, bảo hành, gói dịch vụ) nên bấm
 * vào chỉ đánh dấu đã đọc
 */
export function notificationTarget(type: string): '/customer/requests' | '/customer' | null {
  if (type.startsWith('SURVEY_')) return '/customer/requests'
  if (type === 'INSTALLATION_QUOTATION_ISSUED' || type === 'INSTALLATION_SLOTS_OFFERED') return null
  if (type.startsWith('INSTALLATION_SCHEDULE_')) return null
  if (type.startsWith('INSTALLATION_') || type.startsWith('EQUIPMENT_SUBSTITUTION_')) return '/customer'
  return null
}
