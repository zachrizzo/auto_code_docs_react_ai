"use client"
import * as React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { SimilarityList } from "@/components/similarity-list"

export default function SimilarityPage() {
  const [threshold, setThreshold] = useState([70])

  return (
    <div className="container max-w-5xl py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Component Similarity</h1>
        <p className="text-muted-foreground text-xl mt-2">
          Identify components with similar functionality or structure
        </p>
      </div>

      <Card className="mb-10 border-none shadow-md bg-white dark:bg-slate-900">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-medium">Similarity Threshold</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{threshold}%</span>
              <span className="text-sm text-muted-foreground">Higher values show fewer, more similar matches</span>
            </div>
            <Slider value={threshold} onValueChange={setThreshold} min={50} max={95} step={5} className="py-4" />
          </div>
        </CardContent>
      </Card>

      <SimilarityList threshold={threshold[0]} />
    </div>
  )
}
