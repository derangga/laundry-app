import { Link } from '@tanstack/react-router'
import { BarChart3, ClipboardList, Home, Users } from 'lucide-react'

import { useCurrentUser } from '@/api/auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { NavUser } from './nav-user'

interface MenuItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  route: string
  adminOnly: boolean
}

const menuItems: MenuItem[] = [
  {
    label: 'Home',
    icon: Home,
    route: '/',
    adminOnly: false,
  },
  {
    label: 'History Order',
    icon: ClipboardList,
    route: '/history',
    adminOnly: false,
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    route: '/analytics',
    adminOnly: true,
  },
  {
    label: 'Manage Staff',
    icon: Users,
    route: '/staff',
    adminOnly: true,
  },
]

export function AppSidebar() {
  const { data: user } = useCurrentUser()

  // Filter menu items by role
  const visibleItems = menuItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false
    }
    return true
  })

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ClipboardList className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Laundry Manager
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.route}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.route}
                        activeProps={{
                          className:
                            'bg-sidebar-accent text-sidebar-accent-foreground',
                        }}
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
