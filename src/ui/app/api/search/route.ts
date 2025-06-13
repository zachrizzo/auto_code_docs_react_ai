import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface SearchItem {
  name: string
  type: 'component' | 'function' | 'method' | 'class'
  slug: string
  parentName?: string
  filePath?: string
  description?: string
}

export async function GET() {
  try {
    const docsPath = path.join(process.cwd(), 'public/docs-data')
    
    // Read the component index
    const indexPath = path.join(docsPath, 'component-index.json')
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ error: 'Component index not found' }, { status: 404 })
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    
    const allItems: SearchItem[] = []
    const batchSize = 25 // Process in small batches
    
    // Process components in batches to prevent memory issues
    for (let i = 0; i < indexData.length; i += batchSize) {
      const batch = indexData.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (comp: any) => {
        try {
          // Add the main component from index data
          const mainItem: SearchItem = {
            name: comp.name,
            type: comp.kind || 'component',
            slug: comp.slug,
            filePath: comp.filePath,
            description: comp.description || ''
          }
          
          const items = [mainItem]
          
          // Try to load detailed data for methods, but don't fail if file doesn't exist
          const componentPath = path.join(docsPath, `${comp.slug}.json`)
          if (fs.existsSync(componentPath)) {
            const stats = fs.statSync(componentPath)
            // Only load if file is reasonable size
            if (stats.size <= 256 * 1024) { // 256KB limit
              try {
                const detailData = JSON.parse(fs.readFileSync(componentPath, 'utf-8'))
                
                // Add methods from the detailed data
                if (detailData.methods && detailData.methods.length > 0) {
                  detailData.methods.forEach((method: any) => {
                    if (method.name && method.name !== comp.name) {
                      items.push({
                        name: method.name,
                        type: 'method',
                        slug: `${comp.slug}#${method.name.toLowerCase().replace(/\s/g, '-')}`,
                        parentName: comp.name,
                        filePath: detailData.filePath || comp.filePath,
                        description: method.description || ''
                      })
                    }
                  })
                }
              } catch (err) {
                console.warn(`Could not parse ${comp.slug}.json:`, err)
              }
            } else {
              console.warn(`Skipping large file: ${comp.slug}.json (${stats.size} bytes)`)
            }
          }
          
          return items
        } catch (err) {
          console.error(`Error processing ${comp.slug}:`, err)
          // Return at least the basic component info
          return [{
            name: comp.name,
            type: comp.kind || 'component',
            slug: comp.slug,
            filePath: comp.filePath,
            description: comp.description || ''
          }]
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      const flatResults = batchResults.flat()
      allItems.push(...flatResults)
      
      // Small delay between batches
      if (i + batchSize < indexData.length) {
        await new Promise(resolve => setTimeout(resolve, 5))
      }
    }
    
    // Remove duplicates based on slug and name
    const uniqueItems = allItems.filter((item, index, self) =>
      index === self.findIndex((t) => (t.slug === item.slug && t.name === item.name))
    )
    
    console.log(`Generated ${uniqueItems.length} search items from ${indexData.length} components`)
    
    return NextResponse.json({
      items: uniqueItems,
      totalCount: uniqueItems.length
    })
  } catch (error) {
    console.error('Error generating search data:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}