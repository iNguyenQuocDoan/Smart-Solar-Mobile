import { Alert, StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/ui'
import { Note } from '@/components/form'
import { useRemoveSurveyFile } from '@/hooks/techJob'
import type { OnSiteSurveyAttachmentView } from '@/lib/api/types'
import { formatMoment } from '@/lib/format'
import { attachmentCategoryLabel } from '@/lib/onsiteSurvey/display'
import { useAppTheme } from '@/theme/theme'

// Ảnh và tài liệu của biên bản. Cần ít nhất một ảnh loại Mái trước khi hoàn thành

export function PhotosSection({
  appointmentId,
  attachments,
  disabled,
}: {
  appointmentId: string
  attachments: OnSiteSurveyAttachmentView[]
  disabled?: boolean
}) {
  const theme = useAppTheme()
  const remove = useRemoveSurveyFile(appointmentId)
  const roofPhotos = attachments.filter((a) => a.category === 'ROOF').length

  function confirmRemove(attachment: OnSiteSurveyAttachmentView) {
    Alert.alert(
      'Xoá tệp này?',
      `${attachmentCategoryLabel(attachment.category)}, thêm lúc ${formatMoment(attachment.addedAt)}.`,
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: () =>
            remove.mutate(attachment.attachmentId, {
              onError: (e) => Alert.alert('Chưa xoá được', e instanceof Error ? e.message : 'Vui lòng thử lại.'),
            }),
        },
      ],
    )
  }

  return (
    <View style={styles.block}>
      <Note tone={roofPhotos > 0 ? 'success' : 'warning'}>
        {roofPhotos > 0 ? `${roofPhotos} ảnh mái.` : 'Cần ít nhất một ảnh Mái để hoàn thành.'}
      </Note>
      {attachments.length === 0 ? <Note>Chưa có tệp nào.</Note> : null}
      {attachments.map((a) => (
        <View key={a.attachmentId} style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.text }]}>{attachmentCategoryLabel(a.category)}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>Thêm lúc {formatMoment(a.addedAt)}</Text>
          </View>
          <Button
            label="Xoá"
            icon="trash-outline"
            variant="quiet"
            compact
            disabled={disabled || remove.isPending}
            onPress={() => confirmRemove(a)}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  meta: { fontSize: 13, lineHeight: 18 },
})
