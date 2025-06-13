"use client"
import * as React from "react"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Code, Component, ActivityIcon as Function, FileCode } from "lucide-react"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { InteractiveGraph } from "./interactive-graph"
import { McpServerControl } from "./mcp-server-control"
import { CodeSimilaritySearch } from "./code-similarity-search"
import {
  RelationshipStats,
  NodeDetailsPanel,
  GroupDetailsPanel,
  CodePreviewModal,
  type CodeEntity,
  type Relationship,
  type RelationshipStatsData
} from "./relationships"

// Types are now imported from ./relationships

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
  const [isMinimized, setIsMinimized] = useState(false)

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

  // Panel management functions
  const handleNodePanelClose = () => {
    setSelectedNodeId(null)
    setSelectedNodeData(null)
    setPanelPosition({ 
      x: typeof window !== 'undefined' ? window.innerWidth - 400 : 0, 
      y: 80 
    })
    setIsMinimized(false)
  }

  const handleGroupPanelClose = () => {
    setSelectedGroupId(null)
    setSelectedGroupData(null)
    setPanelPosition({ 
      x: typeof window !== 'undefined' ? window.innerWidth - 400 : 0, 
      y: 80 
    })
    setIsMinimized(false)
  }

  const handleFocusGroup = (groupId: string) => {
    setFocusMode(true)
    setSelectedNodeId(groupId)
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
        <RelationshipStats 
          stats={relationshipStats} 
          componentsCount={components.length} 
        />
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
      <NodeDetailsPanel
        selectedNodeData={selectedNodeData}
        selectedNodeId={selectedNodeId!}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        filteredRelationships={filteredRelationships}
        panelPosition={panelPosition}
        setPanelPosition={setPanelPosition}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
        onClose={handleNodePanelClose}
        onOpenCodeModal={openCodeModal}
        getEntityIcon={getEntityIcon}
        getRelationshipColor={getRelationshipColor}
        getRelationshipLabel={getRelationshipLabel}
      />
    )}

    {/* Group Details Side Panel */}
    {selectedGroupData && (
      <GroupDetailsPanel
        selectedGroupData={selectedGroupData}
        panelPosition={panelPosition}
        setPanelPosition={setPanelPosition}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
        onClose={handleGroupPanelClose}
        onFocusGroup={handleFocusGroup}
        getRelationshipColor={getRelationshipColor}
        getRelationshipLabel={getRelationshipLabel}
      />
    )}

    {/* Beautiful Code Preview Modal */}
    <CodePreviewModal
      isOpen={selectedNodeForCode !== null}
      onClose={closeCodePreview}
      selectedNodeForCode={selectedNodeForCode}
      nodeCodeData={nodeCodeData}
      getEntityIcon={getEntityIcon}
      getRelationshipColor={getRelationshipColor}
      getRelationshipLabel={getRelationshipLabel}
    />
    </div>
  )
}

