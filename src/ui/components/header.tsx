import * as React from "react"
import { ModeToggle } from "./mode-toggle"
import { Search } from "./search"
import { Button } from "./ui/button"
import { Sparkles } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex items-center justify-between">
      <Search />
      <div className="flex items-center gap-3">
        <Button size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Upgrade
        </Button>
        <ModeToggle />
      </div>
    </header>
  )
}
