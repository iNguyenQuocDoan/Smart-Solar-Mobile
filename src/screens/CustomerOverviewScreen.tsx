import { useRouter } from 'expo-router'
import { useEnergy, useMyProjects } from '@/hooks/queries'
import type { CustomerProject } from '@/lib/api/types'
import { dateOf, formatAppointment, formatDay } from '@/lib/format'
import { formatKwhPerYear, formatKwp, projectStatus, projectTitle } from '@/lib/installation'
import {
  Button,
  KeyValue,
  PageHeader,
  Panel,
  QueryState,
  Screen,
  SectionTitle,
  StateView,
  StatusText,
} from '@/components/ui'

// Tổng quan của khách: công trình lắp đặt và sản lượng ước tính theo mô phỏng.
// Chưa nối đồng hồ đo nên không có số đo thực tế, không vẽ số liệu dựng sẵn

function EnergyRows({ project }: { project: CustomerProject }) {
  const energy = useEnergy(project)
  if (project.status !== 'COMPLETED') return null
  const s = energy.data?.simulated
  const estimate =
    s && s.installedCapacityKwp != null
      ? [
          formatKwp(s.installedCapacityKwp),
          s.panelCount != null ? `${s.panelCount} tấm` : null,
          s.annualEnergyKwh != null ? `khoảng ${formatKwhPerYear(s.annualEnergyKwh)}` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : 'Chưa có'
  return (
    <>
      <KeyValue
        label="Sản lượng ước tính"
        value={energy.isPending ? 'Đang tải…' : energy.error ? 'Chưa tải được' : estimate}
      />
      {energy.data && !energy.data.measuredDataAvailable ? (
        <KeyValue label="Số đo thực tế" value="Chưa nối đồng hồ đo" />
      ) : null}
    </>
  )
}

function ProjectPanel({ project }: { project: CustomerProject }) {
  const status = projectStatus(project.status)
  return (
    <Panel>
      <SectionTitle detail={project.assets.length > 0 ? `${project.assets.length} thiết bị` : undefined}>
        {projectTitle(project.projectId)}
      </SectionTitle>
      <KeyValue label="Trạng thái" value={<StatusText tone={status.tone}>{status.label}</StatusText>} />
      {project.handoverAt ? (
        <KeyValue label="Bàn giao" value={formatDay(dateOf(project.handoverAt))} />
      ) : project.scheduledStartsAt && project.scheduledEndsAt ? (
        <KeyValue label="Lịch lắp đặt" value={formatAppointment(project.scheduledStartsAt, project.scheduledEndsAt)} />
      ) : null}
      {project.technicianName ? <KeyValue label="Kỹ thuật viên" value={project.technicianName} /> : null}
      <EnergyRows project={project} />
    </Panel>
  )
}

export function CustomerOverviewScreen() {
  const router = useRouter()
  const projects = useMyProjects()
  const list = (projects.data ?? []).filter((p) => p.status !== 'CANCELLED')
  return (
    <Screen refreshing={projects.isRefetching} onRefresh={() => void projects.refetch()}>
      <PageHeader title="Tổng quan" />
      <QueryState loading={projects.isPending} error={projects.error} onRetry={() => void projects.refetch()} />
      {projects.data && list.length === 0 ? (
        <StateView
          title="Chưa có công trình lắp đặt"
          action={<Button label="Xem yêu cầu khảo sát" compact onPress={() => router.push('./requests')} />}
        />
      ) : null}
      {list.map((p) => (
        <ProjectPanel key={p.projectId} project={p} />
      ))}
    </Screen>
  )
}
