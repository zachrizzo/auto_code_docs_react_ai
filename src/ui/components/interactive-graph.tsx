"use client"
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
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
  const [layoutMode, setLayoutMode] = useState<'force' | 'hierarchical' | 'circular' | 'grouped'>('force')
  const [showLabels, setShowLabels] = useState(true)
  const [showConnectionsOnly, setShowConnectionsOnly] = useState(false)
  const [nodeSpacing, setNodeSpacing] = useState(150)
  const [isAutoLayouting, setIsAutoLayouting] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)
  const [groupDragOffset, setGroupDragOffset] = useState({ x: 0, y: 0 })
  const [groupingMode, setGroupingMode] = useState<'none' | 'file' | 'parent'>('none')
  const [showGroupContainers, setShowGroupContainers] = useState(true)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Node[]>(nodes)
  const edgesRef = useRef<Edge[]>(edges)

  // Physics simulation parameters
  const FORCE_STRENGTH = layoutMode === 'force' ? 0.03 : 0.01
  const DAMPING = 0.85
  const CENTER_FORCE = layoutMode === 'force' ? 0.005 : 0.001

  // Create groups based on grouping mode
  const nodeGroups = useMemo(() => {
    if (groupingMode === 'none') return new Map<string, Node[]>()
    
    const groups = new Map<string, Node[]>()
    
    if (groupingMode === 'file') {
      // Group by file path
      nodes.forEach(node => {
        let groupKey = 'Unknown'
        
        if (node.filePath && node.filePath.trim() !== '') {
          let filePath = node.filePath
          
          // Remove common prefixes to get to the meaningful file path
          const prefixesToRemove = [
            '/Users/zachrizzo/Desktop/programming/auto_code_docs_react_ai/',
            'src/',
            './src/',
            './'
          ]
          
          for (const prefix of prefixesToRemove) {
            if (filePath.startsWith(prefix)) {
              filePath = filePath.substring(prefix.length)
              break
            }
          }
          
          // Extract the file name from the path
          const lastSlashIndex = filePath.lastIndexOf('/')
          let fileName = lastSlashIndex >= 0 ? filePath.substring(lastSlashIndex + 1) : filePath
          
          // Remove file extension for cleaner grouping
          fileName = fileName.replace(/\.(tsx?|jsx?|js|ts)$/, '')
          
          // Handle default fallback paths specially
          if (filePath.startsWith('components/') && !filePath.includes('/', 'components/'.length)) {
            // This is a default fallback path like "components/MyComponent"
            groupKey = fileName
          } else {
            // Use the file name as the group key
            groupKey = fileName
          }
        } else {
          // No file path available, group by component type
          groupKey = `Unknown (${node.type})`
        }
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, [])
        }
        groups.get(groupKey)!.push(node)
      })
    } else if (groupingMode === 'parent') {
      // Group by parent component (nodes that contain other nodes)
      const parentMap = new Map<string, string>() // child -> parent
      
      edges.forEach(edge => {
        if (edge.type === 'contains') {
          parentMap.set(edge.target, edge.source)
        }
      })
      
      // Group nodes by their parent
      nodes.forEach(node => {
        const parent = parentMap.get(node.id) || 'root'
        if (!groups.has(parent)) {
          groups.set(parent, [])
        }
        groups.get(parent)!.push(node)
      })
    }
    
    return groups
  }, [nodes, edges, groupingMode])

  // Update refs when props change and apply layout
  useEffect(() => {
    let layoutNodes = [...nodes]
    
    if (layoutMode === 'hierarchical') {
      layoutNodes = applyHierarchicalLayout(layoutNodes, edges)
    } else if (layoutMode === 'circular') {
      layoutNodes = applyCircularLayout(layoutNodes)
    } else if (layoutMode === 'grouped' && groupingMode !== 'none') {
      layoutNodes = applyGroupedLayout(layoutNodes, nodeGroups)
    }
    
    nodesRef.current = layoutNodes
    edgesRef.current = edges
  }, [nodes, edges, layoutMode, nodeGroups, groupingMode])

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
    const groupBoxes = (currentNodes as any).groupBoxes as Map<string, { x: number, y: number, width: number, height: number }> | undefined

    // Draw group containers first (behind everything else)
    if (showGroupContainers && groupBoxes && groupingMode !== 'none') {
      groupBoxes.forEach((box, groupKey) => {
        ctx.save()
        
        const isDraggedGroup = draggedGroup === groupKey
        const isHoveredGroup = hoveredNode === `group-${groupKey}`
        
        // Enhanced group container style with better visibility
        const baseAlpha = isDraggedGroup ? 0.15 : isHoveredGroup ? 0.12 : 0.08
        const borderAlpha = isDraggedGroup ? 0.6 : isHoveredGroup ? 0.5 : 0.4
        
        // Gradient background
        const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height)
        gradient.addColorStop(0, `rgba(59, 130, 246, ${baseAlpha})`)
        gradient.addColorStop(1, `rgba(147, 51, 234, ${baseAlpha * 0.7})`)
        
        ctx.fillStyle = gradient
        ctx.strokeStyle = `rgba(59, 130, 246, ${borderAlpha})`
        ctx.lineWidth = isDraggedGroup ? 3 : 2
        ctx.setLineDash(isDraggedGroup ? [12, 6] : [8, 4])
        
        // Enhanced shadow for depth
        if (isDraggedGroup || isHoveredGroup) {
          ctx.shadowBlur = 20
          ctx.shadowColor = 'rgba(59, 130, 246, 0.3)'
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 4
        }
        
        // Draw rounded rectangle for group with larger radius
        const radius = 24
        ctx.beginPath()
        ctx.moveTo(box.x + radius, box.y)
        ctx.lineTo(box.x + box.width - radius, box.y)
        ctx.quadraticCurveTo(box.x + box.width, box.y, box.x + box.width, box.y + radius)
        ctx.lineTo(box.x + box.width, box.y + box.height - radius)
        ctx.quadraticCurveTo(box.x + box.width, box.y + box.height, box.x + box.width - radius, box.y + box.height)
        ctx.lineTo(box.x + radius, box.y + box.height)
        ctx.quadraticCurveTo(box.x, box.y + box.height, box.x, box.y + box.height - radius)
        ctx.lineTo(box.x, box.y + radius)
        ctx.quadraticCurveTo(box.x, box.y, box.x + radius, box.y)
        ctx.closePath()
        
        ctx.fill()
        ctx.stroke()
        
        // Reset shadow
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        // Enhanced group label with better styling
        ctx.setLineDash([])
        ctx.font = '14px Inter, sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        
        // Format group label
        let label = groupKey
        if (groupingMode === 'file') {
          if (groupKey.startsWith('Unknown (')) {
            label = groupKey
          } else {
            label = `📁 ${groupKey}.tsx`
          }
        } else if (groupingMode === 'parent') {
          const parentNode = currentNodes.find(n => n.id === groupKey)
          label = parentNode ? `🏗️ ${parentNode.name}` : (groupKey === 'root' ? '🌐 Root Components' : groupKey)
        }
        
        // Enhanced label background with gradient
        const labelPadding = 10
        const textMetrics = ctx.measureText(label)
        const labelWidth = textMetrics.width + labelPadding * 2
        const labelHeight = 28
        const labelX = box.x + 15
        const labelY = box.y - 18
        
        // Label gradient background
        const labelGradient = ctx.createLinearGradient(labelX, labelY, labelX + labelWidth, labelY + labelHeight)
        labelGradient.addColorStop(0, 'rgba(59, 130, 246, 0.95)')
        labelGradient.addColorStop(1, 'rgba(147, 51, 234, 0.95)')
        
        ctx.fillStyle = labelGradient
        ctx.beginPath()
        ctx.moveTo(labelX + 8, labelY)
        ctx.lineTo(labelX + labelWidth - 8, labelY)
        ctx.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + 8)
        ctx.lineTo(labelX + labelWidth, labelY + labelHeight - 8)
        ctx.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - 8, labelY + labelHeight)
        ctx.lineTo(labelX + 8, labelY + labelHeight)
        ctx.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - 8)
        ctx.lineTo(labelX, labelY + 8)
        ctx.quadraticCurveTo(labelX, labelY, labelX + 8, labelY)
        ctx.closePath()
        ctx.fill()
        
        // Label border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.stroke()
        
        // Label text with shadow
        ctx.shadowBlur = 2
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 1
        
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px Inter, sans-serif'
        ctx.fillText(label, labelX + labelPadding, labelY + 8)
        
        // Drag handle indicator when group is hovered or dragged
        if (isHoveredGroup || isDraggedGroup) {
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          
          const handleSize = 6
          const handleSpacing = 3
          const handleX = box.x + box.width - 20
          const handleY = box.y + 10
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
              ctx.beginPath()
              ctx.arc(
                handleX + j * (handleSize + handleSpacing),
                handleY + i * (handleSize + handleSpacing),
                2,
                0,
                2 * Math.PI
              )
              ctx.fill()
            }
          }
        }
        
        ctx.restore()
      })
    }

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
  }, [scale, offset, hoveredNode, selectedNode, filteredTypes, searchTerm, showConnectionsOnly, showLabels, groupingMode, showGroupContainers])

  // Minimap component with proper viewport tracking
  const MinimapComponent = ({ nodes, edges, scale, offset, canvasRef, selectedNode }: {
    nodes: Node[]
    edges: Edge[]
    scale: number
    offset: { x: number, y: number }
    canvasRef: React.RefObject<HTMLCanvasElement>
    selectedNode: string | null
  }) => {
    const minimapCanvasRef = useRef<HTMLCanvasElement>(null)
    
    useEffect(() => {
      const canvas = minimapCanvasRef.current
      if (!canvas || nodes.length === 0) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, 128, 96)
      
      // Calculate world bounds
      const padding = 50
      const minX = Math.min(...nodes.map(n => n.x)) - padding
      const maxX = Math.max(...nodes.map(n => n.x)) + padding
      const minY = Math.min(...nodes.map(n => n.y)) - padding
      const maxY = Math.max(...nodes.map(n => n.y)) + padding
      
      const worldWidth = maxX - minX
      const worldHeight = maxY - minY
      const scaleX = 128 / worldWidth
      const scaleY = 96 / worldHeight
      const minimapScale = Math.min(scaleX, scaleY)
      
      const offsetX = (128 - worldWidth * minimapScale) / 2
      const offsetY = (96 - worldHeight * minimapScale) / 2
      
      // Draw edges
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)'
      ctx.lineWidth = 1
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)
        
        if (sourceNode && targetNode) {
          const x1 = offsetX + (sourceNode.x - minX) * minimapScale
          const y1 = offsetY + (sourceNode.y - minY) * minimapScale
          const x2 = offsetX + (targetNode.x - minX) * minimapScale
          const y2 = offsetY + (targetNode.y - minY) * minimapScale
          
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      })
      
      // Draw nodes
      nodes.forEach(node => {
        const x = offsetX + (node.x - minX) * minimapScale
        const y = offsetY + (node.y - minY) * minimapScale
        const radius = Math.max(1, 2)
        
        ctx.fillStyle = node.id === selectedNode ? '#3b82f6' : '#64748b'
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fill()
      })
    }, [nodes, edges, selectedNode])

    // Calculate viewport indicator position and size
    const calculateViewport = () => {
      if (!canvasRef.current || nodes.length === 0) return null

      const canvas = canvasRef.current
      const padding = 50
      const minX = Math.min(...nodes.map(n => n.x)) - padding
      const maxX = Math.max(...nodes.map(n => n.x)) + padding
      const minY = Math.min(...nodes.map(n => n.y)) - padding
      const maxY = Math.max(...nodes.map(n => n.y)) + padding
      
      const worldWidth = maxX - minX
      const worldHeight = maxY - minY
      
      // Current viewport in world coordinates
      const viewportLeft = (-offset.x) / scale
      const viewportTop = (-offset.y) / scale
      const viewportWidth = canvas.width / scale
      const viewportHeight = canvas.height / scale
      
      // Convert to minimap coordinates (0-100%)
      const left = Math.max(0, Math.min(100, ((viewportLeft - minX) / worldWidth) * 100))
      const top = Math.max(0, Math.min(100, ((viewportTop - minY) / worldHeight) * 100))
      const width = Math.min(100 - left, (viewportWidth / worldWidth) * 100)
      const height = Math.min(100 - top, (viewportHeight / worldHeight) * 100)
      
      return { left, top, width, height }
    }

    const viewport = calculateViewport()
    
    return (
      <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-lg p-2 shadow-lg">
        <div className="w-32 h-24 relative bg-slate-50 dark:bg-slate-900 rounded overflow-hidden">
          <canvas
            ref={minimapCanvasRef}
            width={128}
            height={96}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
          {/* Viewport indicator */}
          {viewport && (
            <div 
              className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
              style={{
                left: `${viewport.left}%`,
                top: `${viewport.top}%`,
                width: `${viewport.width}%`,
                height: `${viewport.height}%`,
              }}
            />
          )}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 text-center">
          Navigation
        </div>
      </div>
    )
  }

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
  
  // Advanced force-directed layout with group constraints and proper spacing
  const applyAdvancedForceLayout = (nodes: Node[], groups: Map<string, Node[]>) => {
    const layoutNodes = [...nodes]
    const groupBoxes = new Map<string, { x: number, y: number, width: number, height: number, centerX: number, centerY: number, fixed?: boolean }>()
    
    // Calculate optimal group sizing and positioning
    const groupKeys = Array.from(groups.keys())
    const numGroups = groupKeys.length
    
    if (numGroups === 0) return layoutNodes
    
    // Calculate average node size for spacing calculations
    const avgNodeRadius = nodes.length > 0 ? nodes.reduce((sum, node) => sum + node.radius, 0) / nodes.length : 20
    const minNodeSpacing = Math.max(avgNodeRadius * 3, 80) // Minimum distance between node centers
    
    // Dynamic grid sizing based on group count and sizes
    const gridSize = Math.max(2, Math.ceil(Math.sqrt(numGroups * 1.2))) // Slightly larger grid for better spacing
    
    // Calculate required spacing based on largest groups
    const maxNodesInAnyGroup = Math.max(...Array.from(groups.values()).map(nodes => nodes.length))
    const estimatedGroupSize = calculateOptimalGroupSize(maxNodesInAnyGroup, minNodeSpacing)
    const groupSpacing = Math.max(estimatedGroupSize + 100, nodeSpacing * 4)
    
    const startX = 300
    const startY = 300
    
    groupKeys.forEach((groupKey, groupIndex) => {
      const groupNodes = groups.get(groupKey) || []
      const numNodesInGroup = groupNodes.length
      
      // Calculate group position in grid
      const gridRow = Math.floor(groupIndex / gridSize)
      const gridCol = groupIndex % gridSize
      const groupCenterX = startX + gridCol * groupSpacing
      const groupCenterY = startY + gridRow * groupSpacing
      
      // Calculate optimal group dimensions for this specific group
      const optimalSize = calculateOptimalGroupSize(numNodesInGroup, minNodeSpacing)
      const groupPadding = Math.max(50, avgNodeRadius * 2) // Generous padding
      
      // Layout nodes within the group using enhanced algorithm
      const nodePositions = calculateOptimalNodePositions(
        numNodesInGroup, 
        groupCenterX, 
        groupCenterY, 
        optimalSize, 
        minNodeSpacing
      )
      
      groupNodes.forEach((node, nodeIndex) => {
        const layoutNode = layoutNodes.find(n => n.id === node.id)
        if (layoutNode && nodePositions[nodeIndex]) {
          layoutNode.x = nodePositions[nodeIndex].x
          layoutNode.y = nodePositions[nodeIndex].y
        }
      })
      
      // Apply overlap resolution within the group
      resolveInternalNodeOverlaps(groupNodes, layoutNodes, minNodeSpacing)
      
      // Calculate actual bounding box based on final node positions
      const groupNodePositions = groupNodes.map(node => {
        const layoutNode = layoutNodes.find(n => n.id === node.id)
        return layoutNode ? { x: layoutNode.x, y: layoutNode.y, radius: layoutNode.radius } : { x: groupCenterX, y: groupCenterY, radius: avgNodeRadius }
      })
      
      if (groupNodePositions.length > 0) {
        const minX = Math.min(...groupNodePositions.map(p => p.x - p.radius)) - groupPadding
        const maxX = Math.max(...groupNodePositions.map(p => p.x + p.radius)) + groupPadding
        const minY = Math.min(...groupNodePositions.map(p => p.y - p.radius)) - groupPadding
        const maxY = Math.max(...groupNodePositions.map(p => p.y + p.radius)) + groupPadding
        
        const width = Math.max(optimalSize, maxX - minX)
        const height = Math.max(optimalSize, maxY - minY)
        
        groupBoxes.set(groupKey, {
          x: groupCenterX - width / 2,
          y: groupCenterY - height / 2,
          width,
          height,
          centerX: groupCenterX,
          centerY: groupCenterY
        })
      }
    })
    
    // Apply group collision detection and adjustment
    const adjustedGroups = resolveGroupCollisions(groupBoxes)
    
    // Store group boxes for drawing
    ;(layoutNodes as any).groupBoxes = adjustedGroups
    
    return layoutNodes
  }

  // Calculate optimal group size based on number of nodes and spacing requirements
  const calculateOptimalGroupSize = (numNodes: number, minSpacing: number): number => {
    if (numNodes <= 1) return Math.max(120, minSpacing * 2)
    
    // Calculate area needed for nodes with proper spacing
    const nodeArea = numNodes * Math.PI * Math.pow(minSpacing / 2, 2)
    const baseRadius = Math.sqrt(nodeArea / Math.PI)
    
    // Add extra space for better distribution and visual appeal
    const scaleFactor = Math.max(1.5, 1 + Math.log(numNodes) * 0.2)
    return Math.max(180, baseRadius * 2 * scaleFactor)
  }

  // Calculate optimal positions for nodes within a group
  const calculateOptimalNodePositions = (
    numNodes: number, 
    centerX: number, 
    centerY: number, 
    groupSize: number, 
    minSpacing: number
  ): Array<{ x: number, y: number }> => {
    const positions: Array<{ x: number, y: number }> = []
    
    if (numNodes === 1) {
      positions.push({ x: centerX, y: centerY })
      return positions
    }
    
    if (numNodes === 2) {
      const spacing = minSpacing * 0.8
      positions.push({ x: centerX - spacing / 2, y: centerY })
      positions.push({ x: centerX + spacing / 2, y: centerY })
      return positions
    }
    
    if (numNodes <= 6) {
      // Circular arrangement for small groups
      const radius = Math.min(groupSize / 3, minSpacing * 0.7)
      for (let i = 0; i < numNodes; i++) {
        const angle = (2 * Math.PI * i) / numNodes
        positions.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        })
      }
      return positions
    }
    
    // For larger groups, use a hybrid approach: rings + spiral
    const innerRingSize = 6
    const outerNodes = numNodes - innerRingSize
    
    // Inner ring
    const innerRadius = minSpacing * 0.6
    for (let i = 0; i < innerRingSize; i++) {
      const angle = (2 * Math.PI * i) / innerRingSize
      positions.push({
        x: centerX + innerRadius * Math.cos(angle),
        y: centerY + innerRadius * Math.sin(angle)
      })
    }
    
    // Outer spiral for remaining nodes
    const maxRadius = groupSize / 2.5
    const spiralTightness = 0.5
    const angleStep = (2 * Math.PI) / 6 // Base angle step
    
    for (let i = 0; i < outerNodes; i++) {
      const spiralProgress = i / outerNodes
      const radius = innerRadius + (maxRadius - innerRadius) * Math.sqrt(spiralProgress)
      const angle = angleStep * i + spiralProgress * Math.PI * spiralTightness
      
      positions.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      })
    }
    
    return positions
  }

  // Resolve overlaps between nodes within a group
  const resolveInternalNodeOverlaps = (
    groupNodes: Node[], 
    layoutNodes: Node[], 
    minSpacing: number
  ) => {
    const maxIterations = 5
    const groupLayoutNodes = groupNodes.map(node => layoutNodes.find(n => n.id === node.id)).filter(Boolean) as Node[]
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasOverlaps = false
      
      for (let i = 0; i < groupLayoutNodes.length; i++) {
        for (let j = i + 1; j < groupLayoutNodes.length; j++) {
          const nodeA = groupLayoutNodes[i]
          const nodeB = groupLayoutNodes[j]
          
          const dx = nodeB.x - nodeA.x
          const dy = nodeB.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const requiredDistance = minSpacing
          
          if (distance < requiredDistance && distance > 0) {
            hasOverlaps = true
            
            const overlap = requiredDistance - distance
            const separationForce = overlap * 0.5
            const normalX = dx / distance
            const normalY = dy / distance
            
            nodeA.x -= normalX * separationForce
            nodeA.y -= normalY * separationForce
            nodeB.x += normalX * separationForce
            nodeB.y += normalY * separationForce
          } else if (distance === 0) {
            // Handle exact overlap
            const randomAngle = Math.random() * 2 * Math.PI
            const pushDistance = minSpacing / 2
            nodeA.x += Math.cos(randomAngle) * pushDistance
            nodeA.y += Math.sin(randomAngle) * pushDistance
            nodeB.x -= Math.cos(randomAngle) * pushDistance
            nodeB.y -= Math.sin(randomAngle) * pushDistance
            hasOverlaps = true
          }
        }
      }
      
      if (!hasOverlaps) break
    }
  }

  // Resolve collisions between group boxes with enhanced algorithm
  const resolveGroupCollisions = (groupBoxes: Map<string, any>) => {
    const boxes = Array.from(groupBoxes.entries())
    const maxIterations = 15
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasCollisions = false
      
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const [, boxA] = boxes[i]
          const [, boxB] = boxes[j]
          
          // Dynamic padding based on box sizes
          const avgSize = (boxA.width + boxA.height + boxB.width + boxB.height) / 4
          const padding = Math.max(60, avgSize * 0.15)
          
          if (boxA.x < boxB.x + boxB.width + padding &&
              boxA.x + boxA.width + padding > boxB.x &&
              boxA.y < boxB.y + boxB.height + padding &&
              boxA.y + boxA.height + padding > boxB.y) {
            
            hasCollisions = true
            
            // Calculate push direction and force
            const centerAX = boxA.x + boxA.width / 2
            const centerAY = boxA.y + boxA.height / 2
            const centerBX = boxB.x + boxB.width / 2
            const centerBY = boxB.y + boxB.height / 2
            
            const dx = centerBX - centerAX
            const dy = centerBY - centerAY
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance > 0) {
              // Calculate required separation distance
              const requiredDistanceX = (boxA.width + boxB.width) / 2 + padding
              const requiredDistanceY = (boxA.height + boxB.height) / 2 + padding
              const requiredDistance = Math.sqrt(requiredDistanceX * requiredDistanceX + requiredDistanceY * requiredDistanceY)
              
              if (distance < requiredDistance) {
                const overlap = requiredDistance - distance
                const pushDistance = Math.max(40, overlap * 0.6)
                const normalX = dx / distance
                const normalY = dy / distance
                
                // Apply stronger separation force
                boxA.x -= normalX * pushDistance / 2
                boxA.y -= normalY * pushDistance / 2
                boxA.centerX = boxA.x + boxA.width / 2
                boxA.centerY = boxA.y + boxA.height / 2
                
                boxB.x += normalX * pushDistance / 2
                boxB.y += normalY * pushDistance / 2
                boxB.centerX = boxB.x + boxB.width / 2
                boxB.centerY = boxB.y + boxB.height / 2
              }
            } else {
              // Handle exact center overlap
              const randomAngle = Math.random() * 2 * Math.PI
              const pushDistance = Math.max(100, avgSize * 0.5)
              
              boxA.x -= Math.cos(randomAngle) * pushDistance / 2
              boxA.y -= Math.sin(randomAngle) * pushDistance / 2
              boxA.centerX = boxA.x + boxA.width / 2
              boxA.centerY = boxA.y + boxA.height / 2
              
              boxB.x += Math.cos(randomAngle) * pushDistance / 2
              boxB.y += Math.sin(randomAngle) * pushDistance / 2
              boxB.centerX = boxB.x + boxB.width / 2
              boxB.centerY = boxB.y + boxB.height / 2
            }
          }
        }
      }
      
      if (!hasCollisions) break
    }
    
    // Update the map with adjusted positions
    const adjustedMap = new Map()
    boxes.forEach(([key, box]) => {
      adjustedMap.set(key, box)
    })
    
    return adjustedMap
  }

  const applyGroupedLayout = (nodes: Node[], groups: Map<string, Node[]>) => {
    return applyAdvancedForceLayout(nodes, groups)
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
      levels.forEach((nodesInLevel) => {
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
      
    } else if (layoutMode === 'grouped' && groupingMode !== 'none') {
      const layoutNodes = applyGroupedLayout(currentNodes, nodeGroups)
      layoutNodes.forEach((layoutNode, index) => {
        currentNodes[index].x = layoutNode.x
        currentNodes[index].y = layoutNode.y
        currentNodes[index].fx = layoutNode.fx
        currentNodes[index].fy = layoutNode.fy
      })
      ;(currentNodes as any).groupBoxes = (layoutNodes as any).groupBoxes
      
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
  }, [layoutMode, nodeSpacing, nodeGroups, groupingMode])

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

  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const fitToView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || nodesRef.current.length === 0) return

    const nodes = nodesRef.current
    const padding = 50

    // Calculate bounding box of all nodes
    const minX = Math.min(...nodes.map(n => n.x)) - padding
    const maxX = Math.max(...nodes.map(n => n.x)) + padding
    const minY = Math.min(...nodes.map(n => n.y)) - padding
    const maxY = Math.max(...nodes.map(n => n.y)) + padding

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    // Calculate scale to fit content
    const scaleX = canvas.width / contentWidth
    const scaleY = canvas.height / contentHeight
    const newScale = Math.min(scaleX, scaleY, 2) // Cap at 2x zoom

    // Calculate offset to center content
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const newOffsetX = canvas.width / 2 - centerX * newScale
    const newOffsetY = canvas.height / 2 - centerY * newScale

    setScale(newScale)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }, [])

  const zoomToNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId)
    const canvas = canvasRef.current
    if (!node || !canvas) return

    const targetScale = 1.5
    const newOffsetX = canvas.width / 2 - node.x * targetScale
    const newOffsetY = canvas.height / 2 - node.y * targetScale

    setScale(targetScale)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return // Only work when not typing in inputs
      
      switch (e.key) {
        case 'r':
        case 'R':
          e.preventDefault()
          resetView()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          fitToView()
          break
        case '=':
        case '+':
          e.preventDefault()
          setScale(prev => Math.min(5, prev * 1.2))
          break
        case '-':
        case '_':
          e.preventDefault()
          setScale(prev => Math.max(0.2, prev / 1.2))
          break
        case ' ':
          e.preventDefault()
          autoLayout()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetView, fitToView, autoLayout])

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - offset.x) / scale
    const y = (e.clientY - rect.top - offset.y) / scale

    // Check if clicking on a group box first (higher priority)
    const currentNodes = nodesRef.current
    const groupBoxes = (currentNodes as any).groupBoxes as Map<string, { x: number, y: number, width: number, height: number }> | undefined
    
    if (showGroupContainers && groupBoxes && groupingMode !== 'none') {
      let clickedGroup: string | null = null
      
      groupBoxes.forEach((box, groupKey) => {
        if (x >= box.x && x <= box.x + box.width && 
            y >= box.y && y <= box.y + box.height) {
          clickedGroup = groupKey
        }
      })
      
      if (clickedGroup) {
        // Start group dragging
        const groupBox = groupBoxes.get(clickedGroup)!
        setDraggedGroup(clickedGroup)
        setGroupDragOffset({
          x: x - groupBox.x,
          y: y - groupBox.y
        })
        return // Don't check for nodes if we're dragging a group
      }
    }

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

    if (draggedGroup) {
      // Dragging a group
      const currentNodes = nodesRef.current
      const groupBoxes = (currentNodes as any).groupBoxes as Map<string, any> | undefined
      
      if (groupBoxes && groupBoxes.has(draggedGroup)) {
        const groupBox = groupBoxes.get(draggedGroup)!
        const newX = x - groupDragOffset.x
        const newY = y - groupDragOffset.y
        
        // Calculate the displacement
        const deltaX = newX - groupBox.x
        const deltaY = newY - groupBox.y
        
        // Update group box position
        groupBox.x = newX
        groupBox.y = newY
        groupBox.centerX = newX + groupBox.width / 2
        groupBox.centerY = newY + groupBox.height / 2
        
        // Move all nodes in this group
        const groupNodes = nodeGroups.get(draggedGroup) || []
        groupNodes.forEach(node => {
          const layoutNode = currentNodes.find(n => n.id === node.id)
          if (layoutNode) {
            layoutNode.x += deltaX
            layoutNode.y += deltaY
            layoutNode.fx = layoutNode.x
            layoutNode.fy = layoutNode.y
          }
        })
      }
      canvas.style.cursor = 'grabbing'
    } else if (draggedNode) {
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
      // Check for hovered elements
      let hoveredElement: string | null = null
      
      // Check for hovered group first
      const currentNodes = nodesRef.current
      const groupBoxes = (currentNodes as any).groupBoxes as Map<string, { x: number, y: number, width: number, height: number }> | undefined
      
      if (showGroupContainers && groupBoxes && groupingMode !== 'none') {
        groupBoxes.forEach((box, groupKey) => {
          if (x >= box.x && x <= box.x + box.width && 
              y >= box.y && y <= box.y + box.height) {
            hoveredElement = `group-${groupKey}`
          }
        })
      }
      
      // If not hovering over a group, check for nodes
      if (!hoveredElement) {
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

        if (hoveredNode) {
          hoveredElement = hoveredNode.id
        }
      }

      setHoveredNode(hoveredElement)
      
      // Set cursor based on what's hovered
      if (hoveredElement?.startsWith('group-')) {
        canvas.style.cursor = 'move'
      } else if (hoveredElement) {
        canvas.style.cursor = 'pointer'
      } else {
        canvas.style.cursor = 'grab'
      }
    }
  }

  const handleMouseUp = () => {
    if (draggedGroup) {
      // Release the dragged group
      const currentNodes = nodesRef.current
      const groupNodes = nodeGroups.get(draggedGroup) || []
      
      // Keep group nodes fixed for a bit, then release for physics
      setTimeout(() => {
        groupNodes.forEach(node => {
          const layoutNode = currentNodes.find(n => n.id === node.id)
          if (layoutNode) {
            layoutNode.fx = null
            layoutNode.fy = null
          }
        })
      }, 1000)
      
      setDraggedGroup(null)
      setGroupDragOffset({ x: 0, y: 0 })
    } else if (draggedNode) {
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
    e.stopPropagation()
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calculate zoom factor with more granular control
    const zoomIntensity = 0.1
    const zoomFactor = e.deltaY > 0 ? (1 - zoomIntensity) : (1 + zoomIntensity)
    const newScale = Math.max(0.2, Math.min(5, scale * zoomFactor))
    
    if (newScale !== scale) {
      // Calculate the point in world coordinates before zoom
      const worldX = (mouseX - offset.x) / scale
      const worldY = (mouseY - offset.y) / scale
      
      // Calculate new offset to keep the mouse point stationary
      const newOffsetX = mouseX - worldX * newScale
      const newOffsetY = mouseY - worldY * newScale
      
      setScale(newScale)
      setOffset({ x: newOffsetX, y: newOffsetY })
    }
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

    // Prevent page scrolling when interacting with the graph
    const preventScroll = (e: WheelEvent) => {
      if (canvas && canvas.contains(e.target as Node)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const preventTouch = (e: TouchEvent) => {
      if (canvas && canvas.contains(e.target as Node)) {
        e.preventDefault()
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    document.addEventListener('wheel', preventScroll, { passive: false })
    document.addEventListener('touchmove', preventTouch, { passive: false })
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('wheel', preventScroll)
      document.removeEventListener('touchmove', preventTouch)
    }
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
                  <SelectItem value="grouped">Grouped</SelectItem>
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
              {layoutMode === 'grouped' && (
                <>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Group by:</div>
                  <Select value={groupingMode} onValueChange={(value: any) => setGroupingMode(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showGroupContainers}
                      onChange={(e) => setShowGroupContainers(e.target.checked)}
                      className="rounded"
                    />
                    Show Containers
                  </label>
                </>
              )}
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
                    onClick={() => setScale(prev => Math.min(5, prev * 1.2))}
                    className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <div className="px-2 py-1 text-sm font-mono text-slate-600 dark:text-slate-400 min-w-[3rem] text-center">
                    {Math.round(scale * 100)}%
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScale(prev => Math.max(0.2, prev / 1.2))}
                    className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fitToView}
                    className="h-8 px-3 hover:bg-green-100 dark:hover:bg-green-900/30"
                    title="Fit to View (F)"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Fit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetView}
                    className="h-8 px-3 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title="Reset View (R)"
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
        className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700"
        style={{ 
          background: 'linear-gradient(135deg, rgb(248 250 252) 0%, rgb(255 255 255) 50%, rgb(248 250 252) 100%)',
          // Dark mode gradient will be handled by CSS
        }}
      >
        {/* Decorative Grid Background - properly contained with rounded corners */}
        <div className="absolute inset-0 opacity-30 rounded-xl overflow-hidden">
          <svg width="100%" height="100%" className="text-slate-300 dark:text-slate-700 rounded-xl">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
              </pattern>
              <clipPath id="roundedContainer">
                <rect width="100%" height="100%" rx="12" ry="12" />
              </clipPath>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" clipPath="url(#roundedContainer)" />
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
          style={{ touchAction: 'none' }} // Prevent touch scrolling
        />
        
        {/* Minimap */}
        {showMinimap && nodesRef.current.length > 0 && (
          <MinimapComponent 
            nodes={nodesRef.current}
            edges={edgesRef.current}
            scale={scale}
            offset={offset}
            canvasRef={canvasRef}
            selectedNode={selectedNode}
          />
        )}
        
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
        
        {/* Enhanced Graph Instructions */}
        <div className="absolute bottom-6 right-6 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm backdrop-blur-sm shadow-lg max-w-xs">
          <div className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Navigation Controls</div>
          <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Pan canvas</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Drag</span>
            </div>
            <div className="flex justify-between">
              <span>Zoom</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Scroll</span>
            </div>
            <div className="flex justify-between">
              <span>Move nodes</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Drag node</span>
            </div>
            <div className="flex justify-between">
              <span>Move groups</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Drag group</span>
            </div>
            <hr className="my-2 border-slate-200 dark:border-slate-700" />
            <div className="font-medium text-slate-800 dark:text-slate-200">Keyboard Shortcuts</div>
            <div className="flex justify-between">
              <span>Reset view</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">R</span>
            </div>
            <div className="flex justify-between">
              <span>Fit to view</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">F</span>
            </div>
            <div className="flex justify-between">
              <span>Zoom in/out</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">+/-</span>
            </div>
            <div className="flex justify-between">
              <span>Auto layout</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Space</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}