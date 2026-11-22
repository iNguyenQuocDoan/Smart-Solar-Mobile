import * as Location from 'expo-location'
import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { Button, Divider } from '@/components/ui'
import { ChoiceList, FormField, Note, NumberBox, OptionRow, Suggestions, TextBox } from '@/components/form'
import type { TechnicianJob } from '@/lib/api/types'
import { directionLabel, formatCoordinates } from '@/lib/onsiteSurvey/display'
import {
  cabinetNoteBudget,
  composeCabinetNotes,
  parseCabinetNotes,
  type CabinetParts,
} from '@/lib/onsiteSurvey/electricalCabinet'
import {
  newObstacleRow,
  obstacleErrorKey,
  type ObstacleRow,
  type OnSiteSurveyErrors,
  type OnSiteSurveyForm,
} from '@/lib/onsiteSurvey/form'
import { readDecimal } from '@/lib/onsiteSurvey/number'
import {
  CABINET_LOCATION_SUGGESTIONS,
  CABINET_PHASES,
  CABINET_SPARE_SPACES,
  DIRECTIONS,
  INSTALLATION_FEASIBILITIES,
  MAIN_BREAKER_SUGGESTIONS,
  ONSITE_OBSTACLE_KINDS,
  ONSITE_SURVEY_LIMITS as LIMITS,
  ROOF_CONDITIONS,
  ROOF_MATERIAL_SUGGESTIONS,
  ROOF_TYPE_SUGGESTIONS,
} from '@/lib/onsiteSurvey/vocabulary'
import { useAppTheme } from '@/theme/theme'

// Các phần của biên bản khảo sát trên điện thoại, mỗi lần hiện một phần. Nhãn, giới hạn, gợi ý như form của web
// (OnSiteSurveyFields, ElectricalCabinetFields)

export type SectionProps = {
  value: OnSiteSurveyForm
  errors: OnSiteSurveyErrors
  onChange: (patch: Partial<OnSiteSurveyForm>) => void
  disabled?: boolean
}

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const declaredText = (value: number | null | undefined, unit: string) =>
  value == null ? null : `Khách khai: ${num.format(value)} ${unit}.`
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ') || undefined

/** Số liệu khách khai để đối chiếu ở từng ô */
export type DeclaredValues = {
  widthM: number | null
  lengthM: number | null
  usableAreaM2: number | null
  tiltDegree: number | null
  azimuthDegree: number | null
}

export const declaredOf = (job: TechnicianJob): DeclaredValues => ({
  widthM: job.preSurvey.surfaceWidthM,
  lengthM: job.preSurvey.surfaceLengthM,
  usableAreaM2: job.preSurvey.usableAreaM2,
  tiltDegree: job.preSurvey.surfaceTiltDegree,
  azimuthDegree: job.preSurvey.surfaceAzimuthDegree,
})

