import { MutationCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { markOwnAction } from '@/hooks/tabAlert'
import { isMobileRole } from '@/lib/auth/roles'
import { AppThemeProvider, useAppTheme } from '@/theme/theme'

function Routes() {
  const { status, session } = useAuth()
  const theme = useAppTheme()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (status === 'anonymous') queryClient.clear()
  }, [queryClient, status])

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: theme.canvas }]}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    )
  }

  const signedIn = status === 'authenticated' && session !== null
  const mobileRole = signedIn && isMobileRole(session.role)

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.canvas } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && session?.role === 'customer'}>
          <Stack.Screen name="customer" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && session?.role === 'technician'}>
          <Stack.Screen name="tech" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !mobileRole}>
          <Stack.Screen name="unsupported-role" />
        </Stack.Protected>
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
        // Thay đổi kéo theo thao tác của chính người dùng không báo đỏ trên tab
        mutationCache: new MutationCache({ onSettled: () => markOwnAction() }),
      }),
  )
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Routes />
          </AuthProvider>
        </QueryClientProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
