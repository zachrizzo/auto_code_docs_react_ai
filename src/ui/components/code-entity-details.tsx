"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { CodeBlock } from "./code-block"
import { Component, Code, ActivityIcon as Function, FileCode, ChevronDown, ChevronRight } from "lucide-react"

interface ExtendedCodeEntity {
  name: string;
  filePath: string;
  code: string;
  type: "component" | "class" | "function" | "method" | string;
  slug?: string;
}

interface SubFunction {
  name: string;
  code: string;
  params?: { name: string; type: string }[];
  returnType?: string;
}

interface CodeEntityDetailsProps {
  entity: ExtendedCodeEntity | null
  isOpen: boolean
  onClose: () => void
}

export function CodeEntityDetails({ entity, isOpen, onClose }: CodeEntityDetailsProps) {
  const [subFunctions, setSubFunctions] = useState<SubFunction[]>([])
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (entity && isOpen) {
      fetchSubFunctions()
    }
  }, [entity, isOpen])
  
  const fetchSubFunctions = async () => {
    if (!entity) return
    
    // Get the slug from the entity or create one from the name
    const slug = entity.slug || entity.name.toLowerCase().replace(/\s+/g, '-')
    
    setLoading(true)
    try {
      const res = await fetch(`/docs-data/${slug}.json`)
      if (!res.ok) {
        console.error(`Failed to fetch entity details: ${res.status}`)
        setLoading(false)
        return
      }
      
      const data = await res.json()
      if (data.methods && Array.isArray(data.methods)) {
        // Filter out the main function/component if it's included in methods
        const filteredMethods = data.methods.filter(
          (method: SubFunction) => method.name !== entity.name
        )
        setSubFunctions(filteredMethods)
      } else {
        setSubFunctions([])
      }
    } catch (error) {
      console.error('Error fetching sub-functions:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const toggleFunction = (functionName: string) => {
    setExpandedFunctions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(functionName)) {
        newSet.delete(functionName)
      } else {
        newSet.add(functionName)
      }
      return newSet
    })
  }
  
  if (!entity) return null

  const getEntityIcon = () => {
    switch (entity.type) {
      case "component":
        return <Component className="h-5 w-5 text-violet-500" />
      case "class":
        return <Code className="h-5 w-5 text-blue-500" />
      case "function":
        return <Function className="h-5 w-5 text-emerald-500" />
      case "method":
        return <FileCode className="h-5 w-5 text-amber-500" />
      default:
        return <Component className="h-5 w-5 text-violet-500" />
    }
  }

  const getEntityTypeBadge = () => {
    switch (entity.type) {
      case "component":
        return (
          <Badge className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
            Component
          </Badge>
        )
      case "class":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            Class
          </Badge>
        )
      case "function":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            Function
          </Badge>
        )
      case "method":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            Method
          </Badge>
        )
      default:
        return (
          <Badge className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
            Component
          </Badge>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[85vh] h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getEntityIcon()}
            <DialogTitle className="text-xl">{entity.name}</DialogTitle>
            {getEntityTypeBadge()}
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-2">{entity.filePath}</p>
        </DialogHeader>

        <Tabs defaultValue="code">
          <TabsList className="mb-4">
            <TabsTrigger value="code">Code</TabsTrigger>
            {subFunctions.length > 0 && (
              <TabsTrigger value="methods">Methods & Sub-functions ({subFunctions.length})</TabsTrigger>
            )}
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          </TabsList>
          
          <TabsContent value="code" className="h-[calc(85vh-12rem)] overflow-y-auto">
            <CodeBlock code={entity.code || ""} language="tsx" />
          </TabsContent>
          
          {subFunctions.length > 0 && (
            <TabsContent value="methods" className="space-y-4 h-[calc(85vh-12rem)] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading sub-functions...
                </div>
              ) : (
                <div className="space-y-4">
                  {subFunctions.map((func) => (
                    <div key={func.name} className="border rounded-md overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                        onClick={() => toggleFunction(func.name)}
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{func.name}</span>
                          {func.params && (
                            <span className="text-sm text-muted-foreground">
                              ({func.params.map(p => `${p.name}: ${p.type}`).join(', ')})
                              {func.returnType && ` → ${func.returnType}`}
                            </span>
                          )}
                        </div>
                        {expandedFunctions.has(func.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      {expandedFunctions.has(func.name) && (
                        <div className="p-0">
                          <CodeBlock code={func.code || ""} language="tsx" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
          
          <TabsContent value="usage" className="h-[calc(85vh-12rem)] overflow-y-auto">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              <p className="text-muted-foreground">Usage examples will appear here.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="dependencies" className="h-[calc(85vh-12rem)] overflow-y-auto">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              <p className="text-muted-foreground">Dependencies will appear here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
