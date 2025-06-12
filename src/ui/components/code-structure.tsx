"use client"
import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader } from "./ui/card"
import { FileIcon, FolderIcon, GitBranch, Package, AlertCircle, Code, Search, Filter, ChevronRight, Activity, FileCode, Layers, Hash, Info } from "lucide-react"
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

interface FileStructure {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileStructure[]
  componentSlug?: string
  uniqueKey?: string
  components?: ComponentData[]
  stats?: {
    componentCount?: number
    methodCount?: number
    relationshipCount?: number
    importCount?: number
    similarityIssues?: number
    complexity?: number
    size?: number
  }
  entityType?: 'component' | 'function' | 'class' | 'method' | 'unknown'
}

export function CodeStructure() {
  const [fileStructure, setFileStructure] = useState<FileStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [breadcrumb, setBreadcrumb] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'tree' | 'analytics' | 'issues'>('tree')
  const [filterType, setFilterType] = useState<'all' | 'components' | 'functions' | 'classes' | 'issues'>('all')
  const [selectedFile, setSelectedFile] = useState<FileStructure | null>(null)
  const [componentDetails, setComponentDetails] = useState<Map<string, ComponentData[]>>(new Map())

  // Helper to toggle folder expansion
  function toggleFolder(path: string) {
    setExpandedFolders((prev: Set<string>) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  // Helper to update breadcrumb
  function updateBreadcrumb(path: string) {
    if (!path) return setBreadcrumb([])
    setBreadcrumb(path.split('/').filter(Boolean))
  }

  // Fetch component data and organize it by file path with enhanced metadata
  useEffect(() => {
    async function fetchComponents() {
      try {
        // Fetch the component index
        const res = await fetch('/docs-data/component-index.json')
        const data = await res.json()

        // Group components by their file paths with full data
        const filesByPath: Record<string, ComponentData[]> = {}
        const detailsMap = new Map<string, ComponentData[]>()

        // Process each component and fetch detailed data
        await Promise.all(data.map(async (comp: { name: string; slug: string; filePath: string }) => {
          if (!comp.filePath) return

          try {
            // Fetch detailed component data
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

            // Store the component in its path
            const path = comp.filePath
            if (!filesByPath[path]) {
              filesByPath[path] = []
            }
            filesByPath[path].push(componentData)

            // Update details map
            if (!detailsMap.has(path)) {
              detailsMap.set(path, [])
            }
            detailsMap.get(path)!.push(componentData)
          } catch (error) {
            console.error(`Error loading details for ${comp.slug}:`, error)
          }
        }))

        setComponentDetails(detailsMap)

        // Convert flat paths to a tree structure with stats
        const rootStructure: FileStructure[] = []

        // Helper function to calculate folder stats
        const calculateStats = (items: FileStructure[]): any => {
          let stats = {
            componentCount: 0,
            methodCount: 0,
            relationshipCount: 0,
            importCount: 0,
            similarityIssues: 0,
            complexity: 0,
            size: 0
          }

          items.forEach(item => {
            if (item.type === 'folder' && item.children) {
              const childStats = calculateStats(item.children)
              Object.keys(stats).forEach(key => {
                stats[key as keyof typeof stats] += childStats[key]
              })
            } else if (item.components) {
              item.components.forEach(comp => {
                stats.componentCount++
                stats.methodCount += comp.methods?.length || 0
                stats.relationshipCount += comp.relationships?.length || 0
                stats.importCount += comp.imports?.length || 0
                stats.similarityIssues += comp.similarityWarnings?.length || 0
              })
            }
          })

          return stats
        }

        // Helper to determine entity type
        const determineEntityType = (comp: ComponentData): FileStructure['entityType'] => {
          if (comp.kind === 'function') return 'function'
          if (comp.kind === 'class') return 'class'
          if (comp.kind === 'method') return 'method'
          if (comp.kind === 'component') return 'component'
          return 'unknown'
        }

        // Process each file path
        Object.entries(filesByPath).forEach(([path, components]) => {
          // Split the path into parts (folders/file)
          const parts = path.split('/')
          let currentLevel = rootStructure

          // Process each part of the path except the last one (the file)
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (!part) continue // Skip empty parts

            // Look for existing folder
            let folder = currentLevel.find(item =>
              item.type === 'folder' && item.name === part
            )

            // Create folder if it doesn't exist
            if (!folder) {
              folder = {
                name: part,
                path: parts.slice(0, i + 1).join('/'),
                type: 'folder',
                children: [],
                stats: {
                  componentCount: 0,
                  methodCount: 0,
                  relationshipCount: 0,
                  importCount: 0,
                  similarityIssues: 0,
                  complexity: 0,
                  size: 0
                }
              }
              currentLevel.push(folder)
            }

            // Update current level to this folder's children
            currentLevel = folder.children!
          }

          // Add the file at the current level with stats
          const fileName = parts[parts.length - 1]
          if (fileName) {
            const fileStats = {
              componentCount: components.length,
              methodCount: components.reduce((acc, comp) => acc + (comp.methods?.length || 0), 0),
              relationshipCount: components.reduce((acc, comp) => acc + (comp.relationships?.length || 0), 0),
              importCount: components.reduce((acc, comp) => acc + (comp.imports?.length || 0), 0),
              similarityIssues: components.reduce((acc, comp) => acc + (comp.similarityWarnings?.length || 0), 0),
              complexity: 0, // Could be calculated based on methods, relationships, etc.
              size: components.length
            }

            currentLevel.push({
              name: fileName,
              path: path,
              type: 'file',
              components: components,
              stats: fileStats,
              children: components.map((comp, compIndex) => ({
                name: comp.name,
                path: `${path}#${comp.name}-${compIndex}`,
                type: 'file' as const,
                componentSlug: comp.slug,
                uniqueKey: `${comp.slug}-${path}-${compIndex}`,
                entityType: determineEntityType(comp),
                stats: {
                  methodCount: comp.methods?.length || 0,
                  relationshipCount: comp.relationships?.length || 0,
                  importCount: comp.imports?.length || 0,
                  similarityIssues: comp.similarityWarnings?.length || 0
                }
              }))
            })
          }
        })

        // Calculate stats for all folders
        const updateFolderStats = (items: FileStructure[]) => {
          items.forEach(item => {
            if (item.type === 'folder' && item.children) {
              updateFolderStats(item.children)
              item.stats = calculateStats(item.children)
            }
          })
        }
        updateFolderStats(rootStructure)

        // Sort the structure (folders first, then alphabetically)
        const sortStructure = (items: FileStructure[]): FileStructure[] => {
          return items.sort((a, b) => {
            // Folders first
            if (a.type !== b.type) {
              return a.type === 'folder' ? -1 : 1
            }
            // Then alphabetically
            return a.name.localeCompare(b.name)
          }).map(item => {
            if (item.children) {
              return { ...item, children: sortStructure(item.children) }
            }
            return item
          })
        }

        setFileStructure(sortStructure(rootStructure))
        setLoading(false)
        // Optionally, expand root by default
        setExpandedFolders(new Set(['']))
      } catch (error) {
        console.error('Error loading file structure:', error)
        setLoading(false)
      }
    }

    fetchComponents()
  }, [])

  // Filter file structure based on search and filter type
  const filteredStructure = useMemo(() => {
    if (!searchQuery && filterType === 'all') return fileStructure

    const filterItems = (items: FileStructure[]): FileStructure[] => {
      return items.reduce((acc: FileStructure[], item) => {
        // Check if item matches search
        const matchesSearch = !searchQuery || 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.components?.some(comp => 
            comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            comp.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )

        // Check if item matches filter type
        let matchesFilter = filterType === 'all'
        if (filterType === 'issues') {
          matchesFilter = (item.stats?.similarityIssues || 0) > 0
        } else if (filterType !== 'all' && item.components) {
          matchesFilter = item.components.some(comp => {
            const entityType = determineEntityType(comp)
            return filterType === 'components' && entityType === 'component' ||
                   filterType === 'functions' && entityType === 'function' ||
                   filterType === 'classes' && entityType === 'class'
          })
        }

        if (item.type === 'folder' && item.children) {
          const filteredChildren = filterItems(item.children)
          if (filteredChildren.length > 0) {
            return [...acc, { ...item, children: filteredChildren }]
          }
        } else if (matchesSearch && matchesFilter) {
          return [...acc, item]
        }

        return acc
      }, [])
    }

    return filterItems(fileStructure)
  }, [fileStructure, searchQuery, filterType])

  // Helper to determine entity type
  const determineEntityType = (comp: ComponentData): FileStructure['entityType'] => {
    if (comp.kind === 'function') return 'function'
    if (comp.kind === 'class') return 'class'
    if (comp.kind === 'method') return 'method'
    if (comp.kind === 'component') return 'component'
    return 'unknown'
  }

  // Calculate overall project stats
  const projectStats = useMemo(() => {
    const stats = {
      totalFiles: 0,
      totalComponents: 0,
      totalMethods: 0,
      totalRelationships: 0,
      totalIssues: 0,
      componentTypes: new Map<string, number>()
    }

    const countStats = (items: FileStructure[]) => {
      items.forEach(item => {
        if (item.type === 'file') {
          stats.totalFiles++
          if (item.stats) {
            stats.totalComponents += item.stats.componentCount || 0
            stats.totalMethods += item.stats.methodCount || 0
            stats.totalRelationships += item.stats.relationshipCount || 0
            stats.totalIssues += item.stats.similarityIssues || 0
          }
          item.components?.forEach(comp => {
            const type = determineEntityType(comp)
            if (type) {
              stats.componentTypes.set(type, (stats.componentTypes.get(type) || 0) + 1)
            }
          })
        } else if (item.children) {
          countStats(item.children)
        }
      })
    }

    countStats(fileStructure)
    return stats
  }, [fileStructure])

  // Enhanced render tree with stats and tooltips
  function renderTree(items: FileStructure[], depth = 0, parentPath = '') {
    return (
      <TooltipProvider>
        <ul className={`pl-${depth * 4} space-y-1`} style={{ paddingLeft: depth * 16 }}>
          {items.map((item, index) => {
            const isFolder = item.type === 'folder'
            const isExpanded = isFolder && expandedFolders.has(item.path)
            const isSelected = selectedPath === item.path
            const hasIssues = (item.stats?.similarityIssues || 0) > 0
            
            return (
              <li
                key={item.uniqueKey || `${item.path}-${index}`}
                className={`py-1 rounded transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                onClick={e => {
                  e.stopPropagation()
                  setSelectedPath(item.path)
                  updateBreadcrumb(item.path)
                  if (isFolder) toggleFolder(item.path)
                  else if (item.type === 'file') setSelectedFile(item)
                }}
                onMouseOver={e => {
                  e.currentTarget.classList.add('bg-slate-100', 'dark:bg-slate-800/50')
                }}
                onMouseOut={e => {
                  if (!isSelected) e.currentTarget.classList.remove('bg-slate-100', 'dark:bg-slate-800/50')
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    {isFolder ? (
                      <span className="mr-2 flex items-center">
                        <FolderIcon className={`h-4 w-4 ${isExpanded ? 'text-yellow-600' : 'text-blue-500'} transition-colors`} />
                        <span className="ml-1 text-xs">{isExpanded ? '▼' : '▶'}</span>
                      </span>
                    ) : item.componentSlug ? (
                      <div className="mr-2 flex items-center">
                        {item.entityType === 'function' && <Code className="h-4 w-4 text-green-500" />}
                        {item.entityType === 'class' && <Package className="h-4 w-4 text-purple-500" />}
                        {item.entityType === 'component' && <FileCode className="h-4 w-4 text-blue-500" />}
                        {item.entityType === 'method' && <Hash className="h-4 w-4 text-orange-500" />}
                        {!item.entityType && <FileIcon className="h-4 w-4 text-gray-500" />}
                      </div>
                    ) : (
                      <FileIcon className="h-4 w-4 text-gray-500 mr-2" />
                    )}

                    {item.componentSlug ? (
                      <Link
                        href={`/components/${item.componentSlug}`}
                        className="text-sm hover:underline text-violet-500"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedPath(item.path)
                          updateBreadcrumb(item.path)
                        }}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}

                    {/* Entity type badge */}
                    {item.entityType && (
                      <Badge className={`ml-2 text-xs ${
                        item.entityType === 'component' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        item.entityType === 'function' ? 'bg-green-50 text-green-600 border-green-200' :
                        item.entityType === 'class' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        item.entityType === 'method' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {item.entityType}
                      </Badge>
                    )}

                    {/* Issue indicator */}
                    {hasIssues && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-4 w-4 text-amber-500 ml-2" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.stats?.similarityIssues} similarity issues detected</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Stats badges for folders */}
                  {isFolder && item.stats && (
                    <div className="flex gap-1 ml-2">
                      {(item.stats.componentCount || 0) > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              {item.stats.componentCount}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.stats.componentCount} components</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {(item.stats.similarityIssues || 0) > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="text-xs">
                              {item.stats.similarityIssues}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.stats.similarityIssues} similarity issues</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>

                {/* Children */}
                {isFolder && isExpanded && item.children && item.children.length > 0 && (
                  <div>{renderTree(item.children, depth + 1, item.path)}</div>
                )}
              </li>
            )
          })}
        </ul>
      </TooltipProvider>
    )
  }

  // Render analytics view
  function renderAnalytics() {
    return (
      <div className="space-y-6">
        {/* Project Overview */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Project Overview
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{projectStats.totalFiles}</div>
                <div className="text-sm text-muted-foreground">Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{projectStats.totalComponents}</div>
                <div className="text-sm text-muted-foreground">Components</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{projectStats.totalMethods}</div>
                <div className="text-sm text-muted-foreground">Methods</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{projectStats.totalIssues}</div>
                <div className="text-sm text-muted-foreground">Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Types Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Component Types
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(projectStats.componentTypes.entries()).map(([type, count]) => {
                const percentage = (count / projectStats.totalComponents) * 100
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{type}s</span>
                      <span>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render issues view
  function renderIssues() {
    const issueFiles = fileStructure.filter(item => 
      item.type === 'file' && (item.stats?.similarityIssues || 0) > 0
    )

    return (
      <div className="space-y-4">
        {issueFiles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No similarity issues detected.</p>
          </div>
        ) : (
          issueFiles.map(file => (
            <Card key={file.path} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedFile(file)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">{file.path}</div>
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {file.stats?.similarityIssues} issues
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading code structure...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (fileStructure.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No file structure information available.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files and components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filter */}
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="components">Components Only</SelectItem>
                  <SelectItem value="functions">Functions Only</SelectItem>
                  <SelectItem value="classes">Classes Only</SelectItem>
                  <SelectItem value="issues">Issues Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tree" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            File Tree
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Issues ({projectStats.totalIssues})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <Card className="bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-6">
              {/* Breadcrumb navigation */}
              {breadcrumb.length > 0 && (
                <nav className="mb-4 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-1">
                  <span
                    className="hover:underline cursor-pointer"
                    onClick={() => {
                      setSelectedPath('')
                      setBreadcrumb([])
                      setExpandedFolders(new Set(['']))
                    }}
                  >Root</span>
                  {breadcrumb.map((part: string, idx: number) => (
                    <React.Fragment key={idx}>
                      <span className="mx-1">/</span>
                      <span
                        className="hover:underline cursor-pointer"
                        onClick={() => {
                          const path = breadcrumb.slice(0, idx + 1).join('/')
                          setSelectedPath(path)
                          setBreadcrumb(breadcrumb.slice(0, idx + 1))
                          setExpandedFolders((prev: Set<string>) => {
                            const newSet = new Set(prev)
                            newSet.add(path)
                            return newSet
                          })
                        }}
                      >{part}</span>
                    </React.Fragment>
                  ))}
                </nav>
              )}
              {renderTree(filteredStructure)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {renderAnalytics()}
        </TabsContent>

        <TabsContent value="issues">
          <Card className="bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Code Similarity Issues
              </h3>
              <p className="text-sm text-muted-foreground">
                Files with potential duplicate or similar code that may benefit from refactoring.
              </p>
            </CardHeader>
            <CardContent>
              {renderIssues()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
