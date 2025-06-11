"use client"
import * as React from "react"

import { useRef, useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "./ui/button"
import { CodeEntityDetails } from "./code-entity-details"
import { MinusIcon, PlusIcon } from "lucide-react"

// Define types locally
export interface CodeEntity {
  id: string;
  name: string;
  type: "component" | "class" | "function" | "method" | string;
  filePath?: string;
  code?: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: "imports" | "extends" | "implements" | "calls" | "renders" | "uses";
}

// Define types for our node positions
type NodePosition = {
  id: string
  x: number
  y: number
}

interface CodeGraphProps {
  entityId?: string
}

export function CodeGraph({ entityId }: CodeGraphProps) {
  const [filter, setFilter] = useState<"all" | "component" | "class" | "function" | "method">("all")
  const [selectedEntity, setSelectedEntity] = useState<CodeEntity | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)

  const [components, setComponents] = useState<CodeEntity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)

  // Create sample data
  const sampleComponents = [
    { id: 'button', name: 'Button', type: 'component', filePath: 'components/ui/button.tsx' },
    { id: 'card', name: 'Card', type: 'component', filePath: 'components/ui/card.tsx' },
    { id: 'dialog', name: 'Dialog', type: 'component', filePath: 'components/ui/dialog.tsx' },
    { id: 'utils', name: 'utils', type: 'function', filePath: 'lib/utils.ts' },
    { id: 'theme', name: 'ThemeProvider', type: 'class', filePath: 'components/theme-provider.tsx' }
  ]
  
  const sampleRelationships = [
    { source: 'card', target: 'button', type: 'imports' as const },
    { source: 'dialog', target: 'button', type: 'imports' as const },
    { source: 'card', target: 'utils', type: 'calls' as const },
    { source: 'dialog', target: 'utils', type: 'calls' as const },
    { source: 'button', target: 'utils', type: 'calls' as const },
    { source: 'theme', target: 'utils', type: 'extends' as const }
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
              filePath: data.filePath || `src/components/${comp.name}`,
              code: data.sourceCode || data.code || ""
            }
          })
        )

        // Build a map of all entities first to avoid duplicates
        const entityMap = new Map<string, CodeEntity>();
        const declarationMap = new Map<string, { file: string; line: number }>();
        
        // First pass: collect all unique entities from declarations
        componentsData.forEach(comp => {
          if (!entityMap.has(comp.id)) {
            entityMap.set(comp.id, comp);
          }
        });

        // Extract relationships from component data
        const relationshipsData: Relationship[] = []
        const entityUsages: Array<{ entityId: string; usedBy: string; usageType: string }> = [];

        // For each component, check dependencies and references
        await Promise.all(
          indexData.map(async (comp: { name: string; slug: string }) => {
            const res = await fetch(`/docs-data/${comp.slug}.json`)
            const data = await res.json()

            // Store declaration info
            if (data.declaration) {
              declarationMap.set(comp.slug, {
                file: data.declaration.declarationFile,
                line: data.declaration.declarationLine
              });
            }

            // Track usages instead of creating duplicate nodes
            if (data.usages && Array.isArray(data.usages)) {
              data.usages.forEach((usage: any) => {
                // Only add if the target entity exists
                if (entityMap.has(usage.entitySlug) || componentsData.find(c => c.id === usage.entitySlug)) {
                  entityUsages.push({
                    entityId: usage.entitySlug,
                    usedBy: comp.slug,
                    usageType: usage.usageType
                  });
                  
                  // Create relationship
                  relationshipsData.push({
                    source: comp.slug,
                    target: usage.entitySlug,
                    type: usage.usageType as Relationship["type"]
                  });
                }
              });
            }

            // Fallback to old format for backward compatibility
            if (!data.usages && data.imports && Array.isArray(data.imports)) {
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
              data.methods.forEach((method: { name: string; calls?: string[] }) => {
                if (method.calls && Array.isArray(method.calls)) {
                  method.calls.forEach((call: string) => {
                    const [targetComp] = call.split('.')
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

            // Check for explicit relationships array
            if (data.relationships && Array.isArray(data.relationships)) {
              data.relationships.forEach((rel: any) => {
                // Handle both formats: with and without source
                if (rel.source && rel.target && rel.type) {
                  // Standard format with source
                  const targetComp = componentsData.find(c => c.id === rel.target || c.slug === rel.target || c.name.toLowerCase().replace(/\s+/g, "-") === rel.target)
                  if (targetComp) {
                    relationshipsData.push({
                      source: rel.source,
                      target: targetComp.id,
                      type: rel.type
                    })
                  }
                } else if (rel.target && rel.type && !rel.source) {
                  // Calls format without source - use current component as source
                  // For calls, we typically want to find the target in our components or create a generic target
                  let targetId = rel.target
                  const targetComp = componentsData.find(c => c.id === rel.target || c.slug === rel.target || c.name.toLowerCase().replace(/\s+/g, "-") === rel.target)
                  if (targetComp) {
                    targetId = targetComp.id
                  }
                  
                  relationshipsData.push({
                    source: comp.slug,
                    target: targetId,
                    type: rel.type
                  })
                }
              })
            }
            
            // Check for similarity warnings (these can indicate relationships)
            if (data.similarityWarnings && Array.isArray(data.similarityWarnings)) {
              data.similarityWarnings.forEach((warning: { similarTo: string; score: number; reason: string }) => {
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

        // Remove duplicate components by id
        const uniqueComponents = componentsData.filter((comp, index, self) =>
          index === self.findIndex(c => c.id === comp.id)
        )

        // Convert entity map to array for rendering
        const finalComponents = Array.from(entityMap.values());
        
        // If we got real data, use it; otherwise use sample data
        if (finalComponents.length > 0) {
          setComponents(finalComponents)
          setRelationships(uniqueRelationships)
        } else {
          // Use sample data
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

  // Use useMemo to prevent recalculation on every render
  const filteredEntities = useMemo(() => {
    return filter === "all" ? components : components.filter((entity) => entity.type === filter)
  }, [filter, components])

  // Filter relationships based on the filtered entities
  const filteredRelationships = useMemo(() => {
    const filteredEntityIds = new Set(filteredEntities.map((e) => e.id))
    return relationships.filter((rel) => filteredEntityIds.has(rel.source) && filteredEntityIds.has(rel.target))
  }, [filteredEntities, relationships])

  // Calculate node positions in a circle layout
  const positions = useMemo(() => {
    const radius = 200
    const centerX = 400
    const centerY = 300

    return filteredEntities.map((entity, index) => {
      const angle = (index / filteredEntities.length) * 2 * Math.PI
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      return {
        id: entity.id,
        x,
        y,
      }
    })
  }, [filteredEntities])

  const handleNodeClick = (entity: CodeEntity) => {
    setSelectedEntity(entity)
    setDetailsOpen(true)
  }

  const getNodeColor = (type: CodeEntity["type"]) => {
    switch (type) {
      case "component":
        return "#8b5cf6" // violet-500
      case "class":
        return "#3b82f6" // blue-500
      case "function":
        return "#10b981" // emerald-500
      case "method":
        return "#f59e0b" // amber-500
      default:
        return "#8b5cf6" // violet-500 as default
    }
  }

  const getEdgeColor = (type: Relationship["type"]) => {
    switch (type) {
      case "imports":
        return "#3b82f6" // blue-500
      case "extends":
        return "#8b5cf6" // violet-500
      case "implements":
        return "#6366f1" // indigo-500
      case "calls":
        return "#f59e0b" // amber-500
      case "renders":
        return "#10b981" // emerald-500
      case "uses":
        return "#8b5cf6" // violet-500
    }
  }

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2))
  }

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
  }


  if (loading) {
    return (
      <Card className="bg-white dark:bg-slate-900 shadow-lg border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">Code Visualization</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg text-slate-600 dark:text-slate-400">Loading code graph data...</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Analyzing relationships and dependencies</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-slate-900 shadow-xl border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 via-indigo-50 to-cyan-50 dark:from-violet-900/20 dark:via-indigo-900/20 dark:to-cyan-900/20 p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                </svg>
              </div>
              Code Visualization
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400">Interactive network diagram of your codebase</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Type Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter:</label>
              <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                <SelectTrigger className="w-[160px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"></div>
                      All Types
                    </span>
                  </SelectItem>
                  <SelectItem value="component" className="hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                      Components
                    </span>
                  </SelectItem>
                  <SelectItem value="class" className="hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Classes
                    </span>
                  </SelectItem>
                  <SelectItem value="function" className="hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      Functions
                    </span>
                  </SelectItem>
                  <SelectItem value="method" className="hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      Methods
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={zoomOut}
                className="h-8 w-8 p-0 hover:bg-violet-100 dark:hover:bg-violet-900/30"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-mono px-2 min-w-[3rem] text-center text-slate-600 dark:text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={zoomIn}
                className="h-8 w-8 p-0 hover:bg-violet-100 dark:hover:bg-violet-900/30"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 overflow-hidden" style={{ height: 650 }}>
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-40">
            <svg width="100%" height="100%" className="text-slate-200 dark:text-slate-700">
              <defs>
                <pattern id="circuit-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <circle cx="30" cy="30" r="2" fill="currentColor" opacity="0.3"/>
                  <path d="M30,10 L30,50 M10,30 L50,30" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#circuit-pattern)" />
            </svg>
          </div>
          
          <svg
            ref={svgRef}
            width="800"
            height="650"
            viewBox="0 0 800 650"
            className="mx-auto relative z-10 drop-shadow-sm"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.3s ease-out" }}
          >
            {/* Define arrow markers once */}
            <defs>
              {filteredRelationships.map((rel, index) => (
                <marker
                  key={`marker-${rel.source}-${rel.target}-${rel.type}-${index}`}
                  id={`arrowhead-${rel.source}-${rel.target}-${rel.type}-${index}`}
                  markerWidth="10"
                  markerHeight="7"
                  refX="0"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill={getEdgeColor(rel.type)} />
                </marker>
              ))}
            </defs>

            {/* Draw edges */}
            {filteredRelationships.map((rel, index) => {
              const sourcePos = positions.find((p) => p.id === rel.source)
              const targetPos = positions.find((p) => p.id === rel.target)

              if (!sourcePos || !targetPos) return null

              // Calculate the angle for the arrow
              const dx = targetPos.x - sourcePos.x
              const dy = targetPos.y - sourcePos.y
              const angle = Math.atan2(dy, dx)

              // Calculate the position for the arrow (slightly before the target)
              const nodeRadius = 30
              const arrowX = targetPos.x - nodeRadius * Math.cos(angle)
              const arrowY = targetPos.y - nodeRadius * Math.sin(angle)

              // Calculate the label position (midpoint of the edge)
              const labelX = (sourcePos.x + targetPos.x) / 2
              const labelY = (sourcePos.y + targetPos.y) / 2 - 10

              const markerId = `arrowhead-${rel.source}-${rel.target}-${rel.type}-${index}`

              return (
                <g key={`edge-${rel.source}-${rel.target}-${rel.type}-${index}`}>
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={arrowX}
                    y2={arrowY}
                    stroke={getEdgeColor(rel.type)}
                    strokeWidth="2"
                    markerEnd={`url(#${markerId})`}
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    fill={getEdgeColor(rel.type)}
                    fontSize="12"
                    fontWeight="500"
                    className="select-none"
                  >
                    {rel.type}
                  </text>
                </g>
              )
            })}

            {/* Draw nodes */}
            {filteredEntities.map((entity, index) => {
              const pos = positions.find((p) => p.id === entity.id)
              if (!pos) return null

              const nodeColor = getNodeColor(entity.type)

              return (
                <g
                  key={`node-${entity.id}-${entity.name}-${index}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => handleNodeClick(entity)}
                  style={{ cursor: "pointer" }}
                >
                  <circle r="30" fill="white" stroke={nodeColor} strokeWidth="3" className="dark:fill-slate-800" />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={nodeColor}
                    fontSize="12"
                    fontWeight="bold"
                    className="select-none"
                  >
                    {entity.name.substring(0, 2)}
                  </text>
                  <text y="50" textAnchor="middle" fill="currentColor" fontSize="12" className="select-none">
                    {entity.name}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500"></div>
              <span className="text-sm">Component</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">Class</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm">Function</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm">Method</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
              imports
            </Badge>
            <Badge className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
              extends
            </Badge>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800">
              implements
            </Badge>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
              calls
            </Badge>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
              renders
            </Badge>
            <Badge className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
              uses
            </Badge>
          </div>
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Legend:</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">3</div>
                <span>Red numbers show connection count (how many relationships this component has)</span>
              </div>
              <div>• Click nodes to see details • Hover for information • Use zoom controls to navigate</div>
              {components.length > 0 && components[0]?.id === 'button' && (
                <div className="text-orange-600 dark:text-orange-400 font-medium mt-2">⚠️ Showing sample data - generate docs to see real relationships</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      {selectedEntity && (
        <CodeEntityDetails
          entity={selectedEntity}
          isOpen={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      )}
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
