"use client"

import * as React from "react"

import { useState } from "react"
import { Code, FileCode, Settings, Home, Search } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "./ui/sidebar"

export function DocsSidebar() {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")

  const mainNavItems = [
    { title: "Home", icon: Home, url: "/" },
    { title: "Components", icon: Code, url: "/components" },
    { title: "Functions", icon: FileCode, url: "/functions" },
    { title: "Settings", icon: Settings, url: "/settings" },
  ]

  const componentItems = [
    { title: "DocumentAll", url: "/components/document-all" },
    { title: "App", url: "/components/app" },
    { title: "Todo", url: "/components/todo" },
    { title: "TodoItem", url: "/components/todo-item" },
    { title: "RecursiveExamples", url: "/components/recursive-examples" },
    { title: "HealthcareDashboard", url: "/components/healthcare-dashboard" },
  ]

  const filteredComponents = componentItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Code className="h-4 w-4" />
          </div>
          <div className="font-semibold">Code Docs</div>
        </Link>
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              placeholder="Search documentation..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Components</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredComponents.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
      <SidebarTrigger className="absolute left-4 top-4 md:hidden" />
    </Sidebar>
  )
}
