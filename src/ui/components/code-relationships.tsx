"use client"
import * as React from "react"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { Code, Component, ActivityIcon as Function, FileCode, X, ExternalLink } from "lucide-react"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { InteractiveGraph } from "./interactive-graph"
import { CodeBlock } from "./code-block"

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
  const [selectedNodeForCode, setSelectedNodeForCode] = useState<string | null>(null)
  const [nodeCodeData, setNodeCodeData] = useState<any>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null)


  // Fetch component data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch component index
        const indexRes = await fetch('/docs-data/component-index.json')
        const indexData = await indexRes.json()

        // Fetch all component data and classify entity types based on file analysis
        const componentsData = await Promise.all(
          indexData.map(async (comp: { name: string; slug: string }) => {
            const res = await fetch(`/docs-data/${comp.slug}.json`)
            const data = await res.json()
            
            // Determine entity type based on comprehensive analysis
            let entityType = "component" // default
            
            // First, analyze the code content for function patterns
            if (data.code) {
              const code = data.code.toLowerCase()
              
              // Check for function patterns in the code
              if (code.includes('function ') || 
                  code.includes('const ') && code.includes(' = ') && (code.includes('=>') || code.includes('function')) ||
                  code.includes('export const ') && code.includes('=>') ||
                  code.includes('export function ') ||
                  code.includes('async ') && code.includes('=>')) {
                
                // Further check if it's NOT a React component
                if (!code.includes('jsx') && 
                    !code.includes('tsx') && 
                    !code.includes('react') && 
                    !code.includes('component') &&
                    !code.includes('props') &&
                    !code.includes('return (') &&
                    !code.includes('<') &&
                    !data.props?.length) {
                  entityType = "function"
                }
              }
              
              // Check for class patterns
              if (code.includes('class ') && code.includes('extends')) {
                entityType = "class"
              }
            }
            
            // Analyze file path for additional context
            if (data.filePath) {
              const filePath = data.filePath.toLowerCase()
              
              // File path based classification (higher priority for utilities)
              if (filePath.includes('/lib/') || 
                  filePath.includes('/utils/') || 
                  filePath.includes('/helpers/') ||
                  filePath.includes('/functions/')) {
                entityType = "function"
              } else if (filePath.includes('/services/') || 
                        filePath.includes('/classes/') ||
                        filePath.includes('/models/')) {
                entityType = "class"
              }
            }
            
            // Name-based classification
            if (data.name) {
              const name = data.name.toLowerCase()
              
              // Function naming patterns
              if (name.includes('use') && name.length > 3 && name[3] === name[3].toUpperCase()) {
                // React hook pattern (useState, useEffect, etc.)
                entityType = "function"
              } else if (name.match(/^[a-z][a-z0-9]*[A-Z]/) || // camelCase starting with lowercase
                        name.includes('to') || 
                        name.includes('get') || 
                        name.includes('set') || 
                        name.includes('create') || 
                        name.includes('update') || 
                        name.includes('delete') || 
                        name.includes('fetch') ||
                        name.includes('handle') ||
                        name.includes('copy') ||
                        name.includes('format') ||
                        name.includes('parse') ||
                        name.includes('validate')) {
                entityType = "function"
              }
              
              // Class naming patterns
              if (name.includes('Service') || 
                  name.includes('Provider') || 
                  name.includes('Manager') ||
                  name.includes('Controller') ||
                  name.includes('Handler') && !name.includes('handle')) {
                entityType = "class"
              }
            }
            
            // Check if it's a method within another component
            if (data.parent || (data.methods && data.methods.length === 1 && data.props?.length === 0)) {
              entityType = "method"
            }
            
            // Final check: if it has props but no JSX, it might be a utility with TypeScript interface
            if (data.props && data.props.length > 0 && data.code && !data.code.includes('<')) {
              entityType = "function"
            }
            
            return {
              id: comp.slug,
              name: comp.name,
              type: entityType,
              filePath: data.filePath || `src/components/${comp.name}`,
              methods: data.methods || [],
              props: data.props || []
            }
          })
        )

        // Extract relationships from component data with enhanced relationship detection
        const relationshipsData: Relationship[] = []

        // Create a lookup map for easier entity finding
        const entityLookup = new Map()
        componentsData.forEach(comp => entityLookup.set(comp.name.toLowerCase(), comp.id))

        // For each component, check for relationships directly
        await Promise.all(
          indexData.map(async (comp: { name: string; slug: string }) => {
            const res = await fetch(`/docs-data/${comp.slug}.json`)
            const data = await res.json()
            const currentEntity = componentsData.find(c => c.id === comp.slug)

            // 1. Direct relationships from data.relationships
            if (data.relationships && Array.isArray(data.relationships)) {
              data.relationships.forEach((rel: any) => {
                if (rel.source && rel.target && rel.type) {
                  relationshipsData.push({
                    source: rel.source,
                    target: rel.target,
                    type: rel.type,
                    weight: rel.weight || 1,
                    context: rel.context
                  })
                } else if (rel.target && rel.type && !rel.source) {
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

            // 2. Create "contains" relationships for methods within components/classes
            if (data.methods && Array.isArray(data.methods) && data.methods.length > 0) {
              data.methods.forEach((method: any) => {
                const methodSlug = `${comp.slug}-${method.name.toLowerCase()}`
                // Check if a method entity exists
                const methodEntity = componentsData.find(c => 
                  c.name.toLowerCase() === method.name.toLowerCase() || 
                  c.id === methodSlug
                )
                
                if (methodEntity) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: methodEntity.id,
                    type: "contains",
                    weight: 1,
                    context: "owns method"
                  })
                }
              })
            }

            // 3. Detect inheritance relationships from naming patterns and file structure
            if (currentEntity && currentEntity.type === "class") {
              // Look for inheritance patterns in the name
              if (data.name.includes('Service') && data.name !== 'BaseService') {
                const baseServiceEntity = componentsData.find(c => 
                  c.name.toLowerCase().includes('baseservice') || 
                  c.name.toLowerCase().includes('base')
                )
                if (baseServiceEntity) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: baseServiceEntity.id,
                    type: "inherits",
                    weight: 2,
                    context: "class inheritance"
                  })
                }
              }
              
              // Provider pattern inheritance
              if (data.name.includes('Provider')) {
                const baseProviderEntity = componentsData.find(c => 
                  c.name.toLowerCase().includes('provider') && 
                  c.name.toLowerCase().includes('base')
                )
                if (baseProviderEntity && baseProviderEntity.id !== comp.slug) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: baseProviderEntity.id,
                    type: "inherits",
                    weight: 2,
                    context: "provider inheritance"
                  })
                }
              }
            }

            // 4. Import relationships (uses)
            if (data.imports && Array.isArray(data.imports)) {
              data.imports.forEach((importItem: string) => {
                const targetSlug = importItem.toLowerCase().replace(/\s+/g, "-")
                const targetEntity = componentsData.find(c => 
                  c.name.toLowerCase() === importItem.toLowerCase() ||
                  c.id === targetSlug
                )
                
                if (targetEntity && !relationshipsData.some(r => 
                  r.source === comp.slug && r.target === targetEntity.id && r.type === "uses"
                )) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: targetEntity.id,
                    type: "uses",
                    weight: 2,
                    context: "imports"
                  })
                }
              })
            }

            // 5. Reference relationships (uses/contains)
            if (data.references && Array.isArray(data.references)) {
              data.references.forEach((refItem: string) => {
                const targetEntity = componentsData.find(c => 
                  c.name.toLowerCase() === refItem.toLowerCase()
                )
                
                if (targetEntity && !relationshipsData.some(r => 
                  r.source === comp.slug && r.target === targetEntity.id
                )) {
                  // Determine relationship type based on entity types
                  let relType: "uses" | "contains" = "uses"
                  if (currentEntity?.type === "component" && targetEntity.type === "component") {
                    relType = "contains" // Component containing/rendering another component
                  }
                  
                  relationshipsData.push({
                    source: comp.slug,
                    target: targetEntity.id,
                    type: relType,
                    weight: relType === "contains" ? 2 : 1,
                    context: relType === "contains" ? "renders component" : "references"
                  })
                }
              })
            }

            // 6. Analyze method code for function calls (uses relationships)
            if (data.methods && Array.isArray(data.methods)) {
              data.methods.forEach((method: any) => {
                if (method.code) {
                  // Look for function calls in method code
                  componentsData.forEach(targetEntity => {
                    if (targetEntity.type === "function" && 
                        targetEntity.id !== comp.slug &&
                        method.code.includes(targetEntity.name)) {
                      
                      if (!relationshipsData.some(r => 
                        r.source === comp.slug && r.target === targetEntity.id && r.type === "uses"
                      )) {
                        relationshipsData.push({
                          source: comp.slug,
                          target: targetEntity.id,
                          type: "uses",
                          weight: 1,
                          context: "calls function"
                        })
                      }
                    }
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

        // Use only real data from the documentation
        console.log('Loading real data from documentation')
        console.log('Components loaded:', componentsData.length)
        console.log('Relationships found:', uniqueRelationships.length)
        
        setComponents(componentsData)
        setRelationships(uniqueRelationships)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching relationship data:", error)
        // Set empty data if there's an error
        setComponents([])
        setRelationships([])
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch code data for a specific node
  const fetchNodeCodeData = async (nodeId: string) => {
    try {
      const res = await fetch(`/docs-data/${nodeId}.json`)
      const data = await res.json()
      setNodeCodeData(data)
    } catch (error) {
      console.error('Error fetching node code data:', error)
      setNodeCodeData(null)
    }
  }

  // Handle node click to select node and show side panel
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    // Fetch basic node data for the side panel
    const nodeEntity = components.find(c => c.id === nodeId)
    setSelectedNodeData(nodeEntity)
  }

  // Handle opening the full code modal
  const openCodeModal = (nodeId: string) => {
    setSelectedNodeForCode(nodeId)
    fetchNodeCodeData(nodeId)
    setSelectedNodeId(null)
    setSelectedNodeData(null)
  }

  // Close code preview modal
  const closeCodePreview = () => {
    setSelectedNodeForCode(null)
    setNodeCodeData(null)
  }

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
      width: 2,
      weight: rel.weight || 1,
      context: rel.context
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
          
          {/* Data Source Info */}
          {components.length > 0 && (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  Real Data
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Extracted from your actual codebase
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
            <p className="text-muted-foreground">No relationships found in your codebase.</p>
            {components.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">Generate documentation first to analyze your code relationships</p>
            ) : (
              <p className="text-sm text-slate-500 mt-2">Your components don't have detectable relationships yet. Try adding imports or method calls.</p>
            )}
          </div>
        ) : graphView === "graph" ? (
          <div className="h-[600px]">
            <InteractiveGraph
              nodes={graphNodes}
              edges={graphEdges}
              focusNodeId={entityId}
              selectedNodeId={selectedNodeId || undefined}
              onNodeClick={handleNodeClick}
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

    {/* Node Details Side Panel */}
    {selectedNodeData && (
      <Card className="fixed top-20 right-4 w-96 max-h-[calc(100vh-5.5rem)] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border-2 border-blue-200 dark:border-blue-800 z-50 rounded-xl">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                {getEntityIcon(selectedNodeData.type)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{selectedNodeData.name}</span>
                <Badge 
                  variant="secondary" 
                  className="mt-1 w-fit bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300"
                >
                  {selectedNodeData.type}
                </Badge>
              </div>
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedNodeId(null)
                setSelectedNodeData(null)
              }}
              className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {selectedNodeData.filePath && (
            <div className="mb-4 p-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg">
              <div className="text-sm text-slate-600 dark:text-slate-400 font-mono break-words">
                📁 {selectedNodeData.filePath}
              </div>
            </div>
          )}
          
          {/* Connection Info */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Connections</h4>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {filteredRelationships.filter(rel => rel.source === selectedNodeId || rel.target === selectedNodeId).length} relationships
            </div>
          </div>

          {/* Relationship breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Relationship Types</h4>
            <div className="space-y-1">
              {['uses', 'inherits', 'contains'].map(relType => {
                const count = filteredRelationships.filter(rel => 
                  (rel.source === selectedNodeId || rel.target === selectedNodeId) && rel.type === relType
                ).length
                if (count === 0) return null
                return (
                  <div key={relType} className="flex items-center justify-between text-sm">
                    <Badge className={`${getRelationshipColor(relType as any)} text-xs`}>
                      {getRelationshipLabel(relType as any)}
                    </Badge>
                    <span className="text-slate-600 dark:text-slate-400">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={() => openCodeModal(selectedNodeId!)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md"
            >
              <Code className="h-4 w-4 mr-2" />
              View Full Code
            </Button>
            
            {selectedNodeData.filePath && (
              <Button 
                variant="outline" 
                asChild
                className="w-full border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <a href={`/${selectedNodeId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details Page
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )}

    {/* Beautiful Code Preview Modal */}
    <Dialog open={selectedNodeForCode !== null} onOpenChange={(open) => !open && closeCodePreview()}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {nodeCodeData && (
                <>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                    {getEntityIcon(nodeCodeData.type || "component")}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <DialogTitle className="font-bold text-slate-900 dark:text-slate-100 truncate text-lg">
                      {nodeCodeData.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {nodeCodeData.type || "component"}
                      </Badge>
                      {nodeCodeData.code && (
                        <Badge variant="outline" className="text-xs">
                          {nodeCodeData.code.split('\n').length} lines
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {nodeCodeData?.filePath && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/${selectedNodeForCode}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Details
                  </a>
                </Button>
              )}
            </div>
          </div>
          {nodeCodeData?.filePath && (
            <div className="mt-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
              📁 {nodeCodeData.filePath}
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="p-4 md:p-6 lg:p-8 space-y-6">
              {nodeCodeData ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {/* Left Column - Info Cards */}
                  <div className="space-y-6">
                    {/* Description Card */}
                    {nodeCodeData.description && (
                      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-slate-700 dark:text-slate-300">{nodeCodeData.description}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Props Card */}
                    {nodeCodeData.props && nodeCodeData.props.length > 0 && (
                      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            Props ({nodeCodeData.props.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 max-h-64 overflow-y-auto">
                          <div className="space-y-3">
                            {nodeCodeData.props.map((prop: any, index: number) => (
                              <div key={index} className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 border border-white/50 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold">
                                    {prop.name}
                                  </code>
                                  <Badge variant="outline" className="text-xs">
                                    {prop.type}
                                  </Badge>
                                  {prop.required && (
                                    <Badge className="text-xs bg-red-100 text-red-700">
                                      required
                                    </Badge>
                                  )}
                                </div>
                                {prop.description && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{prop.description}</p>
                                )}
                                {prop.defaultValue && (
                                  <div className="text-xs text-slate-500">
                                    Default: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{prop.defaultValue}</code>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Relationships Card */}
                    {nodeCodeData.relationships && nodeCodeData.relationships.length > 0 && (
                      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-orange-900 dark:text-orange-100">
                            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                            Relationships ({nodeCodeData.relationships.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 max-h-48 overflow-y-auto">
                          <div className="space-y-2">
                            {nodeCodeData.relationships.map((rel: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-white/50 dark:border-slate-700/50 text-sm">
                                <Badge className={`${getRelationshipColor(rel.type)} text-xs`}>
                                  {getRelationshipLabel(rel.type)}
                                </Badge>
                                <ArrowRightIcon className="h-3 w-3 text-slate-400" />
                                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded flex-1 truncate">
                                  {rel.target}
                                </code>
                                {rel.context && (
                                  <span className="text-xs text-slate-500 bg-slate-100/50 px-1 rounded">
                                    {rel.context}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Methods Card */}
                    {nodeCodeData.methods && nodeCodeData.methods.length > 0 && (
                      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                            Methods ({nodeCodeData.methods.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 max-h-64 overflow-y-auto">
                          <div className="space-y-3">
                            {nodeCodeData.methods.map((method: any, index: number) => (
                              <div key={index} className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 border border-white/50 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <code className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs font-semibold text-purple-800 dark:text-purple-200">
                                    {method.name}()
                                  </code>
                                  {method.params && method.params.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {method.params.map((param: any, paramIndex: number) => (
                                        <Badge key={paramIndex} variant="outline" className="text-xs">
                                          {param.name}: {param.type}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {method.description && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{method.description}</p>
                                )}
                                {method.code && (
                                  <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                                    <CodeBlock code={method.code} language="tsx" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Column - Source Code */}
                  <div className="xl:col-span-2 2xl:col-span-3">
                    {nodeCodeData.code && (
                      <Card className="h-full bg-gradient-to-br from-slate-50 to-stone-50 dark:from-slate-950/30 dark:to-stone-950/30 border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <div className="h-2 w-2 rounded-full bg-slate-500"></div>
                            Source Code
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 h-[calc(100%-4rem)]">
                          <ScrollArea className="h-full w-full">
                            <div className="bg-slate-900 rounded-lg h-full">
                              <CodeBlock code={nodeCodeData.code} language="tsx" />
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Loading code data...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}

