"use client"

import * as React from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable"

type SplitViewProps = {
  left: React.ReactNode
  right: React.ReactNode
  initialRatio?: number
}

export function SplitView({ left, right, initialRatio = 0.5 }: SplitViewProps) {
  // Convert initialRatio (0.5) to an array of percentages for ResizablePanelGroup
  // For a 50/50 split, this should be [50, 50]
  const defaultSizes = [initialRatio * 100, (1 - initialRatio) * 100]

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-[500px] rounded-lg border"
    >
      <ResizablePanel defaultSize={defaultSizes[0]} className="bg-card p-4">
        {left}
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-muted" />
      <ResizablePanel defaultSize={defaultSizes[1]} className="bg-card p-4">
        {right}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
