"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search as SearchIcon } from "lucide-react"
import { Button } from "./ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"

// Mock data - in a real app this would come from your backend
const searchData = {
  components: [
    "Button",
    "Card",
    "Dialog",
    "Dropdown",
    "Form",
    "Input",
    "Modal",
    "Navbar",
    "Sidebar",
    "Table",
    "Tabs",
    "Toast",
  ],
  classes: ["UserService", "AuthManager", "DataProvider", "EventEmitter"],
  methods: ["fetchData", "handleSubmit", "validateForm", "processPayment"],
}

export function Search() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-80"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search documentation...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 dark:bg-slate-800 px-1.5 font-mono text-xs text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search documentation..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Components">
            {searchData.components.map((item) => (
              <CommandItem
                key={item}
                onSelect={() => {
                  router.push(`/components/${item}`)
                  setOpen(false)
                }}
              >
                {item}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Classes">
            {searchData.classes.map((item) => (
              <CommandItem
                key={item}
                onSelect={() => {
                  router.push(`/classes/${item}`)
                  setOpen(false)
                }}
              >
                {item}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Methods">
            {searchData.methods.map((item) => (
              <CommandItem
                key={item}
                onSelect={() => {
                  router.push(`/methods/${item}`)
                  setOpen(false)
                }}
              >
                {item}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
