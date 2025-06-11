"use client"
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { ZoomIn, ZoomOut, RotateCcw, Filter, Shuffle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

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
  filePath?: string
}

interface Edge {
  source: string
  target: string
  type: 'uses' | 'inherits' | 'contains'
  color: string
  width: number
  weight?: number
  context?: string
}

interface InteractiveGraphProps {
  nodes: Node[]
  edges: Edge[]
  focusNodeId?: string
  selectedNodeId?: string
  onNodeClick?: (nodeId: string) => void
  onNodeHover?: (nodeId: string | null) => void
  showMinimap?: boolean
}

export function InteractiveGraph({ nodes, edges, focusNodeId, selectedNodeId, onNodeClick, onNodeHover, showMinimap = true }: InteractiveGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(focusNodeId || null)
  
  // Update selected node when selectedNodeId prop changes
  useEffect(() => {
    setSelectedNode(selectedNodeId || null)
  }, [selectedNodeId])
  const [filteredTypes, setFilteredTypes] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [layoutMode, setLayoutMode] = useState<'force' | 'hierarchical' | 'circular'>('force')
  const [showLabels, setShowLabels] = useState(true)
  const [showConnectionsOnly, setShowConnectionsOnly] = useState(false)
  const [nodeSpacing, setNodeSpacing] = useState(150)
  const [isAutoLayouting, setIsAutoLayouting] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const animationRef = useRef<number>()
  const nodesRef = useRef<Node[]>(nodes)
  const edgesRef = useRef<Edge[]>(edges)

  // Physics simulation parameters
  const FORCE_STRENGTH = layoutMode === 'force' ? 0.03 : 0.01
  const DAMPING = 0.85
  const CENTER_FORCE = layoutMode === 'force' ? 0.005 : 0.001

  // Update refs when props change and apply layout
  useEffect(() => {
    let layoutNodes = [...nodes]
    
    if (layoutMode === 'hierarchical') {
      layoutNodes = applyHierarchicalLayout(layoutNodes, edges)
    } else if (layoutMode === 'circular') {
      layoutNodes = applyCircularLayout(layoutNodes)
    }
    
    nodesRef.current = layoutNodes
    edgesRef.current = edges
  }, [nodes, edges, layoutMode])

  const getNodeGradient = (type: string) => {
    const gradients = {
      component: ['#10F5CC', '#0EA5E9'], // Cyan to blue gradient
      class: ['#818CF8', '#6366F1'], // Indigo gradient
      function: ['#FCD34D', '#F59E0B'], // Yellow gradient
      method: ['#F472B6', '#EC4899'] // Pink gradient
    }
    return gradients[type as keyof typeof gradients] || ['#9CA3AF', '#6B7280']
  }

  const getEdgeColor = (type: string, opacity = 1) => {
    const colors = {
      'uses': `rgba(59, 130, 246, ${opacity})`, // Blue - component uses
      'inherits': `rgba(147, 51, 234, ${opacity})`, // Purple - inheritance
      'contains': `rgba(16, 185, 129, ${opacity})` // Green - containment
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
        const idealDistance = nodeSpacing
        
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

    // Repulsion forces between nodes (stronger to prevent overlaps)
    for (let i = 0; i < currentNodes.length; i++) {
      for (let j = i + 1; j < currentNodes.length; j++) {
        const nodeA = currentNodes[i]
        const nodeB = currentNodes[j]
        
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        const minDistance = nodeSpacing * 0.8 // Minimum safe distance
        const repulsionDistance = nodeSpacing * 1.5
        
        if (distance > 0) {
          let force = 0
          
          if (distance < minDistance) {
            // Strong repulsion for overlapping nodes
            force = (minDistance - distance) * 0.1
          } else if (distance < repulsionDistance) {
            // Normal repulsion
            force = (repulsionDistance - distance) * 0.02
          }
          
          if (force > 0) {
            const forceX = (dx / distance) * force
            const forceY = (dy / distance) * force
            
            nodeA.vx = (nodeA.vx || 0) - forceX
            nodeA.vy = (nodeA.vy || 0) - forceY
            nodeB.vx = (nodeB.vx || 0) + forceX
            nodeB.vy = (nodeB.vy || 0) + forceY
          }
        } else {
          // Nodes at exact same position - push them apart immediately
          const randomAngle = Math.random() * Math.PI * 2
          const pushDistance = minDistance
          nodeA.x += Math.cos(randomAngle) * pushDistance * 0.5
          nodeA.y += Math.sin(randomAngle) * pushDistance * 0.5
          nodeB.x -= Math.cos(randomAngle) * pushDistance * 0.5
          nodeB.y -= Math.sin(randomAngle) * pushDistance * 0.5
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
  }, [nodeSpacing])

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

    // Filter edges for drawing
    const drawableEdges = currentEdges.filter(edge => !filteredTypes.has(edge.type))

    // Draw edges (filtered)
    drawableEdges.forEach(edge => {

      const sourceNode = currentNodes.find(n => n.id === edge.source)
      const targetNode = currentNodes.find(n => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        const isHighlighted = selectedNode === edge.source || selectedNode === edge.target
        const isHovered = hoveredNode === edge.source || hoveredNode === edge.target
        const opacity = isHighlighted ? 1 : isHovered ? 0.8 : 0.6
        const edgeWeight = (edge as any).weight || 1
        const baseWidth = Math.max(1, Math.min(6, edgeWeight))
        const lineWidth = isHighlighted ? baseWidth + 3 : isHovered ? baseWidth + 1 : baseWidth
        
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
          case 'uses':
            ctx.setLineDash([]) // Solid line for uses
            break
          case 'inherits':
            ctx.setLineDash([12, 3, 3, 3]) // Dash-dot for inheritance
            break
          case 'contains':
            ctx.setLineDash([8, 4]) // Dashed for containment
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
        
        // Enhanced arrow for all relationships with size based on weight
        const angle = Math.atan2(dy, dx)
        const arrowLength = isHighlighted ? 25 : Math.max(12, 12 + edgeWeight * 2)
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

    // Draw nodes (only visible ones)
    const visibleNodes = showConnectionsOnly && selectedNode 
      ? currentNodes.filter(node => 
          node.id === selectedNode ||
          drawableEdges.some(edge => edge.source === node.id || edge.target === node.id)
        )
      : currentNodes.filter(node => 
          !searchTerm || 
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.type.toLowerCase().includes(searchTerm.toLowerCase())
        )
    
    visibleNodes.forEach(node => {
      const isSelected = selectedNode === node.id
      const isHovered = hoveredNode === node.id
      const [color1, color2] = getNodeGradient(node.type)
      
      // Modern card-based node design
      ctx.save()
      
      const nodeSize = node.radius * 2.5
      const cornerRadius = 16
      
      // Outer glow for selected/hovered nodes
      if (isSelected || isHovered) {
        const glowSize = isSelected ? 20 : 12
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, nodeSize + glowSize
        )
        glowGradient.addColorStop(0, isSelected ? color1 + '40' : color1 + '20')
        glowGradient.addColorStop(0.5, isSelected ? color1 + '20' : color1 + '10')
        glowGradient.addColorStop(1, 'transparent')
        
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, nodeSize + glowSize, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Modern shadow
      ctx.shadowBlur = isSelected ? 30 : isHovered ? 20 : 15
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = isSelected ? 8 : isHovered ? 6 : 4
      
      // Main node background - glassmorphism effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.beginPath()
      roundRect(ctx, node.x - nodeSize/2, node.y - nodeSize/2, nodeSize, nodeSize, cornerRadius)
      ctx.fill()
      
      // Reset shadow for inner elements
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // Gradient border
      const borderGradient = ctx.createLinearGradient(
        node.x - nodeSize/2, node.y - nodeSize/2,
        node.x + nodeSize/2, node.y + nodeSize/2
      )
      borderGradient.addColorStop(0, color1)
      borderGradient.addColorStop(1, color2)
      
      ctx.strokeStyle = borderGradient
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1
      ctx.beginPath()
      roundRect(ctx, node.x - nodeSize/2, node.y - nodeSize/2, nodeSize, nodeSize, cornerRadius)
      ctx.stroke()
      
      // Type icon background
      const iconBgSize = 24
      const iconBgGradient = ctx.createLinearGradient(
        node.x - iconBgSize/2, node.y - nodeSize/2 + 10,
        node.x + iconBgSize/2, node.y - nodeSize/2 + 10 + iconBgSize
      )
      iconBgGradient.addColorStop(0, color1)
      iconBgGradient.addColorStop(1, color2)
      
      ctx.fillStyle = iconBgGradient
      ctx.beginPath()
      ctx.arc(node.x, node.y - nodeSize/2 + 22, iconBgSize/2, 0, 2 * Math.PI)
      ctx.fill()
      
      // Type icon
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const icons = {
        component: '⚛',
        class: '◧',
        function: 'ƒ',
        method: '◉'
      }
      
      ctx.fillText(icons[node.type as keyof typeof icons] || '◆', node.x, node.y - nodeSize/2 + 22)
      
      ctx.restore()
      
      
      // Node label - modern typography
      if (showLabels || isSelected || isHovered) {
        ctx.save()
        
        // Text background for better readability
        const textMetrics = ctx.measureText(node.name)
        const textWidth = Math.min(textMetrics.width, nodeSize - 10)
        const textHeight = 16
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'
        roundRect(
          ctx,
          node.x - textWidth/2 - 4,
          node.y - textHeight/2 - 2,
          textWidth + 8,
          textHeight + 4,
          4
        )
        ctx.fill()
        
        // Node name
        ctx.fillStyle = '#1f2937'
        ctx.font = `${isSelected ? '600' : '500'} ${isSelected ? '11px' : '10px'} Inter, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Truncate long names
        let displayName = node.name
        if (displayName.length > 12) {
          displayName = displayName.substring(0, 10) + '...'
        }
        
        ctx.fillText(displayName, node.x, node.y)
        
        // File path (smaller, below name)
        if ((isSelected || isHovered) && node.filePath) {
          ctx.fillStyle = '#9ca3af'
          ctx.font = '8px Inter, system-ui, sans-serif'
          const fileName = node.filePath.split('/').pop() || ''
          ctx.fillText(fileName, node.x, node.y + 14)
        }
        
        ctx.restore()
      }
      
      // Connection count indicator - modern pill style
      if (node.connections > 0) {
        ctx.save()
        
        const badgeHeight = 20
        const badgeText = node.connections.toString()
        ctx.font = '10px Inter, sans-serif'
        const badgeWidth = Math.max(24, ctx.measureText(badgeText).width + 12)
        const badgeX = node.x
        const badgeY = node.y + nodeSize/2 - 10
        
        // Badge background
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'
        ctx.beginPath()
        roundRect(ctx, badgeX - badgeWidth/2, badgeY - badgeHeight/2, badgeWidth, badgeHeight, badgeHeight/2)
        ctx.fill()
        
        // Badge border
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 1
        ctx.stroke()
        
        // Badge text
        ctx.fillStyle = '#ef4444'
        ctx.font = '600 10px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(badgeText + ' connections', badgeX, badgeY)
        ctx.restore()
      }
      
    })

    ctx.restore()
  }, [scale, offset, hoveredNode, selectedNode, filteredTypes, searchTerm, showConnectionsOnly, showLabels])

  // Helper function for rounded rectangles
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }


  // Layout algorithms
  const applyHierarchicalLayout = (nodes: Node[], edges: Edge[]) => {
    const levels = new Map<string, number>()
    const visited = new Set<string>()
    
    // Find root nodes (no incoming edges)
    const incomingCount = new Map<string, number>()
    nodes.forEach(node => incomingCount.set(node.id, 0))
    edges.forEach(edge => {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1)
    })
    
    const rootNodes = nodes.filter(node => incomingCount.get(node.id) === 0)
    
    // BFS to assign levels
    const queue = rootNodes.map(node => ({ id: node.id, level: 0 }))
    
    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      if (visited.has(id)) continue
      
      visited.add(id)
      levels.set(id, level)
      
      edges
        .filter(edge => edge.source === id)
        .forEach(edge => {
          if (!visited.has(edge.target)) {
            queue.push({ id: edge.target, level: level + 1 })
          }
        })
    }
    
    // Position nodes by level
    const levelGroups = new Map<number, string[]>()
    levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) levelGroups.set(level, [])
      levelGroups.get(level)!.push(nodeId)
    })
    
    return nodes.map(node => {
      const level = levels.get(node.id) || 0
      const nodesAtLevel = levelGroups.get(level) || []
      const index = nodesAtLevel.indexOf(node.id)
      
      const levelSpacing = nodeSpacing * 1.8
      const nodeSpacingInLevel = nodeSpacing * 0.8
      
      return {
        ...node,
        x: 150 + level * levelSpacing,
        y: 100 + (index * nodeSpacingInLevel) - ((nodesAtLevel.length - 1) * nodeSpacingInLevel / 2),
        fx: layoutMode === 'hierarchical' ? 150 + level * levelSpacing : null,
        fy: layoutMode === 'hierarchical' ? 100 + (index * nodeSpacingInLevel) - ((nodesAtLevel.length - 1) * nodeSpacingInLevel / 2) : null
      }
    })
  }
  
  const applyCircularLayout = (nodes: Node[]) => {
    const centerX = 400
    const centerY = 300
    const radius = Math.max(nodeSpacing, 100 + nodes.length * (nodeSpacing / 10))
    
    return nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        fx: layoutMode === 'circular' ? centerX + radius * Math.cos(angle) : null,
        fy: layoutMode === 'circular' ? centerY + radius * Math.sin(angle) : null
      }
    })
  }

  // Check if two nodes overlap
  const nodesOverlap = (node1: Node, node2: Node, minDistance: number) => {
    const dx = node1.x - node2.x
    const dy = node1.y - node2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < minDistance
  }

  // Find a non-overlapping position for a node
  const findNonOverlappingPosition = (node: Node, otherNodes: Node[], centerX: number, centerY: number, minDistance: number, maxAttempts = 50) => {
    let bestPosition = { x: node.x, y: node.y }
    let bestDistance = 0
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Try different positions around the center
      const angle = (Math.PI * 2 * attempt) / maxAttempts
      const radius = minDistance + (attempt * 20)
      const testX = centerX + Math.cos(angle) * radius
      const testY = centerY + Math.sin(angle) * radius
      
      const testNode = { ...node, x: testX, y: testY }
      
      // Check if this position overlaps with any other node
      let overlaps = false
      let minDistanceToOthers = Infinity
      
      for (const otherNode of otherNodes) {
        if (otherNode.id === node.id) continue
        
        const distance = Math.sqrt((testX - otherNode.x) ** 2 + (testY - otherNode.y) ** 2)
        minDistanceToOthers = Math.min(minDistanceToOthers, distance)
        
        if (distance < minDistance) {
          overlaps = true
          break
        }
      }
      
      if (!overlaps) {
        return { x: testX, y: testY }
      }
      
      // Keep track of the best position (furthest from other nodes)
      if (minDistanceToOthers > bestDistance) {
        bestDistance = minDistanceToOthers
        bestPosition = { x: testX, y: testY }
      }
    }
    
    return bestPosition
  }

  // Auto-layout function to clean up node positions
  const autoLayout = useCallback(() => {
    setIsAutoLayouting(true)
    
    const currentNodes = nodesRef.current
    if (!currentNodes || currentNodes.length === 0) {
      setIsAutoLayouting(false)
      return
    }

    // Clear any fixed positions
    currentNodes.forEach(node => {
      node.fx = null
      node.fy = null
      node.vx = 0
      node.vy = 0
    })

    const minDistance = nodeSpacing * 0.8 // Minimum distance between node centers
    const centerX = 400
    const centerY = 300

    // Apply current layout mode
    if (layoutMode === 'hierarchical') {
      const layoutNodes = applyHierarchicalLayout(currentNodes, edgesRef.current)
      
      // Apply positions and resolve overlaps level by level
      const levels = new Map<number, Node[]>()
      
      layoutNodes.forEach((layoutNode, index) => {
        const level = Math.floor((layoutNode.x - 150) / (nodeSpacing * 1.8))
        if (!levels.has(level)) levels.set(level, [])
        
        currentNodes[index].x = layoutNode.x
        currentNodes[index].y = layoutNode.y
        levels.get(level)!.push(currentNodes[index])
      })
      
      // Fix overlaps within each level
      levels.forEach((nodesInLevel, level) => {
        nodesInLevel.sort((a, b) => a.y - b.y)
        
        for (let i = 0; i < nodesInLevel.length; i++) {
          for (let j = i + 1; j < nodesInLevel.length; j++) {
            if (nodesOverlap(nodesInLevel[i], nodesInLevel[j], minDistance)) {
              // Move the lower node down
              nodesInLevel[j].y = nodesInLevel[i].y + minDistance
            }
          }
        }
      })
      
    } else if (layoutMode === 'circular') {
      const layoutNodes = applyCircularLayout(currentNodes)
      layoutNodes.forEach((layoutNode, index) => {
        currentNodes[index].x = layoutNode.x
        currentNodes[index].y = layoutNode.y
      })
      
      // Circular layout shouldn't have overlaps, but check anyway
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          if (nodesOverlap(currentNodes[i], currentNodes[j], minDistance)) {
            // Adjust radius slightly for overlapping nodes
            const angle = Math.atan2(currentNodes[j].y - centerY, currentNodes[j].x - centerX)
            const newRadius = Math.sqrt((currentNodes[j].x - centerX) ** 2 + (currentNodes[j].y - centerY) ** 2) + minDistance
            currentNodes[j].x = centerX + Math.cos(angle) * newRadius
            currentNodes[j].y = centerY + Math.sin(angle) * newRadius
          }
        }
      }
      
    } else {
      // Force layout - use intelligent grid placement with overlap resolution
      const sortedNodes = [...currentNodes].sort((a, b) => b.connections - a.connections) // Place highly connected nodes first
      
      // Start with a spiral pattern for better distribution
      sortedNodes.forEach((node, index) => {
        if (index === 0) {
          // First node at center
          node.x = centerX
          node.y = centerY
        } else {
          // Place subsequent nodes in a spiral
          const angle = index * 0.5 // Golden angle approximation
          const radius = Math.sqrt(index) * (nodeSpacing * 0.6)
          let newX = centerX + Math.cos(angle) * radius
          let newY = centerY + Math.sin(angle) * radius
          
          // Find non-overlapping position
          const position = findNonOverlappingPosition(
            { ...node, x: newX, y: newY },
            sortedNodes.slice(0, index),
            centerX,
            centerY,
            minDistance
          )
          
          node.x = position.x
          node.y = position.y
        }
      })
      
      // Final pass to eliminate any remaining overlaps
      for (let iteration = 0; iteration < 3; iteration++) {
        let hasOverlaps = false
        
        for (let i = 0; i < currentNodes.length; i++) {
          for (let j = i + 1; j < currentNodes.length; j++) {
            if (nodesOverlap(currentNodes[i], currentNodes[j], minDistance)) {
              hasOverlaps = true
              
              // Move nodes apart
              const dx = currentNodes[j].x - currentNodes[i].x
              const dy = currentNodes[j].y - currentNodes[i].y
              const distance = Math.sqrt(dx * dx + dy * dy)
              
              if (distance > 0) {
                const pushDistance = (minDistance - distance) / 2
                const normalX = dx / distance
                const normalY = dy / distance
                
                currentNodes[i].x -= normalX * pushDistance
                currentNodes[i].y -= normalY * pushDistance
                currentNodes[j].x += normalX * pushDistance
                currentNodes[j].y += normalY * pushDistance
              } else {
                // Nodes are at exact same position, move them apart
                currentNodes[j].x += minDistance
                currentNodes[j].y += minDistance * 0.5
              }
            }
          }
        }
        
        if (!hasOverlaps) break
      }
    }

    // Animation timeout
    setTimeout(() => {
      setIsAutoLayouting(false)
    }, 1000)
  }, [layoutMode, nodeSpacing])

  const animate = useCallback(() => {
    if (layoutMode === 'force') {
      applyForces()
    }
    draw()
    animationRef.current = requestAnimationFrame(animate)
  }, [applyForces, draw, layoutMode])

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

    // Check if clicking on a node (only from visible nodes)
    const currentEdges = edgesRef.current.filter(edge => !filteredTypes.has(edge.type))
    const visibleNodes = showConnectionsOnly && selectedNode 
      ? nodesRef.current.filter(node => 
          node.id === selectedNode ||
          currentEdges.some(edge => edge.source === node.id || edge.target === node.id)
        )
      : nodesRef.current.filter(node => 
          !searchTerm || 
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.type.toLowerCase().includes(searchTerm.toLowerCase())
        )
    
    const clickedNode = visibleNodes.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      return Math.sqrt(dx * dx + dy * dy) <= node.radius
    })

    if (clickedNode) {
      // Start node dragging
      setDraggedNode(clickedNode.id)
      setDragOffset({
        x: x - clickedNode.x,
        y: y - clickedNode.y
      })
      onNodeClick?.(clickedNode.id)
      
      // Fix the node position during dragging
      clickedNode.fx = clickedNode.x
      clickedNode.fy = clickedNode.y
    } else {
      // Start canvas dragging
      setIsDragging(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - offset.x) / scale
    const y = (e.clientY - rect.top - offset.y) / scale

    if (draggedNode) {
      // Dragging a node
      const node = nodesRef.current.find(n => n.id === draggedNode)
      if (node) {
        node.x = x - dragOffset.x
        node.y = y - dragOffset.y
        node.fx = node.x
        node.fy = node.y
      }
      canvas.style.cursor = 'grabbing'
    } else if (isDragging) {
      // Dragging the canvas
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
      canvas.style.cursor = 'grabbing'
    } else {
      // Check for hovered node (only from visible nodes)
      const currentEdges = edgesRef.current.filter(edge => !filteredTypes.has(edge.type))
      const visibleNodes = showConnectionsOnly && selectedNode 
        ? nodesRef.current.filter(node => 
            node.id === selectedNode ||
            currentEdges.some(edge => edge.source === node.id || edge.target === node.id)
          )
        : nodesRef.current.filter(node => 
            !searchTerm || 
            node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.type.toLowerCase().includes(searchTerm.toLowerCase())
          )
      
      const hoveredNode = visibleNodes.find(node => {
        const dx = x - node.x
        const dy = y - node.y
        return Math.sqrt(dx * dx + dy * dy) <= node.radius
      })

      setHoveredNode(hoveredNode?.id || null)
      canvas.style.cursor = hoveredNode ? 'pointer' : 'grab'
    }
  }

  const handleMouseUp = () => {
    if (draggedNode) {
      // Release the dragged node but keep it fixed in place
      const node = nodesRef.current.find(n => n.id === draggedNode)
      if (node) {
        // Keep the node fixed for a bit, then release for physics
        setTimeout(() => {
          node.fx = null
          node.fy = null
        }, 500)
      }
      setDraggedNode(null)
      setDragOffset({ x: 0, y: 0 })
    }
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

  const relationshipTypes = ['uses', 'inherits', 'contains']

  return (
    <div className="w-full h-full space-y-6">
      {/* Enhanced Controls Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          {/* Top Row: Search and Layout Controls */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Search:</div>
              <Input
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Layout:</div>
              <Select value={layoutMode} onValueChange={(value: any) => setLayoutMode(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force-Directed</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Middle Row: View Options */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded"
                />
                Show Labels
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showConnectionsOnly}
                  onChange={(e) => setShowConnectionsOnly(e.target.checked)}
                  className="rounded"
                  disabled={!selectedNode}
                />
                Show Connections Only
              </label>
            </div>
            
            {/* Spacing & Layout Controls */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Spacing:</div>
                <div className="flex items-center gap-3 w-32">
                  <Slider
                    value={[nodeSpacing]}
                    onValueChange={(value) => setNodeSpacing(value[0])}
                    min={50}
                    max={300}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 min-w-[2rem]">{nodeSpacing}px</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={autoLayout}
                disabled={isAutoLayouting}
                className="h-8 px-3 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800"
              >
                <Shuffle className={`h-4 w-4 mr-1 ${isAutoLayouting ? 'animate-spin' : ''}`} />
                {isAutoLayouting ? 'Layouting...' : 'Auto Layout'}
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Zoom:</div>
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
            </div>
          </div>
          
          {/* Bottom Row: Relationship Type Filters */}
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
                backgroundColor: getNodeGradient(nodesRef.current.find(n => n.id === hoveredNode)?.type || 'component')[0] 
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
            <div>• Drag canvas to pan around</div>
            <div>• Drag nodes to reposition</div>
            <div>• Scroll to zoom in/out</div>
            <div>• Click nodes to select</div>
            <div>• Hover for details</div>
          </div>
        </div>
      </div>
    </div>
  )
}