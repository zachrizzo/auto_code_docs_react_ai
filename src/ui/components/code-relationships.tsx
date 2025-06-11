"use client"
import * as React from "react"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Code, Component, ActivityIcon as Function, FileCode } from "lucide-react"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { InteractiveGraph } from "./interactive-graph"

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
  type: "uses" | "inherits" | "contains";
  weight?: number;
  context?: string;
}

interface CodeRelationshipsProps {
  entityId?: string // If provided, show relationships for this specific entity
}

export function CodeRelationships({ entityId }: CodeRelationshipsProps) {
  const [view, setView] = useState<"dependencies" | "dependents" | "all">("all")
  const [components, setComponents] = useState<CodeEntity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [graphView, setGraphView] = useState<"list" | "graph">("graph")

  // Create sample data
  const sampleComponents = [
    { id: 'button', name: 'Button', type: 'component', filePath: 'components/ui/button.tsx' },
    { id: 'card', name: 'Card', type: 'component', filePath: 'components/ui/card.tsx' },
    { id: 'dialog', name: 'Dialog', type: 'component', filePath: 'components/ui/dialog.tsx' },
    { id: 'utils', name: 'utils', type: 'function', filePath: 'lib/utils.ts' },
    { id: 'theme', name: 'ThemeProvider', type: 'class', filePath: 'components/theme-provider.tsx' }
  ]
  
  const sampleRelationships = [
    { source: 'card', target: 'button', type: 'uses' as const, weight: 3, context: 'imports and renders' },
    { source: 'dialog', target: 'button', type: 'uses' as const, weight: 2, context: 'imports only' },
    { source: 'card', target: 'utils', type: 'uses' as const, weight: 2, context: 'calls utility functions' },
    { source: 'dialog', target: 'utils', type: 'uses' as const, weight: 2, context: 'calls utility functions' },
    { source: 'button', target: 'utils', type: 'uses' as const, weight: 2, context: 'calls utility functions' },
    { source: 'theme', target: 'utils', type: 'inherits' as const, weight: 2, context: 'class inheritance' }
  ]

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

        // For each component, check for relationships directly
        await Promise.all(
          indexData.map(async (comp: { name: string; slug: string }) => {
            const res = await fetch(`/docs-data/${comp.slug}.json`)
            const data = await res.json()

            // Check for relationships array directly
            if (data.relationships && Array.isArray(data.relationships)) {
              data.relationships.forEach((rel: any) => {
                // Handle both formats: with and without source
                if (rel.source && rel.target && rel.type) {
                  // Standard format with source
                  relationshipsData.push({
                    source: rel.source,
                    target: rel.target,
                    type: rel.type
                  })
                } else if (rel.target && rel.type && !rel.source) {
                  // Calls format without source - use current component as source
                  relationshipsData.push({
                    source: comp.slug,
                    target: rel.target,
                    type: rel.type,
                    weight: rel.weight || 1,
                    context: rel.context
                  })
                }
              })
            }

            // Fallback: Check for imports/dependencies (legacy support)
            if (data.imports && Array.isArray(data.imports)) {
              data.imports.forEach((importItem: string) => {
                const targetSlug = importItem.toLowerCase().replace(/\s+/g, "-")
                // Check if this relationship already exists
                const exists = relationshipsData.some(r => 
                  r.source === comp.slug && r.target === targetSlug && r.type === "uses"
                )
                if (!exists) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: targetSlug,
                    type: "uses",
                    weight: 2,
                    context: "imports"
                  })
                }
              })
            }

            // Fallback: Check for references (legacy support)
            if (data.references && Array.isArray(data.references)) {
              data.references.forEach((refItem: string) => {
                const targetSlug = refItem.toLowerCase().replace(/\s+/g, "-")
                // Check if this relationship already exists
                const exists = relationshipsData.some(r => 
                  r.source === comp.slug && r.target === targetSlug && r.type === "uses"
                )
                if (!exists) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: targetSlug,
                    type: "uses",
                    weight: 1,
                    context: "renders"
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

        // Debug logging
        console.log('Components loaded:', componentsData.length)
        console.log('Relationships found:', uniqueRelationships.length)
        console.log('Sample relationships:', sampleRelationships.length)
        
        // If we got real data, use it; otherwise use sample data
        if (componentsData.length > 0 && uniqueRelationships.length > 0) {
          console.log('Using real data')
          setComponents(componentsData)
          setRelationships(uniqueRelationships)
        } else {
          // Use sample data
          console.log('Using sample data')
          setComponents(sampleComponents)
          setRelationships(sampleRelationships)
        }
        setLoading(false)
      } catch (error) {
        console.error("Error fetching relationship data, using sample data:", error)
        // Fallback to sample data
        setComponents(sampleComponents)
        setRelationships(sampleRelationships)
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


  // Get the current entity if entityId is provided
  const currentEntity = useMemo(() => {
    if (!entityId || components.length === 0) return undefined
    return components.find((e) => e.id === entityId)
  }, [entityId, components])

  // Prepare graph data
  const { graphNodes, graphEdges } = useMemo(() => {
    if (components.length === 0 || filteredRelationships.length === 0) {
      return { graphNodes: [], graphEdges: [] }
    }

    // Get all entities involved in relationships
    const involvedEntityIds = new Set<string>()
    filteredRelationships.forEach(rel => {
      involvedEntityIds.add(rel.source)
      involvedEntityIds.add(rel.target)
    })

    // Create nodes
    const nodes = components
      .filter(comp => involvedEntityIds.has(comp.id))
      .map(comp => {
        const connections = filteredRelationships.filter(
          rel => rel.source === comp.id || rel.target === comp.id
        ).length

        return {
          id: comp.id,
          name: comp.name,
          type: comp.type as 'component' | 'class' | 'function' | 'method',
          x: Math.random() * 600 + 100,
          y: Math.random() * 400 + 100,
          radius: Math.max(20, Math.min(40, 20 + connections * 3)),
          color: '',
          connections
        }
      })

    // Create edges
    const edges = filteredRelationships.map(rel => ({
      source: rel.source,
      target: rel.target,
      type: rel.type,
      color: '',
      width: 2
    }))

    return { graphNodes: nodes, graphEdges: edges }
  }, [components, filteredRelationships])

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
      case "uses":
        return "Uses"
      case "inherits":
        return "Inherits"
      case "contains":
        return "Contains"
      default:
        return type
    }
  }

  const getRelationshipColor = (type: Relationship["type"]) => {
    switch (type) {
      case "uses":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      case "inherits":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
      case "contains":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800"
    }
  }

  // Calculate relationship statistics
  const relationshipStats = useMemo(() => {
    const stats = {
      total: filteredRelationships.length,
      byType: {} as Record<Relationship['type'], number>,
      mostConnected: { name: '', connections: 0 }
    };

    filteredRelationships.forEach((rel: Relationship) => {
      stats.byType[rel.type] = (stats.byType[rel.type] || 0) + 1;
    });

    const connectionCounts: Record<string, number> = {};
    filteredRelationships.forEach((rel: Relationship) => {
      connectionCounts[rel.source] = (connectionCounts[rel.source] || 0) + 1;
      connectionCounts[rel.target] = (connectionCounts[rel.target] || 0) + 1;
    });

    let mostConnectedEntityInfo = { name: '', connections: 0 };
    Object.entries(connectionCounts).forEach(([entityId, count]) => {
      if (count > mostConnectedEntityInfo.connections) {
        const entity = components.find((c: CodeEntity) => c.id === entityId);
        mostConnectedEntityInfo = { name: entity?.name || entityId, connections: count };
      }
    });
    stats.mostConnected = mostConnectedEntityInfo;

    return stats;
  }, [filteredRelationships, components]);

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
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Panel */}
      {filteredRelationships.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{relationshipStats.total}</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Total Relations</div>
            </CardContent>
          </Card>
          
          {Object.entries(relationshipStats.byType).map(([type, count]) => (
            <Card key={type} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{count}</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 capitalize">{type}</div>
              </CardContent>
            </Card>
          ))}
          
          {relationshipStats.mostConnected.connections > 0 && (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400 truncate">
                  {relationshipStats.mostConnected.name}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Most Connected ({relationshipStats.mostConnected.connections})
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Sample Data Warning */}
          {components.length > 0 && components[0]?.id === 'button' && (
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  Sample Data
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  Generate docs for real relationships
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle>{currentEntity ? `Code Relationships for ${currentEntity.name}` : "Code Relationships"}</CardTitle>
            <div className="flex gap-4">
              <Tabs value={graphView} onValueChange={(v) => setGraphView(v as any)}>
                <TabsList className="bg-slate-100 dark:bg-slate-800">
                  <TabsTrigger value="graph">Graph</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>
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
          </div>
        </CardHeader>
      <CardContent className="p-6">
        {filteredRelationships.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No relationships found.</p>
            <p className="text-sm text-slate-500 mt-2">Generate documentation to see real component relationships</p>
          </div>
        ) : graphView === "graph" ? (
          <div className="h-[600px]">
            <InteractiveGraph
              nodes={graphNodes}
              edges={graphEdges}
              focusNodeId={entityId}
              onNodeClick={(nodeId) => {
                // You can add navigation logic here
                console.log('Clicked node:', nodeId)
              }}
            />
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
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {getEntityIcon(sourceEntity.type)}
                    <div>
                      <div className="font-medium">{sourceEntity.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sourceEntity.filePath}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center mx-4">
                    <Badge className={`${getRelationshipColor(rel.type)}`}>
                      {getRelationshipLabel(rel.type)}
                      {rel.weight && rel.weight > 1 && (
                        <span className="ml-1 text-xs">×{rel.weight}</span>
                      )}
                    </Badge>
                    {rel.context && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-20 text-center">
                        {rel.context}
                      </div>
                    )}
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
    </div>
  )
}