export function RoofSection({
  value,
  errors,
  onChange,
  disabled,
  declared,
}: SectionProps & { declared: DeclaredValues }) {
  const length = readDecimal(value.roofLengthM)
  const width = readDecimal(value.roofWidthM)
  const maxArea = length && width ? length * width : null
  const azimuth = readDecimal(value.azimuthDegree)
  // Giá trị nằm giữa hai hướng (bản cũ hoặc khách khai) vẫn giữ nguyên, không bị đổi ngầm sang hướng gần nhất
  const onCompass = azimuth !== null && azimuth % 45 === 0 && azimuth >= 0 && azimuth < 360
  const otherAzimuth = value.azimuthDegree.trim() !== '' && !onCompass
  const editable = !disabled

  return (
    <>
      <FormField name="roofType" label="Loại mái" required error={errors.roofType}>
        <TextBox
          label="Loại mái"
          value={value.roofType}
          editable={editable}
          maxLength={LIMITS.roofTextLength}
          invalid={Boolean(errors.roofType)}
          onChangeText={(roofType) => onChange({ roofType })}
        />
        <Suggestions
          options={ROOF_TYPE_SUGGESTIONS}
          value={value.roofType}
          disabled={disabled}
          onPick={(roofType) => onChange({ roofType })}
        />
      </FormField>
      <FormField name="roofMaterial" label="Vật liệu mái" required error={errors.roofMaterial}>
        <TextBox
          label="Vật liệu mái"
          value={value.roofMaterial}
          editable={editable}
          maxLength={LIMITS.roofTextLength}
          invalid={Boolean(errors.roofMaterial)}
          onChangeText={(roofMaterial) => onChange({ roofMaterial })}
        />
        <Suggestions
          options={ROOF_MATERIAL_SUGGESTIONS}
          value={value.roofMaterial}
          disabled={disabled}
          onPick={(roofMaterial) => onChange({ roofMaterial })}
        />
      </FormField>
      <FormField
        name="roofLengthM"
        label="Chiều dài"
        required
        hint={join('Đo theo chiều dốc.', declaredText(declared.lengthM, 'm'))}
        error={errors.roofLengthM}
      >
        <NumberBox
          label="Chiều dài mái"
          unit="m"
          value={value.roofLengthM}
          editable={editable}
          invalid={Boolean(errors.roofLengthM)}
          onChangeText={(roofLengthM) => onChange({ roofLengthM })}
        />
      </FormField>
      <FormField
        name="roofWidthM"
        label="Chiều rộng"
        required
        hint={join('Dọc theo mép cao.', declaredText(declared.widthM, 'm'))}
        error={errors.roofWidthM}
      >
        <NumberBox
          label="Chiều rộng mái"
          unit="m"
          value={value.roofWidthM}
          editable={editable}
          invalid={Boolean(errors.roofWidthM)}
          onChangeText={(roofWidthM) => onChange({ roofWidthM })}
        />
      </FormField>
      <FormField
        name="usableAreaM2"
        label="Diện tích lắp được"
        required
        hint={join(
          maxArea ? `Tối đa ${num.format(maxArea)} m².` : undefined,
          declaredText(declared.usableAreaM2, 'm²'),
        )}
        error={errors.usableAreaM2}
      >
        <NumberBox
          label="Diện tích lắp được"
          unit="m²"
          value={value.usableAreaM2}
          editable={editable}
          invalid={Boolean(errors.usableAreaM2)}
          onChangeText={(usableAreaM2) => onChange({ usableAreaM2 })}
        />
      </FormField>
      <FormField
        name="tiltDegree"
        label="Độ dốc"
        required
        hint={join('Mái bằng là 0.', declaredText(declared.tiltDegree, 'độ'))}
        error={errors.tiltDegree}
      >
        <NumberBox
          label="Độ dốc mái"
          unit="độ"
          value={value.tiltDegree}
          editable={editable}
          invalid={Boolean(errors.tiltDegree)}
          onChangeText={(tiltDegree) => onChange({ tiltDegree })}
        />
      </FormField>
      <FormField
        name="azimuthDegree"
        label="Hướng mái"
        required
        hint={
          declared.azimuthDegree == null
            ? undefined
            : `Khách khai: ${directionLabel(declared.azimuthDegree)} (${num.format(declared.azimuthDegree)}°).`
        }
        error={errors.azimuthDegree}
      >
        <OptionRow
          options={DIRECTIONS.map((name, i) => ({ value: String(i * 45), label: `${name} ${i * 45}°` }))}
          value={onCompass ? String(azimuth) : ''}
          disabled={disabled}
          onChange={(azimuthDegree) => onChange({ azimuthDegree })}
        />
        {otherAzimuth ? (
          <Note>
            {azimuth !== null
              ? `Đang ghi ${num.format(azimuth)}° (gần ${directionLabel(azimuth)}). Chọn hướng khác để đổi.`
              : `Giá trị cũ: ${value.azimuthDegree}. Chọn một hướng để sửa.`}
          </Note>
        ) : null}
      </FormField>
      <FormField name="roofCondition" label="Tình trạng mái" required error={errors.roofCondition}>
        <OptionRow
          options={ROOF_CONDITIONS}
          value={value.roofCondition}
          disabled={disabled}
          onChange={(roofCondition) => onChange({ roofCondition })}
        />
      </FormField>
    </>
  )
}

