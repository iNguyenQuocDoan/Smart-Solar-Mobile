import { Stack } from 'expo-router'
import type { ReactNode } from 'react'
import { CustomerBell } from '@/components/NotificationBell'
import { MenuButton, SideMenu, type MenuItem } from '@/components/SideMenu'
import { PageHeaderSlots } from '@/components/ui'
import { useNotifications } from '@/hooks/queries'

const slots = { leading: <MenuButton />, trailing: <CustomerBell /> }

function CustomerMenu({ children }: { children: ReactNode }) {
  const unread = useNotifications().data?.filter((n) => !n.readAt).length ?? 0
  const items: MenuItem[] = [
    { label: 'Tổng quan', icon: 'sunny-outline', href: '/customer' },
    { label: 'Thiết bị', icon: 'hardware-chip-outline', href: '/customer/devices' },
    {
      label: 'Yêu cầu khảo sát',
      icon: 'calendar-outline',
      href: '/customer/requests',
      match: (p) => p.startsWith('/customer/request'),
    },
    { label: 'Đánh giá mới', icon: 'add-circle-outline', href: '/customer/assessment' },
    {
      label: 'Sản phẩm',
      icon: 'grid-outline',
      href: '/customer/products',
      match: (p) => p.startsWith('/customer/product'),
    },
    { label: 'Thông báo', icon: 'notifications-outline', href: '/customer/notifications', count: unread },
    { label: 'Tài khoản', icon: 'person-outline', href: '/customer/account' },
  ]
  return <SideMenu items={items}>{children}</SideMenu>
}

export default function CustomerLayout() {
  return (
    <CustomerMenu>
      <PageHeaderSlots.Provider value={slots}>
        <Stack screenOptions={{ headerShown: false }} />
      </PageHeaderSlots.Provider>
    </CustomerMenu>
  )
}
