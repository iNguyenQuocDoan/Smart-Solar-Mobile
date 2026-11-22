import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useCustomerRequests, useMyProjects, useTechInstallations, useTechJobs, useTechSchedule } from '@/hooks/queries'
import { ApiError } from '@/lib/api/client'
import { authService } from '@/lib/api/services'
import { passwordErrors, passwordRules, type PasswordDraft } from '@/lib/auth/password'
import { roleLabel } from '@/lib/auth/roles'
import { todayVn } from '@/lib/format'
import { assetUnits } from '@/lib/installation'
import { isUpcomingJob } from '@/lib/status'
import { installationGroup } from '@/lib/techInstallation'
import { Button, Field, ListRow, PageHeader, SCREEN_PADDING, Screen, StatusText, type IconName } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

const EMPTY: PasswordDraft = { current: '', next: '', confirm: '' }

// Đổi mật khẩu chỉ cho khách, giống web: tài khoản nội bộ do quản trị cấp. Đổi xong backend thu hồi mọi phiên nên đăng nhập lại
function ChangePassword({ onClose }: { onClose: () => void }) {
  const theme = useAppTheme()
  const { logout } = useAuth()
  const [draft, setDraft] = useState(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordDraft, string>>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const edit = (key: keyof PasswordDraft) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
    setFormError('')
  }

  async function submit() {
    const found = passwordErrors(draft)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await authService.changePassword(draft.current, draft.next)
      Alert.alert('Đã đổi mật khẩu', 'Đăng nhập lại bằng mật khẩu mới.')
      await logout().catch(() => undefined)
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'AUTH_CURRENT_PASSWORD_INVALID' || e.fieldErrors?.currentPassword))
        setErrors({ current: 'Mật khẩu hiện tại không đúng.' })
      else setFormError(e instanceof Error ? e.message : 'Chưa đổi được mật khẩu. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  const secure = { secureTextEntry: true, autoCapitalize: 'none' as const, editable: !busy }
  return (
    <View style={[styles.form, { borderBottomColor: theme.border }]}>
      <Field
        label="Mật khẩu hiện tại"
        value={draft.current}
        onChangeText={edit('current')}
        autoComplete="current-password"
        error={errors.current}
        {...secure}
      />
      <Field
        label="Mật khẩu mới"
        value={draft.next}
        onChangeText={edit('next')}
        autoComplete="new-password"
        error={errors.next}
        {...secure}
      />
      <View style={styles.rules}>
        {passwordRules.map((rule) => {
          const passed = rule.test(draft.next)
          return (
            <View
              key={rule.id}
              style={styles.rule}
              accessible
              accessibilityLabel={`${rule.label}, ${passed ? 'đã đạt' : 'chưa đạt'}`}
            >
              <Ionicons
                name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={passed ? theme.success : theme.textSubtle}
              />
              <Text style={[styles.ruleText, { color: passed ? theme.text : theme.textMuted }]}>{rule.label}</Text>
            </View>
          )
        })}
      </View>
      <Field
        label="Nhập lại mật khẩu mới"
        value={draft.confirm}
        onChangeText={edit('confirm')}
        autoComplete="new-password"
        error={errors.confirm}
        {...secure}
      />
      {formError ? <Text style={[styles.error, { color: theme.danger }]}>{formError}</Text> : null}
      <View style={styles.actions}>
        <Button label="Thôi" variant="secondary" compact disabled={busy} onPress={onClose} />
        <Button label="Lưu mật khẩu mới" icon="checkmark" compact loading={busy} onPress={() => void submit()} />
      </View>
    </View>
  )
}

/** Một dòng của trang tài khoản: icon, tên, số (nếu có), mũi tên mở tab hoặc mở / đóng phần bên dưới */
function ProfileRow({
  icon,
  label,
  count,
  onPress,
  danger,
  expanded,
}: {
  icon: IconName
  label: string
  count?: number
  onPress: () => void
  danger?: boolean
  expanded?: boolean
}) {
  const theme = useAppTheme()
  const chevron = expanded === undefined ? 'chevron-forward' : expanded ? 'chevron-up' : 'chevron-down'
  return (
    <ListRow
      onPress={onPress}
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      style={styles.row}
    >
      <Ionicons name={icon} size={20} color={danger ? theme.danger : theme.textMuted} />
      <Text style={[styles.rowLabel, { color: danger ? theme.danger : theme.text }]}>{label}</Text>
      {count !== undefined ? <Text style={[styles.count, { color: theme.text }]}>{count}</Text> : null}
      {danger ? null : <Ionicons name={chevron} size={18} color={theme.textSubtle} />}
    </ListRow>
  )
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useAppTheme()
  return (
    <View>
      {title ? <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{title}</Text> : null}
      <View style={[styles.group, { borderTopColor: theme.border }]}>{children}</View>
    </View>
  )
}

