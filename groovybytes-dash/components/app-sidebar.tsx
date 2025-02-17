"use client"

import type * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, LineChart, Settings, HardDrive, FileText } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navigation = [
  {
    title: null,
    items: [{ title: "Dashboard", icon: Home, url: "/" }],
  },
  {
    title: "Analytics",
    items: [{ title: "Reports", icon: LineChart, url: "/reports" }],
  },
  {
    title: "Management",
    items: [
      { title: "Devices", icon: HardDrive, url: "/devices" },
      { title: "Documents", icon: FileText, url: "/documents" },
    ],
  },
  {
    title: "Settings",
    items: [{ title: "Settings", icon: Settings, url: "/settings" }],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarContent>
        {navigation.map((group, idx) => (
          <SidebarGroup key={idx}>
            {group.title && (
              <SidebarGroupLabel className="text-sm text-muted-foreground">{group.title}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

