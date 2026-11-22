import { StyleSheet, Text, View } from 'react-native'
import { KeyValue, SectionTitle } from '@/components/ui'
import type { OnSiteSurveyView, Product } from '@/lib/api/types'
import {
  directionLabel,
  feasibilityLabel,
  formatCoordinates,
  obstacleKindLabel,
  roofConditionLabel,
} from '@/lib/onsiteSurvey/display'
import { useAppTheme } from '@/theme/theme'

// Biên bản đã hoàn thành, chỉ đọc. Như OnSiteSurveySummary của web

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const n = (value: number | null | undefined, unit: string) => (value == null ? '—' : `${num.format(value)} ${unit}`)
const t = (value: string | null | undefined) => (value?.trim() ? value : '—')

export function SurveySummary({ survey, products }: { survey: OnSiteSurveyView; products?: Product[] }) {
  const theme = useAppTheme()
  const d = survey.data
  const nameOf = (id: string) => products?.find((p) => p.id === id)?.name ?? 'Sản phẩm không còn trong danh mục'
  const bom = d.billOfMaterials
  const bomLines = [...(bom?.materials ?? []), ...(bom?.serviceItems ?? [])]

  return (
    <View style={styles.block}>
      <SectionTitle>Mái</SectionTitle>
      <KeyValue label="Loại mái" value={t(d.roofType)} />
      <KeyValue label="Vật liệu" value={t(d.roofMaterial)} />
      <KeyValue label="Dài × rộng" value={`${n(d.roofLengthM, 'm')} × ${n(d.roofWidthM, 'm')}`} />
      <KeyValue label="Lắp được" value={n(d.usableAreaM2, 'm²')} />
      <KeyValue label="Độ dốc" value={n(d.tiltDegree, 'độ')} />
      <KeyValue
        label="Hướng"
        value={d.azimuthDegree == null ? '—' : `${directionLabel(d.azimuthDegree)} (${num.format(d.azimuthDegree)}°)`}
      />
      <KeyValue label="Tình trạng" value={roofConditionLabel(d.roofCondition)} />
      <SectionTitle>Điện</SectionTitle>
      <KeyValue label="Tủ điện" value={t(d.electricalCabinetNotes)} />
      <KeyValue label="Đấu nối điện" value={t(d.electricalConnectionNotes)} />
      <SectionTitle>Phương án</SectionTitle>
      <KeyValue label="Khả năng lắp" value={feasibilityLabel(d.installationFeasibility)} />
      <KeyValue label="Vị trí inverter" value={t(d.proposedInverterLocation)} />
      <KeyValue label="Bố trí tấm pin" value={t(d.proposedPanelLayoutNotes)} />
      <SectionTitle>Vật tư và dịch vụ</SectionTitle>
      {bomLines.length === 0 ? (
        <Text style={[styles.meta, { color: theme.textMuted }]}>Chưa ghi.</Text>
      ) : (
        bomLines.map((line) => (
          <KeyValue key={line.productId} label={`× ${num.format(line.quantity)}`} value={nameOf(line.productId)} />
        ))
      )}
      {bom?.installationNotes ? <KeyValue label="Ghi chú lắp" value={bom.installationNotes} /> : null}
      <SectionTitle>Vật cản ({survey.obstacles.length})</SectionTitle>
      {survey.obstacles.map((o, i) => (
        <KeyValue
          key={i}
          label={obstacleKindLabel(o.kind)}
          value={
            [
              o.description,
              o.heightM != null ? `cao ${num.format(o.heightM)} m` : null,
              o.areaM2 != null ? `${num.format(o.areaM2)} m²` : null,
            ]
              .filter(Boolean)
              .join(', ') || '—'
          }
        />
      ))}
      <SectionTitle>Vị trí và ghi chú</SectionTitle>
      <KeyValue label="Toạ độ" value={formatCoordinates(d.measuredLatitude, d.measuredLongitude)} />
      <KeyValue label="Ghi chú" value={t(d.notes)} />
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  meta: { fontSize: 13, lineHeight: 18 },
})