// Số liệu thật của khách, bấm vào mở đúng tab
function CustomerActivity() {
  const router = useRouter()
  const requests = useCustomerRequests()
  const projects = useMyProjects()
  const live = (projects.data ?? []).filter((p) => p.status !== 'CANCELLED')
  const devices = live.reduce((sum, p) => sum + assetUnits(p.assets), 0)
  return (
    <Group title="Hoạt động">
      <ProfileRow
        icon="calendar-outline"
        label="Yêu cầu khảo sát"
        count={requests.data?.length}
        onPress={() => router.navigate('/customer/requests')}
      />
      <ProfileRow
        icon="business-outline"
        label="Công trình"
        count={projects.data ? live.length : undefined}
        onPress={() => router.navigate('/customer')}
      />
      <ProfileRow
        icon="hardware-chip-outline"
        label="Thiết bị đã lắp"
        count={projects.data ? devices : undefined}
        onPress={() => router.navigate('/customer/devices')}
      />
    </Group>
  )
}

// Việc của kỹ thuật viên, cùng cách đếm với các tab
function TechnicianActivity() {
  const router = useRouter()
  const jobs = useTechJobs()
  const installations = useTechInstallations()
  const today = useTechSchedule(todayVn())
  const [now] = useState(() => Date.now())
  const upcoming = jobs.data?.filter((job) => isUpcomingJob(job, now)).length
  const working = installations.data?.filter((p) => installationGroup(p) === 'active').length
  const todayCount = today.data?.appointments.filter((item) => !item.isCapacityHold).length
  return (
    <Group title="Công việc">
      <ProfileRow
        icon="clipboard-outline"
        label="Khảo sát sắp tới"
        count={upcoming}
        onPress={() => router.navigate('/tech')}
      />
      <ProfileRow
        icon="construct-outline"
        label="Lắp đặt đang làm"
        count={working}
        onPress={() => router.navigate('/tech/installations')}
      />
      <ProfileRow
        icon="calendar-outline"
        label="Lịch hôm nay"
        count={todayCount}
        onPress={() => router.navigate('/tech/schedule')}
      />
    </Group>
  )
}

export function AccountScreen() {
  const theme = useAppTheme()
  const { session, logout } = useAuth()
  const [changing, setChanging] = useState(false)
  const isCustomer = session?.role === 'customer'
  const email = session?.email ?? ''

  function confirmLogout() {
    Alert.alert('Đăng xuất?', undefined, [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void logout() },
    ])
  }

  return (
    <Screen>
      <PageHeader title="Tài khoản" />
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
          <Text style={[styles.initial, { color: theme.brandText }]}>{(email[0] ?? 'S').toUpperCase()}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={[styles.email, { color: theme.text }]} numberOfLines={2}>
            {email || 'Tài khoản Smart Solar'}
          </Text>
          {session ? <StatusText tone="success">{roleLabel[session.role]}</StatusText> : null}
        </View>
      </View>
      {isCustomer ? <CustomerActivity /> : <TechnicianActivity />}
      {isCustomer ? (
        <Group title="Bảo mật">
          <ProfileRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            expanded={changing}
            onPress={() => setChanging((open) => !open)}
          />
          {changing ? <ChangePassword onClose={() => setChanging(false)} /> : null}
        </Group>
      ) : null}
      <Group>
        <ProfileRow icon="log-out-outline" label="Đăng xuất" danger onPress={confirmLogout} />
      </Group>
    </Screen>
  )
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  identityText: { flex: 1, gap: 2 },
  email: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  groupTitle: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 6 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, marginHorizontal: -SCREEN_PADDING },
  row: { marginHorizontal: 0, minHeight: 52, gap: 12 },
  rowLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  count: { fontSize: 15, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  form: {
    gap: 10,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rules: { gap: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { flex: 1, fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
