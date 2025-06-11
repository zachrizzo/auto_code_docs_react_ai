"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Slider } from "../../components/ui/slider"
import { SimilarityList } from "../../components/similarity-list"

// Define types to match with SimilarityList component
interface ComponentData {
  name: string;
  slug: string;
  filePath: string;
  code?: string;
  methods?: {
    name: string;
    similarityWarnings?: Array<{
      similarTo: string;
      score: number;
      reason: string;
      filePath: string;
      code: string;
    }>;
  }[];
  entities?: Array<{
    methods?: Array<{
      name: string;
      similarityWarnings?: Array<{
        similarTo: string;
        score: number;
        reason: string;
        filePath: string;
        code: string;
      }>;
    }>;
  }>;
}

export default function SimilarityPage() {
  const [threshold, setThreshold] = useState([50])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [componentsData, setComponentsData] = useState<ComponentData[]>([])

  // Add debug code to verify the data files are accessible
  useEffect(() => {
    async function loadAllData() {
      try {
        // Debug: Check if we can access the component index
        const indexRes = await fetch('/docs-data/component-index.json')
        if (!indexRes.ok) {
          throw new Error(`Failed to fetch component index: ${indexRes.status}`);
        }

        const indexData = await indexRes.json();
        console.log('Component index data loaded:', indexData);

        // Load all component data files
        const allComponentsData = await Promise.all(
          indexData.map(async (comp: { slug: string }) => {
            try {
              const res = await fetch(`/docs-data/${comp.slug}.json`);
              if (!res.ok) {
                console.error(`Failed to load ${comp.slug}.json: ${res.status}`);
                return null;
              }
              return await res.json();
            } catch (err) {
              console.error(`Error loading ${comp.slug}.json:`, err);
              return null;
            }
          })
        );

        // Filter out null results
        const validComponentsData = allComponentsData.filter(Boolean) as ComponentData[];
        console.log('Valid components loaded:', validComponentsData.length);

        // Process the data to extract and incorporate methods from entities
        const processedData = validComponentsData.map(data => {
          if (data.entities && data.entities.length > 0) {
            // Extract methods from entities
            if (!data.methods) {
              data.methods = [];
            }

            data.entities.forEach((entity) => {
              if (entity.methods && entity.methods.length > 0) {
                data.methods!.push(...entity.methods);
              }
            });
          }
          return data;
        });

        // Check for methods with similarities
        let totalMethodsWithSimilarities = 0;
        processedData.forEach((comp) => {
          if (comp.methods) {
            const withSimilarities = comp.methods.filter((m) =>
              m.similarityWarnings && m.similarityWarnings.length > 0
            );
            totalMethodsWithSimilarities += withSimilarities.length;
          }
        });

        console.log(`Found ${totalMethodsWithSimilarities} total methods with similarity warnings`);

        // Set components data for the SimilarityList to use
        // Ensure each component has a unique ID to prevent duplicate key issues
        const uniqueComponents = processedData.map((comp, index) => ({
          ...comp,
          // Add a unique ID based on index to prevent React duplicate key errors
          _uniqueId: `${comp.slug || comp.name}-${index}`
        }));
        
        setComponentsData(uniqueComponents);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setIsLoading(false);
      }
    }

    loadAllData();
  }, []);

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-12">
        <p className="text-center text-lg">Loading components data...</p>
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
    <div className="container max-w-7xl py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Component Similarity</h1>
        <p className="text-muted-foreground text-xl mt-2">
          Identify components with similar functionality or structure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <Card className="sticky top-24 border-none shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6">
                <h3 className="text-lg font-medium">Similarity Threshold</h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{threshold}%</span>
                  <span className="text-sm text-muted-foreground">
                    Higher values show fewer, more similar matches
                  </span>
                </div>
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  min={50}
                  max={95}
                  step={5}
                  className="py-4"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <SimilarityList
            threshold={threshold[0]}
            preloadedComponents={componentsData}
          />
        </div>
      </div>
    </div>
  )
}
