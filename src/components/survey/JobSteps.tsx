import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button, Panel, SectionTitle } from '@/components/ui'
import { Note } from '@/components/form'
import { StartSurvey } from '@/components/survey/StartSurvey'
import { useOnsiteSurvey } from '@/hooks/techJob'
import type { TechnicianJob } from '@/lib/api/types'
import { formatMoment } from '@/lib/format'
import { useAppTheme } from '@/theme/theme'

// Tiến độ làm việc tại công trình: Khảo sát → Báo giá → Thu tiền. Mỗi bước nói việc tiếp theo và mở màn của bước đó

const WORKING_STATUSES = new Set(['ACCEPTED', 'ASSIGNED', 'COMPLETED'])

type StepState = 'done' | 'current' | 'todo'

export function JobSteps({ job }: { job: TechnicianJob }) {
  const router = useRouter()
  const working = WORKING_STATUSES.has(job.status)
  const survey = useOnsiteSurvey(job.appointmentId, { enabled: working })
  if (!working) return null

  const view = survey.data ?? null
  const completed = job.status === 'COMPLETED' || view?.status === 'COMPLETED'
  const started = completed || view?.status === 'IN_PROGRESS'
  const openSurvey = () => router.push({ pathname: '/tech/job/[id]/survey', params: { id: job.appointmentId } })

  return (
    <Panel>
      <SectionTitle>Các bước tại công trình</SectionTitle>
      <Step
        index={1}
        title="Khảo sát"
        state={completed ? 'done' : 'current'}
        detail={
          completed
            ? `Đã hoàn thành${view?.completedAt ? ` lúc ${formatMoment(view.completedAt)}` : ''}.`
            : started
              ? `Đang khảo sát từ ${formatMoment(view?.startedAt)}.`
              : 'Chưa bắt đầu.'
        }
      >
        {survey.isPending ? null : survey.error ? (
          <Note tone="danger">{survey.error.message}</Note>
        ) : started ? (
          <Button
            label={completed ? 'Xem biên bản' : 'Mở biên bản khảo sát'}
            icon="document-text-outline"
            variant={completed ? 'secondary' : 'primary'}
            onPress={openSurvey}
          />
        ) : (
          <StartSurvey job={job} onStarted={openSurvey} />
        )}
      </Step>
      <Step
        index={2}
        title="Báo giá"
        state={completed ? 'current' : 'todo'}
        detail={completed ? 'Lập từ vật tư đã chốt.' : 'Mở khi khảo sát xong.'}
      />
      <Step index={3} title="Thu 30%" state="todo" detail="Thu tại chỗ khi khách đồng ý báo giá." />
    </Panel>
  )
}

function Step({
  index,
  title,
  state,
  detail,
  children,
}: {
  index: number
  title: string
  state: StepState
  detail: string
  children?: ReactNode
}) {
  const theme = useAppTheme()
  const color = state === 'done' ? theme.success : state === 'current' ? theme.brandText : theme.textMuted
  return (
    <View style={styles.step} accessible={!children} accessibilityLabel={`Bước ${index}, ${title}. ${detail}`}>
      <Ionicons
        name={state === 'done' ? 'checkmark-circle' : state === 'current' ? 'ellipse' : 'ellipse-outline'}
        size={22}
        color={color}
      />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: state === 'todo' ? theme.textMuted : theme.text }]}>
          {index}. {title}
        </Text>
        <Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text>
        {children ? <View style={styles.action}>{children}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  detail: { fontSize: 14, lineHeight: 20 },
  action: { marginTop: 8 },
})
