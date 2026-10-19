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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme, type AppTheme } from '@/theme/theme'
import type { Tone } from '@/lib/status'

type IconName = ComponentProps<typeof Ionicons>['name']

export function Screen({ children, refreshing, onRefresh, contentStyle, ...props }: PropsWithChildren<ScrollViewProps> & {
  refreshing?: boolean
  onRefresh?: () => void
  contentStyle?: ViewStyle
}) {
  const theme = useAppTheme()
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.canvas }]} edges={['top']}>
      <ScrollView
        {...props}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={theme.brand} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  const theme = useAppTheme()
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.brandText }]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[styles.pageTitle, { color: theme.text }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text> : null}
      </View>
      {action}
    </View>
  )
}

export function Panel({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const theme = useAppTheme()
  return <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>
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
      {loading ? <ActivityIndicator color={palette.text} size="small" /> : icon ? <Ionicons name={icon} size={19} color={palette.text} /> : null}
      <Text style={[styles.buttonLabel, { color: palette.text }]}>{loading ? 'Đang xử lý…' : label}</Text>
    </Pressable>
  )
}

function buttonPalette(theme: AppTheme, variant: 'primary' | 'secondary' | 'danger' | 'quiet') {
  if (variant === 'primary') return { background: theme.brand, pressed: theme.brandPressed, border: theme.brand, text: theme.onBrand }
  if (variant === 'danger') return { background: theme.dangerSoft, pressed: theme.surfacePressed, border: theme.danger, text: theme.danger }
  if (variant === 'quiet') return { background: 'transparent', pressed: theme.surfacePressed, border: 'transparent', text: theme.brandText }
  return { background: theme.surface, pressed: theme.surfacePressed, border: theme.border, text: theme.text }
}

export function IconButton({ label, icon, onPress, disabled = false }: { label: string; icon: IconName; onPress: () => void; disabled?: boolean }) {
  const theme = useAppTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: theme.surfacePressed }, disabled && styles.disabled]}>
      <Ionicons name={icon} size={22} color={disabled ? theme.textSubtle : theme.text} />
    </Pressable>
  )
}

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: Tone }>) {
  const theme = useAppTheme()
  const colors = tonePalette(theme, tone)
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <View style={[styles.badgeDot, { backgroundColor: colors.text }]} />
      <Text style={[styles.badgeText, { color: colors.text }]}>{children}</Text>
    </View>
  )
}

function tonePalette(theme: AppTheme, tone: Tone) {
  if (tone === 'danger') return { background: theme.dangerSoft, text: theme.danger }
  if (tone === 'warning') return { background: theme.warningSoft, text: theme.warning }
  if (tone === 'success') return { background: theme.successSoft, text: theme.success }
  if (tone === 'info') return { background: theme.infoSoft, text: theme.info }
  return { background: theme.surfaceMuted, text: theme.textMuted }
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
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }, props.multiline && styles.textarea]}
      />
      {error ? <Text style={[styles.fieldError, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  )
}

export function StateView({ icon = 'file-tray-outline', title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  const theme = useAppTheme()
  return (
    <View style={styles.state}>
      <Ionicons name={icon} size={28} color={theme.textMuted} />
      <Text style={[styles.stateTitle, { color: theme.text }]}>{title}</Text>
      {description ? <Text style={[styles.stateDescription, { color: theme.textMuted }]}>{description}</Text> : null}
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  )
}

export function QueryState({ loading, error, onRetry }: { loading: boolean; error: Error | null; onRetry: () => void }) {
  const theme = useAppTheme()
  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={theme.brand} /></View>
  if (error) return <StateView icon="cloud-offline-outline" title="Không tải được dữ liệu" description={error.message} action={<Button label="Thử lại" onPress={onRetry} variant="secondary" compact />} />
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
      {typeof value === 'string' ? <Text style={[styles.value, { color: theme.text }]}>{value}</Text> : value}
    </View>
  )
}

export function Metric({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme()
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>{label}</Text>
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
  screen: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 24 },
  pageHeader: { gap: 12 },
  pageHeaderCopy: { gap: 6, flex: 1 },
  eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  description: { fontSize: 15, lineHeight: 22 },
  panel: { borderWidth: 1, borderRadius: 6, padding: 16, gap: 16 },
  sectionHeading: { gap: 3 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
  button: { minHeight: 48, borderWidth: 1, borderRadius: 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonCompact: { minHeight: 44, alignSelf: 'flex-start', paddingHorizontal: 14 },
  buttonLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  iconButton: { width: 44, height: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  badge: { minHeight: 28, borderRadius: 999, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  field: { gap: 7 },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 6, paddingHorizontal: 14, fontSize: 16, lineHeight: 22 },
  textarea: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  fieldError: { fontSize: 13, lineHeight: 18 },
  state: { minHeight: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 8 },
  stateTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  stateDescription: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
  stateAction: { marginTop: 8 },
  loader: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
  keyValue: { gap: 4 },
  key: { fontSize: 13, lineHeight: 18 },
  value: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  metric: { flex: 1, minWidth: 0, gap: 2 },
  metricValue: { fontSize: 20, lineHeight: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
})
