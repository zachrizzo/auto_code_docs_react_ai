import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50') // Default 50 items per page
    const loadFullData = searchParams.get('full') === 'true'
    
    const docsPath = path.join(process.cwd(), 'public/docs-data')
    
    // Read the component index
    const indexPath = path.join(docsPath, 'component-index.json')
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ error: 'Component index not found' }, { status: 404 })
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    const totalCount = indexData.length
    
    // Calculate pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedIndex = indexData.slice(startIndex, endIndex)
    
    if (!loadFullData) {
      // Return only index data for initial load
      return NextResponse.json({
        components: paginatedIndex,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: endIndex < totalCount
      })
    }
    
    // Load component data files for the current page
    const componentPromises = paginatedIndex.map(async (comp: { slug: string }) => {
      try {
        const componentPath = path.join(docsPath, `${comp.slug}.json`)
        if (fs.existsSync(componentPath)) {
          const stats = fs.statSync(componentPath)
          // Skip files larger than 1MB to prevent memory issues
          if (stats.size > 1024 * 1024) {
            console.warn(`Skipping large file: ${comp.slug}.json (${stats.size} bytes)`)
            return { ...comp, _error: 'File too large' }
          }
          return JSON.parse(fs.readFileSync(componentPath, 'utf-8'))
        }
        return comp // Return index data if file doesn't exist
      } catch (err) {
        console.error(`Error loading ${comp.slug}.json:`, err)
        return { ...comp, _error: 'Failed to load' }
      }
    })
    
    // Process in batches to prevent memory overflow
    const batchSize = 10
    const results = []
    for (let i = 0; i < componentPromises.length; i += batchSize) {
      const batch = componentPromises.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch)
      results.push(...batchResults)
    }
    
    return NextResponse.json({
      components: results,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: endIndex < totalCount
    })
  } catch (error) {
    console.error('Error loading components:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}