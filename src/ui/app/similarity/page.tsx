"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Slider } from "../../components/ui/slider"
import { SimilarityList } from "../../components/similarity-list"
import { Skeleton } from "../../components/ui/skeleton"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { InfoIcon, TrendingUpIcon, FilterIcon, ArchiveIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip"

// Define types to match with SimilarityList component
interface SimilarityWarning {
  similarTo: string;
  score: number;
  reason: string;
  filePath: string;
  code: string;
}

interface Method {
  name: string;
  similarityWarnings?: SimilarityWarning[];
}

interface Entity {
  methods?: Method[];
}

interface ComponentData {
  name: string;
  slug: string;
  filePath: string;
  code?: string;
  methods?: Method[];
  entities?: Entity[];
}

export default function SimilarityPage() {
  const [threshold, setThreshold] = useState([50])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [componentsData, setComponentsData] = useState<(ComponentData & { _uniqueId: string })[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [archivedCount, setArchivedCount] = useState(0)

  // Load similarity data efficiently using the optimized endpoint
  useEffect(() => {
    async function loadSimilarityData() {
      try {
        // Use the optimized similarity endpoint that only loads components with warnings
        const res = await fetch(`/api/components/similarity?threshold=${threshold[0]}`)
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || `Failed to fetch components: ${res.status}`);
        }

        const { components, totalCount, totalProcessed } = await res.json();
        console.log(`Loaded ${totalCount} components with similarities out of ${totalProcessed} processed`);

        // Components are already filtered and processed by the API
        // Just add unique IDs for React keys
        const uniqueComponents = components.map((comp: ComponentData, index: number) => ({
          ...comp,
          _uniqueId: `${comp.slug || comp.name}-${index}`
        }));
        
        setComponentsData(uniqueComponents);
        setIsLoading(false);
      } catch (error: any) {
        console.error("Error loading similarity data:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setIsLoading(false);
      }
    }

    loadSimilarityData();
  }, [threshold]); // Reload when threshold changes

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-12">
        <div className="mb-12">
          <Skeleton className="h-10 w-80 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="sticky top-24 border-none shadow-md bg-white dark:bg-slate-900">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-6" />
                <Skeleton className="h-8 w-16 mb-4" />
                <Skeleton className="h-4 w-full mb-6" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-3">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center p-4 border rounded">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl py-12">
        <p className="text-center text-lg text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container max-w-7xl py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUpIcon className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Component Similarity Analysis
            </h1>
          </div>
          <p className="text-muted-foreground text-xl mt-2 max-w-3xl">
            Discover components with similar functionality or structure to identify opportunities for code deduplication and refactoring.
          </p>
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <InfoIcon className="h-3 w-3" />
              AI-Powered Analysis
            </Badge>
            <Badge variant="outline">
              {componentsData.length} Components Analyzed
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="sticky top-24 border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FilterIcon className="h-5 w-5" />
                  Filter Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Similarity Threshold
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoIcon className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Higher values show fewer, more similar matches. Lower values show more potential duplicates.</p>
                          </TooltipContent>
                        </Tooltip>
                      </label>
                    </div>
                    <div className="text-center mb-4">
                      <span className="text-3xl font-bold text-primary">{threshold[0]}%</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {threshold[0] >= 90 ? 'Very Similar' : 
                         threshold[0] >= 75 ? 'Moderately Similar' : 
                         threshold[0] >= 60 ? 'Somewhat Similar' : 'All Matches'}
                      </p>
                    </div>
                    <Slider
                      value={threshold}
                      onValueChange={setThreshold}
                      min={50}
                      max={95}
                      step={5}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>50%</span>
                      <span>More Results</span>
                      <span>95%</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Archive Options</label>
                    </div>
                    <Button
                      variant={showArchived ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowArchived(!showArchived)}
                      className="w-full gap-2"
                    >
                      <ArchiveIcon className="h-4 w-4" />
                      {showArchived ? "Hide Archived" : "Show Archived"}
                      {archivedCount > 0 && !showArchived && (
                        <Badge variant="secondary" className="ml-auto">
                          {archivedCount}
                        </Badge>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Archive items you don't need to review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            <SimilarityList
              threshold={threshold[0]}
              preloadedComponents={componentsData}
              showArchived={showArchived}
              onShowArchivedChange={setShowArchived}
              archivedCount={archivedCount}
              onArchivedCountChange={setArchivedCount}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
