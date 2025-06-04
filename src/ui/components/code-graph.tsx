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
              data.relationships.forEach((rel: Relationship) => {
                // Only add the relationship if the target exists in our components
                const targetComp = componentsData.find(c => c.id === rel.target || c.slug === rel.target || c.name.toLowerCase().replace(/\s+/g, "-") === rel.target)
                if (targetComp) {
                  relationshipsData.push({
                    source: comp.slug,
                    target: targetComp.id,
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
      <Card className="bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle>Code Visualization</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading code graph data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle>Code Visualization</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="component">Components</SelectItem>
                <SelectItem value="class">Classes</SelectItem>
                <SelectItem value="function">Functions</SelectItem>
                <SelectItem value="method">Methods</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="icon" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-slate-50 dark:bg-slate-950 overflow-auto" style={{ height: 600 }}>
          <svg
            ref={svgRef}
            width="800"
            height="600"
            viewBox="0 0 800 600"
            className="mx-auto"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
          >
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

              return (
                <g key={`edge-${index}`}>
                  <defs>
                    <marker
                      id={`arrowhead-${index}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="0"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill={getEdgeColor(rel.type)} />
                    </marker>
                  </defs>
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={arrowX}
                    y2={arrowY}
                    stroke={getEdgeColor(rel.type)}
                    strokeWidth="2"
                    markerEnd={`url(#arrowhead-${index})`}
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
            {filteredEntities.map((entity) => {
              const pos = positions.find((p) => p.id === entity.id)
              if (!pos) return null

              const nodeColor = getNodeColor(entity.type)

              return (
                <g
                  key={entity.id}
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
