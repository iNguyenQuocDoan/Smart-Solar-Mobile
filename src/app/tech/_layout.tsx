import { Stack } from 'expo-router'
import type { ReactNode } from 'react'
import { TechBell } from '@/components/NotificationBell'
import { MenuButton, SideMenu, type MenuItem } from '@/components/SideMenu'
import { PageHeaderSlots } from '@/components/ui'
import { useOpenJobs, useTechInstallations, useTechJobs } from '@/hooks/queries'
import { techTodos } from '@/lib/techTodo'

const slots = { leading: <MenuButton />, trailing: <TechBell /> }

function TechMenu({ children }: { children: ReactNode }) {
  const open = useOpenJobs()
  const mine = useTechJobs()
  const installations = useTechInstallations()
  const todo = techTodos(open.data ?? [], mine.data ?? [], installations.data ?? []).length
  const items: MenuItem[] = [
    {
      label: 'Khảo sát',
      icon: 'clipboard-outline',
      href: '/tech',
      match: (p) => p === '/tech' || /^\/tech\/(job|survey|quote)\//.test(p),
    },
    {
      label: 'Lắp đặt',
      icon: 'construct-outline',
      href: '/tech/installations',
      match: (p) => p.startsWith('/tech/installation'),
    },
    { label: 'Lịch làm việc', icon: 'calendar-outline', href: '/tech/schedule' },
    { label: 'Sản phẩm', icon: 'grid-outline', href: '/tech/products', match: (p) => p.startsWith('/tech/product') },
    { label: 'Việc cần làm', icon: 'notifications-outline', href: '/tech/todo', count: todo },
    { label: 'Tài khoản', icon: 'person-outline', href: '/tech/account' },
  ]
  return <SideMenu items={items}>{children}</SideMenu>
}

export default function TechLayout() {
  return (
    <TechMenu>
      <PageHeaderSlots.Provider value={slots}>
        <Stack screenOptions={{ headerShown: false }} />
      </PageHeaderSlots.Provider>
    </TechMenu>
  )
}
