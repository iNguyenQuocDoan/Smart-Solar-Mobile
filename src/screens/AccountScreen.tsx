import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/auth/roles'
import { Button, PageHeader, Screen } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function AccountScreen() {
  const theme = useAppTheme()
  const { session, logout } = useAuth()
  return (
    <Screen>
      <PageHeader title="Tài khoản" />
      <View style={styles.identity}>
        <Text style={[styles.email, { color: theme.text }]} numberOfLines={2}>
          {session?.email || 'Tài khoản Smart Solar'}
        </Text>
        <Text style={[styles.role, { color: theme.textMuted }]}>{session ? roleLabel[session.role] : '—'}</Text>
      </View>
      <Button label="Đăng xuất" icon="log-out-outline" variant="danger" compact onPress={() => void logout()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  identity: { gap: 1 },
  email: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  role: { fontSize: 13, lineHeight: 18 },
})
