"use client"

import * as React from "react"

import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { MethodDefinition } from "../lib/docs-data"

type MethodListProps = {
  methods: MethodDefinition[]
  selectedMethod: MethodDefinition | null
  onSelect: (method: MethodDefinition) => void
}

export function MethodList({ methods, selectedMethod, onSelect }: MethodListProps) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-1">
        {methods.map((method) => (
          <Button
            key={method.name}
            variant={selectedMethod?.name === method.name ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => onSelect(method)}
          >
            <div className="flex flex-col items-start">
              <span>{method.name}</span>
              {method.similarityWarnings && method.similarityWarnings.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {method.similarityWarnings.length} similar function{method.similarityWarnings.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  )
}
