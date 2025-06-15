"use client"
import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import Link from "next/link"
import { ComparisonModal } from "./comparison-modal"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { Progress } from "./ui/progress"
import { Input } from "./ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Skeleton } from "./ui/skeleton"
import { InfoIcon, SearchIcon, TrendingUpIcon, AlertTriangleIcon, CheckCircleIcon, EyeIcon, ArchiveIcon, ArchiveRestoreIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

interface SimilarityListProps {
  threshold: number
  preloadedComponents?: ComponentData[]
  showArchived?: boolean
  onShowArchivedChange?: (show: boolean) => void
  archivedCount?: number
  onArchivedCountChange?: (count: number) => void
}

interface ArchivedItem {
  key: string // unique key for the similarity pair
  archivedAt: number // timestamp
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
  kind?: string
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

// Helper function to get the correct URL path based on entity kind
const getEntityUrl = (component: ComponentData, methodName?: string): string => {
  let basePath = '/components'; // default fallback
  
  if (component.kind === 'function') {
    basePath = '/functions';
  } else if (component.kind === 'class') {
    basePath = '/classes';
  } else if (component.kind === 'component') {
    basePath = '/components';
  }
  
  const url = `${basePath}/${component.slug}`;
  return methodName ? `${url}#${methodName}` : url;
};

export function SimilarityList({ 
  threshold, 
  preloadedComponents,
  showArchived: externalShowArchived,
  onShowArchivedChange,
  archivedCount,
  onArchivedCountChange
}: SimilarityListProps) {
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [selectedPair, setSelectedPair] = useState<{
    component1: { name: string; code: string; filePath: string; slug?: string; kind?: string }
    component2: { name: string; code: string; filePath: string; slug?: string; kind?: string }
    similarity: number
    isMethodLevel?: boolean
    method1Name?: string
    method2Name?: string
  } | null>(null)
  const [components, setComponents] = useState<ComponentData[]>(preloadedComponents || [])
  const [similarComponents, setSimilarComponents] = useState<{
    pair: string[]
    similarity: number
    reason: string
    component1: ComponentData
    component2: ComponentData
    isMethodLevel?: boolean
    method1?: string
    method2?: string
  }[]>([])
  const [loading, setLoading] = useState(!preloadedComponents)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([])
  const [internalShowArchived, setInternalShowArchived] = useState(false)
  
  // Use external showArchived if provided, otherwise use internal state
  const showArchived = externalShowArchived !== undefined ? externalShowArchived : internalShowArchived
  const setShowArchived = onShowArchivedChange || setInternalShowArchived

  // Load archived items from localStorage on component mount
  useEffect(() => {
    const stored = localStorage.getItem('similarity-archived-items')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setArchivedItems(parsed)
      } catch (error) {
        console.error('Error loading archived items:', error)
      }
    }
  }, [])

  // Save archived items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('similarity-archived-items', JSON.stringify(archivedItems))
    // Notify parent component of archived count change if callback provided
    if (onArchivedCountChange) {
      onArchivedCountChange(archivedItems.length)
    }
  }, [archivedItems, onArchivedCountChange])

  // Helper function to generate unique key for similarity pair
  const generatePairKey = (item: {
    component1: ComponentData
    component2: ComponentData
    isMethodLevel?: boolean
    method1?: string
    method2?: string
  }) => {
    if (item.isMethodLevel) {
      return [
        `${item.component1.name}.${item.method1}`,
        `${item.component2.name}.${item.method2}`
      ].sort().join('_')
    }
    return [item.component1.name, item.component2.name].sort().join('_')
  }

  // Check if an item is archived
  const isItemArchived = (item: {
    component1: ComponentData
    component2: ComponentData
    isMethodLevel?: boolean
    method1?: string
    method2?: string
  }) => {
    const key = generatePairKey(item)
    return archivedItems.some(archived => archived.key === key)
  }

  // Toggle archive status
  const toggleArchive = (item: {
    component1: ComponentData
    component2: ComponentData
    isMethodLevel?: boolean
    method1?: string
    method2?: string
  }) => {
    const key = generatePairKey(item)
    const isArchived = isItemArchived(item)
    
    if (isArchived) {
      setArchivedItems(prev => prev.filter(archived => archived.key !== key))
    } else {
      setArchivedItems(prev => [...prev, { key, archivedAt: Date.now() }])
    }
  }

  // Fetch component data (only if no preloaded data)
  useEffect(() => {
    if (preloadedComponents) {
      console.log('Using preloaded component data:', preloadedComponents.length);
      setLoading(false);
      return;
    }

    async function fetchComponents() {
      try {
        console.log('Starting to fetch component data...');
        // Fetch component index
        const indexRes = await fetch('/docs-data/component-index.json')
        if (!indexRes.ok) {
          console.error(`Failed to fetch component index: ${indexRes.status}`);
          throw new Error(`Failed to fetch component index: ${indexRes.status}`)
        }
        const indexData = await indexRes.json() as ComponentIndex[]

        console.log('Component index loaded:', indexData)

        // Remove duplicate entries based on slug
        const uniqueComponents = Array.from(
          new Map(indexData.map((comp) => [comp.slug, comp])).values()
        ) as ComponentIndex[]

        console.log('Unique components after deduplication:', uniqueComponents.length);

        // Fetch each component's data
        const componentsData = await Promise.all(
          uniqueComponents.map(async (comp: ComponentIndex) => {
            try {
              const url = `/docs-data/${comp.slug}.json`;
              console.log(`Fetching component data from: ${url}`);
              const res = await fetch(url)
              if (!res.ok) {
                console.error(`Failed to load ${comp.slug}.json: ${res.status}`)
                return null
              }
              const data = await res.json()
              
              // Debug - check if this component has similarity warnings
              if (data.similarityWarnings && data.similarityWarnings.length > 0) {
                console.log(`Found ${data.similarityWarnings.length} top-level similarity warnings in ${comp.name}`);
              }

              // Debug - check the structure of the data
              console.log(`Component ${comp.name} data structure:`, {
                hasMethods: !!data.methods,
                methodsLength: data.methods?.length || 0,
                hasEntities: !!data.entities,
                entitiesLength: data.entities?.length || 0
              });

              // Some components might have entities that contain methods with similarity warnings
              if (data.entities && data.entities.length > 0) {
                let entitiesWithMethods = 0;
                let methodsWithWarnings = 0;

                type EntityMethod = {
                  name: string;
                  similarityWarnings?: SimilarityWarning[];
                  code?: string;
                };

                type Entity = {
                  methods?: EntityMethod[];
                  name?: string;
                  type?: string;
                };

                data.entities.forEach((entity: Entity) => {
                  if (entity.methods && entity.methods.length > 0) {
                    entitiesWithMethods++;

                    entity.methods.forEach((method: EntityMethod) => {
                      if (method.similarityWarnings && method.similarityWarnings.length > 0) {
                        methodsWithWarnings++;
                        console.log(`Found ${method.similarityWarnings.length} warnings in method ${method.name} of entity in ${comp.name}`);
                      }
                    });
                  }
                });

                if (entitiesWithMethods > 0 || methodsWithWarnings > 0) {
                  console.log(`Component ${comp.name} has ${entitiesWithMethods} entities with methods and ${methodsWithWarnings} methods with warnings`);

                  // Add the methods from entities to the main methods array for processing
                  if (!data.methods) {
                    data.methods = [];
                  }

                  data.entities.forEach((entity: Entity) => {
                    if (entity.methods && entity.methods.length > 0) {
                      data.methods.push(...entity.methods);
                    }
                  });

                  console.log(`Updated ${comp.name} methods array to include entity methods, now has ${data.methods.length} methods`);
                }
              }

              if (data.methods && data.methods.some((m: { similarityWarnings?: SimilarityWarning[] }) => m.similarityWarnings && m.similarityWarnings.length > 0)) {
                console.log(`Found method-level similarity warnings in ${comp.name}`);
              }
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
  }, [preloadedComponents])

  // Process similarity data whenever components or threshold changes
  useEffect(() => {
    if (components.length === 0) return

    console.log('Processing similarity data for', components.length, 'components at threshold', threshold)
    
    // Check if we have any similarity warnings in the data
    const hasSimilarityData = components.some(comp => 
      (comp.similarityWarnings && comp.similarityWarnings.length > 0) ||
      (comp.methods && comp.methods.some(m => m.similarityWarnings && m.similarityWarnings.length > 0))
    );
    
    if (!hasSimilarityData) {
      console.log('No similarity data found in components');
    } else {
      console.log('Found similarity data, processing real similarities');
    }

    const similarPairs: {
      pair: string[]
      similarity: number
      reason: string
      component1: ComponentData
      component2: ComponentData
      isMethodLevel?: boolean
      method1?: string
      method2?: string
    }[] = []

    // Track processed pairs to avoid duplicates AND store the highest score found
    const processedPairs = new Map<string, {
      similarity: number;
      reason: string;
      component1: ComponentData;
      component2: ComponentData;
      isMethodLevel?: boolean;
      method1?: string;
      method2?: string;
    }>();

    // Count similarity warnings for debugging
    let totalWarnings = 0;
    let crossComponentWarnings = 0;
    let filteredWarnings = 0;

    // Find components with similarity warnings
    components.forEach(component => {
      // Log each component being processed with detailed structure
      console.log(`Processing component: ${component.name}`);
      console.log(`  - Component warnings: ${component.similarityWarnings?.length || 0}`);
      console.log(`  - Methods: ${component.methods?.length || 0}`);
      if (component.methods && component.methods.length > 0) {
        component.methods.forEach(method => {
          console.log(`    - Method ${method.name}: ${method.similarityWarnings?.length || 0} warnings`);
          if (method.similarityWarnings && method.similarityWarnings.length > 0) {
            method.similarityWarnings.forEach(w => {
              console.log(`      - Similar to: ${w.similarTo}, score: ${w.score}`);
            });
          }
        });
      }

      // Check top-level similarity warnings
      if (component.similarityWarnings && component.similarityWarnings.length > 0) {
        totalWarnings += component.similarityWarnings.length;
        console.log(`Processing ${component.similarityWarnings.length} top-level warnings for ${component.name}`);
        processSimilarityWarnings(component, component.similarityWarnings, false)
      }

      // Check method-level similarity warnings
      if (component.methods && component.methods.length > 0) {
        component.methods.forEach(method => {
          if (method.similarityWarnings && method.similarityWarnings.length > 0) {
            console.log(`Processing ${method.similarityWarnings.length} warnings for method ${method.name} in ${component.name}`);
            totalWarnings += method.similarityWarnings.length;
            processSimilarityWarnings(component, method.similarityWarnings, true, method.name)
          }
        })
      }
    })

    function processSimilarityWarnings(
      component: ComponentData,
      warnings: SimilarityWarning[],
      isMethodLevel: boolean = false,
      methodName?: string
    ) {
      console.log(`Processing ${warnings.length} warnings for ${component.name}${isMethodLevel ? `.${methodName}` : ''}`);
      warnings.forEach((warning, index) => {
        console.log(`  Warning ${index + 1}: similarTo=${warning.similarTo}, score=${warning.score}`);
        // Convert similarity score from 0-1 to percentage if needed
        const similarityPercent = warning.score > 1 // Handles if score is already %, unlikely here
          ? warning.score
          : Math.round(warning.score * 100) // Converts 0-1 score to %

        // Skip if below threshold
        console.log(`    Threshold check: ${similarityPercent}% vs ${threshold}%`);
        if (similarityPercent < threshold) {
          console.log(`    FILTERED OUT: Below threshold`);
          filteredWarnings++;
          return;
        }
        console.log(`    PASSED threshold check`);

        console.log(`    Looking for similar component: ${warning.similarTo}`);

        // Extract component name and method name from similarTo (format could be ComponentName or ComponentName.methodName)
        const parts = warning.similarTo.split('.')
        const similarCompName = parts[0]
        let similarMethodName = parts.length > 1 ? parts[1] : undefined

        // Find the referenced component
        // First try to find by exact component name
        let similarComp = components.find(c => c.name === similarCompName)
        
        // If not found and we have a method name, try to find a component containing that method
        if (!similarComp && similarMethodName) {
          similarComp = components.find(c => 
            c.methods && c.methods.some(m => m.name === similarMethodName)
          )
          console.log(`    Found component ${similarComp?.name} containing method ${similarMethodName}`);
        }
        
        // If still not found, try to find any component containing a method with the name we're looking for
        if (!similarComp) {
          similarComp = components.find(c => 
            c.methods && c.methods.some(m => m.name === similarCompName)
          )
          if (similarComp) {
            console.log(`    Found component ${similarComp.name} containing method ${similarCompName}, treating as method-level similarity`);
            // Update the names to reflect this is actually a method-level similarity
            similarMethodName = similarCompName;
            // Keep the original isMethodLevel state but make sure we track this properly
          } else {
            console.log(`    Could not find component or method named ${similarCompName}`);
            console.log(`    Available components: ${components.map(c => c.name).join(', ')}`);
            console.log(`    Available methods: ${components.flatMap(c => c.methods?.map(m => `${c.name}.${m.name}`) || []).join(', ')}`);
          }
        }

        // Include both cross-component and same-component method-level similarities
        // Only filter out non-method level similarities within the same component
        if (similarComp && (component.name !== similarComp.name || (isMethodLevel && methodName && similarMethodName))) {
          if (component.name !== similarComp.name) {
            crossComponentWarnings++;
          }

          // Create a unique key for this pair
          // For method level, include method names in the key to avoid duplication but ensure sort order
          // to avoid duplicates like A.method1 -> B.method2 and B.method2 -> A.method1
          const actuallyMethodLevel = isMethodLevel || !!similarMethodName
          const pairKey = actuallyMethodLevel
            ? [
              `${component.name}.${methodName || 'component'}`,
              `${similarComp.name}.${similarMethodName || 'component'}`
            ].sort().join('_')
            : [component.name, similarComp.name].sort().join('_')

          console.log(`    Creating pair key: ${pairKey} (${similarityPercent}%)`);
          
          // Check if we've already seen this pair
          const existingPair = processedPairs.get(pairKey);
          if (existingPair) {
            console.log(`    Pair already exists with ${existingPair.similarity}%`);
            // If the new similarity is higher, update the entry
            if (similarityPercent > existingPair.similarity) {
              console.log(`    Updating with higher score: ${similarityPercent}%`);
              processedPairs.set(pairKey, {
                similarity: similarityPercent,
                reason: warning.reason, // Update reason as well
                component1: component, // Keep component references
                component2: similarComp,
                isMethodLevel: actuallyMethodLevel,
                method1: methodName,
                method2: similarMethodName
              });
            }
          } else {
            console.log(`    Adding new pair with ${similarityPercent}%`);
            // Add the new pair
            processedPairs.set(pairKey, {
              similarity: similarityPercent,
              reason: warning.reason,
              component1: component,
              component2: similarComp,
              isMethodLevel: actuallyMethodLevel,
              method1: methodName,
              method2: similarMethodName
            });
          }
        }
      })
    }

    // Convert the map values to an array
    console.log(`Converting ${processedPairs.size} processed pairs to final array`);
    processedPairs.forEach((value, key) => {
      console.log(`Processing pair: ${key}`);
      // For method level similarities, need to handle the key differently
      let name1, name2;
      if (value.isMethodLevel) {
        const [part1, part2] = key.split('_');
        name1 = part1.split('.')[0];
        name2 = part2.split('.')[0];
        console.log(`  Method-level pair: ${name1} <-> ${name2}`);
      } else {
        [name1, name2] = key.split('_');
        console.log(`  Component-level pair: ${name1} <-> ${name2}`);
      }

      // Allow pairs from the same component if they are method level similarities
      if ((name1 === name2 && !value.isMethodLevel)) {
        console.warn(`Skipping non-method same-component similarity pair: ${key}`);
        return;
      }

      // Find the actual component data objects based on names stored in the key
      const comp1Data = components.find(c => c.name === name1);
      const comp2Data = components.find(c => c.name === name2);
      console.log(`  Found components: ${comp1Data?.name || 'NOT FOUND'} & ${comp2Data?.name || 'NOT FOUND'}`);

      // Ensure both components were found before pushing
      if (comp1Data && comp2Data) {
        console.log(`  Adding final pair: ${name1} <-> ${name2} (${value.similarity}%)`);
        similarPairs.push({
          pair: [name1, name2],
          similarity: value.similarity,
          reason: value.isMethodLevel
            ? `Method ${value.method1} is similar to ${value.method2}: ${value.reason}`
            : value.reason,
          component1: comp1Data,
          component2: comp2Data,
          isMethodLevel: value.isMethodLevel,
          method1: value.method1,
          method2: value.method2
        });
      } else {
        console.warn(`Could not find component data for pair key: ${key}`);
        console.log(`Available component names: ${components.map(c => c.name).join(', ')}`);
      }
    });

    // Sort by similarity (highest first)
    similarPairs.sort((a, b) => b.similarity - a.similarity)
    console.log('Similarity statistics:', {
      totalWarnings,
      crossComponentWarnings,
      filteredWarnings,
      processedPairs: processedPairs.size,
      finalPairs: similarPairs.length
    });

    // Log each pair found for debugging
    if (similarPairs.length > 0) {
      console.log('Found similarity pairs:');
      similarPairs.forEach((pair, index) => {
        console.log(`Pair ${index + 1}: ${pair.component1.name}${pair.isMethodLevel ? `.${pair.method1}` : ''} -> ${pair.component2.name}${pair.isMethodLevel ? `.${pair.method2}` : ''} (${pair.similarity}%)`);
      });
    } else {
      console.warn('No similarity pairs were found after processing. Check if threshold is too high or data format is correct.');
    }

    setSimilarComponents(similarPairs)

    // Preload component codes for faster comparison
    similarPairs.forEach(pair => {
      // Helper function to fetch code
      const preloadComponentCode = async (component: ComponentData) => {
        if (component.code) return;

        try {
          const res = await fetch(`/docs-data/${component.slug}.json`)
          const data = await res.json()
          component.code = data.sourceCode || data.code || `// No code available for ${component.name}`
        } catch (error) {
          console.error(`Error prefetching code for ${component.name}:`, error)
        }
      }

      // Fetch codes in parallel
      Promise.all([
        preloadComponentCode(pair.component1),
        preloadComponentCode(pair.component2)
      ]);
    });
  }, [components, threshold])

  const filteredComponents = useMemo(() => {
    let filtered = similarComponents
    
    // Filter by archive status
    if (!showArchived) {
      filtered = filtered.filter(item => !isItemArchived(item))
    }
    
    // Filter by search term
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase()
      filtered = filtered.filter((item) => {
        return (
          item.pair[0].toLowerCase().includes(lowerCaseSearch) ||
          item.pair[1].toLowerCase().includes(lowerCaseSearch) ||
          (item.method1 && item.method1.toLowerCase().includes(lowerCaseSearch)) ||
          (item.method2 && item.method2.toLowerCase().includes(lowerCaseSearch))
        )
      })
    }
    
    return filtered
  }, [similarComponents, searchTerm, showArchived, archivedItems])

  const handleCompare = (item: {
    component1: ComponentData
    component2: ComponentData
    similarity: number
    isMethodLevel?: boolean
    method1?: string
    method2?: string
  }) => {
    // Fetch code for components if not already available
    const loadComponentCode = async (component: ComponentData, methodName?: string) => {
      try {
        // If it's a method-level comparison, try to get the specific method code
        if (methodName) {
          const res = await fetch(`/docs-data/${component.slug}.json`)
          const data = await res.json()

          // Look for the method in the methods array
          if (data.methods) {
            const method = data.methods.find((m: { name: string; code?: string }) => m.name === methodName)
            if (method && method.code) {
              return method.code
            }
          }

          // If we couldn't find the method code, fall back to component code
          console.warn(`Couldn't find method ${methodName} code in ${component.name}, falling back to full component`)
        }

        // Otherwise, get the whole component code
        if (component.code) return component.code

        const res = await fetch(`/docs-data/${component.slug}.json`)
        const data = await res.json()
        return data.sourceCode || data.code || `// No code available for ${component.name}`
      } catch (error) {
        console.error(`Error fetching code for ${component.name}${methodName ? `.${methodName}` : ''}:`, error)
        return `// Error loading code for ${component.name}${methodName ? `.${methodName}` : ''}`
      }
    }

    // Set up the comparison
    Promise.all([
      loadComponentCode(item.component1, item.isMethodLevel ? item.method1 : undefined),
      loadComponentCode(item.component2, item.isMethodLevel ? item.method2 : undefined)
    ]).then(([code1, code2]) => {
      // Use the vector similarity score from the backend
      // This represents semantic similarity based on functionality, not just string matching
      // The ComparisonModal should preserve this score as it's more accurate than text diff
      setSelectedPair({
        component1: {
          name: item.component1.name,
          code: code1,
          filePath: item.component1.filePath || `components/${item.component1.name}`,
          slug: item.component1.slug,
          kind: item.component1.kind,
        },
        component2: {
          name: item.component2.name,
          code: code2,
          filePath: item.component2.filePath || `components/${item.component2.name}`,
          slug: item.component2.slug,
          kind: item.component2.kind,
        },
        similarity: item.similarity,
        isMethodLevel: item.isMethodLevel,
        method1Name: item.method1,
        method2Name: item.method2,
      })
      setComparisonOpen(true)
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-1/3" />
        </div>
        <Card className="shadow-md bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-4 border rounded">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>
  }

  if (similarComponents.length === 0) {
    return (
      <Card className="shadow-md bg-white dark:bg-slate-900">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <CheckCircleIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">No Similar Components Found</h3>
              <p className="text-muted-foreground max-w-md">
                Great! No significant code similarities were detected above the {threshold}% threshold. This suggests good code organization.
              </p>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg max-w-md">
              <p className="font-medium mb-2">💡 Try adjusting the threshold:</p>
              <ul className="space-y-1 text-left">
                <li>• Lower threshold to find more potential duplicates</li>
                <li>• Higher threshold for only very similar code</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Similar Pairs</p>
                  <p className="text-2xl font-bold">{filteredComponents.length}</p>
                </div>
                <AlertTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Similarity</p>
                  <p className="text-2xl font-bold">
                    {filteredComponents.length > 0 ? 
                      Math.round(filteredComponents.reduce((acc, comp) => acc + comp.similarity, 0) / filteredComponents.length) : 0}%
                  </p>
                </div>
                <TrendingUpIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Method Level</p>
                  <p className="text-2xl font-bold">
                    {filteredComponents.filter(c => c.isMethodLevel).length}
                  </p>
                </div>
                <EyeIcon className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span>Similarity Results</span>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-5 w-5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Components and methods with similar code patterns. Higher percentages indicate more similar code.</p>
                </TooltipContent>
              </Tooltip>
            </h2>
            <p className="text-muted-foreground mt-1">
              {filteredComponents.length} pairs found above {threshold}% similarity
              {archivedItems.length > 0 && !showArchived && (
                <span className="ml-2 text-sm">({archivedItems.length} archived)</span>
              )}
            </p>
          </div>
          <div className="relative w-full sm:w-1/3">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by component or method name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
      <div className="space-y-4">
        {filteredComponents.map((item, index) => {
          const archived = isItemArchived(item)
          return (
          <Card key={index} className={`transition-all hover:shadow-lg border-l-4 ${
            archived ? 'opacity-60' : ''
          } ${
            item.similarity >= 90 ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' :
            item.similarity >= 75 ? 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20' :
            item.similarity >= 60 ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20' :
            'border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
          }`}>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                {/* Component/Method Names */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-foreground">
                          {item.isMethodLevel ? (
                            <>
                              <Link 
                                href={getEntityUrl(item.component1)}
                                className="text-blue-600 dark:text-blue-400 text-lg hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              >
                                {item.component1.name}
                              </Link>
                              <span className="text-muted-foreground mx-2">::</span>
                              <Link 
                                href={getEntityUrl(item.component1, item.method1)}
                                className="font-mono text-sm bg-muted px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                              >
                                {item.method1}
                              </Link>
                            </>
                          ) : (
                            <Link 
                              href={getEntityUrl(item.component1)}
                              className="text-blue-600 dark:text-blue-400 text-xl hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                              {item.component1.name}
                            </Link>
                          )}
                        </div>
                        {item.isMethodLevel && (
                          <Badge variant="secondary" className="text-xs">
                            Method
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ArrowRightIcon className="h-4 w-4" />
                        <span className="font-medium">
                          {item.isMethodLevel ? (
                            <>
                              <Link 
                                href={getEntityUrl(item.component2)}
                                className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              >
                                {item.component2.name}
                              </Link>
                              <span className="mx-2">::</span>
                              <Link 
                                href={getEntityUrl(item.component2, item.method2)}
                                className="font-mono text-sm bg-muted px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                              >
                                {item.method2}
                              </Link>
                            </>
                          ) : (
                            <Link 
                              href={getEntityUrl(item.component2)}
                              className="text-blue-600 dark:text-blue-400 text-lg hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                              {item.component2.name}
                            </Link>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Similarity Score - Desktop */}
                  <div className="hidden md:flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-3 mb-2">
                        <Progress 
                          value={item.similarity} 
                          className="w-32 h-3" 
                        />
                        <span className={`font-bold text-3xl ${
                          item.similarity >= 90 ? 'text-red-600 dark:text-red-400' :
                          item.similarity >= 75 ? 'text-orange-600 dark:text-orange-400' :
                          item.similarity >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {item.similarity.toFixed(0)}%
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.similarity >= 90 ? 'border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950' :
                          item.similarity >= 75 ? 'border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950' :
                          item.similarity >= 60 ? 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:bg-yellow-950' :
                          'border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950'
                        }`}
                      >
                        {item.similarity >= 90 ? 'Very High' :
                         item.similarity >= 75 ? 'High' :
                         item.similarity >= 60 ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Similarity Score - Mobile */}
                <div className="md:hidden flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={item.similarity} 
                      className="w-24 h-3" 
                    />
                    <span className={`font-bold text-2xl ${
                      item.similarity >= 90 ? 'text-red-600 dark:text-red-400' :
                      item.similarity >= 75 ? 'text-orange-600 dark:text-orange-400' :
                      item.similarity >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {item.similarity.toFixed(0)}%
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      item.similarity >= 90 ? 'border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950' :
                      item.similarity >= 75 ? 'border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950' :
                      item.similarity >= 60 ? 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:bg-yellow-950' :
                      'border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950'
                    }`}
                  >
                    {item.similarity >= 90 ? 'Very High' :
                     item.similarity >= 75 ? 'High' :
                     item.similarity >= 60 ? 'Medium' : 'Low'}
                  </Badge>
                </div>

                {/* Reason */}
                <div className="pt-3 border-t border-muted">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Similarity Reason:</span> {item.reason}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isItemArchived(item) ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => toggleArchive(item)}
                        className="gap-2"
                      >
                        {isItemArchived(item) ? (
                          <>
                            <ArchiveRestoreIcon className="h-4 w-4" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <ArchiveIcon className="h-4 w-4" />
                            Archive
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isItemArchived(item) ? "Restore this similarity pair" : "Archive this similarity pair"}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleCompare(item)}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Compare Code
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View side-by-side code comparison</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        )}
      </div>
      {selectedPair && <ComparisonModal
        isOpen={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        component1={selectedPair.component1}
        component2={selectedPair.component2}
        similarityScore={selectedPair.similarity}
        method1Name={selectedPair.method1Name}
        method2Name={selectedPair.method2Name}
        isMethodComparison={selectedPair.isMethodLevel}
      />}
    </div>
  )
}
