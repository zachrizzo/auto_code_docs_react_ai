"use client"
import * as React from "react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { GitCompare } from "lucide-react"
import { ComparisonModal } from "./comparison-modal"

type SimilarComponent = {
  name: string
  similarity: number
  reason: string
}

interface SimilarComponentsSectionProps {
  components: SimilarComponent[]
  currentComponent: {
    name: string
    code: string
    filePath: string
  }
}

export function SimilarComponentsSection({ components, currentComponent }: SimilarComponentsSectionProps) {
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<SimilarComponent | null>(null)

  // Mock code for the similar component - in a real app, you'd fetch this
  const getMockCode = (componentName: string) => {
    return `import React from 'react';

export function ${componentName}({ title, children }) {
  return (
    <div className="component-${componentName.toLowerCase()}">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}`
  }

  const handleCompare = (component: SimilarComponent) => {
    setSelectedComponent(component)
    setComparisonOpen(true)
  }

  if (!components || components.length === 0) {
    return null
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold">Similar Components</h2>
          <p className="text-muted-foreground mt-1">Components with similar functionality or structure</p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {components.map((component) => (
            <div key={component.name} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-lg">{component.name}</h3>
                  <Badge
                    className={`${
                      component.similarity >= 80
                        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                    }`}
                  >
                    {component.similarity}% Similar
                  </Badge>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/components/${component.name}`}>View Component</Link>
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => handleCompare(component)}>
                    <GitCompare className="h-4 w-4" />
                    Compare
                  </Button>
                </div>
              </div>
              <p>{component.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedComponent && (
        <ComparisonModal
          isOpen={comparisonOpen}
          onClose={() => setComparisonOpen(false)}
          component1={currentComponent}
          component2={{
            name: selectedComponent.name,
            code: getMockCode(selectedComponent.name),
            filePath: `src/components/${selectedComponent.name}.tsx`,
          }}
          similarityScore={selectedComponent.similarity}
        />
      )}
    </>
  )
}
