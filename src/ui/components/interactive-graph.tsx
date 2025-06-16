"use client"
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { ZoomIn, ZoomOut, RotateCcw, Filter, Shuffle, Focus, Info, Move, Zap, Search, MoreVertical, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuCheckboxItem } from './ui/dropdown-menu'

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
  type: 'uses' | 'calls' | 'instantiates' | 'contains' | 'imports' | 'exports'
  color: string
  width: number
  weight?: number
  context?: string
}

interface InteractiveGraphProps {
  nodes: Node[]
  edges: Edge[]
  focusNodeId?: string
  selectedNodeId?: string | null
  onNodeClick?: (nodeId: string) => void
  onNodeHover?: (nodeId: string | null) => void
  onGroupClick?: (groupId: string, groupNodes: Node[]) => void
  showMinimap?: boolean
  enableAnimations?: boolean
  setSelectedNodeId?: (nodeId: string | null) => void
  focusMode?: boolean
  setFocusMode?: (enabled: boolean) => void
}

export function InteractiveGraph({ 
  nodes, 
  edges, 
  focusNodeId, 
  selectedNodeId, 
  onNodeClick, 
  onNodeHover, 
  onGroupClick, 
  showMinimap = true, 
  enableAnimations = true,
  setSelectedNodeId,
  focusMode,
  setFocusMode
}: InteractiveGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)
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
  const [searchMode, setSearchMode] = useState<'node-only' | 'with-connections'>('with-connections')
  const [searchResults, setSearchResults] = useState<Node[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [layoutMode, setLayoutMode] = useState<'force' | 'hierarchical' | 'circular' | 'grouped'>('grouped')
  const [showLabels, setShowLabels] = useState(true)
  const [showConnectionsOnly, setShowConnectionsOnly] = useState(false)
  const [nodeSpacing, setNodeSpacing] = useState(250)
  const [nodeSize, setNodeSize] = useState(90)
  const [isAutoLayouting, setIsAutoLayouting] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null)
  const [groupDragOffset, setGroupDragOffset] = useState({ x: 0, y: 0 })
  const [groupingMode, setGroupingMode] = useState<'none' | 'file' | 'parent'>('file')
  const [showGroupContainers, setShowGroupContainers] = useState(true)
  const [edgeStyle, setEdgeStyle] = useState<'straight' | 'curved' | 'step'>('curved')
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null)
  const [groupFocusMode, setGroupFocusMode] = useState(focusMode || false)
  const [showMinimapLocal, setShowMinimapLocal] = useState(showMinimap)
  const [showGraphControls, setShowGraphControls] = useState(true)
  
  // Sync focus mode with props
  useEffect(() => {
    if (focusMode !== undefined) {
      setGroupFocusMode(focusMode)
    }
  }, [focusMode])
  const [selectedNodeForMenu, setSelectedNodeForMenu] = useState<string | null>(null)
  const [selectedGroupForMenu, setSelectedGroupForMenu] = useState<string | null>(null)
  const [menuActionHover, setMenuActionHover] = useState<string | null>(null)
  const [nodeContextMenu, setNodeContextMenu] = useState<{ x: number; y: number; node: Node } | null>(null)
  const [groupContextMenu, setGroupContextMenu] = useState<{ x: number; y: number; group: string; nodes: Node[] } | null>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Node[]>(nodes)
  const edgesRef = useRef<Edge[]>(edges)
  const [animationTime, setAnimationTime] = useState(0)
  const [enableAnimation, setEnableAnimation] = useState(enableAnimations)
  const [animationSpeed, setAnimationSpeed] = useState(1) // Speed multiplier (1 = normal, 0.5 = half speed, 2 = double speed)
  const baseAnimationSpeed = 2000 // milliseconds for full cycle

  // Physics simulation parameters - adjusted for grouped layouts
  const FORCE_STRENGTH = layoutMode === 'grouped' ? 0.01 : layoutMode === 'force' ? 0.02 : 0.008
  const DAMPING = 0.88
  const CENTER_FORCE = layoutMode === 'grouped' ? 0.001 : layoutMode === 'force' ? 0.003 : 0.001

  // Animation loop for line animations
  useEffect(() => {
    if (!enableAnimation) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
      return
    }
    
    const startTime = Date.now()
    const updateAnimation = () => {
      const elapsed = Date.now() - startTime
      setAnimationTime(elapsed)
      
      // Only continue animation if still enabled and component is mounted
      if (enableAnimation && animationRef.current !== undefined) {
        animationRef.current = requestAnimationFrame(updateAnimation)
      }
    }
    
    animationRef.current = requestAnimationFrame(updateAnimation)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
    }
  }, [enableAnimation])
  
  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

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
  
  // Calculate tree layout for nodes within a group
  const calculateTreeLayout = (groupNodes: Node[], spacing: number) => {
    if (groupNodes.length === 0) return []
    if (groupNodes.length === 1) return [{ x: 0, y: 0 }]
    
    const positions: { x: number, y: number }[] = []
    
    // Sort nodes by type and connections for better tree structure
    const sortedNodes = [...groupNodes].sort((a, b) => {
      // Primary components at root, functions as branches, methods as leaves
      const typeOrder = { component: 0, class: 1, function: 2, method: 3 }
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] ?? 4
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] ?? 4
      
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.connections || 0) - (a.connections || 0) // More connected nodes higher
    })
    
    if (sortedNodes.length <= 3) {
      // Small groups: horizontal line layout with better spacing
      const actualSpacing = spacing * 1.3 // Increase spacing between nodes
      const totalWidth = (sortedNodes.length - 1) * actualSpacing
      sortedNodes.forEach((_, index) => {
        positions.push({
          x: -totalWidth / 2 + index * actualSpacing,
          y: 0
        })
      })
    } else if (sortedNodes.length <= 6) {
      // Medium groups: 2-level tree structure with improved spacing
      const root = sortedNodes[0]
      const children = sortedNodes.slice(1)
      
      // Root at top center with more vertical space
      positions.push({ x: 0, y: -spacing * 1.3 })
      
      // Children arranged in a horizontal line below with more spacing
      const childSpacing = spacing * 1.5 // Increased horizontal spacing
      const childWidth = (children.length - 1) * childSpacing
      children.forEach((_, index) => {
        positions.push({
          x: -childWidth / 2 + index * childSpacing,
          y: spacing * 1.1 // Increased vertical spacing
        })
      })
    } else {
      // Large groups: 3-level tree structure with better spacing
      const root = sortedNodes[0]
      const level2Count = Math.min(3, Math.ceil(sortedNodes.length / 3))
      const level2Nodes = sortedNodes.slice(1, 1 + level2Count)
      const level3Nodes = sortedNodes.slice(1 + level2Count)
      
      // Root at top center with more space
      positions.push({ x: 0, y: -spacing * 1.5 })
      
      // Level 2: spread horizontally with better spacing
      const level2Spacing = spacing * 1.4
      const level2Width = (level2Count - 1) * level2Spacing
      level2Nodes.forEach((_, index) => {
        positions.push({
          x: level2Count === 1 ? 0 : -level2Width / 2 + index * level2Spacing,
          y: -spacing * 0.1 // Slightly below root
        })
      })
      
      // Level 3: arrange under level 2 nodes with better spacing
      const nodesPerParent = Math.ceil(level3Nodes.length / level2Count)
      const childSpacing = spacing * 1.1
      level3Nodes.forEach((_, index) => {
        const parentIndex = Math.floor(index / nodesPerParent)
        const childIndex = index % nodesPerParent
        const parentX = level2Count === 1 ? 0 : -level2Width / 2 + parentIndex * level2Spacing
        
        const siblingCount = Math.min(nodesPerParent, level3Nodes.length - parentIndex * nodesPerParent)
        const siblingWidth = (siblingCount - 1) * childSpacing
        
        positions.push({
          x: parentX + (siblingCount === 1 ? 0 : -siblingWidth / 2 + childIndex * childSpacing),
          y: spacing * 1.8 // Increased vertical spacing for level 3
        })
      })
    }
    
    return positions
  }

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
        const idealDistance = nodeSpacing * (1 + Math.random() * 0.2) // Add slight randomness to prevent rigid patterns
        
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
        
        // Adjust distances based on layout mode for better grouping
        const minDistance = layoutMode === 'grouped' ? nodeSpacing * 0.6 : nodeSpacing * 0.9
        const repulsionDistance = layoutMode === 'grouped' ? nodeSpacing * 1.2 : nodeSpacing * 1.8
        
        if (distance > 0) {
          let force = 0
          
          if (distance < minDistance) {
            // Adjust repulsion based on layout mode
            const repulsionStrength = layoutMode === 'grouped' ? 0.1 : 0.15
            force = (minDistance - distance) * repulsionStrength
          } else if (distance < repulsionDistance) {
            // Softer repulsion for grouped layouts
            const softRepulsion = layoutMode === 'grouped' ? 0.015 : 0.025
            force = (repulsionDistance - distance) * softRepulsion
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
          const pushDistance = minDistance * 1.5
          nodeA.x += Math.cos(randomAngle) * pushDistance * 0.7
          nodeA.y += Math.sin(randomAngle) * pushDistance * 0.7
          nodeB.x -= Math.cos(randomAngle) * pushDistance * 0.7
          nodeB.y -= Math.sin(randomAngle) * pushDistance * 0.7
        }
      }
    }

    // Center force - dynamic based on canvas size
    const canvas = canvasRef.current
    const centerX = canvas && canvas.width > 0 ? canvas.width / 2 : 400
    const centerY = canvas && canvas.height > 0 ? canvas.height / 2 : 300
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

    // First, calculate which nodes are visible based on search and filters
    let visibleNodeIds = new Set<string>()
    
    if (searchTerm && searchTerm.trim() !== '') {
      // Search mode - get visible nodes from search results
      const matchingNodes = currentNodes.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      if (matchingNodes.length > 0) {
        const matchingNodeIds = new Set(matchingNodes.map(node => node.id))
        const connectedNodeIds = new Set<string>()
        
        // Add matching nodes to visible set
        matchingNodeIds.forEach(nodeId => connectedNodeIds.add(nodeId))
        
        // Add connected nodes based on search mode
        if (searchMode === 'with-connections') {
          currentEdges.forEach(edge => {
            if (matchingNodeIds.has(edge.source)) {
              connectedNodeIds.add(edge.target)
            }
            if (matchingNodeIds.has(edge.target)) {
              connectedNodeIds.add(edge.source)
            }
          })
        }
        
        visibleNodeIds = connectedNodeIds
      }
    } else if (showConnectionsOnly && selectedNode) {
      // Show connections only mode
      visibleNodeIds.add(selectedNode)
      currentEdges.forEach(edge => {
        if (edge.source === selectedNode || edge.target === selectedNode) {
          visibleNodeIds.add(edge.source)
          visibleNodeIds.add(edge.target)
        }
      })
    } else {
      // Normal mode - all nodes are visible
      currentNodes.forEach(node => visibleNodeIds.add(node.id))
    }
    
    // Additional filtering for group focus mode
    if (groupFocusMode && focusedGroup && nodeGroups.has(focusedGroup)) {
      const groupMembers = nodeGroups.get(focusedGroup)!
      const groupMemberIds = new Set(groupMembers.map(n => n.id))
      
      // Find all connected nodes first
      const connectedNodeIds = new Set<string>()
      groupMemberIds.forEach(memberId => connectedNodeIds.add(memberId))
      
      currentEdges.forEach(edge => {
        if (groupMemberIds.has(edge.source)) {
          connectedNodeIds.add(edge.target)
        }
        if (groupMemberIds.has(edge.target)) {
          connectedNodeIds.add(edge.source)
        }
      })
      
      // Intersect with visible nodes from search/filter
      visibleNodeIds = new Set([...visibleNodeIds].filter(id => connectedNodeIds.has(id)))
    }

    // Draw group containers first (behind everything else)
    if (showGroupContainers && groupBoxes && groupingMode !== 'none') {
      // Only show groups that contain visible nodes
      groupBoxes.forEach((box, groupKey) => {
        // Check if this group has any visible nodes
        const groupNodes = nodeGroups.get(groupKey) || []
        const hasVisibleNodes = groupNodes.some(node => visibleNodeIds.has(node.id))
        
        if (!hasVisibleNodes) return // Skip groups with no visible nodes
        ctx.save()
        
        const isDraggedGroup = draggedGroup === groupKey
        const isHoveredGroup = hoveredNode === `group-${groupKey}`
        const isFocusedGroup = groupFocusMode && focusedGroup === groupKey
        
        // Enhanced group container style with better visibility
        let baseAlpha = isDraggedGroup ? 0.15 : isHoveredGroup ? 0.12 : 0.08
        let borderAlpha = isDraggedGroup ? 0.6 : isHoveredGroup ? 0.5 : 0.4
        
        // Special styling for focused groups
        if (isFocusedGroup) {
          baseAlpha = 0.2
          borderAlpha = 0.8
        }
        
        // Gradient background
        const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height)
        
        if (isFocusedGroup) {
          // Amber/orange gradient for focused groups
          gradient.addColorStop(0, `rgba(245, 158, 11, ${baseAlpha})`)
          gradient.addColorStop(1, `rgba(217, 119, 6, ${baseAlpha * 0.7})`)
          ctx.fillStyle = gradient
          ctx.strokeStyle = `rgba(245, 158, 11, ${borderAlpha})`
        } else {
          // Blue/purple gradient for normal groups
          gradient.addColorStop(0, `rgba(59, 130, 246, ${baseAlpha})`)
          gradient.addColorStop(1, `rgba(147, 51, 234, ${baseAlpha * 0.7})`)
          ctx.fillStyle = gradient
          ctx.strokeStyle = `rgba(59, 130, 246, ${borderAlpha})`
        }
        ctx.lineWidth = isDraggedGroup ? 3 : 2
        ctx.setLineDash(isDraggedGroup ? [12, 6] : [8, 4])
        
        // Enhanced shadow for depth
        if (isDraggedGroup || isHoveredGroup || isFocusedGroup) {
          ctx.shadowBlur = isFocusedGroup ? 25 : 20
          ctx.shadowColor = isFocusedGroup ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.3)'
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = isFocusedGroup ? 6 : 4
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
    let drawableEdges = currentEdges.filter(edge => !filteredTypes.has(edge.type))
    
    // Filter edges to only show connections between visible nodes
    drawableEdges = drawableEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )

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
        
        // Draw main edge line with animation
        ctx.strokeStyle = edgeColor
        ctx.lineWidth = lineWidth
        
        // Different line styles for different relationship types with animation
        const animationPhase = enableAnimation ? (animationTime / animationSpeed) % 1 : 0
        const dashOffset = animationPhase * 24 // Animate dash offset
        
        switch (edge.type) {
          case 'uses':
            if (enableAnimation && (isHighlighted || isHovered)) {
              // Animated flowing dots for highlighted uses relationships
              ctx.setLineDash([6, 12])
              ctx.lineDashOffset = -dashOffset
            } else {
              ctx.setLineDash([]) // Solid line for uses
            }
            break
          case 'contains':
            ctx.setLineDash([8, 4]) // Dashed for containment
            if (enableAnimation && (isHighlighted || isHovered)) {
              ctx.lineDashOffset = -dashOffset * 0.3 // Even slower for containment
            }
            break
          default:
            ctx.setLineDash([])
        }
        
        // Draw edge with selected style
        ctx.beginPath()
        
        if (edgeStyle === 'straight') {
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
        } else if (edgeStyle === 'curved') {
          // Curved bezier path
          const midX = (startX + endX) / 2
          const midY = (startY + endY) / 2
          const controlOffset = distance * 0.2
          const controlX = midX + (dy / distance) * controlOffset
          const controlY = midY - (dx / distance) * controlOffset
          
          ctx.moveTo(startX, startY)
          ctx.quadraticCurveTo(controlX, controlY, endX, endY)
        } else if (edgeStyle === 'step') {
          // Step/orthogonal path
          const midX = (startX + endX) / 2
          ctx.moveTo(startX, startY)
          ctx.lineTo(midX, startY)
          ctx.lineTo(midX, endY)
          ctx.lineTo(endX, endY)
        }
        
        ctx.stroke()
        
        // Reset line dash for subsequent drawings
        ctx.setLineDash([])
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        // Draw basic animated dashes for all edges when enabled
        if (enableAnimation) {
          // Show subtle flowing dashes on all edges (much slower, reversed direction)
          const flowSpeed = 0.05 * animationSpeed  // Much slower: reduced from 0.15 to 0.05
          const dashPhase = 1 - ((animationTime * flowSpeed / 1000) % 1)  // Reversed direction
          
          ctx.save()
          ctx.strokeStyle = edgeColor.replace(/[\d.]+\)$/g, '0.4)')
          ctx.lineWidth = Math.max(1, lineWidth - 1)
          ctx.setLineDash([8, 8])
          ctx.lineDashOffset = dashPhase * 16
          
          ctx.beginPath()
          if (edgeStyle === 'straight') {
            ctx.moveTo(startX, startY)
            ctx.lineTo(endX, endY)
          } else if (edgeStyle === 'curved') {
            const midX = (startX + endX) / 2
            const midY = (startY + endY) / 2
            const controlOffset = distance * 0.2
            const controlX = midX + (dy / distance) * controlOffset
            const controlY = midY - (dx / distance) * controlOffset
            ctx.moveTo(startX, startY)
            ctx.quadraticCurveTo(controlX, controlY, endX, endY)
          } else if (edgeStyle === 'step') {
            const midX = (startX + endX) / 2
            ctx.moveTo(startX, startY)
            ctx.lineTo(midX, startY)
            ctx.lineTo(midX, endY)
            ctx.lineTo(endX, endY)
          }
          ctx.stroke()
          ctx.restore()
        }
        
        // Draw enhanced animated flow particles for highlighted edges
        if (enableAnimation && (isHighlighted || isHovered)) {
          const particleSettings = {
            'uses': { numParticles: 3, particleSize: 4, speed: 0.08, trail: false },        // Much slower: 0.08
            'contains': { numParticles: 2, particleSize: 5, speed: 0.05, trail: false }   // Much slower: 0.05
          }
          
          const settings = particleSettings[edge.type as keyof typeof particleSettings] || particleSettings['uses']
          const particleColor = edgeColor.replace(/[\d.]+\)$/g, '0.9)')
          const fadeColor = edgeColor.replace(/[\d.]+\)$/g, '0.3)')
          
          for (let i = 0; i < settings.numParticles; i++) {
            const particlePhase = 1 - (((animationPhase * settings.speed) + i / settings.numParticles) % 1)  // Reversed direction
            let particleX = startX + (endX - startX) * particlePhase
            let particleY = startY + (endY - startY) * particlePhase
            
            // Add slight curve to particle path if using curved edges
            if (edgeStyle === 'curved') {
              const midX = (startX + endX) / 2
              const midY = (startY + endY) / 2
              const controlOffset = distance * 0.2
              const controlX = midX + (dy / distance) * controlOffset
              const controlY = midY - (dx / distance) * controlOffset
              
              // Bezier curve calculation for particle position
              const t = particlePhase
              const oneMinusT = 1 - t
              particleX = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * controlX + t * t * endX
              particleY = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * endY
            }
            
            // Draw particle with enhanced effects
            ctx.save()
            
            // Different particle styles for different relationship types
            if (edge.type === 'uses') {
              // Fast moving glowing dots for 'uses'
              ctx.shadowBlur = 12
              ctx.shadowColor = particleColor
              ctx.fillStyle = particleColor
              ctx.beginPath()
              ctx.arc(particleX, particleY, settings.particleSize, 0, 2 * Math.PI)
              ctx.fill()
            } else if (edge.type === 'contains') {
              // Square particles for 'contains'
              const size = settings.particleSize
              ctx.fillStyle = particleColor
              ctx.shadowBlur = 8
              ctx.shadowColor = particleColor
              ctx.fillRect(particleX - size/2, particleY - size/2, size, size)
            }
            
            ctx.restore()
          }
        }
        
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
        
        // Add animated flowing dot indicators for better visibility
        if (enableAnimation) {
          const flowPhase = 1 - ((animationTime / 16000) % 1)  // Even slower: 16 seconds for full cycle (half speed), reversed direction
          const dotSpacing = distance / Math.max(2, Math.floor(distance / 200))  // More spacing between dots
          const numFlowDots = Math.min(2, Math.max(1, Math.floor(distance / 250)))  // Fewer dots: max 2, larger spacing
          
          for (let i = 0; i < numFlowDots; i++) {
            const dotPhase = (flowPhase + i / numFlowDots) % 1
            let flowDotX = startX + (endX - startX) * dotPhase
            let flowDotY = startY + (endY - startY) * dotPhase
            
            // Adjust for curved paths
            if (edgeStyle === 'curved') {
              const midX = (startX + endX) / 2
              const midY = (startY + endY) / 2
              const controlOffset = distance * 0.2
              const controlX = midX + (dy / distance) * controlOffset
              const controlY = midY - (dx / distance) * controlOffset
              
              const t = dotPhase
              const oneMinusT = 1 - t
              flowDotX = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * controlX + t * t * endX
              flowDotY = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * endY
            }
            
            const dotSize = 6  // Size of the flowing dots
            const alpha = Math.sin(dotPhase * Math.PI) * 0.6 + 0.4 // Fade in/out but stay more visible
            
            ctx.save()
            ctx.globalAlpha = alpha
            
            // Draw glowing dot
            ctx.shadowBlur = 8
            ctx.shadowColor = edgeColor.replace(/[\d.]+\)$/g, '0.8)')
            ctx.fillStyle = edgeColor.replace(/[\d.]+\)$/g, '0.9)')
            
            ctx.beginPath()
            ctx.arc(flowDotX, flowDotY, dotSize, 0, 2 * Math.PI)
            ctx.fill()
            
            // Add inner bright dot for better visibility
            ctx.shadowBlur = 0
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(flowDotX, flowDotY, dotSize * 0.4, 0, 2 * Math.PI)
            ctx.fill()
            
            ctx.restore()
          }
        }
        
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

    // Draw nodes (using the same visibleNodeIds set from edge filtering)
    const visibleNodes = currentNodes.filter(node => visibleNodeIds.has(node.id))
    
    visibleNodes.forEach(node => {
      const isSelected = selectedNode === node.id
      const isHovered = hoveredNode === node.id
      const [color1, color2] = getNodeGradient(node.type)
      
      // Modern card-based node design
      ctx.save()
      
      const calculatedNodeSize = Math.max(nodeSize, node.radius * 3.5) // Dynamic node size
      const cornerRadius = 20
      
      // Outer glow for selected/hovered nodes with pulse animation
      if (isSelected || isHovered) {
        const baseGlowSize = isSelected ? 20 : 12
        // Add subtle pulse animation to selected nodes (slowed down)
        const pulseMultiplier = enableAnimation && isSelected ? 
          (1 + Math.sin(animationTime / 2000) * 0.15) : 1  // Slowed from 1000ms to 2000ms, reduced intensity from 0.2 to 0.15
        const glowSize = baseGlowSize * pulseMultiplier
        
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, calculatedNodeSize + glowSize
        )
        const glowOpacity = enableAnimation && isSelected ? 
          Math.min(0.6, 0.4 + Math.sin(animationTime / 1600) * 0.15) : 0.4  // Slowed from 800ms to 1600ms, reduced intensity
        
        glowGradient.addColorStop(0, isSelected ? color1 + Math.floor(glowOpacity * 255).toString(16) : color1 + '20')
        glowGradient.addColorStop(0.5, isSelected ? color1 + Math.floor(glowOpacity * 127).toString(16) : color1 + '10')
        glowGradient.addColorStop(1, 'transparent')
        
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, calculatedNodeSize + glowSize, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Modern shadow
      ctx.shadowBlur = isSelected ? 30 : isHovered ? 20 : 15
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = isSelected ? 8 : isHovered ? 6 : 4
      
      // Main node background - glassmorphism effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(node.x - calculatedNodeSize/2, node.y - calculatedNodeSize/2, calculatedNodeSize, calculatedNodeSize, cornerRadius)
      } else {
        // Fallback for browsers that don't support roundRect
        const x = node.x - calculatedNodeSize/2
        const y = node.y - calculatedNodeSize/2
        const r = cornerRadius
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + calculatedNodeSize - r, y)
        ctx.quadraticCurveTo(x + calculatedNodeSize, y, x + calculatedNodeSize, y + r)
        ctx.lineTo(x + calculatedNodeSize, y + calculatedNodeSize - r)
        ctx.quadraticCurveTo(x + calculatedNodeSize, y + calculatedNodeSize, x + calculatedNodeSize - r, y + calculatedNodeSize)
        ctx.lineTo(x + r, y + calculatedNodeSize)
        ctx.quadraticCurveTo(x, y + calculatedNodeSize, x, y + calculatedNodeSize - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
      }
      ctx.fill()
      
      // Reset shadow for inner elements
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // Gradient border
      const borderGradient = ctx.createLinearGradient(
        node.x - calculatedNodeSize/2, node.y - calculatedNodeSize/2,
        node.x + calculatedNodeSize/2, node.y + calculatedNodeSize/2
      )
      borderGradient.addColorStop(0, color1)
      borderGradient.addColorStop(1, color2)
      
      ctx.strokeStyle = borderGradient
      ctx.lineWidth = isSelected ? 4 : isHovered ? 3 : 2
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(node.x - calculatedNodeSize/2, node.y - calculatedNodeSize/2, calculatedNodeSize, calculatedNodeSize, cornerRadius)
      } else {
        // Fallback for browsers that don't support roundRect
        const x = node.x - calculatedNodeSize/2
        const y = node.y - calculatedNodeSize/2
        const r = cornerRadius
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + calculatedNodeSize - r, y)
        ctx.quadraticCurveTo(x + calculatedNodeSize, y, x + calculatedNodeSize, y + r)
        ctx.lineTo(x + calculatedNodeSize, y + calculatedNodeSize - r)
        ctx.quadraticCurveTo(x + calculatedNodeSize, y + calculatedNodeSize, x + calculatedNodeSize - r, y + calculatedNodeSize)
        ctx.lineTo(x + r, y + calculatedNodeSize)
        ctx.quadraticCurveTo(x, y + calculatedNodeSize, x, y + calculatedNodeSize - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
      }
      ctx.stroke()
      
      // Type icon background
      const iconBgSize = 24
      const iconBgGradient = ctx.createLinearGradient(
        node.x - iconBgSize/2, node.y - calculatedNodeSize/2 + 10,
        node.x + iconBgSize/2, node.y - calculatedNodeSize/2 + 10 + iconBgSize
      )
      iconBgGradient.addColorStop(0, color1)
      iconBgGradient.addColorStop(1, color2)
      
      ctx.fillStyle = iconBgGradient
      ctx.beginPath()
      ctx.arc(node.x, node.y - calculatedNodeSize/2 + 22, iconBgSize/2, 0, 2 * Math.PI)
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
      
      ctx.fillText(icons[node.type as keyof typeof icons] || '◆', node.x, node.y - calculatedNodeSize/2 + 22)
      
      ctx.restore()
      
      
      // Node label - modern typography
      if (showLabels || isSelected || isHovered) {
        ctx.save()
        
        // Text background for better readability
        const textMetrics = ctx.measureText(node.name)
        const textWidth = Math.min(textMetrics.width, calculatedNodeSize - 10)
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
        const badgeY = node.y + calculatedNodeSize/2 - 10
        
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
      
      // Draw menu if this node is selected for menu
      if (selectedNodeForMenu === node.id) {
        ctx.save()
        
        // Menu dimensions
        const menuHeight = 32
        const menuWidth = 120
        const menuY = node.y - calculatedNodeSize/2 - menuHeight - 8
        const menuX = node.x - menuWidth/2
        
        // Menu shadow
        ctx.shadowBlur = 10
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2
        
        // Menu background
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)' // slate-800
        ctx.beginPath()
        roundRect(ctx, menuX, menuY, menuWidth, menuHeight, 8)
        ctx.fill()
        
        // Menu border
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)' // slate-600
        ctx.lineWidth = 1
        ctx.stroke()
        
        // Reset shadow for icons
        ctx.shadowBlur = 0
        
        // Draw menu items
        const iconSize = 14
        const itemWidth = menuWidth / 3
        
        // Focus button
        const focusX = menuX + itemWidth * 0.5
        const focusY = menuY + menuHeight / 2
        ctx.fillStyle = menuActionHover === 'focus' ? '#60a5fa' : '#93c5fd' // blue-400/300
        ctx.font = `${iconSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('◎', focusX, focusY)
        
        // Divider
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(menuX + itemWidth, menuY + 6)
        ctx.lineTo(menuX + itemWidth, menuY + menuHeight - 6)
        ctx.stroke()
        
        // Info button
        const infoX = menuX + itemWidth * 1.5
        const infoY = menuY + menuHeight / 2
        ctx.fillStyle = menuActionHover === 'info' ? '#22d3ee' : '#67e8f9' // cyan-400/300
        ctx.fillText('ⓘ', infoX, infoY)
        
        // Divider
        ctx.beginPath()
        ctx.moveTo(menuX + itemWidth * 2, menuY + 6)
        ctx.lineTo(menuX + itemWidth * 2, menuY + menuHeight - 6)
        ctx.stroke()
        
        // Move button
        const moveX = menuX + itemWidth * 2.5
        const moveY = menuY + menuHeight / 2
        ctx.fillStyle = menuActionHover === 'move' ? '#4ade80' : '#86efac' // green-400/300
        ctx.fillText('↔', moveX, moveY)
        
        // Draw connection line to node
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(node.x, menuY + menuHeight)
        ctx.lineTo(node.x, node.y - calculatedNodeSize/2)
        ctx.stroke()
        
        ctx.restore()
      }
    })

    ctx.restore()
  }, [scale, offset, hoveredNode, selectedNode, filteredTypes, searchTerm, showConnectionsOnly, showLabels, groupingMode, showGroupContainers, groupFocusMode, focusedGroup, selectedNodeForMenu, selectedGroupForMenu, menuActionHover, animationTime, enableAnimation, edgeStyle, nodeSpacing, nodeSize])

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
    const minNodeSpacing = Math.max(nodeSpacing * 0.8, avgNodeRadius * 2) // Use user's nodeSpacing setting
    
    // Dynamic grid sizing based on group count and sizes
    const gridSize = Math.max(2, Math.ceil(Math.sqrt(numGroups * 1.2))) // Slightly larger grid for better spacing
    
    // Calculate required spacing based on largest groups
    const maxNodesInAnyGroup = Math.max(...Array.from(groups.values()).map(nodes => nodes.length))
    const estimatedGroupSize = calculateOptimalGroupSize(maxNodesInAnyGroup, minNodeSpacing)
    const groupSpacing = Math.max(estimatedGroupSize + nodeSpacing * 0.5, nodeSpacing * 2)
    
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
    const adjustedGroups = resolveGroupCollisions(groupBoxes, groups, layoutNodes)
    
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
  const resolveGroupCollisions = (groupBoxes: Map<string, any>, groups?: Map<string, Node[]>, layoutNodes?: Node[]) => {
    const boxes = Array.from(groupBoxes.entries())
    const maxIterations = 25 // More iterations for better separation
    
    // Store original positions to track movement
    const originalPositions = new Map()
    boxes.forEach(([key, box]) => {
      originalPositions.set(key, { x: box.x, y: box.y, centerX: box.centerX, centerY: box.centerY })
    })
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasCollisions = false
      
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const [, boxA] = boxes[i]
          const [, boxB] = boxes[j]
          
          // Increased padding between groups to prevent overlapping
          const avgSize = (boxA.width + boxA.height + boxB.width + boxB.height) / 4
          const padding = Math.max(120, avgSize * 0.25) // Much larger padding
          
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
                const pushDistance = Math.max(80, overlap * 1.2) // Much stronger separation
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
              const pushDistance = Math.max(150, avgSize * 0.8) // Stronger random separation
              
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
    
    // Move nodes along with their groups if collision resolution moved them
    if (groups && layoutNodes) {
      boxes.forEach(([groupKey, box]) => {
        const originalPos = originalPositions.get(groupKey)
        if (originalPos) {
          const deltaX = box.centerX - originalPos.centerX
          const deltaY = box.centerY - originalPos.centerY
          
          // Only move nodes if the group was significantly moved
          if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            const groupNodes = groups.get(groupKey) || []
            groupNodes.forEach(groupNode => {
              const layoutNode = layoutNodes.find(n => n.id === groupNode.id)
              if (layoutNode) {
                layoutNode.x += deltaX
                layoutNode.y += deltaY
              }
            })
          }
        }
      })
    }
    
    // Update the map with adjusted positions
    const adjustedMap = new Map()
    boxes.forEach(([key, box]) => {
      adjustedMap.set(key, box)
    })
    
    return adjustedMap
  }

  // Function to resolve node overlaps within a group
  const resolveNodeOverlapsInGroup = (groupNodes: Node[], groupCenterX: number, groupCenterY: number, spacing: number) => {
    const minDistance = spacing * 0.7 // Minimum distance between node centers
    const maxIterations = 30
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasOverlaps = false
      
      for (let i = 0; i < groupNodes.length; i++) {
        for (let j = i + 1; j < groupNodes.length; j++) {
          const nodeA = groupNodes[i]
          const nodeB = groupNodes[j]
          
          const dx = nodeB.x - nodeA.x
          const dy = nodeB.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const requiredDistance = Math.max(minDistance, (nodeA.radius + nodeB.radius) * 2.2) // Ensure nodes don't visually overlap
          
          if (distance < requiredDistance) {
            hasOverlaps = true
            
            // Calculate separation vector
            if (distance > 0) {
              const overlap = requiredDistance - distance
              const separationX = (dx / distance) * overlap * 0.6
              const separationY = (dy / distance) * overlap * 0.6
              
              // Move nodes apart
              nodeA.x -= separationX / 2
              nodeA.y -= separationY / 2
              nodeB.x += separationX / 2
              nodeB.y += separationY / 2
            } else {
              // Handle exact same position
              const angle = Math.random() * 2 * Math.PI
              const separation = requiredDistance / 2
              
              nodeA.x = groupCenterX - Math.cos(angle) * separation
              nodeA.y = groupCenterY - Math.sin(angle) * separation
              nodeB.x = groupCenterX + Math.cos(angle) * separation
              nodeB.y = groupCenterY + Math.sin(angle) * separation
            }
          }
        }
      }
      
      if (!hasOverlaps) break
    }
    
    // Apply gentle centering force to keep nodes roughly centered in group
    const currentCenterX = groupNodes.reduce((sum, node) => sum + node.x, 0) / groupNodes.length
    const currentCenterY = groupNodes.reduce((sum, node) => sum + node.y, 0) / groupNodes.length
    
    const offsetX = groupCenterX - currentCenterX
    const offsetY = groupCenterY - currentCenterY
    
    // Apply a gentle centering adjustment
    groupNodes.forEach(node => {
      node.x += offsetX * 0.3
      node.y += offsetY * 0.3
    })
  }

  const applyGroupedLayout = (nodes: Node[], groups: Map<string, Node[]>) => {
    const layoutNodes = [...nodes]
    const groupBoxes = new Map()
    const canvas = canvasRef.current
    const canvasWidth = canvas ? canvas.width : 1200
    const canvasHeight = canvas ? canvas.height : 800
    
    // Calculate initial group positions with proper spacing
    const groupEntries = Array.from(groups.entries()).filter(([_, nodes]) => nodes.length > 0)
    const groupsPerRow = Math.min(3, Math.ceil(Math.sqrt(groupEntries.length))) // Max 3 groups per row
    const groupPadding = 200 // Large padding between groups
    const availableWidth = canvasWidth - groupPadding * 2
    const availableHeight = canvasHeight - groupPadding * 2
    const groupWidth = availableWidth / groupsPerRow
    const groupHeight = availableHeight / Math.ceil(groupEntries.length / groupsPerRow)
    
    groupEntries.forEach(([groupKey, groupNodes], groupIndex) => {
      if (groupNodes.length === 0) return
      
      // Calculate this group's center position with padding
      const row = Math.floor(groupIndex / groupsPerRow)
      const col = groupIndex % groupsPerRow
      const groupCenterX = groupPadding + (col + 0.5) * groupWidth
      const groupCenterY = groupPadding + (row + 0.5) * groupHeight
      
      // Get tree layout positions relative to center with better spacing
      const internalSpacing = nodeSpacing * 1.2 // Increased from 0.8 to 1.2 for more space
      const treePositions = calculateTreeLayout(groupNodes, internalSpacing)
      
      // Apply absolute positions to nodes within this group
      groupNodes.forEach((node, index) => {
        const layoutNode = layoutNodes.find(n => n.id === node.id)
        if (layoutNode && treePositions[index]) {
          // Position nodes relative to group center
          layoutNode.x = groupCenterX + treePositions[index].x
          layoutNode.y = groupCenterY + treePositions[index].y
        }
      })
      
      // Resolve node overlaps within this group
      const groupLayoutNodes = groupNodes.map(node => 
        layoutNodes.find(n => n.id === node.id)
      ).filter(Boolean) as Node[]
      
      resolveNodeOverlapsInGroup(groupLayoutNodes, groupCenterX, groupCenterY, internalSpacing)
      
      // Calculate group container after positioning and overlap resolution
      const groupNodePositions = groupLayoutNodes.map(node => ({
        x: node.x,
        y: node.y,
        radius: node.radius
      }))
      
      if (groupNodePositions.length > 0) {
        const padding = 120 // More generous padding for group containers to accommodate spacing
        const minX = Math.min(...groupNodePositions.map(p => p.x - p.radius)) - padding
        const maxX = Math.max(...groupNodePositions.map(p => p.x + p.radius)) + padding
        const minY = Math.min(...groupNodePositions.map(p => p.y - p.radius)) - padding
        const maxY = Math.max(...groupNodePositions.map(p => p.y + p.radius)) + padding
        
        groupBoxes.set(groupKey, {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2
        })
      }
    })
    
    // Apply collision resolution and move nodes with their groups
    const resolvedBoxes = resolveGroupCollisions(groupBoxes, groups, layoutNodes)
    
    // Attach resolved group boxes to nodes for rendering
    ;(layoutNodes as any).groupBoxes = resolvedBoxes
    
    return layoutNodes
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

  // Context menu actions
  const handleNodeAction = (action: string, node: Node) => {
    switch (action) {
      case 'focus':
        setSelectedNode(node.id)
        setShowConnectionsOnly(true)
        break
      case 'details':
        onNodeClick?.(node.id)
        break
      case 'drag':
        setDraggedNode(node.id)
        setDragOffset({ x: 0, y: 0 })
        node.fx = node.x
        node.fy = node.y
        break
    }
    setSelectedNodeForMenu(null)
  }

  const handleGroupAction = (action: string, groupId: string, nodes: Node[]) => {
    switch (action) {
      case 'isolate':
        setGroupFocusMode(true)
        setFocusedGroup(groupId)
        setSelectedNode(null)
        break
      case 'details':
        if (onGroupClick) {
          onGroupClick(groupId, nodes)
        }
        break
      case 'expand':
        // Could implement group expansion logic here
        break
    }
    setSelectedGroupForMenu(null)
  }

  const fitToView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || nodesRef.current.length === 0 || canvas.width === 0 || canvas.height === 0) return

    const nodes = nodesRef.current
    const padding = 80

    // Calculate bounding box of all nodes
    const minX = Math.min(...nodes.map(n => n.x)) - padding
    const maxX = Math.max(...nodes.map(n => n.x)) + padding
    const minY = Math.min(...nodes.map(n => n.y)) - padding
    const maxY = Math.max(...nodes.map(n => n.y)) + padding

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    // Avoid division by zero
    if (contentWidth === 0 || contentHeight === 0) return

    // Calculate scale to fit content with more conservative scaling
    const scaleX = canvas.width / contentWidth
    const scaleY = canvas.height / contentHeight
    const newScale = Math.max(0.1, Math.min(scaleX, scaleY, 1.5)) // More reasonable scale range

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
        case 'Escape':
          e.preventDefault()
          setNodeContextMenu(null)
          setGroupContextMenu(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetView, fitToView, autoLayout])

  // Update search results when search term or search mode changes
  useEffect(() => {
    if (searchTerm && searchTerm.trim() !== '') {
      const matchingNodes = nodesRef.current.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setSearchResults(matchingNodes)
      setCurrentSearchIndex(0)
      
      // Auto-zoom to first result if there are matches
      if (matchingNodes.length > 0) {
        zoomToNode(matchingNodes[0].id)
      }
    } else {
      setSearchResults([])
      setCurrentSearchIndex(0)
    }
  }, [searchTerm, searchMode, zoomToNode])

  // Navigate to next/previous search result
  const navigateSearchResults = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return
    
    let newIndex
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1
    }
    
    setCurrentSearchIndex(newIndex)
    zoomToNode(searchResults[newIndex].id)
  }, [searchResults, currentSearchIndex, zoomToNode])

  // Click outside handler for context menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-context-menu]') && !target.closest('canvas')) {
        setNodeContextMenu(null)
        setGroupContextMenu(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - offset.x) / scale
    const y = (e.clientY - rect.top - offset.y) / scale

    // Handle right-click for context menus
    if (e.button === 2) {
      e.preventDefault()
      return // Let onContextMenu handle this
    }

    const currentNodes = nodesRef.current
    const groupBoxes = (currentNodes as any).groupBoxes as Map<string, { x: number, y: number, width: number, height: number }> | undefined
    
    // First check if clicking on a node (higher priority than groups)
    const currentEdges = edgesRef.current.filter(edge => !filteredTypes.has(edge.type))
    let visibleNodes: Node[]
    
    if (groupFocusMode && focusedGroup && nodeGroups.has(focusedGroup)) {
      // Group focus mode - same logic as rendering
      const groupMembers = nodeGroups.get(focusedGroup)!
      const groupMemberIds = new Set(groupMembers.map(n => n.id))
      
      const connectedNodeIds = new Set<string>()
      groupMemberIds.forEach(memberId => connectedNodeIds.add(memberId))
      
      currentEdges.forEach(edge => {
        if (groupMemberIds.has(edge.source)) {
          connectedNodeIds.add(edge.target)
        }
        if (groupMemberIds.has(edge.target)) {
          connectedNodeIds.add(edge.source)
        }
      })
      
      visibleNodes = nodesRef.current.filter(node => connectedNodeIds.has(node.id))
    } else if (showConnectionsOnly && selectedNode) {
      visibleNodes = nodesRef.current.filter(node => 
        node.id === selectedNode ||
        currentEdges.some(edge => edge.source === node.id || edge.target === node.id)
      )
    } else if (searchTerm) {
      // Filter nodes for visibility based on search - isolate matching nodes and their connections
      const matchingNodes = nodesRef.current.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      if (matchingNodes.length > 0) {
        const matchingNodeIds = new Set(matchingNodes.map(node => node.id))
        const connectedNodeIds = new Set<string>()
        
        matchingNodeIds.forEach(nodeId => connectedNodeIds.add(nodeId))
        
        currentEdges.forEach(edge => {
          if (matchingNodeIds.has(edge.source)) {
            connectedNodeIds.add(edge.target)
          }
          if (matchingNodeIds.has(edge.target)) {
            connectedNodeIds.add(edge.source)
          }
        })
        
        visibleNodes = nodesRef.current.filter(node => connectedNodeIds.has(node.id))
      } else {
        visibleNodes = []
      }
    } else {
      visibleNodes = nodesRef.current
    }
    
    // Increase click area for nodes slightly for better UX
    const clickedNode = visibleNodes.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      const clickRadius = node.radius + 5 // Add 5px buffer for easier clicking
      return Math.sqrt(dx * dx + dy * dy) <= clickRadius
    })

    // Check if clicking on a menu item first
    if (selectedNodeForMenu) {
      const selectedNodeObj = visibleNodes.find(n => n.id === selectedNodeForMenu)
      if (selectedNodeObj) {
        const selectedNodeSize = Math.max(nodeSize, selectedNodeObj.radius * 3.5)
        const menuHeight = 32
        const menuWidth = 120
        const menuY = selectedNodeObj.y - selectedNodeSize/2 - menuHeight - 8
        const menuX = selectedNodeObj.x - menuWidth/2
        const itemWidth = menuWidth / 3
        
        // Check if click is on menu
        if (x >= menuX && x <= menuX + menuWidth && y >= menuY && y <= menuY + menuHeight) {
          // Determine which button was clicked
          if (x < menuX + itemWidth) {
            // Focus button clicked
            handleNodeAction('focus', selectedNodeObj)
          } else if (x < menuX + itemWidth * 2) {
            // Info button clicked
            handleNodeAction('details', selectedNodeObj)
          } else {
            // Move button clicked
            handleNodeAction('drag', selectedNodeObj)
          }
          return
        }
      }
    }

    if (clickedNode) {
      // Node clicked - toggle menu
      if (selectedNodeForMenu === clickedNode.id) {
        // Clicking the same node again - close menu
        setSelectedNodeForMenu(null)
      } else {
        // Select this node for menu
        setSelectedNodeForMenu(clickedNode.id)
        setSelectedGroupForMenu(null)
      }
      return // Exit early - node takes priority
    }
    
    // Only check for group dragging if no node was clicked
    if (showGroupContainers && groupBoxes && groupingMode !== 'none') {
      let clickedGroup: string | null = null
      
      groupBoxes.forEach((box, groupKey) => {
        if (x >= box.x && x <= box.x + box.width && 
            y >= box.y && y <= box.y + box.height) {
          clickedGroup = groupKey
        }
      })
      
      if (clickedGroup) {
        // Check if click is in the group header area for dragging
        const groupBox = groupBoxes.get(clickedGroup)!
        const headerHeight = 40 // Only drag from header area
        
        if (y <= groupBox.y + headerHeight) {
          // Start group dragging only from header
          setDraggedGroup(clickedGroup)
          setGroupDragOffset({
            x: x - groupBox.x,
            y: y - groupBox.y
          })
          return
        } else {
          // Click on group body - toggle group menu
          if (nodeGroups.has(clickedGroup)) {
            if (selectedGroupForMenu === clickedGroup) {
              // Clicking the same group again - close menu
              setSelectedGroupForMenu(null)
            } else {
              // Select this group for menu
              setSelectedGroupForMenu(clickedGroup)
              setSelectedNodeForMenu(null)
            }
          }
          return
        }
      }
    }
    
    // If no node or group clicked, clear menus and start canvas dragging
    setSelectedNodeForMenu(null)
    setSelectedGroupForMenu(null)
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
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
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }
      // Only update if the offset has actually changed significantly
      if (Math.abs(newOffset.x - offset.x) > 1 || Math.abs(newOffset.y - offset.y) > 1) {
        setOffset(newOffset)
      }
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
          : searchTerm
            ? (() => {
                // Filter nodes for visibility based on search - isolate matching nodes and their connections
                const matchingNodes = nodesRef.current.filter(node => 
                  node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  node.type.toLowerCase().includes(searchTerm.toLowerCase())
                )
                
                if (matchingNodes.length > 0) {
                  const matchingNodeIds = new Set(matchingNodes.map(node => node.id))
                  const connectedNodeIds = new Set<string>()
                  
                  matchingNodeIds.forEach(nodeId => connectedNodeIds.add(nodeId))
                  
                  currentEdges.forEach(edge => {
                    if (matchingNodeIds.has(edge.source)) {
                      connectedNodeIds.add(edge.target)
                    }
                    if (matchingNodeIds.has(edge.target)) {
                      connectedNodeIds.add(edge.source)
                    }
                  })
                  
                  return nodesRef.current.filter(node => connectedNodeIds.has(node.id))
                } else {
                  return []
                }
              })()
            : nodesRef.current
        
        const hoveredNode = visibleNodes.find(node => {
          const dx = x - node.x
          const dy = y - node.y
          return Math.sqrt(dx * dx + dy * dy) <= node.radius
        })

        if (hoveredNode) {
          hoveredElement = hoveredNode.id
        }
      }

      // Only update hovered node if it actually changed
      if (hoveredNode !== hoveredElement) {
        setHoveredNode(hoveredElement)
      }
      
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - offset.x) / scale
    const y = (e.clientY - rect.top - offset.y) / scale

    const currentNodes = nodesRef.current
    const groupBoxes = (currentNodes as any).groupBoxes as Map<string, { x: number, y: number, width: number, height: number }> | undefined
    
    // Check if right-clicking on a node
    const currentEdges = edgesRef.current.filter(edge => !filteredTypes.has(edge.type))
    let visibleNodes: Node[]
    
    if (groupFocusMode && focusedGroup && nodeGroups.has(focusedGroup)) {
      const groupMembers = nodeGroups.get(focusedGroup)!
      const groupMemberIds = new Set(groupMembers.map(n => n.id))
      
      const connectedNodeIds = new Set<string>()
      groupMemberIds.forEach(memberId => connectedNodeIds.add(memberId))
      
      currentEdges.forEach(edge => {
        if (groupMemberIds.has(edge.source)) {
          connectedNodeIds.add(edge.target)
        }
        if (groupMemberIds.has(edge.target)) {
          connectedNodeIds.add(edge.source)
        }
      })
      
      visibleNodes = nodesRef.current.filter(node => connectedNodeIds.has(node.id))
    } else if (showConnectionsOnly && selectedNode) {
      visibleNodes = nodesRef.current.filter(node => 
        node.id === selectedNode ||
        currentEdges.some(edge => edge.source === node.id || edge.target === node.id)
      )
    } else {
      visibleNodes = nodesRef.current.filter(node => 
        !searchTerm || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Check for node click
    const clickedNode = visibleNodes.find(node => {
      const dx = x - node.x
      const dy = y - node.y
      const clickRadius = node.radius + 5
      return Math.sqrt(dx * dx + dy * dy) <= clickRadius
    })

    if (clickedNode) {
      // Show node context menu
      setNodeContextMenu({
        x: e.clientX,
        y: e.clientY,
        node: clickedNode
      })
      setGroupContextMenu(null)
      return
    }

    // Check for group click
    if (showGroupContainers && groupBoxes && groupingMode !== 'none') {
      let clickedGroup: string | null = null
      
      groupBoxes.forEach((box, groupKey) => {
        if (x >= box.x && x <= box.x + box.width && 
            y >= box.y && y <= box.y + box.height) {
          clickedGroup = groupKey
        }
      })
      
      if (clickedGroup && nodeGroups.has(clickedGroup)) {
        // Show group context menu
        setGroupContextMenu({
          x: e.clientX,
          y: e.clientY,
          group: clickedGroup,
          nodes: nodeGroups.get(clickedGroup)!
        })
        setNodeContextMenu(null)
        return
      }
    }

    // Clear any existing context menus if clicking on empty space
    setNodeContextMenu(null)
    setGroupContextMenu(null)
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
      // Force a reflow to get accurate dimensions
      container.style.width = container.style.width
      
      // Get the container dimensions with proper calculations
      const rect = container.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(container)
      
      // Calculate available space minus padding and borders
      const paddingX = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight)
      const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom)
      const borderX = parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth)
      const borderY = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth)
      
      // Set canvas size to fill container
      const availableWidth = Math.max(600, rect.width - paddingX - borderX)
      const availableHeight = Math.max(400, rect.height - paddingY - borderY)
      
      canvas.width = availableWidth
      canvas.height = availableHeight
      
      // Set CSS size to match
      canvas.style.width = availableWidth + 'px'
      canvas.style.height = availableHeight + 'px'
    }

    // Prevent page scrolling when interacting with the graph
    const preventScroll = (e: WheelEvent) => {
      if (canvas && canvas.contains(e.target as globalThis.Node)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const preventTouch = (e: TouchEvent) => {
      if (canvas && canvas.contains(e.target as globalThis.Node)) {
        e.preventDefault()
      }
    }

    resizeCanvas()
    // Force initial resize after a short delay to ensure container is rendered
    setTimeout(resizeCanvas, 100)
    setTimeout(resizeCanvas, 500)
    
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
    <Card 
      ref={containerRef} 
      className="w-full h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 shadow-2xl border border-slate-200 dark:border-slate-700 rounded-xl"
    >
      {/* Modern Controls Header */}
      <CardHeader className="p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 z-10 flex-shrink-0">
        {/* Main Control Bar */}
        <div className="flex items-center justify-between w-full p-4 gap-3 flex-wrap">
          {/* Left Section - Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full h-9 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-600/50 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-sm"
              />
            </div>
            
            {/* Search Options - Only show when searching */}
            {searchTerm && (
              <>
                <Select value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
                  <SelectTrigger className="w-32 h-9 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-600/50 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="node-only">Node only</SelectItem>
                    <SelectItem value="with-connections">With connections</SelectItem>
                  </SelectContent>
                </Select>
                
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-50/70 dark:bg-blue-900/30 rounded-lg border border-blue-200/50 dark:border-blue-600/50">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                      {currentSearchIndex + 1}/{searchResults.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateSearchResults('prev')}
                      className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded"
                      title="Previous"
                      disabled={searchResults.length <= 1}
                    >
                      <span className="text-sm">←</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateSearchResults('next')}
                      className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded"
                      title="Next"
                      disabled={searchResults.length <= 1}
                    >
                      <span className="text-sm">→</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Center Section - Essential Controls */}
          {showGraphControls && (
          <div className="flex items-center gap-2">
            {/* Auto Layout Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={autoLayout}
              disabled={isAutoLayouting}
              className="h-9 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Shuffle className={`h-4 w-4 ${!isAutoLayouting && 'mr-2'} ${isAutoLayouting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isAutoLayouting ? 'Organizing...' : 'Auto Layout'}</span>
            </Button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50/70 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-600/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScale(prev => Math.min(5, prev * 1.2))}
                className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                title="Zoom In (+)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="px-2 text-xs font-mono text-slate-600 dark:text-slate-400 min-w-[2.5rem] text-center hidden sm:block">
                {Math.round(scale * 100)}%
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScale(prev => Math.max(0.2, prev / 1.2))}
                className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                title="Zoom Out (-)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-0.5 hidden sm:block"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fitToView}
                className="h-7 px-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-xs rounded hidden sm:flex"
                title="Fit to View (F)"
              >
                Fit
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetView}
                className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                title="Reset View (R)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          )}

          {/* Right Section - Settings Menu */}
          <div className="flex items-center gap-2">
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 px-3 bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-600/50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                  <MoreVertical className="h-4 w-4 sm:hidden" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* View Options */}
                <DropdownMenuCheckboxItem
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                >
                  Show Labels
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={enableAnimation}
                  onCheckedChange={setEnableAnimation}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Enable Animations
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showMinimapLocal}
                  onCheckedChange={setShowMinimapLocal}
                >
                  Show Minimap
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showGraphControls}
                  onCheckedChange={setShowGraphControls}
                >
                  Show Graph Controls
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Layout</DropdownMenuLabel>
                
                {/* Layout Mode */}
                <div className="px-2 py-1.5">
                  <Select value={layoutMode} onValueChange={(value: any) => setLayoutMode(value)}>
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="force">Force Layout</SelectItem>
                      <SelectItem value="hierarchical">Hierarchical</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="grouped">Grouped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Edge Style */}
                <div className="px-2 py-1.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Edge Style</span>
                  <Select value={edgeStyle} onValueChange={(value: any) => setEdgeStyle(value)}>
                    <SelectTrigger className="w-full h-8 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight">Straight</SelectItem>
                      <SelectItem value="curved">Curved</SelectItem>
                      <SelectItem value="step">Step</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Grouping Mode */}
                {layoutMode === 'grouped' && (
                  <div className="px-2 py-1.5">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Group By</span>
                    <Select value={groupingMode} onValueChange={(value: any) => setGroupingMode(value)}>
                      <SelectTrigger className="w-full h-8 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {groupingMode !== 'none' && (
                  <DropdownMenuCheckboxItem
                    checked={showGroupContainers}
                    onCheckedChange={setShowGroupContainers}
                  >
                    Show Group Containers
                  </DropdownMenuCheckboxItem>
                )}
                
                <DropdownMenuSeparator />
                
                {/* Node Spacing Slider */}
                <div className="px-2 py-1.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Node Spacing</span>
                  <Slider
                    value={[nodeSpacing]}
                    onValueChange={([v]) => setNodeSpacing(v)}
                    min={150}
                    max={400}
                    step={10}
                    className="mt-2"
                  />
                </div>
                
                {/* Node Size Slider */}
                <div className="px-2 py-1.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Node Size</span>
                  <Slider
                    value={[nodeSize]}
                    onValueChange={([v]) => setNodeSize(v)}
                    min={50}
                    max={150}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Relationship Filters */}
        <div className="flex items-center justify-center w-full px-4 pb-3 border-t border-slate-100/50 dark:border-slate-700/50 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters:
            </span>
            <div className="flex gap-2">
              {relationshipTypes.map(type => (
                <Badge
                  key={type}
                  variant={filteredTypes.has(type) ? "outline" : "default"}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-1 text-sm font-medium rounded-full ${
                    filteredTypes.has(type) ? 'opacity-50 grayscale bg-slate-100 dark:bg-slate-800' : 'shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => toggleFilter(type)}
                  style={{
                    backgroundColor: filteredTypes.has(type) ? 'transparent' : getEdgeColor(type, 0.15),
                    borderColor: getEdgeColor(type, 0.8),
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
      </CardHeader>
      
      {/* Enhanced Graph Container */}
      <div
        className="relative w-full flex-1 shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, rgb(248 250 252) 0%, rgb(255 255 255) 50%, rgb(248 250 252) 100%)',
          minHeight: '500px'
        }}
      >
        {/* Enhanced Decorative Grid Background */}
        <div 
          className="absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25px 25px, rgb(59 130 246 / 0.3) 2px, transparent 2px),
              linear-gradient(rgb(148 163 184 / 0.2) 1px, transparent 1px), 
              linear-gradient(90deg, rgb(148 163 184 / 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px, 50px 50px, 50px 50px',
            borderRadius: '16px'
          }}
        ></div>
        
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing"
          style={{ 
            touchAction: 'none',
            display: 'block',
            width: '100%',
            height: '100%'
          }}
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
              <span>Node menu</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Click node</span>
            </div>
            <div className="flex justify-between">
              <span>Group menu</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Click group</span>
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

        {/* Node Context Menu */}
        {nodeContextMenu && (
          <div 
            data-context-menu
            className="fixed z-50"
            style={{
              left: `${nodeContextMenu.x - 60}px`, 
              top: `${nodeContextMenu.y - 15}px`, 
            }}
          >
            {/* Connection line to node */}
            <div 
              className="absolute w-0.5 h-3 bg-slate-600 dark:bg-slate-500 left-1/2 bottom-0 transform -translate-x-1/2"
              style={{ transform: 'translateX(-50%) translateY(100%)' }}
            />
            
            {/* Menu container with tail */}
            <div className="relative">
              {/* Tail pointing down to node */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800 dark:border-t-slate-700"></div>
              </div>
              
              {/* Main menu */}
              <div className="bg-slate-800/98 dark:bg-slate-700/98 backdrop-blur-sm border border-slate-600 dark:border-slate-500 rounded-lg shadow-2xl flex items-center gap-0.5 p-1 min-w-fit">
                <button
                  onClick={() => handleNodeAction('focus', nodeContextMenu.node)}
                  className="p-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors"
                  title="Focus Node"
                >
                  <Focus className="h-3 w-3 text-blue-400" />
                </button>
                <div className="w-px h-4 bg-slate-600 dark:bg-slate-500"></div>
                <button
                  onClick={() => handleNodeAction('details', nodeContextMenu.node)}
                  className="p-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors"
                  title="View Details"
                >
                  <Info className="h-3 w-3 text-cyan-400" />
                </button>
                <div className="w-px h-4 bg-slate-600 dark:bg-slate-500"></div>
                <button
                  onClick={() => handleNodeAction('drag', nodeContextMenu.node)}
                  className="p-1.5 hover:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors"
                  title="Start Dragging"
                >
                  <Move className="h-3 w-3 text-green-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group Context Menu */}
        {groupContextMenu && (
          <div 
            data-context-menu
            className="fixed z-50"
            style={{
              left: `${groupContextMenu.x - 60}px`, 
              top: `${groupContextMenu.y + 10}px`, 
            }}
          >
            {/* Menu container with tail pointing up to group */}
            <div className="relative">
              {/* Tail pointing up to group */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-amber-800 dark:border-b-amber-700"></div>
              </div>
              
              {/* Main menu */}
              <div className="bg-amber-800/98 dark:bg-amber-700/98 backdrop-blur-sm border border-amber-600 dark:border-amber-500 rounded-lg shadow-2xl flex items-center gap-0.5 p-1 min-w-fit">
                <button
                  onClick={() => handleGroupAction('isolate', groupContextMenu.group, groupContextMenu.nodes)}
                  className="p-1.5 hover:bg-amber-700 dark:hover:bg-amber-600 rounded-md transition-colors"
                  title="Isolate Group"
                >
                  <Zap className="h-3 w-3 text-amber-200" />
                </button>
                <div className="w-px h-4 bg-amber-600 dark:bg-amber-500"></div>
                <button
                  onClick={() => handleGroupAction('details', groupContextMenu.group, groupContextMenu.nodes)}
                  className="p-1.5 hover:bg-amber-700 dark:hover:bg-amber-600 rounded-md transition-colors"
                  title="View Details"
                >
                  <Info className="h-3 w-3 text-amber-200" />
                </button>
                <div className="w-px h-4 bg-amber-600 dark:bg-amber-500"></div>
                <div className="px-2 text-xs text-amber-200 font-medium flex items-center">
                  {groupContextMenu.nodes.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}