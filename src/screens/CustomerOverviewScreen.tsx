import { useRouter } from 'expo-router'
import { useEnergy, useMyProjects } from '@/hooks/queries'
import type { CustomerProject } from '@/lib/api/types'
import { dateOf, formatAppointment, formatDay } from '@/lib/format'
import {
  assetUnits,
  formatKwhPerYear,
  formatKwp,
  projectNextStep,
  projectStatus,
  projectTitle,
} from '@/lib/installation'
import { connectionMeta } from '@/lib/iot'
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

// Tổng quan của khách: công trình lắp đặt, sản lượng dự kiến theo mô phỏng và trạng thái thiết bị đo. Số đo đọc ở màn Giám sát
// điện năng; ở đây không hiện số đo để không phải hỏi lại liên tục. Chưa có số liệu thì bỏ dòng, không ghi "Chưa có"

function EnergyRows({ project }: { project: CustomerProject }) {
  const router = useRouter()
  const energy = useEnergy(project)
  const measured = energy.data?.measured
  const connection = measured ? connectionMeta(measured.device.connectionStatus) : null
  const s = project.status === 'COMPLETED' ? energy.data?.simulated : null
  const estimate =
    s && s.installedCapacityKwp != null
      ? [
          formatKwp(s.installedCapacityKwp),
          s.panelCount != null ? `${s.panelCount} tấm` : null,
          s.annualEnergyKwh != null ? `khoảng ${formatKwhPerYear(s.annualEnergyKwh)}` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null
  return (
    <>
      {estimate ? <KeyValue label="Dự kiến" value={estimate} /> : null}
      {connection ? (
        <>
          <KeyValue label="Thiết bị đo" value={<StatusText tone={connection.tone}>{connection.label}</StatusText>} />
          <Button
            label="Xem số đo"
            icon="pulse-outline"
            variant="secondary"
            compact
            onPress={() => router.push({ pathname: '/customer/monitoring', params: { projectId: project.projectId } })}
          />
        </>
      ) : null}
    </>
  )
}

function ProjectPanel({ project }: { project: CustomerProject }) {
  const status = projectStatus(project.status)
  const next = projectNextStep(project.status)
  return (
    <Panel>
      <SectionTitle detail={project.assets.length > 0 ? `${assetUnits(project.assets)} thiết bị` : undefined}>
        {projectTitle(project.projectId)}
      </SectionTitle>
      <KeyValue label="Trạng thái" value={<StatusText tone={status.tone}>{status.label}</StatusText>} />
      {project.handoverAt ? (
        <KeyValue label="Bàn giao" value={formatDay(dateOf(project.handoverAt))} />
      ) : project.scheduledStartsAt && project.scheduledEndsAt ? (
        <KeyValue label="Lịch lắp đặt" value={formatAppointment(project.scheduledStartsAt, project.scheduledEndsAt)} />
      ) : null}
      {project.technicianName ? <KeyValue label="Kỹ thuật viên" value={project.technicianName} /> : null}
      {next ? <KeyValue label="Tiếp theo" value={next} /> : null}
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
