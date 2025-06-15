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
          // Determine type based on component name and file path patterns
          let entityType: 'component' | 'function' | 'method' | 'class' = 'function' // default
          
          const name = comp.name
          const filePath = comp.filePath || ''
          
          // Use explicit kind if available
          if (comp.kind) {
            entityType = comp.kind
          } else {
            // Classify based on patterns
            if (name[0] === name[0].toUpperCase()) {
              if (filePath.includes('component') || filePath.includes('/ui/') || 
                  name.includes('Component') || name.includes('Page') || name.includes('Modal') ||
                  name.includes('Provider') || name.includes('Wrapper') || name.includes('Layout') ||
                  name.includes('Dialog') || name.includes('Button') || name.includes('Card') ||
                  name.includes('Input') || name.includes('Form') || name.includes('List') ||
                  name.includes('Menu') || name.includes('Nav') || name.includes('Header') ||
                  name.includes('Footer') || name.includes('Sidebar') || name.includes('Panel')) {
                entityType = 'component'
              } else if (name.includes('Service') || name.includes('Manager') || name.includes('Controller') ||
                        name.includes('Class') || name.includes('Handler') || name.includes('Store') ||
                        name.includes('Repository') || name.includes('Factory') || name.includes('Builder')) {
                entityType = 'class'
              } else {
                entityType = 'component' // Uppercase names are usually components in React
              }
            } else {
              // Lowercase names are functions (not methods unless explicitly marked)
              entityType = 'function'
            }
          }

          // Add the main component from index data
          const mainItem: SearchItem = {
            name: comp.name,
            type: entityType,
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
                
                // Add methods from the detailed data - only if parent is a class AND not already in component index
                if (detailData.methods && detailData.methods.length > 0) {
                  detailData.methods.forEach((method: any) => {
                    if (method.name && method.name !== comp.name) {
                      // Check if this method/function already exists in the component index
                      const alreadyInIndex = indexData.some((indexItem: any) => 
                        indexItem.name === method.name && 
                        (indexItem.filePath === (detailData.filePath || comp.filePath) || 
                         indexItem.slug.includes(method.name.toLowerCase()))
                      )
                      
                      // Skip if already exists in component index
                      if (alreadyInIndex) {
                        return
                      }
                      
                      // Determine if this is truly a method (function of a class) or just a function
                      let methodType: 'method' | 'function' = 'function'
                      
                      // Only mark as method if the parent entity is a class
                      if (entityType === 'class') {
                        methodType = 'method'
                      }
                      // Or if the method explicitly indicates it's part of a class context
                      else if (method.isClassMethod || method.memberOf || method.static) {
                        methodType = 'method'
                      }
                      
                      items.push({
                        name: method.name,
                        type: methodType,
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
          // Return at least the basic component info with proper type classification
          let fallbackType: 'component' | 'function' | 'method' | 'class' = 'function'
          const name = comp.name
          const filePath = comp.filePath || ''
          
          if (name[0] === name[0].toUpperCase()) {
            if (filePath.includes('component') || filePath.includes('/ui/') || 
                name.includes('Component') || name.includes('Page') || name.includes('Modal') ||
                name.includes('Provider') || name.includes('Wrapper') || name.includes('Layout') ||
                name.includes('Dialog') || name.includes('Button') || name.includes('Card') ||
                name.includes('Input') || name.includes('Form') || name.includes('List') ||
                name.includes('Menu') || name.includes('Nav') || name.includes('Header') ||
                name.includes('Footer') || name.includes('Sidebar') || name.includes('Panel')) {
              fallbackType = 'component'
            } else if (name.includes('Service') || name.includes('Manager') || name.includes('Controller') ||
                      name.includes('Class') || name.includes('Handler') || name.includes('Store') ||
                      name.includes('Repository') || name.includes('Factory') || name.includes('Builder')) {
              fallbackType = 'class'
            } else {
              fallbackType = 'component' // Uppercase names are usually components in React
            }
          } else {
            fallbackType = 'function'
          }
          
          return [{
            name: comp.name,
            type: fallbackType,
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
    
    // Remove duplicates based on name and filePath (more comprehensive deduplication)
    const uniqueItems = allItems.filter((item, index, self) => {
      return index === self.findIndex((t) => {
        // Match by name and filePath to catch duplicates from different sources
        const sameNameAndFile = t.name === item.name && t.filePath === item.filePath
        // Also match by slug for exact duplicates
        const sameSlug = t.slug === item.slug
        return sameNameAndFile || sameSlug
      })
    })
    
    // Log duplicate analysis
    const duplicateAnalysis = allItems.reduce((acc, item) => {
      const key = `${item.name}|${item.filePath}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item.type)
      return acc
    }, {} as Record<string, string[]>)
    
    const duplicates = Object.entries(duplicateAnalysis).filter(([_, types]) => types.length > 1)
    if (duplicates.length > 0) {
      console.log('Found duplicates:', duplicates.slice(0, 5)) // Show first 5 duplicates
    }
    
    console.log(`Generated ${uniqueItems.length} search items from ${indexData.length} components (removed ${allItems.length - uniqueItems.length} duplicates)`)
    
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