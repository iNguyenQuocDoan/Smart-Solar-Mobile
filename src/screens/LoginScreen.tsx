import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/lib/api/client'
import { Button, Field, Screen } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function LoginScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!email.trim() || !password) {
      setError('Nhập email và mật khẩu để tiếp tục.')
      return
    }
    setPending(true)
    setError('')
    try {
      await login(email, password)
      router.replace('/')
    } catch (reason) {
      setError(
        reason instanceof ApiError || reason instanceof Error
          ? reason.message
          : 'Không thể đăng nhập. Vui lòng thử lại.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen contentStyle={styles.screen}>
        <View style={styles.brand}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.mark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={[styles.brandName, { color: theme.text }]}>Smart Solar</Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.formTitle, { color: theme.text }]}>
            Đăng nhập
          </Text>
          {error ? (
            <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: theme.dangerSoft }]}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.danger} />
              <Text style={[styles.alertText, { color: theme.danger }]}>{error}</Text>
            </View>
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="ten@congty.vn"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <View>
            <Field
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="Nhập mật khẩu"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onPress={() => setShowPassword((value) => !value)}
              style={styles.passwordToggle}
              hitSlop={8}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.textMuted} />
            </Pressable>
          </View>
          <Button label="Đăng nhập" onPress={() => void submit()} loading={pending} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { justifyContent: 'center', paddingTop: 32, paddingBottom: 40, gap: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 60, height: 48 },
  brandName: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  form: { borderWidth: 1, borderRadius: 6, padding: 20, gap: 18, maxWidth: 520, width: '100%', alignSelf: 'center' },
  formTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  alert: { borderRadius: 6, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  alertText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  passwordToggle: {
    position: 'absolute',
    right: 3,
    bottom: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
