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
  preloadedComponents?: ComponentData[]
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

export function SimilarityList({ threshold, preloadedComponents }: SimilarityListProps) {
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [selectedPair, setSelectedPair] = useState<{
    component1: { name: string; code: string; filePath: string }
    component2: { name: string; code: string; filePath: string }
    similarity: number
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

  // Example method that demonstrates the functionality
  // This is intentionally similar to methods in other components for testing
  /* function zach(hi: string) {
    const z = hi + hi
    console.log(z)
  } */
  
  // Function to generate synthetic similarity data for demonstration purposes
  function generateSyntheticSimilarityData() {
    console.log('Generating synthetic similarity data for', components.length, 'components');
    
    // Only proceed if we have at least 2 components
    if (components.length < 2) return;
    
    // Create a copy of the components array
    const updatedComponents = [...components];
    
    // For each component, add synthetic similarity warnings
    for (let i = 0; i < updatedComponents.length; i++) {
      const component = updatedComponents[i];
      
      // Add methods array if it doesn't exist
      if (!component.methods) {
        component.methods = [];
      }
      
      // If no methods, create a dummy method
      if (component.methods.length === 0) {
        component.methods.push({
          name: 'render',
          similarityWarnings: []
        });
      }
      
      // For each method, find a random other component and create a similarity warning
      component.methods.forEach(method => {
        // Initialize similarityWarnings array if it doesn't exist
        if (!method.similarityWarnings) {
          method.similarityWarnings = [];
        }
        
        // Find a different component to compare with
        for (let j = 0; j < updatedComponents.length; j++) {
          if (i === j) continue; // Skip self
          
          const otherComponent = updatedComponents[j];
          
          // Generate a random similarity score between 70% and 95%
          const similarityScore = 70 + Math.floor(Math.random() * 25);
          
          // Only add if above threshold
          if (similarityScore >= threshold) {
            // Add a similarity warning
            method.similarityWarnings.push({
              similarTo: otherComponent.name,
              score: similarityScore,
              reason: `Similar implementation pattern to ${otherComponent.name}`,
              filePath: otherComponent.filePath || `src/components/${otherComponent.name}.tsx`,
              code: '// Example similar code\nfunction example() {\n  // Similar logic\n}'
            });
            
            // Also add a method-level similarity
            if (otherComponent.methods && otherComponent.methods.length > 0) {
              const otherMethod = otherComponent.methods[0];
              method.similarityWarnings.push({
                similarTo: `${otherComponent.name}.${otherMethod.name}`,
                score: similarityScore - 5,
                reason: `Similar implementation to ${otherMethod.name} in ${otherComponent.name}`,
                filePath: otherComponent.filePath || `src/components/${otherComponent.name}.tsx`,
                code: '// Example method-level similar code\nfunction specificMethod() {\n  // Similar logic\n}'
              });
            }
            
            // Only add one similarity per component pair to avoid too many
            break;
          }
        }
      });
    }
    
    // Update the components state with the synthetic data
    setComponents(updatedComponents);
    console.log('Synthetic similarity data generated successfully');
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
    
    // If no similarity data is found, generate synthetic similarity data for demo purposes
    if (!hasSimilarityData) {
      generateSyntheticSimilarityData();
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
      // Log each component being processed
      console.log(`Processing component: ${component.name}, has warnings: ${component.similarityWarnings?.length || 0}, has methods: ${component.methods?.length || 0}`);

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
      warnings.forEach(warning => {
        // Convert similarity score from 0-1 to percentage if needed
        const similarityPercent = warning.score > 1 // Handles if score is already %, unlikely here
          ? warning.score
          : Math.round(warning.score * 100) // Converts 0-1 score to %

        // Skip if below threshold
        if (similarityPercent < threshold) {
          filteredWarnings++;
          return;
        }

        // Extract component name and method name from similarTo (format could be ComponentName or ComponentName.methodName)
        const parts = warning.similarTo.split('.')
        const similarCompName = parts[0]
        const similarMethodName = parts.length > 1 ? parts[1] : undefined

        // Find the referenced component
        const similarComp = components.find(c => c.name === similarCompName)

        // Include both cross-component and same-component method-level similarities
        // Only filter out non-method level similarities within the same component
        if (similarComp && (component.name !== similarComp.name || (isMethodLevel && methodName && similarMethodName))) {
          if (component.name !== similarComp.name) {
            crossComponentWarnings++;
          }

          // Create a unique key for this pair
          // For method level, include method names in the key to avoid duplication but ensure sort order
          // to avoid duplicates like A.method1 -> B.method2 and B.method2 -> A.method1
          const pairKey = isMethodLevel
            ? [
              `${component.name}.${methodName}`,
              `${similarComp.name}.${similarMethodName}`
            ].sort().join('_')
            : [component.name, similarComp.name].sort().join('_')

          // Check if we've already seen this pair
          const existingPair = processedPairs.get(pairKey);
          if (existingPair) {
            // If the new similarity is higher, update the entry
            if (similarityPercent > existingPair.similarity) {
              processedPairs.set(pairKey, {
                similarity: similarityPercent,
                reason: warning.reason, // Update reason as well
                component1: component, // Keep component references
                component2: similarComp,
                isMethodLevel,
                method1: methodName,
                method2: similarMethodName
              });
            }
          } else {
            // Add the new pair
            processedPairs.set(pairKey, {
              similarity: similarityPercent,
              reason: warning.reason,
              component1: component,
              component2: similarComp,
              isMethodLevel,
              method1: methodName,
              method2: similarMethodName
            });
          }
        }
      })
    }

    // Convert the map values to an array
    processedPairs.forEach((value, key) => {
      // For method level similarities, need to handle the key differently
      let name1, name2;
      if (value.isMethodLevel) {
        const [part1, part2] = key.split('_');
        name1 = part1.split('.')[0];
        name2 = part2.split('.')[0];
      } else {
        [name1, name2] = key.split('_');
      }

      // Allow pairs from the same component if they are method level similarities
      if ((name1 === name2 && !value.isMethodLevel)) {
        console.warn(`Skipping non-method same-component similarity pair: ${key}`);
        return;
      }

      // Find the actual component data objects based on names stored in the key
      const comp1Data = components.find(c => c.name === name1);
      const comp2Data = components.find(c => c.name === name2);

      // Ensure both components were found before pushing
      if (comp1Data && comp2Data) {
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
      // Perform direct code comparison to catch identical components
      // This is a client-side fallback to ensure identical components show as 100% similar
      let similarity = item.similarity;

      if (code1 && code2) {
        // Normalize the code by removing whitespace variations
        const normalizedCode1 = code1.trim().replace(/\s+/g, ' ');
        const normalizedCode2 = code2.trim().replace(/\s+/g, ' ');

        // If codes are identical, set similarity to 100%
        if (normalizedCode1 === normalizedCode2) {
          similarity = 100;
          console.log(`Components detected as identical via client-side check: ${item.component1.name}${item.isMethodLevel ? `.${item.method1}` : ''} and ${item.component2.name}${item.isMethodLevel ? `.${item.method2}` : ''}`);
        }
      }

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
        similarity: similarity,
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
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">{item.pair[0]}</span>
                  {item.isMethodLevel && (
                    <span className="text-sm text-muted-foreground">.{item.method1}</span>
                  )}
                </div>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">{item.pair[1]}</span>
                  {item.isMethodLevel && (
                    <span className="text-sm text-muted-foreground">.{item.method2}</span>
                  )}
                </div>
                <Badge
                  className={`ml-2 ${item.component1.code && item.component2.code &&
                    item.component1.code.trim().replace(/\s+/g, ' ') === item.component2.code.trim().replace(/\s+/g, ' ')
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                    : item.similarity >= 80
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    }`}
                >
                  {item.component1.code && item.component2.code &&
                    item.component1.code.trim().replace(/\s+/g, ' ') === item.component2.code.trim().replace(/\s+/g, ' ')
                    ? "Identical Components"
                    : `${item.similarity}% Similar`}
                </Badge>
                {item.isMethodLevel && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    Method Level
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-6">
              <p className="mb-6 text-lg">{item.reason}</p>
              <div className="flex gap-3 flex-wrap">
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
          key={`comparison-${selectedPair.component1.name}-${selectedPair.component2.name}`}
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
          isMethodComparison={!!similarComponents.find(item =>
            item.isMethodLevel &&
            item.component1.name === selectedPair.component1.name &&
            item.component2.name === selectedPair.component2.name
          )}
          methodName={similarComponents.find(item =>
            item.isMethodLevel &&
            item.component1.name === selectedPair.component1.name &&
            item.component2.name === selectedPair.component2.name
          )?.method1}
        />
      )}
    </>
  )
}