export function ElectricSection({ value, errors, onChange, disabled }: SectionProps) {
  const parts = parseCabinetNotes(value.electricalCabinetNotes)
  const set = (patch: Partial<CabinetParts>) =>
    onChange({ electricalCabinetNotes: composeCabinetNotes({ ...parts, ...patch }) })
  const editable = !disabled

  return (
    <>
      <FormField
        name="electricalCabinetNotes"
        label="Tủ điện"
        required
        hint="Ghi ít nhất một ô bên dưới."
        error={errors.electricalCabinetNotes}
      >
        <View style={styles.group}>
          <FormField label="Vị trí tủ">
            <TextBox
              label="Vị trí tủ điện"
              value={parts.location}
              editable={editable}
              onChangeText={(location) => set({ location })}
            />
            <Suggestions
              options={CABINET_LOCATION_SUGGESTIONS}
              value={parts.location}
              disabled={disabled}
              onPick={(location) => set({ location })}
            />
          </FormField>
          <FormField label="Nguồn điện">
            <OptionRow
              clearable
              options={CABINET_PHASES.map((v) => ({ value: v, label: v }))}
              value={parts.phase}
              disabled={disabled}
              onChange={(phase) => set({ phase })}
            />
            {parts.phase && !CABINET_PHASES.includes(parts.phase) ? <Note>Giá trị cũ: {parts.phase}</Note> : null}
          </FormField>
          <FormField label="Aptomat tổng">
            <TextBox
              label="Aptomat tổng"
              value={parts.mainBreaker}
              editable={editable}
              onChangeText={(mainBreaker) => set({ mainBreaker })}
            />
            <Suggestions
              options={MAIN_BREAKER_SUGGESTIONS}
              value={parts.mainBreaker}
              disabled={disabled}
              onPick={(mainBreaker) => set({ mainBreaker })}
            />
          </FormField>
          <FormField label="Chỗ trống trong tủ">
            <OptionRow
              clearable
              options={CABINET_SPARE_SPACES.map((v) => ({ value: v, label: v }))}
              value={parts.spareSpace}
              disabled={disabled}
              onChange={(spareSpace) => set({ spareSpace })}
            />
            {parts.spareSpace && !CABINET_SPARE_SPACES.includes(parts.spareSpace) ? (
              <Note>Giá trị cũ: {parts.spareSpace}</Note>
            ) : null}
          </FormField>
          <FormField label="Ghi chú thêm về tủ điện">
            <TextBox
              label="Ghi chú thêm về tủ điện"
              multiline
              value={parts.note}
              editable={editable}
              maxLength={cabinetNoteBudget(parts, LIMITS.longNoteLength)}
              onChangeText={(note) => set({ note })}
            />
          </FormField>
        </View>
      </FormField>
      <Divider />
      <FormField name="electricalConnectionNotes" label="Đấu nối điện" error={errors.electricalConnectionNotes}>
        <TextBox
          label="Đấu nối điện"
          multiline
          value={value.electricalConnectionNotes}
          editable={editable}
          maxLength={LIMITS.longNoteLength}
          placeholder="Đường đi dây, điểm đấu vào lưới, công tơ…"
          onChangeText={(electricalConnectionNotes) => onChange({ electricalConnectionNotes })}
        />
      </FormField>
    </>
  )
}

export function PlanSection({ value, errors, onChange, disabled }: SectionProps) {
  const editable = !disabled
  return (
    <>
      <FormField
        name="installationFeasibility"
        label="Khả năng lắp đặt"
        required
        error={errors.installationFeasibility}
      >
        <ChoiceList
          options={INSTALLATION_FEASIBILITIES}
          value={value.installationFeasibility}
          disabled={disabled}
          onChange={(installationFeasibility) => onChange({ installationFeasibility })}
        />
      </FormField>
      <FormField name="proposedInverterLocation" label="Vị trí đặt inverter" error={errors.proposedInverterLocation}>
        <TextBox
          label="Vị trí đặt inverter"
          multiline
          value={value.proposedInverterLocation}
          editable={editable}
          maxLength={LIMITS.inverterLocationLength}
          onChangeText={(proposedInverterLocation) => onChange({ proposedInverterLocation })}
        />
      </FormField>
      <FormField name="proposedPanelLayoutNotes" label="Bố trí tấm pin" error={errors.proposedPanelLayoutNotes}>
        <TextBox
          label="Bố trí tấm pin"
          multiline
          value={value.proposedPanelLayoutNotes}
          editable={editable}
          maxLength={LIMITS.longNoteLength}
          placeholder="Số dãy, hướng đặt tấm, khoảng tránh vật cản…"
          onChangeText={(proposedPanelLayoutNotes) => onChange({ proposedPanelLayoutNotes })}
        />
      </FormField>
    </>
  )
}

