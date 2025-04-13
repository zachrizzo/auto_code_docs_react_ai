"use client"

import * as React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { CodeBlock } from "../../../components/code-block"
import { MethodList } from "../../../components/method-list"
import { SimilarFunctions } from "../../../components/similar-functions"
import { ComponentDefinition, MethodDefinition, getComponentBySlug } from "../../../lib/docs-data"
import { useParams } from "next/navigation"

export default function ComponentPage() {
  const params = useParams()
  const slug = params.slug as string

  const [componentData, setComponentData] = useState<ComponentDefinition | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<MethodDefinition | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getComponentBySlug(slug)
        setComponentData(data)
        if (data && data.methods.length > 0) {
          setSelectedMethod(data.methods[0])
        }
      } catch (error) {
        console.error("Error loading component data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [slug])

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 md:px-6">
        <div className="h-8 w-1/3 bg-muted rounded animate-pulse mb-4"></div>
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-8"></div>
        <div className="h-80 bg-muted rounded animate-pulse"></div>
      </div>
    )
  }

  if (!componentData) {
    return (
      <div className="container mx-auto py-10 px-4 md:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Component Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          The component you are looking for does not exist.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{componentData.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{componentData.description}</p>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="outline">{componentData.filePath}</Badge>
          </div>
        </div>

        <Tabs defaultValue="code" className="w-full">
          <TabsList>
            <TabsTrigger value="code">Source Code</TabsTrigger>
            {componentData.methods.length > 0 && (
              <TabsTrigger value="methods">Methods</TabsTrigger>
            )}
            {selectedMethod?.similarityWarnings && selectedMethod.similarityWarnings.length > 0 && (
              <TabsTrigger value="similar">Similar Functions</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="code" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Source Code</CardTitle>
                <CardDescription>The complete source code for {componentData.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={componentData.sourceCode} language="tsx" />
              </CardContent>
            </Card>
          </TabsContent>

          {componentData.methods.length > 0 && (
            <TabsContent value="methods" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>Methods</CardTitle>
                    <CardDescription>Functions defined in this component</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MethodList
                      methods={componentData.methods}
                      onSelect={setSelectedMethod}
                      selectedMethod={selectedMethod}
                    />
                  </CardContent>
                </Card>

                {selectedMethod && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>{selectedMethod.name}</CardTitle>
                      <CardDescription>
                        {selectedMethod.params.map((p) => `${p.name}: ${p.type}`).join(", ")} → {selectedMethod.returnType}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock code={selectedMethod.code} language="tsx" />
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {selectedMethod?.similarityWarnings && selectedMethod.similarityWarnings.length > 0 && (
            <TabsContent value="similar" className="mt-4">
              <SimilarFunctions method={selectedMethod} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
