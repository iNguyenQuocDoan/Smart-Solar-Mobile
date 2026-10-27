import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/auth/roles'
import { Button, PageHeader, Panel, Screen } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function AccountScreen() {
  const theme = useAppTheme()
  const { session, logout } = useAuth()
  const initial = session?.email.charAt(0).toUpperCase() || 'S'
  return (
    <Screen>
      <PageHeader title="Tài khoản" />
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
})
