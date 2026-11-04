import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme, type AppTheme } from '@/theme/theme'
import type { Tone } from '@/lib/status'

export type IconName = ComponentProps<typeof Ionicons>['name']

/** Lề trái phải của mọi màn hình */
export const SCREEN_PADDING = 12

export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  ...props
}: PropsWithChildren<ScrollViewProps> & {
  refreshing?: boolean
  onRefresh?: () => void
  contentStyle?: ViewStyle
}) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.canvas }]} edges={['top']}>
      <ScrollView
        {...props}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, { paddingBottom: 16 + insets.bottom }, contentStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={theme.brand} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

export function PageHeader({
  title,
  description,
  alert,
  action,
}: {
  title: string
  description?: string
  /** Việc đang chờ người dùng xử lý, hiện màu đỏ */
  alert?: string
  action?: ReactNode
}) {
  const theme = useAppTheme()
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        <Text accessibilityRole="header" style={[styles.pageTitle, { color: theme.text }]}>
          {title}
        </Text>
        {description ? <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text> : null}
        {alert ? <Text style={[styles.pageAlert, { color: theme.danger }]}>{alert}</Text> : null}
      </View>
      {action}
    </View>
  )
}

// Một phần của trang, không có nền hay khung, các phần liền nhau ngăn bằng đường kẻ
export function Panel({ children }: PropsWithChildren) {
  const theme = useAppTheme()
  return <View style={[styles.panel, { borderTopColor: theme.border }]}>{children}</View>
}

// Dòng danh sách nằm thẳng trên nền trang và tràn hết chiều ngang, kẻ mảnh giữa các dòng
export function ListRow({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  last = false,
  style,
}: PropsWithChildren<{
  onPress?: () => void
  accessibilityLabel?: string
  accessibilityHint?: string
  last?: boolean
  style?: ViewStyle
}>) {
  const theme = useAppTheme()
  const frame = [styles.listRow, { borderBottomColor: theme.border }, last && styles.listRowLast, style]
  if (!onPress)
    return (
      <View style={frame} accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [frame, pressed && { backgroundColor: theme.surfacePressed }]}
    >
      {children}
    </Pressable>
  )
}

export function SectionTitle({ children, detail }: PropsWithChildren<{ detail?: string }>) {
  const theme = useAppTheme()
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{children}</Text>
      {detail ? <Text style={[styles.meta, { color: theme.textMuted }]}>{detail}</Text> : null}
    </View>
  )
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  compact,
}: {
  label: string
  onPress: () => void
  icon?: IconName
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet'
  disabled?: boolean
  loading?: boolean
  compact?: boolean
}) {
  const theme = useAppTheme()
  const palette = buttonPalette(theme, variant)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: pressed ? palette.pressed : palette.background, borderColor: palette.border },
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={19} color={palette.text} />
      ) : null}
      <Text style={[styles.buttonLabel, { color: palette.text }]}>{loading ? 'Đang xử lý…' : label}</Text>
    </Pressable>
  )
}

function buttonPalette(theme: AppTheme, variant: 'primary' | 'secondary' | 'danger' | 'quiet') {
  if (variant === 'primary')
    return { background: theme.brand, pressed: theme.brandPressed, border: theme.brand, text: theme.onBrand }
  if (variant === 'danger')
    return { background: theme.dangerSoft, pressed: theme.surfacePressed, border: theme.danger, text: theme.danger }
  if (variant === 'quiet')
    return { background: 'transparent', pressed: theme.surfacePressed, border: 'transparent', text: theme.brandText }
  return { background: theme.surface, pressed: theme.surfacePressed, border: theme.border, text: theme.text }
}

export function IconButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string
  icon: IconName
  onPress: () => void
  disabled?: boolean
}) {
  const theme = useAppTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { backgroundColor: theme.surfacePressed },
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={22} color={disabled ? theme.textSubtle : theme.text} />
    </Pressable>
  )
}

export function BackButton({ onPress, label = 'Quay lại' }: { onPress: () => void; label?: string }) {
  return (
    <View style={styles.back}>
      <IconButton label={label} icon="arrow-back" onPress={onPress} />
    </View>
  )
}

// Trạng thái là chữ có màu, không nền, không chấm
export function StatusText({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: Tone }>) {
  const theme = useAppTheme()
  return <Text style={[styles.statusText, { color: toneColor(theme, tone) }]}>{children}</Text>
}

function toneColor(theme: AppTheme, tone: Tone) {
  if (tone === 'danger') return theme.danger
  if (tone === 'warning') return theme.warning
  if (tone === 'success') return theme.success
  if (tone === 'info') return theme.info
  return theme.textMuted
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const theme = useAppTheme()
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={theme.textSubtle}
        selectionColor={theme.brandText}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
          props.multiline && styles.textarea,
        ]}
      />
      {error ? <Text style={[styles.fieldError, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  )
}

export function StateView({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  const theme = useAppTheme()
  return (
    <View style={styles.state}>
      <Text style={[styles.stateTitle, { color: theme.text }]}>{title}</Text>
      {description ? <Text style={[styles.stateDescription, { color: theme.textMuted }]}>{description}</Text> : null}
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  )
}

export function QueryState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean
  error: Error | null
  onRetry: () => void
}) {
  const theme = useAppTheme()
  if (loading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    )
  if (error)
    return (
      <StateView
        title="Không tải được dữ liệu"
        description={error.message}
        action={<Button label="Thử lại" onPress={onRetry} variant="secondary" compact />}
      />
    )
  return null
}

export function Divider() {
  const theme = useAppTheme()
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  const theme = useAppTheme()
  return (
    <View style={styles.keyValue}>
      <Text style={[styles.key, { color: theme.textMuted }]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      ) : (
        <View style={styles.valueBox}>{value}</View>
      )}
    </View>
  )
}

export const uiStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stack8: { gap: 8 },
  stack12: { gap: 12 },
  stack16: { gap: 16 },
  stack24: { gap: 24 },
  flex1: { flex: 1 },
})

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: 8, gap: 12 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  pageHeaderCopy: { flex: 1, gap: 2 },
  pageTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
  pageAlert: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  listRow: {
    marginHorizontal: -SCREEN_PADDING,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listRowLast: { borderBottomWidth: 0 },
  sectionHeading: { gap: 2 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonCompact: { minHeight: 40, alignSelf: 'flex-start' },
  buttonLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  iconButton: { width: 40, height: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  back: { marginLeft: -8, marginBottom: -4 },
  statusText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  field: { gap: 4 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, fontSize: 15, lineHeight: 20 },
  textarea: { minHeight: 72, paddingTop: 10, textAlignVertical: 'top' },
  fieldError: { fontSize: 13, lineHeight: 18 },
  state: { paddingVertical: 16, gap: 4 },
  stateTitle: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  stateDescription: { fontSize: 14, lineHeight: 20 },
  stateAction: { marginTop: 8 },
  loader: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
  keyValue: { flexDirection: 'row', gap: 8 },
  key: { width: 112, fontSize: 13, lineHeight: 20 },
  value: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  valueBox: { flex: 1 },
})
