"use client"
import * as React from "react"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Code, Component, ActivityIcon as Function, FileCode, X, ExternalLink, Server, Zap, Info, Focus, Move, Minus } from "lucide-react"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { InteractiveGraph } from "./interactive-graph"
import { CodeBlock } from "./code-block"
import { McpServerControl } from "./mcp-server-control"
import { CodeSimilaritySearch } from "./code-similarity-search"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeHighlight from "rehype-highlight"

// Define types locally
export interface CodeEntity {
  id: string;
  name: string;
  type: "component" | "class" | "function" | "method" | string;
  filePath?: string;
  methods?: any[];
  props?: any[];
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroupData, setSelectedGroupData] = useState<any>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isMinimized, setIsMinimized] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Fetch component index first
        const indexRes = await fetch('/docs-data/component-index.json')
        if (!indexRes.ok) {
          throw new Error(`Failed to fetch component index: ${indexRes.statusText}`)
        }
        const indexData = await indexRes.json()

        // Create basic components from index data
        const componentsData: CodeEntity[] = indexData.map((comp: { name: string; slug: string; filePath?: string }) => {
          let entityType = "component"
          const name = comp.name.toLowerCase()
          if (name.includes('use') && name.length > 3 && comp.name[3] === comp.name[3].toUpperCase()) entityType = "function"
          else if (name.match(/^[a-z][a-z0-9]*[A-Z]/) || ['to', 'get', 'set', 'create', 'update', 'delete', 'fetch', 'handle', 'copy', 'format', 'parse', 'validate'].some(p => name.includes(p))) entityType = "function"
          if (['service', 'provider', 'manager', 'controller', 'handler'].some(p => name.includes(p)) && !name.includes('handle')) entityType = "class"
          if (comp.filePath) {
            const filePath = comp.filePath.toLowerCase()
            if (['/lib/', '/utils/', '/helpers/', '/functions/'].some(p => filePath.includes(p))) entityType = "function"
            else if (['/services/', '/classes/', '/models/'].some(p => filePath.includes(p))) entityType = "class"
          }
          return { id: comp.slug, name: comp.name, type: entityType, filePath: comp.filePath || `src/components/${comp.name}`, methods: [], props: [] }
        })

        // Load all component details to get complete relationships
        const detailedData = await Promise.all(
          componentsData.map(async (comp) => {
            try {
              const res = await fetch(`/docs-data/${comp.id}.json`)
              if (!res.ok) {
                console.warn(`Failed to load details for ${comp.id}: ${res.statusText}`)
                return null
              }
              return await res.json()
            } catch (error) {
              console.warn(`Failed to load details for ${comp.id}:`, error)
              return null
            }
          })
        )

        // Helper function to resolve entity names to actual component IDs
        const resolveEntityId = (entityName: string): string | null => {
          // First try exact ID match
          const exactMatch = componentsData.find(c => c.id === entityName)
          if (exactMatch) return exactMatch.id
          
          // Try exact name match
          const nameMatch = componentsData.find(c => c.name === entityName)
          if (nameMatch) return nameMatch.id
          
          // Try case-insensitive name match
          const caseInsensitiveMatch = componentsData.find(c => c.name.toLowerCase() === entityName.toLowerCase())
          if (caseInsensitiveMatch) return caseInsensitiveMatch.id
          
          // Try to find a component that ends with the entity name (for cases like "dialog" -> "src_ui_components_ui_dialog_dialog")
          const slugEndMatch = componentsData.find(c => c.id.toLowerCase().endsWith(`_${entityName.toLowerCase()}`))
          if (slugEndMatch) return slugEndMatch.id
          
          // Try to find a component whose name matches the entity name
          const nameInSlugMatch = componentsData.find(c => c.id.toLowerCase().includes(`_${entityName.toLowerCase()}_`) || c.id.toLowerCase().endsWith(`_${entityName.toLowerCase()}`))
          if (nameInSlugMatch) return nameInSlugMatch.id
          
          return null
        }

        // Extract relationships from the loaded component data
        const relationshipsData: Relationship[] = []
        detailedData.forEach((data, index) => {
          if (!data) return
          const comp = componentsData[index]
          if (data.relationships && Array.isArray(data.relationships)) {
            data.relationships.forEach((rel: any) => {
              let sourceId = rel.source
              let targetId = rel.target
              
              // Resolve source and target to actual component IDs
              if (sourceId) {
                const resolvedSource = resolveEntityId(sourceId)
                sourceId = resolvedSource || sourceId
              } else {
                sourceId = comp.id
              }
              
              if (targetId) {
                const resolvedTarget = resolveEntityId(targetId)
                targetId = resolvedTarget
              }
              
              // Only add relationship if both source and target exist
              if (sourceId && targetId && rel.type) {
                relationshipsData.push({ source: sourceId, target: targetId, type: rel.type, weight: rel.weight || 1, context: rel.context })
              }
            })
          }
          if (data.imports && Array.isArray(data.imports)) {
            data.imports.forEach((importItem: string) => {
              const resolvedTarget = resolveEntityId(importItem)
              if (resolvedTarget && !relationshipsData.some(r => r.source === comp.id && r.target === resolvedTarget && r.type === "uses")) {
                relationshipsData.push({ source: comp.id, target: resolvedTarget, type: "uses", weight: 2, context: "imports" })
              }
            })
          }
        })

        const uniqueRelationships = relationshipsData.filter((rel, index, self) =>
          index === self.findIndex(r => r.source === rel.source && r.target === rel.target && r.type === rel.type)
        )

        console.log('Initialized with data from documentation index')
        console.log('Components loaded:', componentsData.length)
        console.log('Relationships loaded:', uniqueRelationships.length)
        
        setComponents(componentsData)
        setRelationships(uniqueRelationships)
        
      } catch (error) {
        console.error("Error fetching relationship data:", error)
        setComponents([])
        setRelationships([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Function to load full details for a specific component on-demand
  const loadComponentDetails = async (componentId: string) => {
    try {
      const res = await fetch(`/docs-data/${componentId}.json`)
      const data = await res.json()
      
      // Update the component in state with full details
      setComponents(prev => prev.map(comp => 
        comp.id === componentId 
          ? { ...comp, methods: data.methods || [], props: data.props || [] }
          : comp
      ))
      
      // Extract and add any new relationships from this component
      const newRelationships: Relationship[] = []
      
      if (data.relationships && Array.isArray(data.relationships)) {
        data.relationships.forEach((rel: any) => {
          if (rel.source && rel.target && rel.type) {
            newRelationships.push({
              source: rel.source,
              target: rel.target,
              type: rel.type,
              weight: rel.weight || 1,
              context: rel.context
            })
          } else if (rel.target && rel.type && !rel.source) {
            newRelationships.push({
              source: componentId,
              target: rel.target,
              type: rel.type,
              weight: rel.weight || 1,
              context: rel.context
            })
          }
        })
      }
      
      // Add new relationships that don't already exist
      setRelationships(prev => {
        const existing = new Set(prev.map(r => `${r.source}-${r.target}-${r.type}`))
        const filtered = newRelationships.filter(rel => 
          !existing.has(`${rel.source}-${rel.target}-${rel.type}`)
        )
        return [...prev, ...filtered]
      })
      
      return data
    } catch (error) {
      console.error(`Error loading details for ${componentId}:`, error)
      return null
    }
  }

  // Fetch code data for a specific node
  const fetchNodeCodeData = async (nodeId: string) => {
    try {
      const data = await loadComponentDetails(nodeId)
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
    
    // Load detailed data for this component if not already loaded
    if (nodeEntity && (!nodeEntity.methods || nodeEntity.methods.length === 0)) {
      loadComponentDetails(nodeId)
    }
    
    // Clear group selection when selecting a node
    setSelectedGroupId(null)
    setSelectedGroupData(null)
    // Reset focus mode when selecting a new node
    setFocusMode(false)
    // Reset panel position when selecting a new node (default to right side)
    setPanelPosition({ 
      x: typeof window !== 'undefined' ? window.innerWidth - 400 : 0, 
      y: 80 
    })
    // Reset minimize state
    setIsMinimized(false)
  }

  // Handle group click to select group and show side panel
  const handleGroupClick = (groupId: string, groupNodes: any[]) => {
    setSelectedGroupId(groupId)
    // Create group data object with summary information
    const groupData = {
      id: groupId,
      name: groupId,
      nodeCount: groupNodes.length,
      nodes: groupNodes,
      types: [...new Set(groupNodes.map(n => n.type))],
      // Calculate connections to nodes outside this group
      externalConnections: relationships.filter(rel => {
        const groupNodeIds = new Set(groupNodes.map(n => n.id))
        return (groupNodeIds.has(rel.source) && !groupNodeIds.has(rel.target)) ||
               (groupNodeIds.has(rel.target) && !groupNodeIds.has(rel.source))
      })
    }
    setSelectedGroupData(groupData)
    // Clear node selection when selecting a group
    setSelectedNodeId(null)
    setSelectedNodeData(null)
    // Reset focus mode when selecting a group
    setFocusMode(false)
    // Reset panel position when selecting a group
    setPanelPosition({ 
      x: typeof window !== 'undefined' ? window.innerWidth - 400 : 0, 
      y: 80 
    })
    // Reset minimize state
    setIsMinimized(false)
  }

  // Drag functionality for the panel
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y
      })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      // Allow panel to be dragged anywhere, with minimal constraints to keep it accessible
      const panel = panelRef.current
      if (panel) {
        const rect = panel.getBoundingClientRect()
        const minVisibleArea = 50 // Minimum pixels that must remain visible
        
        setPanelPosition({
          x: Math.max(-rect.width + minVisibleArea, Math.min(window.innerWidth - minVisibleArea, newX)),
          y: Math.max(-rect.height + minVisibleArea, Math.min(window.innerHeight - minVisibleArea, newY))
        })
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, dragStart, panelPosition])

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

    // Apply focus mode filtering if enabled and a node is selected
    let workingRelationships = filteredRelationships
    if (focusMode && selectedNodeId) {
      // Find all relationships connected to the selected node
      const relatedEntityIds = new Set<string>([selectedNodeId])
      
      // Get directly connected entities
      filteredRelationships.forEach(rel => {
        if (rel.source === selectedNodeId) {
          relatedEntityIds.add(rel.target)
        }
        if (rel.target === selectedNodeId) {
          relatedEntityIds.add(rel.source)
        }
      })

      // Filter relationships to only include those involving related entities
      workingRelationships = filteredRelationships.filter(rel =>
        relatedEntityIds.has(rel.source) && relatedEntityIds.has(rel.target)
      )
    }

    // Get all entities involved in relationships
    const involvedEntityIds = new Set<string>()
    workingRelationships.forEach(rel => {
      involvedEntityIds.add(rel.source)
      involvedEntityIds.add(rel.target)
    })

    // Create nodes - only include components that actually exist
    const nodes = components
      .filter(comp => involvedEntityIds.has(comp.id))
      .map(comp => {
        const connections = workingRelationships.filter(
          rel => rel.source === comp.id || rel.target === comp.id
        ).length

        return {
          id: comp.id,
          name: comp.name,
          type: comp.type as 'component' | 'class' | 'function' | 'method',
          x: Math.random() * 1200 + 300,
          y: Math.random() * 800 + 200,
          radius: Math.max(25, Math.min(45, 25 + connections * 2)),
          color: '',
          connections,
          filePath: comp.filePath
        }
      })

    // Create edges
    const edges = workingRelationships.map(rel => ({
      source: rel.source,
      target: rel.target,
      type: rel.type,
      color: '',
      width: 2,
      weight: rel.weight || 1,
      context: rel.context
    }))

    return { graphNodes: nodes, graphEdges: edges }
  }, [components, filteredRelationships, focusMode, selectedNodeId])

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg font-medium">Loading components...</p>
            <p className="text-sm text-slate-500 mt-2">Loading component index and building relationships</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <McpServerControl />
      <CodeSimilaritySearch />

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
        {components.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <Component className="h-16 w-16 mx-auto" />
            </div>
            <p className="text-muted-foreground text-lg font-medium">No components found</p>
            <p className="text-sm text-slate-500 mt-2">Generate documentation first to analyze your code relationships</p>
          </div>
        ) : filteredRelationships.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <Component className="h-16 w-16 mx-auto" />
            </div>
            <p className="text-muted-foreground text-lg font-medium">Components loaded</p>
            <p className="text-sm text-slate-500 mt-2">
              {components.length} components available. Relationships are loaded on-demand when you interact with components.
            </p>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 Click on components in the graph view or browse the list to explore relationships
              </p>
            </div>
          </div>
        ) : graphView === "graph" ? (
          <div className="h-[85vh] w-full min-h-[700px]">
            <InteractiveGraph
              nodes={graphNodes}
              edges={graphEdges}
              focusNodeId={entityId}
              selectedNodeId={selectedNodeId || undefined}
              onNodeClick={handleNodeClick}
              onGroupClick={handleGroupClick}
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
                  className="flex items-center gap-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getEntityIcon(sourceEntity.type)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-base">{sourceEntity.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate" title={sourceEntity.filePath}>
                        {sourceEntity.filePath?.split('/').slice(-2).join('/') || sourceEntity.filePath}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center mx-2 flex-shrink-0">
                    <Badge className={`${getRelationshipColor(rel.type)} text-xs`}>
                      {getRelationshipLabel(rel.type)}
                      {rel.weight && rel.weight > 1 && (
                        <span className="ml-1">×{rel.weight}</span>
                      )}
                    </Badge>
                    {rel.context && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-16 text-center truncate" title={rel.context}>
                        {rel.context}
                      </div>
                    )}
                    <ArrowRightIcon className="h-5 w-5 text-muted-foreground my-1" />
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getEntityIcon(targetEntity.type)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-base">{targetEntity.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate" title={targetEntity.filePath}>
                        {targetEntity.filePath?.split('/').slice(-2).join('/') || targetEntity.filePath}
                      </div>
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
      <Card 
        ref={panelRef}
        className={`fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border-2 border-blue-200 dark:border-blue-800 z-50 rounded-xl select-none transition-all duration-300 ${
          isMinimized 
            ? 'w-80 h-16' 
            : 'w-96 max-h-[calc(100vh-5.5rem)] overflow-y-auto'
        }`}
        style={{
          top: `${panelPosition.y}px`,
          left: `${panelPosition.x}px`,
          right: 'auto',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <CardHeader 
          className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 drag-handle cursor-grab hover:cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg pointer-events-none">
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
            <div className="flex items-center gap-1 pointer-events-auto">
              <div className="drag-handle cursor-grab hover:cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <Move className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedNodeId(null)
                  setSelectedNodeData(null)
                  setPanelPosition({ 
                    x: typeof window !== 'undefined' ? window.innerWidth - 400 : 0, 
                    y: 80 
                  })
                  setIsMinimized(false)
                }}
                className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isMinimized && (
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
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Connections {focusMode && <span className="text-amber-600 dark:text-amber-400">(Focus Mode)</span>}
            </h4>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {(() => {
                // Calculate connections based on current view (focus mode or normal)
                const relevantRelationships = focusMode && selectedNodeId 
                  ? filteredRelationships.filter(rel => {
                      const relatedEntityIds = new Set<string>([selectedNodeId])
                      filteredRelationships.forEach(r => {
                        if (r.source === selectedNodeId) relatedEntityIds.add(r.target)
                        if (r.target === selectedNodeId) relatedEntityIds.add(r.source)
                      })
                      return relatedEntityIds.has(rel.source) && relatedEntityIds.has(rel.target)
                    })
                  : filteredRelationships.filter(rel => rel.source === selectedNodeId || rel.target === selectedNodeId)
                
                return `${relevantRelationships.length} relationships`
              })()}
            </div>
          </div>

          {/* Relationship breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Relationship Types</h4>
            <div className="space-y-1">
              {['uses', 'inherits', 'contains'].map(relType => {
                // Calculate count based on current view (focus mode or normal)  
                const relevantRelationships = focusMode && selectedNodeId 
                  ? filteredRelationships.filter(rel => {
                      const relatedEntityIds = new Set<string>([selectedNodeId])
                      filteredRelationships.forEach(r => {
                        if (r.source === selectedNodeId) relatedEntityIds.add(r.target)
                        if (r.target === selectedNodeId) relatedEntityIds.add(r.source)
                      })
                      return relatedEntityIds.has(rel.source) && relatedEntityIds.has(rel.target) && rel.type === relType
                    })
                  : filteredRelationships.filter(rel => 
                      (rel.source === selectedNodeId || rel.target === selectedNodeId) && rel.type === relType
                    )
                
                const count = relevantRelationships.length
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

          {/* Focus Mode Switch */}
          <div className="mb-4 p-3 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <Label htmlFor="focus-mode" className="text-sm font-medium cursor-pointer">
                <div className="flex items-center gap-2">
                  <Focus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Focus Mode</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Show only related components
                </div>
              </Label>
              <Switch
                id="focus-mode"
                checked={focusMode}
                onCheckedChange={setFocusMode}
                className="data-[state=checked]:bg-amber-600"
              />
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
                <a href={`/components/${selectedNodeId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details Page
                </a>
              </Button>
            )}
          </div>
        </CardContent>
        )}
      </Card>
    )}

    {/* Group Details Side Panel */}
    {selectedGroupData && (
      <Card 
        ref={panelRef}
        className={`fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border-2 border-amber-200 dark:border-amber-800 z-50 rounded-xl select-none transition-all duration-300 ${
          isMinimized 
            ? 'w-80 h-16' 
            : 'w-96 max-h-[calc(100vh-5.5rem)] overflow-y-auto'
        }`}
        style={{
          top: `${panelPosition.y}px`,
          left: `${panelPosition.x}px`,
          right: 'auto',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <CardHeader 
          className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 drag-handle cursor-grab hover:cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg pointer-events-none">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                <FileCode className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{selectedGroupData.name}</span>
                <Badge 
                  variant="secondary" 
                  className="mt-1 w-fit bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300"
                >
                  {selectedGroupData.nodeCount} nodes
                </Badge>
              </div>
            </CardTitle>
            <div className="flex items-center gap-1 pointer-events-auto">
              <div className="drag-handle cursor-grab hover:cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <Move className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/20"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedGroupId(null)
                  setSelectedGroupData(null)
                  setPanelPosition({ 
                    x: typeof window !== 'undefined' ? window.innerWidth - 400 : 0, 
                    y: 80 
                  })
                  setIsMinimized(false)
                }}
                className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isMinimized && (
          <CardContent className="p-4">
          
          {/* Group Summary */}
          <div className="mb-4 p-3 bg-amber-100/80 dark:bg-amber-800/80 rounded-lg">
            <div className="text-sm text-amber-600 dark:text-amber-400 font-mono break-words">
              📁 Group: {selectedGroupData.name}
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {selectedGroupData.nodeCount} components • {selectedGroupData.externalConnections.length} external connections
            </div>
          </div>
          
          {/* Node Types Breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Node Types</h4>
            <div className="flex flex-wrap gap-1">
              {selectedGroupData.types.map((type: string) => {
                const count = selectedGroupData.nodes.filter((n: any) => n.type === type).length
                return (
                  <Badge key={type} className={`${getRelationshipColor('uses')} text-xs`}>
                    {type} ({count})
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* External Connections */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              External Connections ({selectedGroupData.externalConnections.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedGroupData.externalConnections.slice(0, 5).map((rel: any, index: number) => {
                const isOutgoing = selectedGroupData.nodes.some((n: any) => n.id === rel.source)
                const externalNode = isOutgoing ? rel.target : rel.source
                return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <Badge className={`${getRelationshipColor(rel.type)} text-xs`}>
                      {getRelationshipLabel(rel.type)}
                    </Badge>
                    <span className="text-slate-600 dark:text-slate-400 truncate ml-2 flex-1">
                      {isOutgoing ? '→' : '←'} {externalNode}
                    </span>
                  </div>
                )
              })}
              {selectedGroupData.externalConnections.length > 5 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  +{selectedGroupData.externalConnections.length - 5} more...
                </div>
              )}
            </div>
          </div>

          {/* Group Actions */}
          <div className="space-y-2">
            <Button 
              onClick={() => {
                // Set focus mode on this group
                setFocusMode(true)
                setSelectedNodeId(selectedGroupData.id)
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
            >
              <Focus className="h-4 w-4 mr-2" />
              Focus on Group
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                // Open first component in group
                const firstNode = selectedGroupData.nodes[0]
                if (firstNode) {
                  window.open(`/components/${firstNode.id}`, '_blank')
                }
              }}
              className="w-full border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Components
            </Button>
          </div>
        </CardContent>
        )}
      </Card>
    )}

    {/* Beautiful Code Preview Modal */}
    <Dialog open={selectedNodeForCode !== null} onOpenChange={(open) => !open && closeCodePreview()}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {nodeCodeData ? (
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
              ) : (
                <DialogTitle className="font-bold text-slate-900 dark:text-slate-100 truncate text-lg">
                  Loading...
                </DialogTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              {nodeCodeData?.filePath && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/components/${selectedNodeForCode}`} target="_blank" rel="noopener noreferrer">
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
                      <Card className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-900 dark:text-blue-100">
                            <Info className="h-4 w-4" />
                            Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="prose dark:prose-invert max-w-none text-sm">
                            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                              {nodeCodeData.description}
                            </ReactMarkdown>
                          </div>
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
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1 prose dark:prose-invert max-w-none">
                                    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                                      {prop.description}
                                    </ReactMarkdown>
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
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 prose dark:prose-invert max-w-none">
                                    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                                      {method.description}
                                    </ReactMarkdown>
                                  </div>
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

