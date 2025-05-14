"use client"
import * as React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ComponentStats } from "@/components/component-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeStructure } from "@/components/code-structure"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Component } from "lucide-react"

interface ComponentCounts {
  components: number
  classes: number
  functions: number
  methods: number
  totalCoverage: number
}

export default function Home() {
  const [counts, setCounts] = useState<ComponentCounts>({
    components: 0,
    classes: 0,
    functions: 0,
    methods: 0,
    totalCoverage: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchComponentCounts() {
      try {
        // Fetch the component index
        const res = await fetch('/docs-data/component-index.json')
        const data = await res.json()

        // Get all component details to check for types
        const componentDetails = await Promise.all(
          data.map(async (comp: { name: string; slug: string }) => {
            try {
              const detailRes = await fetch(`/docs-data/${comp.slug}.json`)
              return await detailRes.json()
            } catch (error) {
              console.error(`Error fetching details for ${comp.name}:`, error)
              return { type: 'component' } // Default if we can't determine
            }
          })
        )

        // Count different types
        const typeCounts = componentDetails.reduce((acc: ComponentCounts, comp: any) => {
          const type = comp.type || 'component'

          if (type === 'component') {
            acc.components++
          } else if (type === 'class') {
            acc.classes++
          } else if (type === 'function') {
            acc.functions++
          } else if (type === 'method') {
            acc.methods++
          }

          return acc
        }, { components: 0, classes: 0, functions: 0, methods: 0, totalCoverage: 0 })

        // Calculate coverage percentage (just an estimate based on description presence)
        const totalItems = componentDetails.length
        const itemsWithDescription = componentDetails.filter(comp =>
          comp.description && comp.description.trim().length > 0
        ).length

        const coveragePercentage = totalItems > 0
          ? Math.round((itemsWithDescription / totalItems) * 100)
          : 0

        setCounts({
          ...typeCounts,
          totalCoverage: coveragePercentage
        })
        setLoading(false)
      } catch (error) {
        console.error('Error loading component data:', error)
        setLoading(false)
      }
    }

    fetchComponentCounts()
  }, [])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">React Component Documentation</h1>
          <p className="text-xl text-gray-600 mb-6">
            Explore and understand components, methods, and code relationships in your React codebase.
          </p>
          <Link href="/?tab=components" passHref>
            <Button size="lg" className="gap-2">
              <Component className="h-5 w-5" />
              View Components
            </Button>
          </Link>
        </div>

        <div className="container max-w-6xl py-12">
          <div className="flex flex-col gap-4 mb-12">
            <h1 className="text-5xl font-bold tracking-tight">Code Documentation</h1>
            <p className="text-muted-foreground text-xl">AI-powered insights for your codebase</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
              <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-500" />
              <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Components</p>
                  <p className="text-4xl font-bold">{loading ? "..." : counts.components}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
              <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Classes</p>
                  <p className="text-4xl font-bold">{loading ? "..." : counts.classes}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-green-500" />
              <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Documentation Coverage</p>
                  <p className="text-4xl font-bold">{loading ? "..." : `${counts.totalCoverage}%`}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16">
            <Tabs defaultValue="components" className="mb-8">
              <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-lg">
                <TabsTrigger value="components" className="rounded-md">
                  Components
                </TabsTrigger>
                <TabsTrigger value="classes" className="rounded-md">
                  Classes
                </TabsTrigger>
                <TabsTrigger value="methods" className="rounded-md">
                  Methods
                </TabsTrigger>
              </TabsList>
              <TabsContent value="components">
                <h2 className="text-2xl font-bold mb-8">Components</h2>
                <ComponentStats />
              </TabsContent>
              <TabsContent value="classes">
                <h2 className="text-2xl font-bold mb-8">Classes</h2>
                <ComponentStats type="class" />
              </TabsContent>
              <TabsContent value="methods">
                <h2 className="text-2xl font-bold mb-8">Methods</h2>
                <ComponentStats type="method" />
              </TabsContent>
            </Tabs>

            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-8">Code Structure</h2>
              <CodeStructure />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
