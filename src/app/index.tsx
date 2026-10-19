import { Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

export default function Index() {
  const { status, session } = useAuth()
  if (status === 'loading') return null
  if (!session) return <Redirect href="/login" />
  if (session.role === 'customer') return <Redirect href="/customer" />
  if (session.role === 'technician') return <Redirect href="/tech" />
  return <Redirect href="/unsupported-role" />
}
