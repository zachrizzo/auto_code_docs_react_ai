import * as React from "react"
import { CodeRelationships } from "@/components/code-relationships"

export default function RelationshipsPage() {
  return (
    <div className="container max-w-6xl py-12">
      <div className="flex flex-col gap-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Code Relationships</h1>
        <p className="text-muted-foreground text-xl">Explore dependencies and relationships between code elements</p>
      </div>

      <div className="space-y-12">
        <CodeRelationships />
      </div>
    </div>
  )
}
