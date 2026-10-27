import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/auth/roles'
import { Button, KeyValue, PageHeader, Panel, Screen } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function AccountScreen() {
  const theme = useAppTheme()
  const { session, logout } = useAuth()
  const initial = session?.email.charAt(0).toUpperCase() || 'S'
  return (
    <Screen>
      <PageHeader eyebrow="Tài khoản" title="Hồ sơ của bạn" description="Thông tin lấy từ phiên đăng nhập hiện tại." />
      <Panel>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
            <Text style={[styles.avatarText, { color: theme.brandText }]}>{initial}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={[styles.email, { color: theme.text }]} numberOfLines={2}>
              {session?.email || 'Tài khoản Smart Solar'}
            </Text>
            <Text style={[styles.role, { color: theme.textMuted }]}>{session ? roleLabel[session.role] : '—'}</Text>
          </View>
        </View>
        <View style={[styles.rule, { backgroundColor: theme.border }]} />
        <KeyValue label="Giao diện" value="Theo cài đặt hệ thống" />
        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.success} />
          <Text style={[styles.secureText, { color: theme.textMuted }]}>
            Refresh token được lưu trong vùng bảo mật của thiết bị.
          </Text>
        </View>
      </Panel>
      <Button label="Đăng xuất" icon="log-out-outline" variant="danger" onPress={() => void logout()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  identityCopy: { flex: 1, gap: 2 },
  email: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  role: { fontSize: 14, lineHeight: 20 },
  rule: { height: StyleSheet.hairlineWidth },
  secureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  secureText: { flex: 1, fontSize: 13, lineHeight: 19 },
})
