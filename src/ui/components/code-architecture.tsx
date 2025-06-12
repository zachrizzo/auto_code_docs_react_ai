"use client"
import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { 
  Network, Users, Zap, Target, Layers, Search, Filter, 
  GitBranch, Package, AlertCircle, Code, Activity, FileCode, 
  Hash, Info, ArrowRight, Circle, Square, Triangle, 
  Workflow, TreePine, Map, Brain, Eye, Settings, Database,
  Server, Globe, Smartphone, Cpu, HardDrive
} from "lucide-react"
import { Badge } from "./ui/badge"
import Link from "next/link"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Progress } from "./ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Separator } from "./ui/separator"

interface ComponentData {
  name: string
  slug: string
  filePath: string
  kind?: string
  methods?: any[]
  relationships?: any[]
  imports?: string[]
  references?: string[]
  similarityWarnings?: any[]
  description?: string
}

interface ArchitecturalLayer {
  name: string
  components: ComponentData[]
  description: string
  icon: any
  color: string
}

interface DependencyNode {
  id: string
  name: string
  type: string
  layer: string
  connections: number
  size: number
}

interface CodePattern {
  type: string
  component: string
  description: string
  severity: 'info' | 'warning' | 'error'
  impact: number
}

export function CodeArchitecture() {
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'architecture' | 'dependencies' | 'layers' | 'patterns' | 'flows'>('architecture')
  const [filterType, setFilterType] = useState<'all' | 'components' | 'functions' | 'classes' | 'high-coupling' | 'isolated'>('all')
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null)
  
  const [architecturalLayers, setArchitecturalLayers] = useState<ArchitecturalLayer[]>([])
  const [dependencyNodes, setDependencyNodes] = useState<DependencyNode[]>([])
  const [codePatterns, setCodePatterns] = useState<CodePattern[]>([])
  const [dataFlows, setDataFlows] = useState<any[]>([])
  const [componentDetails, setComponentDetails] = useState<Record<string, ComponentData[]>>({})

  // Fetch and analyze code architecture
  useEffect(() => {
    async function analyzeArchitecture() {
      try {
        // Fetch component index
        const res = await fetch('/docs-data/component-index.json')
        const data = await res.json()

        const detailsMap: Record<string, ComponentData[]> = {}
        const allComponents: ComponentData[] = []

        // Fetch all component details
        await Promise.all(data.map(async (comp: { name: string; slug: string; filePath: string }) => {
          if (!comp.filePath) return

          try {
            const detailRes = await fetch(`/docs-data/${comp.slug}.json`)
            const detailData = await detailRes.json()

            const componentData: ComponentData = {
              name: comp.name,
              slug: comp.slug,
              filePath: comp.filePath,
              kind: detailData.kind,
              methods: detailData.methods || [],
              relationships: detailData.relationships || [],
              imports: detailData.imports || [],
              references: detailData.references || [],
              similarityWarnings: detailData.similarityWarnings || [],
              description: detailData.description
            }

            const path = comp.filePath
            if (!detailsMap[path]) {
              detailsMap[path] = []
            }
            detailsMap[path].push(componentData)
            allComponents.push(componentData)
          } catch (error) {
            console.error(`Error loading details for ${comp.slug}:`, error)
          }
        }))

        setComponentDetails(detailsMap)

        // Analyze architectural layers
        const layers: ArchitecturalLayer[] = [
          {
            name: "Presentation Layer",
            components: [],
            description: "Pages, routes, and top-level UI components",
            icon: Smartphone,
            color: "blue"
          },
          {
            name: "UI Components",
            components: [],
            description: "Reusable UI components and design system",
            icon: Package,
            color: "purple"
          },
          {
            name: "Business Logic",
            components: [],
            description: "Domain-specific components and business rules",
            icon: Brain,
            color: "green"
          },
          {
            name: "Service Layer",
            components: [],
            description: "API calls, external integrations, and services",
            icon: Server,
            color: "orange"
          },
          {
            name: "Utility Layer",
            components: [],
            description: "Helper functions, utilities, and shared logic",
            icon: Settings,
            color: "gray"
          },
          {
            name: "Data Layer",
            components: [],
            description: "Types, interfaces, and data structures",
            icon: Database,
            color: "indigo"
          }
        ]

        // Categorize components into layers
        allComponents.forEach(comp => {
          const path = comp.filePath.toLowerCase()
          
          if (path.includes('/pages/') || path.includes('/app/') || path.includes('/routes/')) {
            layers[0].components.push(comp)
          } else if (path.includes('/components/ui/') || path.includes('/ui/')) {
            layers[1].components.push(comp)
          } else if (path.includes('/components/') && !path.includes('/ui/')) {
            layers[2].components.push(comp)
          } else if (path.includes('/services/') || path.includes('/api/') || path.includes('/hooks/')) {
            layers[3].components.push(comp)
          } else if (path.includes('/lib/') || path.includes('/utils/') || path.includes('/helpers/')) {
            layers[4].components.push(comp)
          } else if (path.includes('/types/') || path.includes('/interfaces/') || path.includes('/models/')) {
            layers[5].components.push(comp)
          } else {
            // Default to business logic
            layers[2].components.push(comp)
          }
        })

        setArchitecturalLayers(layers)

        // Build dependency graph with unique IDs
        const nodes: DependencyNode[] = allComponents.map((comp, index) => ({
          id: `${comp.slug}-${index}`, // Make ID unique by adding index
          name: comp.name,
          type: comp.kind || 'unknown',
          layer: layers.find(l => l.components.includes(comp))?.name || 'Unknown',
          connections: (comp.relationships?.length || 0) + (comp.imports?.length || 0),
          size: (comp.methods?.length || 0) + (comp.relationships?.length || 0)
        }))

        setDependencyNodes(nodes)

        // Identify patterns and anti-patterns
        const patterns: CodePattern[] = []

        allComponents.forEach(comp => {
          // Complex components
          if (comp.methods && comp.methods.length > 10) {
            patterns.push({
              type: 'God Component',
              component: comp.name,
              description: `Has ${comp.methods.length} methods - consider breaking into smaller components`,
              severity: 'warning',
              impact: comp.methods.length
            })
          }

          // High coupling
          const totalDeps = (comp.relationships?.length || 0) + (comp.imports?.length || 0)
          if (totalDeps > 15) {
            patterns.push({
              type: 'High Coupling',
              component: comp.name,
              description: `Has ${totalDeps} dependencies - violates loose coupling principle`,
              severity: 'error',
              impact: totalDeps
            })
          }

          // Isolated components (potential dead code)
          if (totalDeps === 0 && !(comp.filePath.includes('/pages/') || comp.filePath.includes('/app/'))) {
            patterns.push({
              type: 'Isolated Component',
              component: comp.name,
              description: 'No dependencies or dependents - might be dead code',
              severity: 'info',
              impact: 1
            })
          }

          // Code duplication
          if (comp.similarityWarnings && comp.similarityWarnings.length > 0) {
            patterns.push({
              type: 'Code Duplication',
              component: comp.name,
              description: `Similar to ${comp.similarityWarnings.length} other components`,
              severity: 'warning',
              impact: comp.similarityWarnings.length
            })
          }

          // Single Responsibility violations
          if (comp.kind === 'component' && comp.methods && comp.methods.length > 5) {
            const businessLogicMethods = comp.methods.filter((m: any) => 
              !m.name.startsWith('render') && 
              !m.name.startsWith('on') && 
              !m.name.startsWith('handle')
            ).length
            
            if (businessLogicMethods > 3) {
              patterns.push({
                type: 'Mixed Concerns',
                component: comp.name,
                description: `Contains both UI and business logic - consider separating concerns`,
                severity: 'warning',
                impact: businessLogicMethods
              })
            }
          }
        })

        setCodePatterns(patterns.sort((a, b) => b.impact - a.impact))

        // Analyze data flows
        const flows: any[] = []
        allComponents.forEach(comp => {
          comp.relationships?.forEach(rel => {
            if (rel.type === 'uses' || rel.type === 'calls') {
              flows.push({
                from: comp.name,
                to: rel.target,
                type: rel.type,
                context: rel.context,
                weight: rel.weight || 1
              })
            }
          })
        })

        setDataFlows(flows)
        setLoading(false)

      } catch (error) {
        console.error('Error analyzing architecture:', error)
        setLoading(false)
      }
    }

    analyzeArchitecture()
  }, [])

  // Architecture overview with layer visualization
  function renderArchitectureView() {
    const totalComponents = architecturalLayers.reduce((acc, layer) => acc + layer.components.length, 0)
    
    return (
      <div className="space-y-6">
        {/* Architecture Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Architecture Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your application's architectural layers and component distribution
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {architecturalLayers.map((layer, index) => {
                const percentage = totalComponents > 0 ? (layer.components.length / totalComponents) * 100 : 0
                const Icon = layer.icon
                
                return (
                  <Card key={layer.name} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setViewMode('layers')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg bg-${layer.color}-100 dark:bg-${layer.color}-900/20`}>
                          <Icon className={`h-5 w-5 text-${layer.color}-600 dark:text-${layer.color}-400`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{layer.name}</h3>
                          <p className="text-sm text-muted-foreground">{layer.components.length} components</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{layer.description}</p>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% of codebase</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalComponents}</div>
              <div className="text-sm text-muted-foreground">Total Components</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{architecturalLayers.length}</div>
              <div className="text-sm text-muted-foreground">Architectural Layers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{dependencyNodes.reduce((acc, node) => acc + node.connections, 0)}</div>
              <div className="text-sm text-muted-foreground">Total Dependencies</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{codePatterns.filter(p => p.severity === 'error' || p.severity === 'warning').length}</div>
              <div className="text-sm text-muted-foreground">Architecture Issues</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Dependency network visualization
  function renderDependencyView() {
    const highCouplingComponents = dependencyNodes.filter(node => node.connections > 10)
    const isolatedComponents = dependencyNodes.filter(node => node.connections === 0)
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Dependency Network
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Component relationships and coupling analysis
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* High Coupling */}
              <div>
                <h3 className="font-medium mb-3 text-red-600">High Coupling ({highCouplingComponents.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {highCouplingComponents.map((node, index) => (
                    <Card key={`high-coupling-${node.id}-${index}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{node.name}</div>
                          <div className="text-sm text-muted-foreground">{node.layer}</div>
                        </div>
                        <Badge variant="destructive">{node.connections} deps</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Isolated Components */}
              <div>
                <h3 className="font-medium mb-3 text-yellow-600">Isolated Components ({isolatedComponents.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {isolatedComponents.map((node, index) => (
                    <Card key={`isolated-${node.id}-${index}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{node.name}</div>
                          <div className="text-sm text-muted-foreground">{node.layer}</div>
                        </div>
                        <Badge variant="outline">0 deps</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dependency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Dependency Distribution by Layer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {architecturalLayers.map(layer => {
                const layerNodes = dependencyNodes.filter(node => node.layer === layer.name)
                const avgDependencies = layerNodes.length > 0 
                  ? layerNodes.reduce((acc, node) => acc + node.connections, 0) / layerNodes.length 
                  : 0
                
                return (
                  <div key={layer.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <layer.icon className="h-4 w-4" />
                      <span>{layer.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {layerNodes.length} components
                      </span>
                      <span className="text-sm font-medium">
                        {avgDependencies.toFixed(1)} avg deps
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Layer-based view
  function renderLayersView() {
    return (
      <div className="space-y-6">
        {architecturalLayers.map((layer, index) => {
          const Icon = layer.icon
          
          return (
            <Card key={layer.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 text-${layer.color}-600`} />
                  {layer.name}
                  <Badge variant="outline">{layer.components.length} components</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{layer.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {layer.components.map((component, componentIndex) => {
                    const node = dependencyNodes.find(n => n.id.startsWith(component.slug))
                    
                    return (
                      <Card key={`${layer.name}-${component.slug}-${componentIndex}`} className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedComponent(component)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{component.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {component.methods?.length || 0} methods
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`text-xs ${
                              component.kind === 'component' ? 'bg-blue-50 text-blue-600' :
                              component.kind === 'function' ? 'bg-green-50 text-green-600' :
                              component.kind === 'class' ? 'bg-purple-50 text-purple-600' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {component.kind || 'unknown'}
                            </Badge>
                            {node && node.connections > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {node.connections} deps
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Pattern analysis view
  function renderPatternsView() {
    const errorPatterns = codePatterns.filter(p => p.severity === 'error')
    const warningPatterns = codePatterns.filter(p => p.severity === 'warning')
    const infoPatterns = codePatterns.filter(p => p.severity === 'info')

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Code Patterns & Anti-Patterns
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Architectural patterns, violations, and improvement opportunities
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Critical Issues */}
              <div>
                <h3 className="font-medium mb-3 text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Critical Issues ({errorPatterns.length})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {errorPatterns.map((pattern, index) => (
                    <Card key={`error-${pattern.component}-${pattern.type}-${index}`} className="p-3 border-red-200 bg-red-50 dark:bg-red-900/10">
                      <div className="font-medium text-red-800 dark:text-red-200">{pattern.type}</div>
                      <div className="text-sm text-red-600 dark:text-red-300">{pattern.component}</div>
                      <div className="text-xs text-red-500 dark:text-red-400 mt-1">{pattern.description}</div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              <div>
                <h3 className="font-medium mb-3 text-amber-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Warnings ({warningPatterns.length})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {warningPatterns.map((pattern, index) => (
                    <Card key={`warning-${pattern.component}-${pattern.type}-${index}`} className="p-3 border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                      <div className="font-medium text-amber-800 dark:text-amber-200">{pattern.type}</div>
                      <div className="text-sm text-amber-600 dark:text-amber-300">{pattern.component}</div>
                      <div className="text-xs text-amber-500 dark:text-amber-400 mt-1">{pattern.description}</div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Information */}
              <div>
                <h3 className="font-medium mb-3 text-blue-600 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Information ({infoPatterns.length})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {infoPatterns.map((pattern, index) => (
                    <Card key={`info-${pattern.component}-${pattern.type}-${index}`} className="p-3 border-blue-200 bg-blue-50 dark:bg-blue-900/10">
                      <div className="font-medium text-blue-800 dark:text-blue-200">{pattern.type}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-300">{pattern.component}</div>
                      <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">{pattern.description}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Data flow visualization
  function renderFlowsView() {
    const componentFlows: Record<string, any[]> = {}
    
    dataFlows.forEach(flow => {
      if (!componentFlows[flow.from]) {
        componentFlows[flow.from] = []
      }
      componentFlows[flow.from].push(flow)
    })

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Data Flow Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How data and control flows through your components
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(componentFlows).slice(0, 10).map(([component, flows]) => (
                <Card key={component} className="p-4">
                  <div className="font-medium mb-2">{component}</div>
                  <div className="space-y-2">
                    {flows.map((flow, index) => (
                      <div key={`flow-${component}-${flow.to}-${index}`} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span>{flow.to}</span>
                        <Badge variant="outline" className="text-xs">{flow.type}</Badge>
                        {flow.context && (
                          <span className="text-muted-foreground text-xs">({flow.context})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Analyzing code architecture...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search components and patterns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Components</SelectItem>
                    <SelectItem value="components">UI Components</SelectItem>
                    <SelectItem value="functions">Functions</SelectItem>
                    <SelectItem value="classes">Classes</SelectItem>
                    <SelectItem value="high-coupling">High Coupling</SelectItem>
                    <SelectItem value="isolated">Isolated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Tabs */}
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="architecture" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="dependencies" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Dependencies
            </TabsTrigger>
            <TabsTrigger value="layers" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Layers
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Patterns ({codePatterns.length})
            </TabsTrigger>
            <TabsTrigger value="flows" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Data Flows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="architecture">
            {renderArchitectureView()}
          </TabsContent>

          <TabsContent value="dependencies">
            {renderDependencyView()}
          </TabsContent>

          <TabsContent value="layers">
            {renderLayersView()}
          </TabsContent>

          <TabsContent value="patterns">
            {renderPatternsView()}
          </TabsContent>

          <TabsContent value="flows">
            {renderFlowsView()}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}