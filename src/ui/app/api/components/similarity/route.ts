import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface Method {
  name: string
  similarityWarnings?: any[]
}

interface ComponentData {
  slug: string
  name: string
  filePath: string
  methods?: Method[]
  entities?: { methods?: Method[] }[]
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const threshold = parseInt(searchParams.get('threshold') || '50')
    
    const docsPath = path.join(process.cwd(), 'public/docs-data')
    
    // Read the component index
    const indexPath = path.join(docsPath, 'component-index.json')
    if (!fs.existsSync(indexPath)) {
      return NextResponse.json({ error: 'Component index not found' }, { status: 404 })
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    
    // Only load components that have methods (potential for similarities)
    // Some indexes might not have methodCount, so we'll check all components
    const componentsWithMethods = indexData.filter((comp: any) => 
      comp.methodCount === undefined || comp.methodCount > 0
    )
    
    console.log(`Processing ${componentsWithMethods.length} components with methods out of ${indexData.length} total`)
    
    const componentsWithSimilarities = []
    const batchSize = 20 // Process in smaller batches
    
    // Process components in batches
    for (let i = 0; i < componentsWithMethods.length; i += batchSize) {
      const batch = componentsWithMethods.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (comp: { slug: string }) => {
        try {
          const componentPath = path.join(docsPath, `${comp.slug}.json`)
          if (!fs.existsSync(componentPath)) {
            return null
          }
          
          const stats = fs.statSync(componentPath)
          if (stats.size > 512 * 1024) { // Skip files larger than 512KB
            console.warn(`Skipping large file: ${comp.slug}.json`)
            return null
          }
          
          const data: ComponentData = JSON.parse(fs.readFileSync(componentPath, 'utf-8'))
          
          // Check if this component has any similarity warnings
          let hasSimilarities = false
          const allMethods: Method[] = []
          
          // Collect methods from the component
          if (data.methods) {
            allMethods.push(...data.methods)
          }
          
          // Collect methods from entities
          if (data.entities) {
            data.entities.forEach(entity => {
              if (entity.methods) {
                allMethods.push(...entity.methods)
              }
            })
          }
          
          // Check if any method has similarity warnings above threshold
          // Note: scores are between 0-1, so convert threshold from percentage
          const normalizedThreshold = threshold / 100
          for (const method of allMethods) {
            if (method.similarityWarnings && method.similarityWarnings.length > 0) {
              const hasRelevantWarning = method.similarityWarnings.some(
                (warning: any) => warning.score >= normalizedThreshold
              )
              if (hasRelevantWarning) {
                hasSimilarities = true
                break
              }
            }
          }
          
          if (hasSimilarities) {
            // Only include methods with similarities to reduce payload
            const filteredMethods = allMethods.filter(method => 
              method.similarityWarnings && 
              method.similarityWarnings.some((w: any) => w.score >= normalizedThreshold)
            )
            
            return {
              ...data,
              methods: filteredMethods,
              entities: undefined, // Remove entities to reduce payload
              _methodCount: filteredMethods.length
            }
          }
          
          return null
        } catch (err) {
          console.error(`Error processing ${comp.slug}:`, err)
          return null
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      const validResults = batchResults.filter(Boolean)
      componentsWithSimilarities.push(...validResults)
      
      // Add a small delay between batches to prevent overload
      if (i + batchSize < componentsWithMethods.length) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    console.log(`Found ${componentsWithSimilarities.length} components with similarities`)
    
    return NextResponse.json({
      components: componentsWithSimilarities,
      totalCount: componentsWithSimilarities.length,
      totalProcessed: componentsWithMethods.length,
      threshold
    })
  } catch (error) {
    console.error('Error loading similarity data:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}