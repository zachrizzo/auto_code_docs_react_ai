"use client"
import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { CodeBlock } from "./code-block"
import { Component, Code, ActivityIcon as Function, FileCode } from "lucide-react"
import { CodeEntity } from "./code-graph"

interface CodeEntityDetailsProps {
  entity: CodeEntity | null
  isOpen: boolean
  onClose: () => void
}

export function CodeEntityDetails({ entity, isOpen, onClose }: CodeEntityDetailsProps) {
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
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
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
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          </TabsList>
          <TabsContent value="code">
            <CodeBlock code={entity.code || ""} language="tsx" />
          </TabsContent>
          <TabsContent value="usage">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              <p className="text-muted-foreground">Usage examples will appear here.</p>
            </div>
          </TabsContent>
          <TabsContent value="dependencies">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              <p className="text-muted-foreground">Dependencies will appear here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
