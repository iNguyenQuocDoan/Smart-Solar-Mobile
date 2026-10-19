import { jwtDecode } from 'jwt-decode'
import type { UserRole } from '@/lib/api/types'

const aliases: Record<string, UserRole> = {
  customer: 'customer',
  user: 'customer',
  homeowner: 'customer',
  technician: 'technician',
  tech: 'technician',
  sales: 'sales',
  salesperson: 'sales',
  manager: 'manager',
  admin: 'admin',
  administrator: 'admin',
  systemadmin: 'admin',
}

const priority: UserRole[] = ['admin', 'manager', 'sales', 'technician', 'customer']
const dotnetRole = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const dotnetEmail = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]/g, '')
}

function parseRole(value: unknown): UserRole | null {
  if (typeof value === 'string') return aliases[normalize(value)] ?? null
  if (!Array.isArray(value)) return null
  const roles = value.map(parseRole).filter((role): role is UserRole => role !== null)
  return priority.find((role) => roles.includes(role)) ?? roles[0] ?? null
}

type Claims = { role?: unknown; email?: unknown; sub?: unknown; [key: string]: unknown }

export function sessionFromToken(token: string) {
  try {
    const claims = jwtDecode<Claims>(token)
    const role = parseRole(claims.role ?? claims[dotnetRole])
    if (!role) return null
    const emailValue = claims.email ?? claims[dotnetEmail]
    return {
      role,
      email: typeof emailValue === 'string' ? emailValue : '',
      userId: typeof claims.sub === 'string' ? claims.sub : '',
    }
  } catch {
    return null
  }
}

export function isMobileRole(role: UserRole): role is 'customer' | 'technician' {
  return role === 'customer' || role === 'technician'
}

export const roleLabel: Record<UserRole, string> = {
  customer: 'Khách hàng',
  technician: 'Kỹ thuật viên',
  sales: 'Kinh doanh',
  manager: 'Quản lý',
  admin: 'Quản trị viên',
}
