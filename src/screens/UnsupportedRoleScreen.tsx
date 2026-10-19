import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/auth/roles'
import { Button, Screen } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function UnsupportedRoleScreen() {
  const theme = useAppTheme()
  const { session, logout } = useAuth()
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Ứng dụng này dành cho khách hàng và kỹ thuật viên.</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Tài khoản hiện tại có vai trò {session ? roleLabel[session.role].toLowerCase() : 'không xác định'}. Hãy dùng cổng web dành cho vai trò này.
        </Text>
      </View>
      <Button label="Đăng xuất" variant="secondary" onPress={() => void logout()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  copy: { gap: 12 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: '800', letterSpacing: -0.6 },
  body: { fontSize: 16, lineHeight: 24 },
})
