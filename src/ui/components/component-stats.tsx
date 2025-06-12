"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import Link from "next/link"
import { FileCode, Clock, Code } from "lucide-react"

interface ComponentStatsProps {
  type?: 'component' | 'class' | 'method' | 'function'
  searchQuery?: string
}

interface ComponentData {
  name: string
  slug: string
  description: string
  filePath: string
  methodCount: number
  type?: string
  code?: string
  parentName?: string
  parentType?: string
}

export function ComponentStats({ type = 'component', searchQuery = '' }: ComponentStatsProps) {
  const [components, setComponents] = useState<ComponentData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchComponents() {
      try {
        // Fetch the component index
        const res = await fetch('/docs-data/component-index.json')
        const data = await res.json()

        // For methods, we need to extract methods from all components
        if (type === 'method') {
          const allMethods: ComponentData[] = []
          
          // Load all component details and extract their methods
          await Promise.all(
            data.map(async (comp: { name: string; slug: string }) => {
              try {
                const detailRes = await fetch(`/docs-data/${comp.slug}.json`)
                const detail = await detailRes.json()
                
                // If this component has methods, add them to our collection
                if (detail.methods && Array.isArray(detail.methods)) {
                  detail.methods.forEach((method: any) => {
                    // Skip if the method name is the same as the component (main function)
                    if (method.name !== comp.name) {
                      allMethods.push({
                        name: method.name,
                        slug: `${comp.slug}#${method.name}`, // Use fragment for method linking
                        description: method.description || `A method in ${comp.name}`,
                        filePath: detail.filePath || 'Unknown path',
                        methodCount: 0,
                        type: 'method',
                        parentName: comp.name,
                        parentType: detail.type || 'component'
                      })
                    }
                  })
                }
              } catch (error) {
                console.error(`Error fetching details for ${comp.name}:`, error)
              }
            })
          )
          
          setComponents(allMethods)
          setLoading(false)
          return
        }
        
        // For non-method types, classify items based on naming patterns
        const fullComponents: ComponentData[] = data.map((comp: any) => {
          let detectedType = 'component' // default
          
          const name = comp.name
          const filePath = comp.filePath || ''
          
          // UI components (from ui/ directory) 
          if (comp.slug?.startsWith('ui_') || filePath.includes('/ui/')) {
            if (name[0] === name[0].toUpperCase() && !name.includes('_')) {
              detectedType = 'component' // PascalCase = React component
            } else {
              detectedType = 'function' // camelCase = function/method
            }
          }
          // Functions and methods (camelCase names)
          else if (name[0] === name[0].toLowerCase() && /[a-z][A-Z]/.test(name) || 
                   name.includes('handle') || name.includes('fetch') || name.includes('get') || 
                   name.includes('set') || name.includes('toggle') || name.includes('render')) {
            detectedType = 'function'
          }
          // Classes (usually PascalCase and might contain certain keywords)
          else if (name[0] === name[0].toUpperCase() && 
                   (name.includes('Service') || name.includes('Manager') || name.includes('Controller') || 
                    name.includes('Handler') || name.includes('Provider') && !filePath.includes('component'))) {
            detectedType = 'class'  
          }
          // Components (PascalCase, typically React components)
          else if (name[0] === name[0].toUpperCase()) {
            detectedType = 'component'
          }
          // Everything else defaults to function
          else {
            detectedType = 'function'
          }

          return {
            ...comp,
            type: comp.type || detectedType,
            description: comp.description || `A ${detectedType} in your codebase.`,
            filePath: comp.filePath || 'Unknown path',
            methodCount: comp.methodCount || 0
          }
        })

        // Filter by the requested type
        const filteredComponents = fullComponents.filter(c =>
          type === 'component' ?
            c.type === 'component' || !c.type : // Include components or those without type specified
            c.type === type
        )

        setComponents(filteredComponents)
        setLoading(false)
      } catch (error) {
        console.error('Error loading component data:', error)
        setLoading(false)
      }
    }

    fetchComponents()
  }, [type])

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading component statistics...</p>
      </div>
    )
  }

  // Filter components based on search query
  const filteredComponents = components.filter(component => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      component.name.toLowerCase().includes(query) ||
      (component.description && component.description.toLowerCase().includes(query)) ||
      (component.filePath && component.filePath.toLowerCase().includes(query))
    )
  })

  if (filteredComponents.length === 0) {
    return (
      <div className="text-center py-12">
        {searchQuery ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-lg">No {type}s found matching "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search terms or browse all {type}s</p>
          </div>
        ) : (
          <p className="text-muted-foreground">No {type}s found in the documentation.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {filteredComponents.length} of {components.length} {type}s</span>
          {searchQuery && <span>matching "{searchQuery}"</span>}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredComponents.map((component) => {
          // Determine the correct base path based on type
          let basePath = '/components/';
          if (type === 'class') basePath = '/classes/';
          if (type === 'function') basePath = '/functions/';
          
          // For methods, use the parent type to determine the base path
          if (type === 'method' && component.parentType) {
            if (component.parentType === 'class') basePath = '/classes/';
            if (component.parentType === 'function') basePath = '/functions/';
          }
          
          // Extract the path and fragment for proper routing
          const [path, fragment] = component.slug.split('#');
          const href = `${basePath}${path}${fragment ? `#${fragment}` : ''}`;
          
          // Create a truly unique key by including the type and parent info if available
          const uniqueKey = `${type}-${component.slug}-${component.parentName || ''}-${Math.random().toString(36).substring(7)}`;
          
          return (
            <Link key={uniqueKey} href={href} className="h-full block group">
              <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer border-none shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm group-hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        type === 'method' ? 'bg-amber-100 dark:bg-amber-900/20' :
                        type === 'class' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        type === 'function' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                        'bg-violet-100 dark:bg-violet-900/20'
                      }`}>
                        {type === 'method' ? (
                          <FileCode className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        ) : type === 'class' ? (
                          <Code className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : type === 'function' ? (
                          <FileCode className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Code className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {component.name}
                        </h3>
                        {component.parentName && (
                          <p className="text-xs text-muted-foreground">
                            in {component.parentName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs font-normal shrink-0">
                      {component.methodCount > 0 ? `${component.methodCount} methods` : type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                    {component.description || `A ${type} in your codebase.`}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Clock className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{component.filePath || 'Unknown path'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}