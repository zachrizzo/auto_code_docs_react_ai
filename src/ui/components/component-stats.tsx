"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import Link from "next/link"
import { FileCode, Clock, Code } from "lucide-react"

interface ComponentStatsProps {
  type?: 'component' | 'class' | 'method' | 'function'
}

interface ComponentData {
  name: string
  slug: string
  description: string
  filePath: string
  methodCount: number
  type?: string
  code?: string
}

export function ComponentStats({ type = 'component' }: ComponentStatsProps) {
  const [components, setComponents] = useState<ComponentData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchComponents() {
      try {
        // Fetch the component index
        const res = await fetch('/docs-data/component-index.json')
        const data = await res.json()

        // Load all component details to check for types
        const fullComponents = await Promise.all(
          data.map(async (comp: { name: string; slug: string }) => {
            try {
              const detailRes = await fetch(`/docs-data/${comp.slug}.json`)
              const detail = await detailRes.json()
              return {
                ...comp,
                type: detail.type || 'component'
              }
            } catch (error) {
              console.error(`Error fetching details for ${comp.name}:`, error)
              return {
                ...comp,
                type: 'component' // Default if we can't determine
              }
            }
          })
        )

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

  if (components.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No {type}s found in the documentation.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {components.map((component) => (
        <Link key={component.slug} href={`/docs/${component.slug}`} className="h-full block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {type === 'method' ? (
                    <FileCode className="h-5 w-5 text-amber-500" />
                  ) : type === 'class' ? (
                    <Code className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Code className="h-5 w-5 text-violet-500" />
                  )}
                  <h3 className="font-medium text-lg">{component.name}</h3>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {component.methodCount > 0 ? `${component.methodCount} methods` : 'No methods'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {component.description || `A ${type} in your codebase.`}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="truncate max-w-[250px]">{component.filePath || 'Unknown path'}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
