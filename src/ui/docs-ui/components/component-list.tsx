"use client"

import * as React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { ComponentDefinition, getAllComponents } from "../lib/docs-data"
import { FileCode, Package, ArrowRight } from "lucide-react"
import { Skeleton } from "./ui/skeleton"
import { Button } from "./ui/button"

export function ComponentList({ limit }: { limit?: number }) {
  const [components, setComponents] = useState<ComponentDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAllComponents()
        setComponents(data)
      } catch (error) {
        console.error("Error loading component data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const displayComponents = limit ? components.slice(0, limit) : components

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: limit || 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border border-muted/40">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-5 w-full" />
            </CardHeader>
            <CardContent className="pb-6">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
            <CardFooter className="border-t py-3 bg-muted/10">
              <Skeleton className="h-5 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayComponents.map((component) => (
        <Link key={component.name} href={`/components/${component.slug}`}>
          <Card className="overflow-hidden border border-muted/40 h-full transition-all hover:border-primary/20 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="px-2 py-0 text-xs font-normal">
                  {component.filePath}
                </Badge>
                {component.methods.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {component.methods.length} method{component.methods.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                {component.name.includes("Component") || component.name.match(/^[A-Z]/) ? (
                  <Package className="h-4 w-4 text-primary" />
                ) : (
                  <FileCode className="h-4 w-4 text-primary" />
                )}
                {component.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {component.description || "No description available"}
              </CardDescription>
            </CardHeader>
            <CardFooter className="border-t py-3 bg-muted/5 flex justify-between">
              <span className="text-xs text-muted-foreground">View details</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}
