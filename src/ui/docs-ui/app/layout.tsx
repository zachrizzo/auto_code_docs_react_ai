import * as React from "react"


import type { Metadata } from "next/dist/lib/metadata/types/metadata-interface"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"
import { DocsSidebar } from "../components/docs-sidebar"
import { SidebarProvider } from "../components/ui/sidebar"
import { ChatWindow } from "../components/chat-window"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Code Documentation",
  description: "Interactive code documentation with vector search and AI chat",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SidebarProvider>
            <div className="flex min-h-screen">
              <DocsSidebar />
              <main className="flex-1">{children}</main>
              <ChatWindow />
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'