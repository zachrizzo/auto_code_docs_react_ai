"use client"
import * as React from "react"
import { CodeRelationships } from "@/components/code-relationships"

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-7xl">
        <div className="flex flex-col gap-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Code Relationships</h1>
            <p className="text-muted-foreground text-xl">
                Explore dependencies and relationships between code elements
            </p>
        </div>
        <CodeRelationships />
      </div>
    </main>
  )
}
