"use client"
import * as React from "react"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Code, Component, ActivityIcon as Function, FileCode } from "lucide-react"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { InteractiveGraph } from "./interactive-graph"
import {
  RelationshipStats,
  RelationshipStatsData,
  NodeDetailsPanel,
  GroupDetailsPanel,
  CodePreviewModal,
  type CodeEntity,
  type Relationship,
} from "./relationships"

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
        // Fetch all entities with proper types from search API
        const searchRes = await fetch('/api/search')
        if (!searchRes.ok) {
          throw new Error(`Failed to fetch entities: ${searchRes.statusText}`)
        }
        const searchData = await searchRes.json()

        // Create entities from search data which has proper type information
        const allEntities: CodeEntity[] = []
        
        searchData.items.forEach((entity: { name: string; slug: string; type: string; filePath?: string; parentName?: string }) => {
          // Add the main entity
          allEntities.push({ 
            id: entity.slug, 
            name: entity.name, 
            type: entity.type || "component", 
            filePath: entity.filePath || `src/${entity.type}s/${entity.name}`, 
            methods: [], 
            props: [] 
          })
        })
        
        const componentsData = allEntities

        // Load all component details to get complete relationships (skip methods since they don't have separate files)
        const detailedData = await Promise.all(
          componentsData.map(async (comp) => {
            // Skip method entities - they don't have separate JSON files
            if (comp.type === "method") {
              return null
            }
            
            try {
              const res = await fetch(`/docs-data/${comp.id}.json`)
              if (!res.ok) {
                console.warn(`Failed to load details for ${comp.id}: ${res.status} ${res.statusText}`)
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
        
        // First, add parent-child relationships for methods
        searchData.items.forEach((entity: { slug: string; methods?: any[] }) => {
          if (entity.methods && entity.methods.length > 0) {
            entity.methods.forEach((method: any) => {
              relationshipsData.push({
                source: entity.slug,
                target: `${entity.slug}_${method.name}`,
                type: "contains",
                weight: 1,
                context: "method"
              })
            })
          }
        })
        
        detailedData.forEach((data, index) => {
          if (!data) return
          const comp = componentsData[index]
          
          // Skip method entities for detailed data processing (they don't have their own files)
          if (comp.type === "method") return
          
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
        console.log('Total entities loaded:', componentsData.length)
        console.log('- Components:', componentsData.filter(c => c.type === 'component').length)
        console.log('- Functions:', componentsData.filter(c => c.type === 'function').length)
        console.log('- Classes:', componentsData.filter(c => c.type === 'class').length)
        console.log('- Methods:', componentsData.filter(c => c.type === 'method').length)
        console.log('Sample entities:', componentsData.slice(0, 5).map(c => ({ name: c.name, type: c.type })))
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
      if (!res.ok) {
        console.warn(`Failed to load details for ${componentId}: ${res.status} ${res.statusText}`)
        return null
      }
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

    } catch (error) {
      console.error(`Error loading details for ${componentId}:`, error)
    }
  }

  const fetchNodeCodeData = async (nodeId: string) => {
    try {
      const entity = components.find(c => c.id === nodeId)
      if (!entity) {
        setNodeCodeData(null)
        return
      }

      const res = await fetch(`/docs-data/${entity.id}.json`)
      if (!res.ok) {
        throw new Error(`Failed to fetch code for ${entity.name}`)
      }
      const data = await res.json()
      
      // Set the complete data object that the modal expects
      setNodeCodeData({
        ...data,
        name: data.name || entity.name,
        type: data.type || data.kind || entity.type,
        code: data.sourceCode || data.code,
        filePath: data.filePath || entity.filePath
      })
    } catch (error) {
      console.error("Error fetching node code:", error)
      setNodeCodeData(null)
    }
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    // Fetch basic node data for the side panel
    const nodeEntity = components.find(c => c.id === nodeId)
    setSelectedNodeData(nodeEntity)
    
    // Check if component details (methods, props) are already loaded
    if (nodeEntity && nodeEntity.type !== 'method' && (!nodeEntity.methods || nodeEntity.methods.length === 0)) {
      loadComponentDetails(nodeId)
    }
    
    // For methods, we don't need to load more data as they are part of the parent
    if (nodeEntity?.type === 'method') {
      const parentId = nodeId.substring(0, nodeId.lastIndexOf('_'))
      loadComponentDetails(parentId)
    }

    setIsMinimized(false)
    setSelectedGroupId(null)
  }

  const handleGroupClick = (groupId: string, groupNodes: any[]) => {
    setSelectedGroupId(groupId)
    setSelectedGroupData({
      id: groupId,
      nodes: groupNodes,
      types: [...new Set(groupNodes.map(n => n.type))],
      // Calculate connections to nodes outside this group
      externalConnections: relationships.filter(rel => {
        const groupNodeIds = new Set(groupNodes.map(n => n.id))
        return (groupNodeIds.has(rel.source) && !groupNodeIds.has(rel.target)) ||
               (groupNodeIds.has(rel.target) && !groupNodeIds.has(rel.source))
      }).length
    })
    setIsMinimized(false)
    setSelectedNodeId(null)
  }

  const handleNodePanelClose = () => {
    setSelectedNodeId(null)
    setSelectedNodeData(null)
  }

  const handleGroupPanelClose = () => {
    setSelectedGroupId(null)
    setSelectedGroupData(null)
  }

  const handleFocusGroup = (groupId: string) => {
    setFocusMode(true)
    setSelectedNodeId(groupId) // Use selectedNodeId to trigger focus in the graph
  }

  const openCodeModal = (nodeId: string) => {
    setSelectedNodeForCode(nodeId)
    fetchNodeCodeData(nodeId)
  }

  const closeCodePreview = () => {
    setSelectedNodeForCode(null)
    setNodeCodeData(null)
  }
  
    // Filter relationships based on entityId, focus mode, and selected node
    const filteredRelationships = useMemo(() => {
      let baseRelationships = relationships

      // First apply entityId filtering if provided
      if (entityId && relationships.length > 0) {
        baseRelationships = relationships.filter((rel) => {
          if (view === "dependencies") return rel.source === entityId
          if (view === "dependents") return rel.target === entityId
          return rel.source === entityId || rel.target === entityId
        })
      }

      // Then apply focus mode filtering if enabled and a node is selected
      if (focusMode && selectedNodeId && baseRelationships.length > 0) {
        return baseRelationships.filter((rel) => {
          return rel.source === selectedNodeId || rel.target === selectedNodeId
        })
      }

      return baseRelationships
    }, [entityId, view, relationships, focusMode, selectedNodeId])


    // Get the current entity if entityId is provided
    const currentEntity = useMemo(() => {
      if (!entityId || components.length === 0) return undefined
      return components.find((e) => e.id === entityId)
    }, [entityId, components])

    // Prepare graph data
    const { graphNodes, graphEdges } = useMemo(() => {
      if (components.length === 0) {
        return { graphNodes: [], graphEdges: [] }
      }

      const workingRelationships = filteredRelationships
      const involvedEntityIds = new Set(
        workingRelationships.flatMap(rel => [rel.source, rel.target])
      )

      // Create nodes - include ALL components when showing all relationships, 
      // or only connected ones when filtering
      let nodesToShow = components
      if (entityId || (focusMode && selectedNodeId)) {
        // When filtering by entity or in focus mode, show connected nodes AND the target entity itself
        const connectedNodes = components.filter(comp => involvedEntityIds.has(comp.id))
        
        // Always include the target entity/selected node even if it has no relationships
        const targetNodeIds = new Set()
        if (entityId) targetNodeIds.add(entityId)
        if (focusMode && selectedNodeId) targetNodeIds.add(selectedNodeId)
        
        const targetNodes = components.filter(comp => targetNodeIds.has(comp.id))
        
        nodesToShow = [...connectedNodes, ...targetNodes].filter((node, index, self) => 
          index === self.findIndex(n => n.id === node.id)
        )
      }
      // Otherwise show all components to ensure functions and other entities are visible
      
      const nodes = nodesToShow.map(comp => {
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
    }, [components, filteredRelationships, focusMode, selectedNodeId, entityId])

    const getEntityIcon = (type: CodeEntity["type"]) => {
      switch (type) {
        case "component": return <Component className="h-4 w-4" />
        case "function": return <Function className="h-4 w-4" />
        case "class": return <Code className="h-4 w-4" />
        case "method": return <Function className="h-4 w-4 text-purple-500" />
        default: return <FileCode className="h-4 w-4" />
      }
    }

    const getRelationshipLabel = (type: Relationship["type"]) => {
      switch (type) {
        case "uses": return "Uses"
        case "inherits": return "Inherits"
        case "contains": return "Contains"
        default: return "Unknown"
      }
    }

    const getRelationshipColor = (type: Relationship["type"]) => {
      switch (type) {
        case "uses": return "stroke-blue-500"
        case "inherits": return "stroke-green-500"
        case "contains": return "stroke-gray-400"
        default: return "stroke-gray-300"
      }
    }
    
    // Calculate statistics based on filtered relationships
    const relationshipStats: RelationshipStatsData = useMemo(() => {
      const stats: RelationshipStatsData = {
        total: filteredRelationships.length,
        byType: {} as Record<Relationship['type'], number>,
        mostConnected: { name: '', connections: 0 }
      };

      const connectionCounts: Record<string, number> = {};
      filteredRelationships.forEach((rel: Relationship) => {
        stats.byType[rel.type] = (stats.byType[rel.type] || 0) + 1;
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

    if (loading && !entityId) {
      return (
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle>Loading Relationships...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-12">
              <div className="loader ease-linear rounded-full border-4 border-t-4 border-slate-200 h-12 w-12 mb-4"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (currentEntity) {
      return (
        <div className="space-y-6 pb-16">
          <div className="flex items-center space-x-4 mb-4">
            <h1 className="text-2xl font-bold">{currentEntity.name} Relationships</h1>
            <Tabs value={view} onValueChange={(v) => setView(v as "dependencies" | "dependents" | "all")}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                <TabsTrigger value="dependents">Dependents</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {filteredRelationships.length > 0 ? (
            <p className="text-muted-foreground mb-4">
              Showing {filteredRelationships.length} relationships for {currentEntity.name}.
            </p>
          ) : (
            <p className="text-muted-foreground mb-4">
              No relationships found for {currentEntity.name}.
            </p>
          )}

          {/* Show the same graph interface as the main page, but filtered for this entity */}
          {/* Statistics Panel */}
          {filteredRelationships.length > 0 && (
            <RelationshipStats 
              stats={relationshipStats} 
              componentsCount={components.length} 
            />
          )}

          <Card className="bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Relationship Explorer</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualize and analyze connections for {currentEntity.name}.
                </p>
              </div>
              <Tabs value={graphView} onValueChange={(v) => setGraphView(v as "list" | "graph")}>
                <TabsList>
                  <TabsTrigger value="graph">Graph View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            
            {graphView === 'list' ? (
              <CardContent className="p-6">
                {filteredRelationships.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">No relationships found</p>
                    <p className="text-sm text-slate-500 mt-2">
                      {currentEntity.name} has no documented relationships.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredRelationships.map((rel, index) => {
                      const sourceEntity = components.find((e) => e.id === rel.source)
                      const targetEntity = components.find((e) => e.id === rel.target)

                      if (!sourceEntity || !targetEntity) return null

                      return (
                        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex-shrink-0">
                            {getEntityIcon(sourceEntity.type)}
                          </div>
                          <div className="flex-1 font-medium">{sourceEntity.name}</div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <ArrowRightIcon />
                            <Badge variant="secondary">{getRelationshipLabel(rel.type)}</Badge>
                            <ArrowRightIcon />
                          </div>
                          <div className="flex-shrink-0">
                            {getEntityIcon(targetEntity.type)}
                          </div>
                          <div className="flex-1 font-medium">{targetEntity.name}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            ) : (
              <CardContent className="p-0">
                <div className="relative h-[800px] bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <InteractiveGraph 
                    nodes={graphNodes} 
                    edges={graphEdges} 
                    onNodeClick={handleNodeClick}
                    onGroupClick={handleGroupClick}
                    selectedNodeId={selectedNodeId} 
                    setSelectedNodeId={setSelectedNodeId}
                    focusMode={focusMode}
                    setFocusMode={setFocusMode}
                    enableAnimations={true}
                    showMinimap={true}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {selectedNodeId && selectedNodeData && !isMinimized && (
            <NodeDetailsPanel
              selectedNodeData={selectedNodeData}
              selectedNodeId={selectedNodeId}
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

          {selectedGroupId && selectedGroupData && !isMinimized && (
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
        </div>
      )
    }

    return (
      <div className="space-y-6 pb-16">
        {/* Statistics Panel */}
        {filteredRelationships.length > 0 && (
          <RelationshipStats 
            stats={relationshipStats} 
            componentsCount={components.length} 
          />
        )}

        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Relationship Explorer</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize and analyze connections between your components.
              </p>
            </div>
            <Tabs value={graphView} onValueChange={(v) => setGraphView(v as "list" | "graph")}>
              <TabsList>
                <TabsTrigger value="graph">Graph View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
        {graphView === 'list' ? (
          <CardContent className="p-6">
            {filteredRelationships.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-muted-foreground text-lg font-medium">No relationships found</p>
                <p className="text-sm text-slate-500 mt-2">
                  {components.length} components loaded. Switch to graph view to see all entities.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredRelationships.map((rel, index) => {
                  const sourceEntity = components.find((e) => e.id === rel.source)
                  const targetEntity = components.find((e) => e.id === rel.target)

                  if (!sourceEntity || !targetEntity) return null

                  return (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex-shrink-0">
                        {getEntityIcon(sourceEntity.type)}
                      </div>
                      <div className="flex-1 font-medium">{sourceEntity.name}</div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <ArrowRightIcon />
                        <Badge variant="secondary">{getRelationshipLabel(rel.type)}</Badge>
                        <ArrowRightIcon />
                      </div>
                      <div className="flex-shrink-0">
                        {getEntityIcon(targetEntity.type)}
                      </div>
                      <div className="flex-1 font-medium">{targetEntity.name}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="relative h-[800px] bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <InteractiveGraph 
                nodes={graphNodes} 
                edges={graphEdges} 
                onNodeClick={handleNodeClick}
                onGroupClick={handleGroupClick}
                selectedNodeId={selectedNodeId} 
                setSelectedNodeId={setSelectedNodeId}
                focusMode={focusMode}
                setFocusMode={setFocusMode}
                enableAnimations={true}
                showMinimap={true}
              />
            </div>
          </CardContent>
        )}
        </Card>

        {selectedNodeId && selectedNodeData && !isMinimized && (
          <NodeDetailsPanel
            selectedNodeData={selectedNodeData}
            selectedNodeId={selectedNodeId}
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

        {selectedGroupId && selectedGroupData && !isMinimized && (
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

        {/* Code Preview Modal */}
        <CodePreviewModal
          isOpen={!!selectedNodeForCode}
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

