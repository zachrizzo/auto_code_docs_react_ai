"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import Link from "next/link"
import { ComparisonModal } from "./comparison-modal"
import { ArrowRightIcon } from "@radix-ui/react-icons"

interface SimilarityListProps {
  threshold: number
}

interface SimilarityWarning {
  similarTo: string
  score: number
  reason: string
  filePath: string
  code: string
}

interface ComponentData {
  name: string
  slug: string
  filePath: string
  code?: string
  methods?: {
    name: string
    similarityWarnings?: SimilarityWarning[]
  }[]
  similarityWarnings?: SimilarityWarning[]
}

interface ComponentIndex {
  name: string
  slug: string
  filePath?: string
  description?: string
  methodCount?: number
}

export function SimilarityList({ threshold }: SimilarityListProps) {
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [selectedPair, setSelectedPair] = useState<{
    component1: { name: string; code: string; filePath: string }
    component2: { name: string; code: string; filePath: string }
    similarity: number
  } | null>(null)
  const [components, setComponents] = useState<ComponentData[]>([])
  const [similarComponents, setSimilarComponents] = useState<{
    pair: string[]
    similarity: number
    reason: string
    component1: ComponentData
    component2: ComponentData
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch component data
  useEffect(() => {
    async function fetchComponents() {
      try {
        // Fetch component index
        const indexRes = await fetch('/docs-data/component-index.json')
        if (!indexRes.ok) {
          throw new Error(`Failed to fetch component index: ${indexRes.status}`)
        }
        const indexData = await indexRes.json() as ComponentIndex[]

        console.log('Component index loaded:', indexData)

        // Remove duplicate entries based on slug
        const uniqueComponents = Array.from(
          new Map(indexData.map((comp) => [comp.slug, comp])).values()
        ) as ComponentIndex[]

        // Fetch each component's data
        const componentsData = await Promise.all(
          uniqueComponents.map(async (comp: ComponentIndex) => {
            try {
              const res = await fetch(`/docs-data/${comp.slug}.json`)
              if (!res.ok) {
                console.error(`Failed to load ${comp.slug}.json: ${res.status}`)
                return null
              }
              const data = await res.json()
              return data
            } catch (err) {
              console.error(`Error loading ${comp.slug}.json:`, err)
              return null
            }
          })
        )

        // Filter out null results
        const validComponentsData = componentsData.filter(Boolean) as ComponentData[]
        console.log('Valid components loaded:', validComponentsData.length)

        setComponents(validComponentsData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching component data:", error)
        setError(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setLoading(false)
      }
    }

    fetchComponents()
  }, [])

  // Process similarity data whenever components or threshold changes
  useEffect(() => {
    if (components.length === 0) return

    console.log('Processing similarity data for', components.length, 'components at threshold', threshold)

    const similarPairs: {
      pair: string[]
      similarity: number
      reason: string
      component1: ComponentData
      component2: ComponentData
    }[] = []

    // Track processed pairs to avoid duplicates
    const processedPairs = new Set<string>()

    // Find components with similarity warnings
    components.forEach(component => {
      // Check top-level similarity warnings
      if (component.similarityWarnings && component.similarityWarnings.length > 0) {
        processSimilarityWarnings(component, component.similarityWarnings)
      }

      // Check method-level similarity warnings
      if (component.methods && component.methods.length > 0) {
        component.methods.forEach(method => {
          if (method.similarityWarnings && method.similarityWarnings.length > 0) {
            processSimilarityWarnings(component, method.similarityWarnings)
          }
        })
      }
    })

    function processSimilarityWarnings(component: ComponentData, warnings: SimilarityWarning[]) {
      warnings.forEach(warning => {
        // Convert similarity score from 0-1 to percentage if needed
        const similarityPercent = warning.score > 1
          ? warning.score
          : Math.round(warning.score * 100)

        // Skip if below threshold
        if (similarityPercent < threshold) return

        // Extract component name from similarTo (format could be ComponentName or ComponentName.methodName)
        const similarCompName = warning.similarTo.split('.')[0]

        // Find the referenced component
        const similarComp = components.find(c => c.name === similarCompName)

        if (similarComp) {
          // Create a unique key for this pair to avoid duplicates
          const pairKey = [component.name, similarComp.name].sort().join('_')

          // Skip if we've already processed this pair
          if (processedPairs.has(pairKey)) return
          processedPairs.add(pairKey)

          similarPairs.push({
            pair: [component.name, similarComp.name],
            similarity: similarityPercent,
            reason: warning.reason,
            component1: component,
            component2: similarComp
          })
        }
      })
    }

    // Sort by similarity (highest first)
    similarPairs.sort((a, b) => b.similarity - a.similarity)
    console.log('Found', similarPairs.length, 'similar component pairs')
    setSimilarComponents(similarPairs)
  }, [components, threshold])

  const handleCompare = (item: {
    component1: ComponentData
    component2: ComponentData
    similarity: number
  }) => {
    // Fetch code for components if not already available
    const fetchComponentCode = async (component: ComponentData) => {
      if (component.code) return component.code

      try {
        const res = await fetch(`/docs-data/${component.slug}.json`)
        const data = await res.json()
        return data.sourceCode || data.code || `// No code available for ${component.name}`
      } catch (error) {
        console.error(`Error fetching code for ${component.name}:`, error)
        return `// Error loading code for ${component.name}`
      }
    }

    // Set up the comparison
    Promise.all([
      fetchComponentCode(item.component1),
      fetchComponentCode(item.component2)
    ]).then(([code1, code2]) => {
      setSelectedPair({
        component1: {
          name: item.component1.name,
          code: code1,
          filePath: item.component1.filePath || `components/${item.component1.name}`,
        },
        component2: {
          name: item.component2.name,
          code: code2,
          filePath: item.component2.filePath || `components/${item.component2.name}`,
        },
        similarity: item.similarity,
      })
      setComparisonOpen(true)
    })
  }

  if (loading) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
        <p className="text-lg">Loading similarity data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-red-300">
        <p className="text-lg text-red-600">{error}</p>
        <p className="text-sm text-muted-foreground mt-2">Check console for more details.</p>
      </div>
    )
  }

  if (similarComponents.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
        <p className="text-lg text-muted-foreground">No similar components found at {threshold}% threshold.</p>
        <p className="text-sm text-muted-foreground mt-2">Try lowering the threshold to see more results.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8">
        {similarComponents.map((item, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium">{item.pair[0]}</span>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-medium">{item.pair[1]}</span>
                <Badge
                  className={`ml-2 ${item.similarity >= 80
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    }`}
                >
                  {item.similarity}% Similar
                </Badge>
              </div>
            </div>
            <div className="p-6">
              <p className="mb-6 text-lg">{item.reason}</p>
              <div className="flex gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/docs/${item.component1.slug || item.pair[0].toLowerCase()}`}>View {item.pair[0]}</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/docs/${item.component2.slug || item.pair[1].toLowerCase()}`}>View {item.pair[1]}</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
                  onClick={() => handleCompare(item)}
                >
                  Compare Components
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPair && (
        <ComparisonModal
          isOpen={comparisonOpen}
          onClose={() => setComparisonOpen(false)}
          component1={{
            name: selectedPair.component1.name,
            code: selectedPair.component1.code,
            filePath: selectedPair.component1.filePath,
          }}
          component2={{
            name: selectedPair.component2.name,
            code: selectedPair.component2.code,
            filePath: selectedPair.component2.filePath,
          }}
          similarityScore={selectedPair.similarity}
        />
      )}
    </>
  )
}
