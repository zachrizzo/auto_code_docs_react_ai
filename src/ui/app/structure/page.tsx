import * as React from "react"
import { CodeStructure } from "@/components/code-structure"

export default function StructurePage() {
  return (
    <div className="container max-w-6xl py-12">
      <div className="flex flex-col gap-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Code Structure</h1>
        <p className="text-muted-foreground text-xl">
          Explore the file and folder structure of your project.
        </p>
      </div>

      <div className="space-y-12">
        <CodeStructure />
      </div>
    </div>
  )
} 