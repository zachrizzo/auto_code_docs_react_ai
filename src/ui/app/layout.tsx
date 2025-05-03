import * as React from "react"
import type { Metadata } from "next"
import { Inter as FontSans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"
import { ChatBubble } from "../components/chat-bubble"
import { cn } from "../lib/utils"
import { Header } from "../components/header"
import { Sidebar } from "../components/sidebar"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Code Documentation",
  description: "AI-powered code documentation",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">{children}</main>
            </div>
            <ChatBubble />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
