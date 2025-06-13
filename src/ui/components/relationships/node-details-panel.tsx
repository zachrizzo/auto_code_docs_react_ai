"use client"

import { useRef, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Code, Component, ActivityIcon as Function, FileCode, X, ExternalLink, Focus, Move, Minus } from "lucide-react"
import { CodeEntity, Relationship } from "./types"

interface NodeDetailsPanelProps {
  selectedNodeData: CodeEntity
  selectedNodeId: string
  focusMode: boolean
  setFocusMode: (mode: boolean) => void
  filteredRelationships: Relationship[]
  panelPosition: { x: number; y: number }
  setPanelPosition: (position: { x: number; y: number }) => void
  isMinimized: boolean
  setIsMinimized: (minimized: boolean) => void
  onClose: () => void
  onOpenCodeModal: (nodeId: string) => void
  getEntityIcon: (type: CodeEntity["type"]) => JSX.Element
  getRelationshipColor: (type: Relationship["type"]) => string
  getRelationshipLabel: (type: Relationship["type"]) => string
}

export function NodeDetailsPanel({
  selectedNodeData,
  selectedNodeId,
  focusMode,
  setFocusMode,
  filteredRelationships,
  panelPosition,
  setPanelPosition,
  isMinimized,
  setIsMinimized,
  onClose,
  onOpenCodeModal,
  getEntityIcon,
  getRelationshipColor,
  getRelationshipLabel
}: NodeDetailsPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

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

  return (
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
              onClick={onClose}
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
            onClick={() => onOpenCodeModal(selectedNodeId)}
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
  )
}