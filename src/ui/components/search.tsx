"use client"

import * as React from "react"
import { useState, useEffect } from "react"
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

interface SearchItem {
  name: string;
  type: 'component' | 'class' | 'function' | 'method' | 'subfunction';
  slug: string;
  parentName?: string;
  filePath?: string;
}

interface ComponentData {
  name: string;
  slug: string;
  filePath?: string;
  type?: string;
  methods?: {
    name: string;
    code?: string;
  }[];
}

export function Search() {
  const [open, setOpen] = useState(false)
  const [searchItems, setSearchItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  // Fetch all components and their methods/subfunctions
  useEffect(() => {
    async function fetchSearchData() {
      try {
        setLoading(true)
        // Fetch the component index
        const res = await fetch('/docs-data/component-index.json')
        if (!res.ok) {
          console.error(`Failed to fetch component index: ${res.status}`)
          setLoading(false)
          return
        }
        const indexData = await res.json()

        // Fetch detailed data for each component
        const allItems: SearchItem[] = []

        await Promise.all(
          indexData.map(async (comp: { name: string; slug: string; filePath?: string }) => {
            try {
              // Add the component itself
              allItems.push({
                name: comp.name,
                type: 'component',
                slug: comp.slug,
                filePath: comp.filePath
              })

              // Fetch component details to get methods/subfunctions
              const detailRes = await fetch(`/docs-data/${comp.slug}.json`)
              if (!detailRes.ok) return

              const detailData: ComponentData = await detailRes.json()
              
              // Add methods and subfunctions if they exist
              if (detailData.methods && detailData.methods.length > 0) {
                detailData.methods.forEach(method => {
                  if (method.name !== comp.name) { // Don't duplicate the main component function
                    allItems.push({
                      name: method.name,
                      // Use 'method' type to ensure it shows in the methods tab
                      type: 'method',
                      slug: `${comp.slug}#${method.name}`,
                      parentName: comp.name,
                      filePath: comp.filePath
                    })
                  }
                })
              }
            } catch (error) {
              console.error(`Error fetching details for ${comp.name}:`, error)
            }
          })
        )

        setSearchItems(allItems)
        setLoading(false)
      } catch (error) {
        console.error('Error loading search data:', error)
        setLoading(false)
      }
    }

    fetchSearchData()
  }, [])

  // Filter items based on search query
  const filteredItems = searchQuery.length > 0
    ? searchItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.parentName && item.parentName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : searchItems

  // Group items by type
  const components = filteredItems.filter(item => item.type === 'component')
  const classes = filteredItems.filter(item => item.type === 'class')
  const functions = filteredItems.filter(item => item.type === 'function')
  const methods = filteredItems.filter(item => item.type === 'method')
  const subfunctions = filteredItems.filter(item => item.type === 'subfunction')

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
        <CommandInput 
          placeholder="Search documentation..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading search data...
            </div>
          ) : (
            <>
              <CommandEmpty>No results found.</CommandEmpty>
              
              {components.length > 0 && (
                <CommandGroup heading="Components">
                  {components.map((item) => (
                    <CommandItem
                      key={`component-${item.slug}`}
                      onSelect={() => {
                        const [path, fragment] = item.slug.split('#');
                        let base = '/components/';
                        if (item.type === 'function') base = '/functions/';
                        if (item.type === 'class') base = '/classes/';
                        if (item.type === 'method' && item.parentName) {
                          // Default to components for method parent, can be extended for other types
                          base = '/components/';
                        }
                        router.push(`${base}${path}${fragment ? `#${fragment}` : ''}`);
                        setOpen(false)
                      }}
                    >
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {classes.length > 0 && (
                <CommandGroup heading="Classes">
                  {classes.map((item) => (
                    <CommandItem
                      key={`class-${item.slug}`}
                      onSelect={() => {
                        const [path, fragment] = item.slug.split('#');
                        let base = '/components/';
                        if (item.type === 'function') base = '/functions/';
                        if (item.type === 'class') base = '/classes/';
                        if (item.type === 'method' && item.parentName) {
                          // Default to components for method parent, can be extended for other types
                          base = '/components/';
                        }
                        router.push(`${base}${path}${fragment ? `#${fragment}` : ''}`);
                        setOpen(false)
                      }}
                    >
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {functions.length > 0 && (
                <CommandGroup heading="Functions">
                  {functions.map((item) => (
                    <CommandItem
                      key={`function-${item.slug}`}
                      onSelect={() => {
                        const [path, fragment] = item.slug.split('#');
                        let base = '/components/';
                        if (item.type === 'function') base = '/functions/';
                        if (item.type === 'class') base = '/classes/';
                        if (item.type === 'method' && item.parentName) {
                          // Default to components for method parent, can be extended for other types
                          base = '/components/';
                        }
                        router.push(`${base}${path}${fragment ? `#${fragment}` : ''}`);
                        setOpen(false)
                      }}
                    >
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {methods.length > 0 && (
                <CommandGroup heading="Methods">
                  {methods.map((item) => (
                    <CommandItem
                      key={`method-${item.slug}`}
                      onSelect={() => {
                        const [path, fragment] = item.slug.split('#');
                        let base = '/components/';
                        if (item.type === 'function') base = '/functions/';
                        if (item.type === 'class') base = '/classes/';
                        if (item.type === 'method' && item.parentName) {
                          // Default to components for method parent, can be extended for other types
                          base = '/components/';
                        }
                        router.push(`${base}${path}${fragment ? `#${fragment}` : ''}`);
                        setOpen(false)
                      }}
                    >
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {subfunctions.length > 0 && (
                <CommandGroup heading="Sub-functions & Methods">
                  {subfunctions.map((item) => (
                    <CommandItem
                      key={`subfunction-${item.slug}`}
                      onSelect={() => {
                        const [path, fragment] = item.slug.split('#');
                        let base = '/components/';
                        if (item.type === 'function') base = '/functions/';
                        if (item.type === 'class') base = '/classes/';
                        if (item.type === 'method' && item.parentName) {
                          // Default to components for method parent, can be extended for other types
                          base = '/components/';
                        }
                        router.push(`${base}${path}${fragment ? `#${fragment}` : ''}`);
                        setOpen(false)
                      }}
                    >
                      {item.parentName ? `${item.parentName}.${item.name}` : item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
