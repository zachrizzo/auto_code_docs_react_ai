"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { SplitView } from "./split-view"
import { CodeBlock } from "./code-block"
import { Badge } from "./ui/badge"
import { MethodDefinition, SimilarityWarning } from "../lib/docs-data"

export function SimilarFunctions({ method }: { method: MethodDefinition }) {
  const [selectedSimilarity, setSelectedSimilarity] = useState<SimilarityWarning | null>(
    method.similarityWarnings && method.similarityWarnings.length > 0 ? method.similarityWarnings[0] : null,
  )

  if (!method.similarityWarnings || method.similarityWarnings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Functions</CardTitle>
          <CardDescription>No similar functions found for {method.name}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Similar Functions</CardTitle>
          <CardDescription>Functions that are similar to {method.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {method.similarityWarnings.map((similarity) => (
              <Badge
                key={similarity.similarTo}
                variant={selectedSimilarity?.similarTo === similarity.similarTo ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedSimilarity(similarity)}
              >
                {similarity.similarTo} ({Math.round(similarity.score * 100)}%)
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSimilarity && (
        <Card>
          <CardHeader>
            <CardTitle>Code Comparison</CardTitle>
            <CardDescription>
              {method.name} vs {selectedSimilarity.similarTo} - {selectedSimilarity.reason}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SplitView
              left={
                <div>
                  <div className="mb-2 font-medium">{method.name}</div>
                  <CodeBlock code={method.code} language="tsx" />
                </div>
              }
              right={
                <div>
                  <div className="mb-2 font-medium">
                    {selectedSimilarity.similarTo}{" "}
                    <span className="text-sm text-muted-foreground">({selectedSimilarity.filePath})</span>
                  </div>
                  <CodeBlock code={selectedSimilarity.code} language="tsx" />
                </div>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
