import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button } from '@/components/ui'
import { Note } from '@/components/form'
import { useStartSurvey } from '@/hooks/techJob'
import type { TechnicianJob } from '@/lib/api/types'
import { formatMoment } from '@/lib/format'
import { surveyStartOpensAt } from '@/lib/onsiteSurvey/display'

// "Bắt đầu khảo sát": tới công trình thì bấm để backend ghi giờ bắt đầu. Mở sớm nhất 2 giờ trước giờ hẹn
// (backend kiểm lại theo cài đặt). Như StartSurvey trên web

export function StartSurvey({ job, onStarted }: { job: TechnicianJob; onStarted?: () => void }) {
  const start = useStartSurvey(job.appointmentId)
  const [now] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const opensAt = surveyStartOpensAt(job.startsAt)
  const tooEarly = now < opensAt.getTime()

  async function run() {
    setError(null)
    try {
      await start.mutateAsync()
      onStarted?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vui lòng thử lại.')
    }
  }

  return (
    <View style={styles.block}>
      <Button
        label="Bắt đầu khảo sát"
        icon="play"
        disabled={tooEarly}
        loading={start.isPending}
        onPress={() => void run()}
      />
      {tooEarly ? <Note>Bắt đầu được từ {formatMoment(opensAt.toISOString())}.</Note> : null}
      {error ? <Note tone="danger">{error}</Note> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 10 },
})
