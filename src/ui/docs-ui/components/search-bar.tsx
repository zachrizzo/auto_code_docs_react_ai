"use client"

import React from "react"
import { useState } from "react"
import { Search, Package, FileCode, ArrowRight, CornerDownLeft } from "lucide-react"
import { Input } from "./ui/input"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./ui/command"
import { useRouter } from "next/navigation"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"

export function SearchBar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Mock search results - in a real app, this would come from your API
  const searchResults = [
    { type: "component", name: "DocumentAll", path: "/components/document-all", description: "Documentation container component" },
    { type: "component", name: "Todo", path: "/components/todo", description: "Task management component" },
    { type: "function", name: "fibonacci", path: "/functions/fibonacci", description: "Calculate fibonacci sequence" },
    { type: "function", name: "factorial", path: "/functions/factorial", description: "Calculate factorial value" },
  ]

  const handleSelect = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <div className="relative w-full">
        <div
          className="group flex items-center rounded-md border border-input px-3 py-2 text-sm shadow-sm hover:border-primary/50 focus-within:ring-1 focus-within:ring-primary cursor-pointer"
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
        >
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-70" />
          <span className="text-muted-foreground">Search documentation...</span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </span>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search documentation..." />
        <CommandList>
          <CommandEmpty className="py-6 text-center text-sm">
            <div className="mb-2">No results found</div>
            <div className="text-xs text-muted-foreground">Try a different search term</div>
          </CommandEmpty>
          <CommandGroup heading="Components">
            {searchResults
              .filter((result) => result.type === "component")
              .map((result) => (
                <CommandItem
                  key={result.path}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center">
                    <Package className="mr-2 h-4 w-4 text-primary" />
                    <div>
                      <div>{result.name}</div>
                      <div className="text-xs text-muted-foreground">{result.description}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">Component</Badge>
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandGroup heading="Functions">
            {searchResults
              .filter((result) => result.type === "function")
              .map((result) => (
                <CommandItem
                  key={result.path}
                  onSelect={() => handleSelect(result.path)}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center">
                    <FileCode className="mr-2 h-4 w-4 text-primary" />
                    <div>
                      <div>{result.name}</div>
                      <div className="text-xs text-muted-foreground">{result.description}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">Function</Badge>
                </CommandItem>
              ))}
          </CommandGroup>
          <div className="py-2 px-2 text-xs text-muted-foreground border-t">
            <div className="flex items-center justify-between">
              <span>Navigate</span>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Select</span>
              <div className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
              </div>
            </div>
          </div>
        </CommandList>
      </CommandDialog>
    </>
  )
}
