"use client"
import * as React from "react"
import { CodeRelationships } from "@/components/code-relationships"

export default function Home() {
  return (
    <main className="flex flex-col h-full p-4">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
        <div className="flex flex-col gap-2 mb-4 flex-shrink-0">
            <h1 className="text-3xl font-bold tracking-tight">Code Relationships</h1>
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CodeRelationships />
        </div>
      </div>
    </main>
  )
}
