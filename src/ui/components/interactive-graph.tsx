"use client"
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Filter } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface Node {
  id: string
  name: string
  type: 'component' | 'class' | 'function' | 'method'
  x: number
  y: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  radius: number
  color: string
  connections: number
}

interface Edge {
  source: string
  target: string
  type: 'imports' | 'extends' | 'implements' | 'calls' | 'renders' | 'uses'
  color: string
  width: number
}

interface InteractiveGraphProps {
  nodes: Node[]
  edges: Edge[]
  focusNodeId?: string
  onNodeClick?: (nodeId: string) => void
}

export function InteractiveGraph({ nodes, edges, focusNodeId, onNodeClick }: InteractiveGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(focusNodeId || null)
  const [filteredTypes, setFilteredTypes] = useState<Set<string>>(new Set())
  const animationRef = useRef<number>()
  const nodesRef = useRef<Node[]>(nodes)
  const edgesRef = useRef<Edge[]>(edges)

  // Physics simulation parameters
  const FORCE_STRENGTH = 0.03 // Reduced from 0.1
  const DAMPING = 0.85 // Reduced from 0.9 for quicker settling
  const CENTER_FORCE = 0.005 // Reduced from 0.01

  // Update refs when props change
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  const getNodeColor = (type: string, isSelected: boolean, isHovered: boolean) => {
    const colors = {
      component: isSelected ? '#8b5cf6' : isHovered ? '#a78bfa' : '#d946ef',
      class: isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#0ea5e9',
      function: isSelected ? '#10b981' : isHovered ? '#34d399' : '#06d6a0',
      method: isSelected ? '#f59e0b' : isHovered ? '#fbbf24' : '#f97316'
    }
    return colors[type as keyof typeof colors] || '#6b7280'
  }

  const getEdgeColor = (type: string, opacity = 1) => {
    const colors = {
      imports: `rgba(14, 165, 233, ${opacity})`, // Blue
      extends: `rgba(147, 51, 234, ${opacity})`, // Purple  
      implements: `rgba(99, 102, 241, ${opacity})`, // Indigo
      calls: `rgba(245, 158, 11, ${opacity})`, // Amber
      renders: `rgba(6, 214, 160, ${opacity})`, // Emerald
      uses: `rgba(217, 70, 239, ${opacity})` // Fuchsia
    }
    return colors[type as keyof typeof colors] || `rgba(107, 114, 128, ${opacity})`
  }

  const applyForces = useCallback(() => {
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    
    if (!currentNodes || currentNodes.length === 0) return

    // Reset forces
    currentNodes.forEach(node => {
      node.vx = (node.vx || 0) * DAMPING
      node.vy = (node.vy || 0) * DAMPING
    })

    // Spring forces for edges
    currentEdges.forEach(edge => {
      const sourceNode = currentNodes.find(n => n.id === edge.source)
      const targetNode = currentNodes.find(n => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        const dx = targetNode.x - sourceNode.x
        const dy = targetNode.y - sourceNode.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const idealDistance = 150
        
        if (distance > 0) {
          const force = (distance - idealDistance) * FORCE_STRENGTH
          const forceX = (dx / distance) * force
          const forceY = (dy / distance) * force
          
          sourceNode.vx = (sourceNode.vx || 0) + forceX
          sourceNode.vy = (sourceNode.vy || 0) + forceY
          targetNode.vx = (targetNode.vx || 0) - forceX
          targetNode.vy = (targetNode.vy || 0) - forceY
        }
      }
    })

    // Repulsion forces between nodes
    for (let i = 0; i < currentNodes.length; i++) {
      for (let j = i + 1; j < currentNodes.length; j++) {
        const nodeA = currentNodes[i]
        const nodeB = currentNodes[j]
        
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0 && distance < 200) {
          const force = (200 - distance) * 0.02 // Reduced multiplier from 0.05
          const forceX = (dx / distance) * force
          const forceY = (dy / distance) * force
          
          nodeA.vx = (nodeA.vx || 0) - forceX
          nodeA.vy = (nodeA.vy || 0) - forceY
          nodeB.vx = (nodeB.vx || 0) + forceX
          nodeB.vy = (nodeB.vy || 0) + forceY
        }
      }
    }

    // Center force
    const centerX = 400
    const centerY = 300
    currentNodes.forEach(node => {
      const dx = centerX - node.x
      const dy = centerY - node.y
      node.vx = (node.vx || 0) + dx * CENTER_FORCE
      node.vy = (node.vy || 0) + dy * CENTER_FORCE
    })

    // Update positions
    currentNodes.forEach(node => {
      if (!node.fx && !node.fy) {
        node.x += node.vx || 0
        node.y += node.vy || 0
      }
    })
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()

    // Apply transform
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current

    // Draw edges
    currentEdges.forEach(edge => {
      if (filteredTypes.has(edge.type)) return

      const sourceNode = currentNodes.find(n => n.id === edge.source)
      const targetNode = currentNodes.find(n => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        const isHighlighted = selectedNode === edge.source || selectedNode === edge.target
        const isHovered = hoveredNode === edge.source || hoveredNode === edge.target
        const opacity = isHighlighted ? 1 : isHovered ? 0.8 : 0.5
        const lineWidth = isHighlighted ? 4 : isHovered ? 3 : 2
        
        // Calculate edge positions (from edge of circles, not centers)
        const dx = targetNode.x - sourceNode.x
        const dy = targetNode.y - sourceNode.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        // If distance is zero, nodes are at the same spot. Skip drawing this edge to avoid NaN/Infinity.
        if (distance === 0) {
          // console.warn(`Edge between ${sourceNode.id} and ${targetNode.id} has zero length.`); // Optional: for debugging
          return; // Skip rendering this specific edge
        }
        
        const normalizedDx = dx / distance
        const normalizedDy = dy / distance
        
        const startX = sourceNode.x + normalizedDx * sourceNode.radius
        const startY = sourceNode.y + normalizedDy * sourceNode.radius
        const endX = targetNode.x - normalizedDx * targetNode.radius
        const endY = targetNode.y - normalizedDy * targetNode.radius
        
        // Enhanced edge styling
        const edgeColor = getEdgeColor(edge.type, opacity)
        
        if (isHighlighted) {
          // Glow effect for highlighted edges
          ctx.shadowBlur = 12
          ctx.shadowColor = edgeColor
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
        }
        
        // Draw main edge line
        ctx.strokeStyle = edgeColor
        ctx.lineWidth = lineWidth
        
        // Different line styles for different relationship types
        switch (edge.type) {
          case 'calls':
            ctx.setLineDash([8, 4])
            break
          case 'extends':
            ctx.setLineDash([12, 3, 3, 3])
            break
          case 'implements':
            ctx.setLineDash([6, 6])
            break
          default:
            ctx.setLineDash([])
        }
        
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        // Enhanced arrow for all relationships (not just highlighted)
        const angle = Math.atan2(dy, dx)
        const arrowLength = isHighlighted ? 20 : 15
        const arrowAngle = Math.PI / 6
        
        // Arrow gradient
        const arrowGradient = ctx.createLinearGradient(
          endX - arrowLength * Math.cos(angle),
          endY - arrowLength * Math.sin(angle),
          endX,
          endY
        )
        arrowGradient.addColorStop(0, edgeColor)
        arrowGradient.addColorStop(1, edgeColor.replace(/[\d.]+\)$/g, '1)'))
        
        ctx.fillStyle = arrowGradient
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowAngle),
          endY - arrowLength * Math.sin(angle - arrowAngle)
        )
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowAngle),
          endY - arrowLength * Math.sin(angle + arrowAngle)
        )
        ctx.closePath()
        ctx.fill()
        
        // Relationship type label on highlighted edges
        if (isHighlighted) {
          const midX = (startX + endX) / 2
          const midY = (startY + endY) / 2
          
          // Label background
          const labelPadding = 6
          const labelText = edge.type.toUpperCase()
          ctx.font = 'bold 10px Inter, sans-serif'
          const textMetrics = ctx.measureText(labelText)
          const labelWidth = textMetrics.width + labelPadding * 2
          const labelHeight = 16
          
          // Background with rounded corners effect
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
          ctx.beginPath()
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(
              midX - labelWidth / 2,
              midY - labelHeight / 2,
              labelWidth,
              labelHeight,
              4
            );
          } else {
            ctx.rect(
              midX - labelWidth / 2,
              midY - labelHeight / 2,
              labelWidth,
              labelHeight
            );
          }
          ctx.fill()
          
          // Label text
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(labelText, midX, midY)
        }
      }
    })

    // Draw nodes
    currentNodes.forEach(node => {
      const isSelected = selectedNode === node.id
      const isHovered = hoveredNode === node.id
      const baseColor = getNodeColor(node.type, isSelected, isHovered)
      
      // Create radial gradient for node
      const gradient = ctx.createRadialGradient(
        node.x - node.radius * 0.3, 
        node.y - node.radius * 0.3, 
        0,
        node.x, 
        node.y, 
        node.radius
      )
      
      if (isSelected) {
        gradient.addColorStop(0, '#ffffff')
        gradient.addColorStop(0.3, baseColor)
        gradient.addColorStop(1, baseColor + '80')
      } else if (isHovered) {
        gradient.addColorStop(0, baseColor + 'ff')
        gradient.addColorStop(0.7, baseColor)
        gradient.addColorStop(1, baseColor + '60')
      } else {
        gradient.addColorStop(0, baseColor + 'ff')
        gradient.addColorStop(0.8, baseColor)
        gradient.addColorStop(1, baseColor + '40')
      }
      
      // Enhanced shadow for nodes
      if (isSelected) {
        ctx.shadowBlur = 25
        ctx.shadowColor = baseColor
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      } else if (isHovered) {
        ctx.shadowBlur = 15
        ctx.shadowColor = baseColor + '80'
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      } else {
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
      }
      
      // Main node circle with gradient
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Node border with glow effect
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      if (isSelected) {
        // Double border for selected nodes
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 4
        ctx.setLineDash([])
        ctx.stroke()
        
        ctx.strokeStyle = baseColor
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.9)'
        ctx.lineWidth = isHovered ? 3 : 2
        ctx.setLineDash([])
        ctx.stroke()
      }
      
      // Node label with better typography
      ctx.fillStyle = isSelected || isHovered ? '#ffffff' : '#ffffff'
      ctx.font = `${isSelected ? 'bold ' : ''}${isSelected ? '13px' : '11px'} Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Text shadow for better readability
      if (!isSelected) {
        ctx.shadowBlur = 3
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1
      }
      
      ctx.fillText(node.name, node.x, node.y)
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // Enhanced connection count badge
      if (node.connections > 0) {
        const badgeRadius = isSelected ? 12 : 10
        const badgeX = node.x + node.radius - 3
        const badgeY = node.y - node.radius + 3
        
        // Badge gradient
        const badgeGradient = ctx.createRadialGradient(
          badgeX - badgeRadius * 0.3,
          badgeY - badgeRadius * 0.3,
          0,
          badgeX,
          badgeY,
          badgeRadius
        )
        badgeGradient.addColorStop(0, '#ff6b6b')
        badgeGradient.addColorStop(1, '#e63946')
        
        // Badge shadow
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(230, 57, 70, 0.4)'
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2
        
        ctx.fillStyle = badgeGradient
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI)
        ctx.fill()
        
        // Badge border
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Badge text
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${isSelected ? '11px' : '9px'} Inter, sans-serif`
        ctx.fillText(node.connections.toString(), badgeX, badgeY)
      }
      
      // Type indicator icon
      if (isSelected || isHovered) {
        const iconSize = 16
        const iconX = node.x - node.radius + 8
        const iconY = node.y + node.radius - 8
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.font = `${iconSize}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        const icons = {
          component: '⚛',
          class: '🏛',
          function: '⚡',
          method: '🔧'
        }
        
        const icon = icons[node.type as keyof typeof icons] || '📦'
        ctx.fillText(icon, iconX, iconY)
      }
    })

    ctx.restore()
  }, [scale, offset, hoveredNode, selectedNode, filteredTypes])

  const animate = useCallback(() => {
    applyForces()
    draw()
    animationRef.current = requestAnimationFrame(animate)
  }, [applyForces, draw])

  useEffect(() => {
    animate()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - offset.x) / scale
    const y = (e.clientY - rect.top - offset.y) / scale

    // Check if clicking on a node
    const clickedNode = nodesRef.current.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      return Math.sqrt(dx * dx + dy * dy) <= node.radius
    })

    if (clickedNode) {
      setSelectedNode(clickedNode.id)
      onNodeClick?.(clickedNode.id)
    } else {
      setIsDragging(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    } else {
      // Check for hovered node
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left - offset.x) / scale
      const y = (e.clientY - rect.top - offset.y) / scale

      const hoveredNode = nodesRef.current.find(node => {
        const dx = x - node.x
        const dy = y - node.y
        return Math.sqrt(dx * dx + dy * dy) <= node.radius
      })

      setHoveredNode(hoveredNode?.id || null)
      canvas.style.cursor = hoveredNode ? 'pointer' : isDragging ? 'grabbing' : 'grab'
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.1, Math.min(3, prev * zoomFactor)))
  }

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const toggleFilter = (type: string) => {
    setFilteredTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  const relationshipTypes = ['imports', 'extends', 'implements', 'calls', 'renders', 'uses']

  return (
    <div className="w-full h-full space-y-6">
      {/* Enhanced Controls Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          {/* Zoom Controls */}
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Controls:</div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScale(prev => Math.min(3, prev * 1.2))}
                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="px-2 py-1 text-sm font-mono text-slate-600 dark:text-slate-400 min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScale(prev => Math.max(0.1, prev * 0.8))}
                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetView}
                className="h-8 px-3 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          
          {/* Relationship Type Filters */}
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter Relationships:</div>
            <div className="flex gap-2 flex-wrap">
              {relationshipTypes.map(type => (
                <Badge
                  key={type}
                  variant={filteredTypes.has(type) ? "outline" : "default"}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                    filteredTypes.has(type) ? 'opacity-50 grayscale' : 'shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => toggleFilter(type)}
                  style={{
                    backgroundColor: filteredTypes.has(type) ? 'transparent' : getEdgeColor(type, 0.1),
                    borderColor: getEdgeColor(type, 1),
                    color: filteredTypes.has(type) ? 'currentColor' : getEdgeColor(type, 1)
                  }}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: getEdgeColor(type, 1) }}></span>
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Graph Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      >
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%" className="text-slate-300 dark:text-slate-700">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing"
        />
        
        {/* Enhanced Node Info Tooltip */}
        {hoveredNode && (
          <div className="absolute top-6 left-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 p-4 z-20 min-w-[200px] backdrop-blur-sm bg-white/95 dark:bg-slate-800/95">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ 
                backgroundColor: getNodeColor(nodesRef.current.find(n => n.id === hoveredNode)?.type || 'component', false, false) 
              }}></div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {nodesRef.current.find(n => n.id === hoveredNode)?.name}
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Type: {nodesRef.current.find(n => n.id === hoveredNode)?.type}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Connections: {nodesRef.current.find(n => n.id === hoveredNode)?.connections || 0}
            </div>
          </div>
        )}
        
        {/* Graph Instructions */}
        <div className="absolute bottom-6 right-6 bg-slate-900/80 dark:bg-slate-100/80 text-white dark:text-slate-900 rounded-lg p-3 text-sm backdrop-blur-sm">
          <div className="font-medium mb-1">Graph Controls:</div>
          <div className="space-y-1 text-xs opacity-90">
            <div>• Drag to pan around</div>
            <div>• Scroll to zoom in/out</div>
            <div>• Click nodes to select</div>
            <div>• Hover for details</div>
          </div>
        </div>
      </div>
    </div>
  )
}