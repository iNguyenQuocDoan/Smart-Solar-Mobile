import Ionicons from '@expo/vector-icons/Ionicons'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type ScrollView, type TextInputProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SCREEN_PADDING } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

// Ô nhập của các màn làm việc tại công trình (khảo sát, báo giá, thu tiền): dùng một tay, ngoài nắng, mạng yếu.
// Ô bắt buộc có dấu *, lỗi hiện ngay dưới ô; mỗi ô đăng ký vị trí để "còn thiếu" cuộn được tới đúng ô

// ---------- Cuộn tới ô ----------

type FieldRegistry = {
  register: (name: string, view: View | null) => void
}

const RegistryContext = createContext<FieldRegistry | null>(null)

/**
 * Giữ vị trí các ô trong một ScrollView. `scrollTo(name)` cuộn để ô nằm gần đầu màn. Ô chưa dựng (đang ở phần khác) thì
 * trả false để màn chuyển phần rồi gọi lại
 */
export function useFieldScroller(scrollRef: RefObject<ScrollView | null>, contentRef: RefObject<View | null>) {
  const views = useRef(new Map<string, View>())
  const registry = useMemo<FieldRegistry>(
    () => ({
      register: (name, view) => {
        if (view) views.current.set(name, view)
        else views.current.delete(name)
      },
    }),
    [],
  )
  const scrollTo = useCallback(
    (name: string) => {
      const view = views.current.get(name)
      const content = contentRef.current
      if (!view || !content) return false
      view.measureLayout(content, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }))
      return true
    },
    [contentRef, scrollRef],
  )
  return { registry, scrollTo }
}

export function FieldRegistryProvider({ registry, children }: PropsWithChildren<{ registry: FieldRegistry }>) {
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
}

// ---------- Khung một ô ----------

export function FormField({
  name,
  label,
  required,
  hint,
  error,
  children,
}: PropsWithChildren<{
  /** Khoá lỗi của ô, để cuộn tới */
  name?: string
  label: string
  required?: boolean
  hint?: string
  error?: string
}>) {
  const theme = useAppTheme()
  const registry = useContext(RegistryContext)
  return (
    <View
      style={styles.field}
      ref={name && registry ? (view) => registry.register(name, view) : undefined}
      collapsable={false}
    >
      <Text style={[styles.label, { color: theme.text }]}>
        {label}
        {required ? <Text style={{ color: theme.danger }}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  )
}

// ---------- Ô chữ, ô số ----------

export function TextBox({
  invalid,
  unit,
  label,
  ...props
}: TextInputProps & { invalid?: boolean; unit?: string; label: string }) {
  const theme = useAppTheme()
  const input = (
    <TextInput
      {...props}
      accessibilityLabel={label}
      placeholderTextColor={theme.textSubtle}
      selectionColor={theme.brandText}
      style={[
        styles.input,
        unit ? styles.inputWithUnit : null,
        { color: theme.text, backgroundColor: theme.surface, borderColor: invalid ? theme.danger : theme.border },
        props.multiline && styles.textarea,
        props.editable === false && styles.disabled,
      ]}
    />
  )
  if (!unit) return input
  return (
    <View style={styles.unitRow}>
      {input}
      <Text style={[styles.unit, { color: theme.textMuted }]}>{unit}</Text>
    </View>
  )
}

/** Ô số: bàn phím số có dấu thập phân; nhận cả dấu phẩy và dấu chấm (đọc ở lib/onsiteSurvey/number) */
export function NumberBox(props: TextInputProps & { invalid?: boolean; unit?: string; label: string }) {
  return <TextBox keyboardType="decimal-pad" autoComplete="off" autoCorrect={false} {...props} />
}

// ---------- Gợi ý và lựa chọn ----------

/** Hàng gợi ý cho ô chữ tự do: bấm để điền, vẫn gõ được giá trị khác */
export function Suggestions({
  options,
  value,
  onPick,
  disabled,
}: {
  options: readonly string[]
  value: string
  onPick: (value: string) => void
  disabled?: boolean
}) {
  const theme = useAppTheme()
  return (
    <View style={styles.optionWrap}>
      {options.map((option) => {
        const active = option === value
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => onPick(option)}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor: active ? theme.brandText : theme.border,
                backgroundColor: active ? theme.brandSoft : pressed ? theme.surfacePressed : theme.surface,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: active ? theme.brandText : theme.text }]}>{option}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Chọn một trong vài giá trị cố định, các ô nằm cạnh nhau. Bấm lại ô đang chọn thì bỏ chọn khi `clearable` */
export function OptionRow<T extends string>({
  options,
  value,
  onChange,
  disabled,
  clearable,
}: {
  options: readonly { value: T; label: string }[]
  value: string
  onChange: (value: T | '') => void
  disabled?: boolean
  clearable?: boolean
}) {
  const theme = useAppTheme()
  return (
    <View style={styles.optionWrap} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            disabled={disabled}
            onPress={() => onChange(active && clearable ? '' : option.value)}
            style={({ pressed }) => [
              styles.option,
              styles.optionWide,
              {
                borderColor: active ? theme.brand : theme.border,
                backgroundColor: active ? theme.brand : pressed ? theme.surfacePressed : theme.surface,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: active ? theme.onBrand : theme.text }]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Danh sách lựa chọn có mô tả, một dòng một lựa chọn */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly { value: T; label: string; hint?: string }[]
  value: string
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const theme = useAppTheme()
  return (
    <View accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.choice, pressed && { backgroundColor: theme.surfacePressed }]}
          >
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={active ? theme.brandText : theme.textMuted}
            />
            <View style={styles.choiceCopy}>
              <Text style={[styles.choiceLabel, { color: theme.text }]}>{option.label}</Text>
              {option.hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{option.hint}</Text> : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

// ---------- Thanh hành động dính đáy ----------

/** Nằm dưới ScrollView, trong KeyboardAvoidingView nên không bị bàn phím che; chừa vùng an toàn dưới */
export function ActionBar({ children }: { children: ReactNode }) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.actionBar,
        { borderTopColor: theme.border, backgroundColor: theme.canvas, paddingBottom: 8 + insets.bottom },
      ]}
    >
      {children}
    </View>
  )
}

/** Dòng chữ có màu theo tình trạng: xong, còn thiếu, lỗi */
export function Note({
  tone = 'muted',
  children,
}: {
  tone?: 'muted' | 'danger' | 'warning' | 'success'
  children: ReactNode
}) {
  const theme = useAppTheme()
  const color =
    tone === 'danger'
      ? theme.danger
      : tone === 'warning'
        ? theme.warning
        : tone === 'success'
          ? theme.success
          : theme.textMuted
  return <Text style={[styles.note, { color }, tone !== 'muted' && styles.noteStrong]}>{children}</Text>
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, fontSize: 16, lineHeight: 22 },
  inputWithUnit: { flex: 1 },
  textarea: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  disabled: { opacity: 0.6 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unit: { minWidth: 28, fontSize: 15, lineHeight: 20 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, justifyContent: 'center' },
  optionWide: { minWidth: 88, alignItems: 'center' },
  optionText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    marginHorizontal: -SCREEN_PADDING,
    paddingHorizontal: SCREEN_PADDING,
  },
  choiceCopy: { flex: 1, gap: 2 },
  choiceLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  actionBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    gap: 8,
  },
  note: { fontSize: 13, lineHeight: 18 },
  noteStrong: { fontWeight: '600' },
})
