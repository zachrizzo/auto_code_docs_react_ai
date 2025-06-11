"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search as SearchIcon, Component, Code as CodeIcon, FunctionSquare, FileCode, Clock, Star } from "lucide-react"
import { Button } from "./ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import { Badge } from "./ui/badge"

interface SearchItem {
  name: string;
  type: 'component' | 'class' | 'function' | 'method' | 'subfunction';
  slug: string;
  parentName?: string;
  filePath?: string;
  description?: string;
}

interface ComponentData {
  name: string;
  slug: string;
  filePath?: string;
  type?: string;
  description?: string;
  methods?: {
    name: string;
    code?: string;
    description?: string;
  }[];
}

const getItemIcon = (type: SearchItem['type']) => {
  switch (type) {
    case 'component':
      return <Component className="h-4 w-4" />;
    case 'class':
      return <CodeIcon className="h-4 w-4" />;
    case 'function':
      return <FunctionSquare className="h-4 w-4" />;
    case 'method':
    case 'subfunction':
      return <FileCode className="h-4 w-4" />;
    default:
      return <Component className="h-4 w-4" />;
  }
}

export function Search() {
  const [open, setOpen] = useState(false)
  const [searchItems, setSearchItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    async function fetchSearchData() {
      try {
        setLoading(true)
        const res = await fetch('/docs-data/component-index.json')
        if (!res.ok) {
          console.error(`Failed to fetch component index: ${res.status}`)
          setLoading(false)
          return
        }
        const indexData = await res.json()

        const allItems: SearchItem[] = []
        await Promise.all(
          indexData.map(async (comp: { name: string; slug: string; filePath?: string }) => {
            try {
              const detailRes = await fetch(`/docs-data/${comp.slug}.json`)
              if (!detailRes.ok) {
                allItems.push({ name: comp.name, type: 'component', slug: comp.slug, filePath: comp.filePath, description: '' })
                return
              }
              const detailData: ComponentData = await detailRes.json()
              allItems.push({
                name: detailData.name,
                type: (detailData.type as SearchItem['type']) || 'component',
                slug: detailData.slug,
                filePath: detailData.filePath,
                description: detailData.description
              })
              if (detailData.methods && detailData.methods.length > 0) {
                detailData.methods.forEach(method => {
                  if (method.name !== comp.name) {
                    allItems.push({
                      name: method.name,
                      type: 'method',
                      slug: `${comp.slug}#${method.name.toLowerCase().replace(/\s/g, '-')}`,
                      parentName: comp.name,
                      filePath: detailData.filePath,
                      description: method.description,
                    })
                  }
                })
              }
            } catch (error) {
              console.error(`Error fetching details for ${comp.name}:`, error)
            }
          })
        )

        const uniqueItems = allItems.filter((item, index, self) =>
          index === self.findIndex((t) => (t.slug === item.slug && t.name === item.name))
        );

        setSearchItems(uniqueItems)
        setLoading(false)
      } catch (error) {
        console.error('Error loading search data:', error)
        setLoading(false)
      }
    }
    fetchSearchData()
  }, [])
  
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 100)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const filteredItems = debouncedQuery.length > 0
    ? searchItems.filter(item =>
        item.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        (item.parentName && item.parentName.toLowerCase().includes(debouncedQuery.toLowerCase())) ||
        (item.filePath && item.filePath.toLowerCase().includes(debouncedQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(debouncedQuery.toLowerCase()))
      )
    : []

  const groupedItems = filteredItems.reduce((acc, item) => {
    const type = item.parentName ? 'Methods & Sub-functions' : 'Components & Functions';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  const handleSelect = (slug: string) => {
    const [path, fragment] = slug.split('#');
    router.push(`/components/${path}${fragment ? `#${fragment}` : ''}`);
  }
  
  return (
    <>
      <Button
        variant="ghost"
        className="relative h-10 w-full justify-start rounded-lg text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-96 bg-background border border-border shadow-sm hover:bg-accent hover:text-accent-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search documentation...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Type a command or search..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="h-12 text-base"
        />
        <CommandList className="max-h-[calc(100vh-200px)]">
          {loading && debouncedQuery.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading components, functions, and more...
            </div>
          )}
          {debouncedQuery.length === 0 && !loading && searchItems.length > 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Start typing to search through {searchItems.length} indexed items.
            </div>
          )}
          {debouncedQuery.length > 0 && filteredItems.length === 0 && !loading && (
             <CommandEmpty>No results found for "{debouncedQuery}".</CommandEmpty>
          )}
          
          {Object.entries(groupedItems).map(([groupName, items]) => (
            <CommandGroup key={groupName} heading={<span className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{groupName}</span>}>
              {items.map((item) => (
                <CommandItem
                  key={item.slug}
                  onSelect={() => runCommand(() => handleSelect(item.slug))}
                  value={`${item.name} ${item.parentName || ''} ${item.filePath || ''}`}
                  className="group !py-3 !px-4 aria-selected:bg-accent/50"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-muted/60 group-hover:bg-accent rounded-md transition-colors">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                        {item.parentName ? (
                          <>
                            <span>In:</span>
                            <Badge variant="outline" className="font-normal">{item.parentName}</Badge>
                          </>
                        ) : item.filePath ? (
                          <span>{item.filePath}</span>
                        ) : (
                          <span>Component</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
