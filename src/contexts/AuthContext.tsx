import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { authService } from '@/lib/api/services'
import { restoreSessionTokens, setSessionExpiredHandler, waitForRefresh } from '@/lib/api/client'
import type { UserRole } from '@/lib/api/types'
import { sessionFromToken } from '@/lib/auth/roles'
import { clearTokens, getRefreshToken, saveTokens } from '@/lib/auth/tokenStorage'

type Session = { role: UserRole; email: string; userId: string }
type AuthValue = {
  status: 'loading' | 'anonymous' | 'authenticated'
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthValue['status']>('loading')
  const [session, setSession] = useState<Session | null>(null)

  const expire = useCallback(() => {
    setSession(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(expire)
    let alive = true
    void restoreSessionTokens()
      .then((token) => {
        if (!alive) return
        const next = sessionFromToken(token)
        if (!next) throw new Error('Không đọc được vai trò từ phiên đăng nhập.')
        setSession(next)
        setStatus('authenticated')
      })
      .catch(async () => {
        await clearTokens()
        if (alive) expire()
      })
    return () => {
      alive = false
      setSessionExpiredHandler(null)
    }
  }, [expire])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authService.login(email.trim(), password)
    if (!tokens.accessToken || !tokens.refreshToken) throw new Error('Máy chủ không trả về phiên đăng nhập hợp lệ.')
    const next = sessionFromToken(tokens.accessToken)
    if (!next) throw new Error('Không đọc được vai trò từ tài khoản này.')
    await saveTokens(tokens)
    setSession(next)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await waitForRefresh()
    const refreshToken = await getRefreshToken()
    try {
      if (refreshToken) await authService.logout(refreshToken)
    } finally {
      await clearTokens()
      setSession(null)
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo(() => ({ status, session, login, logout }), [status, session, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth phải nằm trong AuthProvider.')
  return value
}
