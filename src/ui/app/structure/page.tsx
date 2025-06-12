import * as React from "react"
import { CodeArchitecture } from "@/components/code-architecture"

export default function StructurePage() {
  return (
    <div className="container max-w-7xl py-12">
      <div className="flex flex-col gap-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Code Architecture</h1>
        <p className="text-muted-foreground text-xl">
          Explore your application's architecture, dependencies, and design patterns.
        </p>
      </div>

      <div className="space-y-12">
        <CodeArchitecture />
      </div>
    </div>
  )
} 