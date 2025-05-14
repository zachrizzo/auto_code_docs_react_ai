"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { FileIcon, FolderIcon } from "lucide-react"
import { Badge } from "./ui/badge"
import Link from "next/link"

interface FileStructure {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileStructure[]
  componentSlug?: string
  uniqueKey?: string
}

export function CodeStructure() {
  const [fileStructure, setFileStructure] = useState<FileStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [breadcrumb, setBreadcrumb] = useState<string[]>([])

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

  // Fetch component data and organize it by file path
  useEffect(() => {
    async function fetchComponents() {
      try {
        // Fetch the component index
        const res = await fetch('/docs-data/component-index.json')
        const data = await res.json()

        // Group components by their file paths
        const filesByPath: Record<string, { name: string; slug: string }[]> = {}

        // Process each component
        data.forEach((comp: { name: string; slug: string; filePath: string }) => {
          if (!comp.filePath) return

          // Store the component in its path
          const path = comp.filePath
          if (!filesByPath[path]) {
            filesByPath[path] = []
          }
          filesByPath[path].push({ name: comp.name, slug: comp.slug })
        })

        // Convert flat paths to a tree structure
        const rootStructure: FileStructure[] = []

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
                children: []
              }
              currentLevel.push(folder)
            }

            // Update current level to this folder's children
            currentLevel = folder.children!
          }

          // Add the file at the current level
          const fileName = parts[parts.length - 1]
          if (fileName) {
            currentLevel.push({
              name: fileName,
              path: path,
              type: 'file',
              children: components.map((comp, compIndex) => ({
                name: comp.name,
                path: `${path}#${comp.name}-${compIndex}`, // Add index to make path unique
                type: 'file',
                componentSlug: comp.slug,
                uniqueKey: `${comp.slug}-${path}-${compIndex}` // Add explicit unique key property
              }))
            })
          }
        })

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

  function renderTree(items: FileStructure[], depth = 0, parentPath = '') {
    return (
      <ul className={`pl-${depth * 4} space-y-1`} style={{ paddingLeft: depth * 16 }}>
        {items.map((item, index) => {
          const isFolder = item.type === 'folder'
          const isExpanded = isFolder && expandedFolders.has(item.path)
          const isSelected = selectedPath === item.path
          return (
            <li
              key={item.uniqueKey || `${item.path}-${index}`}
              className={`py-1 rounded transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
              onClick={e => {
                e.stopPropagation()
                setSelectedPath(item.path)
                updateBreadcrumb(item.path)
                if (isFolder) toggleFolder(item.path)
              }}
              onMouseOver={e => {
                e.currentTarget.classList.add('bg-slate-100', 'dark:bg-slate-800/50')
              }}
              onMouseOut={e => {
                if (!isSelected) e.currentTarget.classList.remove('bg-slate-100', 'dark:bg-slate-800/50')
              }}
              style={{ cursor: isFolder ? 'pointer' : 'default' }}
            >
              <div className="flex items-center">
                {isFolder ? (
                  <span className="mr-2 flex items-center">
                    <FolderIcon className={`h-4 w-4 ${isExpanded ? 'text-yellow-600' : 'text-blue-500'} transition-colors`} />
                    <span className="ml-1 text-xs">{isExpanded ? '▼' : '▶'}</span>
                  </span>
                ) : item.componentSlug ? (
                  <div className="w-4 h-4 mr-2" />
                ) : (
                  <FileIcon className="h-4 w-4 text-gray-500 mr-2" />
                )}

                {item.componentSlug ? (
                  <Link
                    href={`/docs/${item.componentSlug}`}
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

                {item.componentSlug && (
                  <Badge className="ml-2 text-xs bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
                    Component
                  </Badge>
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
        {renderTree(fileStructure)}
      </CardContent>
    </Card>
  )
}
