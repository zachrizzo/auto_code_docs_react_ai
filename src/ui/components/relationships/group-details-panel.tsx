"use client"

import React, { useRef, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { FileCode, X, ExternalLink, Focus, Move, Minus } from "lucide-react"
import { Relationship } from "./types"

interface GroupData {
  id: string
  name?: string
  nodeCount?: number
  nodes: any[]
  types: string[]
  externalConnections: Relationship[] | number
}

interface GroupDetailsPanelProps {
  selectedGroupData: GroupData
  panelPosition: { x: number; y: number }
  setPanelPosition: (position: { x: number; y: number }) => void
  isMinimized: boolean
  setIsMinimized: (minimized: boolean) => void
  onClose: () => void
  onFocusGroup: (groupId: string) => void
  getRelationshipColor: (type: Relationship["type"]) => string
  getRelationshipLabel: (type: Relationship["type"]) => string
}

export function GroupDetailsPanel({
  selectedGroupData,
  panelPosition,
  setPanelPosition,
  isMinimized,
  setIsMinimized,
  onClose,
  onFocusGroup,
  getRelationshipColor,
  getRelationshipLabel
}: GroupDetailsPanelProps) {
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
      className={`fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border-2 border-amber-200 dark:border-amber-800 z-50 rounded-xl select-none transition-all duration-300 ${
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
        className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 drag-handle cursor-grab hover:cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg pointer-events-none">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
              <FileCode className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{selectedGroupData.name}</span>
              <Badge 
                variant="secondary" 
                className="mt-1 w-fit bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300"
              >
                {selectedGroupData.nodeCount} nodes
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
              className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/20"
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
        
        {/* Group Summary */}
        <div className="mb-4 p-3 bg-amber-100/80 dark:bg-amber-800/80 rounded-lg">
          <div className="text-sm text-amber-600 dark:text-amber-400 font-mono break-words">
            📁 Group: {selectedGroupData.name || selectedGroupData.id}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {selectedGroupData.nodes.length} components • {Array.isArray(selectedGroupData.externalConnections) ? selectedGroupData.externalConnections.length : selectedGroupData.externalConnections} external connections
          </div>
        </div>
        
        {/* Node Types Breakdown */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Node Types</h4>
          <div className="flex flex-wrap gap-1">
            {selectedGroupData.types.map((type: string) => {
              const count = selectedGroupData.nodes.filter((n: any) => n.type === type).length
              return (
                <Badge key={type} className={`${getRelationshipColor('uses')} text-xs`}>
                  {type} ({count})
                </Badge>
              )
            })}
          </div>
        </div>

        {/* External Connections */}
        <div className="mb-4">
          {Array.isArray(selectedGroupData.externalConnections) ? (
            <>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                External Connections ({selectedGroupData.externalConnections.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedGroupData.externalConnections.slice(0, 5).map((rel: any, index: number) => {
                  const isOutgoing = selectedGroupData.nodes.some((n: any) => n.id === rel.source)
                  const externalNode = isOutgoing ? rel.target : rel.source
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <Badge className={`${getRelationshipColor(rel.type)} text-xs`}>
                        {getRelationshipLabel(rel.type)}
                      </Badge>
                      <span className="text-slate-600 dark:text-slate-400 truncate ml-2 flex-1">
                        {isOutgoing ? '→' : '←'} {externalNode}
                      </span>
                </div>
              )
            })}
                {selectedGroupData.externalConnections.length > 5 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    +{selectedGroupData.externalConnections.length - 5} more...
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                External Connections ({selectedGroupData.externalConnections})
              </h4>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Connection details not available
              </div>
            </>
          )}
        </div>

        {/* Group Actions */}
        <div className="space-y-2">
          <Button 
            onClick={() => onFocusGroup(selectedGroupData.id)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
          >
            <Focus className="h-4 w-4 mr-2" />
            Focus on Group
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => {
              // Open first component in group
              const firstNode = selectedGroupData.nodes[0]
              if (firstNode) {
                window.open(`/components/${firstNode.id}`, '_blank')
              }
            }}
            className="w-full border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Components
          </Button>
        </div>
      </CardContent>
      )}
    </Card>
  )
}