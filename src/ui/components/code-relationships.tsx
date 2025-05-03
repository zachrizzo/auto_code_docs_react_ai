"use client"
import * as React from "react"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Code, Component, ActivityIcon as Function, FileCode } from "lucide-react"
import { ArrowRightIcon } from "@radix-ui/react-icons"

// Define types locally
export interface CodeEntity {
  id: string;
  name: string;
  type: "component" | "class" | "function" | "method" | string;
  filePath?: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: "imports" | "extends" | "implements" | "calls" | "renders" | "uses";
}

interface CodeRelationshipsProps {
  entityId?: string // If provided, show relationships for this specific entity
  entityType?: "component" | "class" | "function" | "method"
}

export function CodeRelationships({ entityId, entityType }: CodeRelationshipsProps) {
  const [view, setView] = useState<"dependencies" | "dependents" | "all">("all")
  const [components, setComponents] = useState<CodeEntity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch component data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch component index
        const indexRes = await fetch('/docs-data/component-index.json')
        const indexData = await indexRes.json()

        // Fetch all component data
        const componentsData = await Promise.all(
          indexData.map(async (comp: { name: string; slug: string }) => {
            const res = await fetch(`/docs-data/${comp.slug}.json`)
            const data = await res.json()
            return {
              id: comp.slug,
              name: comp.name,
              type: data.type || "component",
              filePath: data.filePath || `src/components/${comp.name}`
            }
          })
        )

        // Extract relationships from component data
        const relationshipsData: Relationship[] = []

        // For each component, check dependencies and references
        await Promise.all(
          indexData.map(async (comp: { name: string; slug: string }) => {
            const res = await fetch(`/docs-data/${comp.slug}.json`)
            const data = await res.json()

            // Check for imports/dependencies
            if (data.imports && Array.isArray(data.imports)) {
              data.imports.forEach((importItem: string) => {
                const targetComp = componentsData.find(c => c.name === importItem || c.id === importItem)
                if (targetComp) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: targetComp.id,
                    type: "imports"
                  })
                }
              })
            }

            // Check for method calls
            if (data.methods && Array.isArray(data.methods)) {
              data.methods.forEach((method: any) => {
                if (method.calls && Array.isArray(method.calls)) {
                  method.calls.forEach((call: string) => {
                    const [targetComp, targetMethod] = call.split('.')
                    const target = componentsData.find(c => c.name === targetComp)
                    if (target) {
                      relationshipsData.push({
                        source: comp.slug,
                        target: target.id,
                        type: "calls"
                      })
                    }
                  })
                }
              })
            }

            // Check for similarity warnings (these can indicate relationships)
            if (data.similarityWarnings && Array.isArray(data.similarityWarnings)) {
              data.similarityWarnings.forEach((warning: any) => {
                const similarCompName = warning.similarTo.split('.')[0]
                const targetComp = componentsData.find(c => c.name === similarCompName)

                if (targetComp && warning.score > 0.7) { // Only consider strong similarities
                  // Determine relationship type based on similarity and component types
                  let relType: Relationship["type"] = "uses"

                  // If reason contains certain keywords, use more specific relationship type
                  const reason = warning.reason.toLowerCase()
                  if (reason.includes("extends") || reason.includes("inherits")) {
                    relType = "extends"
                  } else if (reason.includes("implements")) {
                    relType = "implements"
                  } else if (reason.includes("renders") || reason.includes("displays")) {
                    relType = "renders"
                  } else if (reason.includes("calls") || reason.includes("invokes")) {
                    relType = "calls"
                  }

                  relationshipsData.push({
                    source: comp.slug,
                    target: targetComp.id,
                    type: relType
                  })
                }
              })
            }
          })
        )

        // Remove duplicate relationships
        const uniqueRelationships = relationshipsData.filter((rel, index, self) =>
          index === self.findIndex(r =>
            r.source === rel.source && r.target === rel.target && r.type === rel.type
          )
        )

        setComponents(componentsData)
        setRelationships(uniqueRelationships)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching relationship data:", error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // If entityId is provided, filter relationships for this entity
  const filteredRelationships = useMemo(() => {
    if (!entityId || relationships.length === 0) {
      return relationships
    }

    return relationships.filter((rel) => {
      if (view === "dependencies") return rel.source === entityId
      if (view === "dependents") return rel.target === entityId
      return rel.source === entityId || rel.target === entityId
    })
  }, [entityId, view, relationships])

  // Get the entities involved in the filtered relationships
  const filteredEntities = useMemo(() => {
    if (components.length === 0) return []

    const entityIds = new Set<string>()
    filteredRelationships.forEach((rel) => {
      entityIds.add(rel.source)
      entityIds.add(rel.target)
    })
    return components.filter((entity) => entityIds.has(entity.id))
  }, [filteredRelationships, components])

  // Get the current entity if entityId is provided
  const currentEntity = useMemo(() => {
    if (!entityId || components.length === 0) return undefined
    return components.find((e) => e.id === entityId)
  }, [entityId, components])

  const getEntityIcon = (type: CodeEntity["type"]) => {
    switch (type) {
      case "component":
        return <Component className="h-4 w-4" />
      case "class":
        return <Code className="h-4 w-4" />
      case "function":
        return <Function className="h-4 w-4" />
      case "method":
        return <FileCode className="h-4 w-4" />
      default:
        return <Component className="h-4 w-4" />
    }
  }

  const getRelationshipLabel = (type: Relationship["type"]) => {
    switch (type) {
      case "imports":
        return "Imports"
      case "extends":
        return "Extends"
      case "implements":
        return "Implements"
      case "calls":
        return "Calls"
      case "renders":
        return "Renders"
      case "uses":
        return "Uses"
    }
  }

  const getRelationshipColor = (type: Relationship["type"]) => {
    switch (type) {
      case "imports":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      case "extends":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
      case "implements":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800"
      case "calls":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      case "renders":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
      case "uses":
        return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800"
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle>Code Relationships</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading relationship data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle>{currentEntity ? `Code Relationships for ${currentEntity.name}` : "Code Relationships"}</CardTitle>
          {currentEntity && (
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                <TabsTrigger value="dependents">Dependents</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {filteredRelationships.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No relationships found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRelationships.map((rel, index) => {
              const sourceEntity = components.find((e) => e.id === rel.source)
              const targetEntity = components.find((e) => e.id === rel.target)

              if (!sourceEntity || !targetEntity) return null

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    {getEntityIcon(sourceEntity.type)}
                    <div>
                      <div className="font-medium">{sourceEntity.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sourceEntity.filePath}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center mx-4">
                    <Badge className={`${getRelationshipColor(rel.type)}`}>{getRelationshipLabel(rel.type)}</Badge>
                    <ArrowRightIcon className="h-6 w-6 text-muted-foreground my-1" />
                  </div>

                  <div className="flex items-center gap-2">
                    {getEntityIcon(targetEntity.type)}
                    <div>
                      <div className="font-medium">{targetEntity.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{targetEntity.filePath}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ArrowLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}