export function ObstacleSection({ value, errors, onChange, disabled }: SectionProps) {
  const theme = useAppTheme()
  const rows = value.obstacles
  const update = (index: number, patch: Partial<ObstacleRow>) =>
    onChange({ obstacles: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) })
  const editable = !disabled

  return (
    <>
      {rows.length === 0 ? <Note>Chưa ghi vật cản nào.</Note> : null}
      {rows.map((row, i) => (
        <View key={row.key} style={[styles.obstacle, { borderBottomColor: theme.border }]}>
          <View style={styles.spread}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Vật cản {i + 1}</Text>
            <Button
              label="Xoá"
              icon="trash-outline"
              variant="quiet"
              compact
              disabled={disabled}
              onPress={() => onChange({ obstacles: rows.filter((_, j) => j !== i) })}
            />
          </View>
          <FormField label="Loại">
            <OptionRow
              options={ONSITE_OBSTACLE_KINDS}
              value={row.kind}
              disabled={disabled}
              onChange={(kind) => kind && update(i, { kind })}
            />
          </FormField>
          <FormField label="Mô tả">
            <TextBox
              label={`Mô tả vật cản ${i + 1}`}
              value={row.description}
              editable={editable}
              maxLength={LIMITS.obstacleDescriptionLength}
              onChangeText={(description) => update(i, { description })}
            />
          </FormField>
          <View style={styles.pair}>
            <View style={styles.half}>
              <FormField
                name={obstacleErrorKey(i, 'heightM')}
                label="Cao"
                error={errors[obstacleErrorKey(i, 'heightM')]}
              >
                <NumberBox
                  label={`Chiều cao vật cản ${i + 1}`}
                  unit="m"
                  value={row.heightM}
                  editable={editable}
                  invalid={Boolean(errors[obstacleErrorKey(i, 'heightM')])}
                  onChangeText={(heightM) => update(i, { heightM })}
                />
              </FormField>
            </View>
            <View style={styles.half}>
              <FormField
                name={obstacleErrorKey(i, 'areaM2')}
                label="Diện tích"
                error={errors[obstacleErrorKey(i, 'areaM2')]}
              >
                <NumberBox
                  label={`Diện tích vật cản ${i + 1}`}
                  unit="m²"
                  value={row.areaM2}
                  editable={editable}
                  invalid={Boolean(errors[obstacleErrorKey(i, 'areaM2')])}
                  onChangeText={(areaM2) => update(i, { areaM2 })}
                />
              </FormField>
            </View>
          </View>
        </View>
      ))}
      {rows.length < LIMITS.maxObstacles ? (
        <Button
          label="Thêm vật cản"
          icon="add"
          variant="secondary"
          disabled={disabled}
          onPress={() => onChange({ obstacles: [...rows, newObstacleRow()] })}
        />
      ) : (
        <Note>Tối đa {LIMITS.maxObstacles} vật cản.</Note>
      )}
    </>
  )
}

/** Toạ độ lấy từ GPS của máy tại công trình, không gõ tay. Xin quyền vị trí lúc bấm, có đường lui khi bị từ chối */
export function LocationSection({ value, errors, onChange, disabled }: SectionProps) {
  const theme = useAppTheme()
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const hasLocation = value.measuredLatitude !== null && value.measuredLongitude !== null

  async function capture() {
    setError(null)
    setDenied(false)
    setLocating(true)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setDenied(true)
        setError(
          permission.canAskAgain
            ? 'Chưa được phép lấy vị trí. Bấm lại và chọn Cho phép để ghi toạ độ công trình.'
            : 'Ứng dụng đang bị chặn lấy vị trí. Mở cài đặt, bật quyền vị trí rồi thử lại. Không có toạ độ vẫn lưu được.',
        )
        return
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20_000)),
      ])
      const round = (n: number) => Math.round(n * 1e6) / 1e6
      onChange({
        measuredLatitude: round(position.coords.latitude),
        measuredLongitude: round(position.coords.longitude),
      })
    } catch {
      setError('Chưa lấy được vị trí. Bật định vị của máy, ra chỗ thoáng rồi thử lại.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <>
      <FormField label="Toạ độ công trình">
        {hasLocation ? (
          <Text style={[styles.coordinates, { color: theme.text }]}>
            {formatCoordinates(value.measuredLatitude, value.measuredLongitude)}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={hasLocation ? 'Lấy lại vị trí' : 'Lấy vị trí hiện tại'}
            icon="locate-outline"
            variant="secondary"
            compact
            loading={locating}
            disabled={disabled}
            onPress={() => void capture()}
          />
          {hasLocation ? (
            <Button
              label="Bỏ toạ độ"
              icon="close"
              variant="quiet"
              compact
              disabled={disabled}
              onPress={() => onChange({ measuredLatitude: null, measuredLongitude: null })}
            />
          ) : null}
          {denied ? (
            <Button label="Mở cài đặt" variant="quiet" compact onPress={() => void Linking.openSettings()} />
          ) : null}
        </View>
        {error ? (
          <Note tone="danger">{error}</Note>
        ) : (
          <Note>Đứng tại công trình rồi bấm để ghi toạ độ GPS của máy (không bắt buộc).</Note>
        )}
      </FormField>
      <FormField name="notes" label="Ghi chú" error={errors.notes}>
        <TextBox
          label="Ghi chú"
          multiline
          value={value.notes}
          editable={!disabled}
          maxLength={LIMITS.notesLength}
          onChangeText={(notes) => onChange({ notes })}
        />
      </FormField>
    </>
  )
}

const styles = StyleSheet.create({
  group: { gap: 14 },
  obstacle: { gap: 10, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  coordinates: { fontSize: 15, lineHeight: 22, fontVariant: ['tabular-nums'] },
})
