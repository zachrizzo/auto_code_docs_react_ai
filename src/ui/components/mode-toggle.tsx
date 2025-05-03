"use client"
import * as React from "react"
import { useTheme } from "next-themes"

import { Button } from "./ui/button"
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Function to handle direct theme toggle between light and dark
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  if (!mounted) {
    return <Button variant="outline" size="icon" className="border-slate-200 dark:border-slate-700" />
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="border-slate-200 dark:border-slate-700"
      onClick={toggleTheme}
    >
      <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </Button>
  )
}
