import * as React from "react"

import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { FileCode, Package } from "lucide-react"

// Mock data - in a real app, this would come from your API
const featuredComponents = [
  {
    name: "DocumentAll",
    description:
      "This component brings together all the components, functions and examples for documentation generation purposes.",
    path: "/components/DocumentAll",
    type: "component",
    methodCount: 5,
  },
  {
    name: "Todo",
    description: "A Todo component that manages a list of todo items with various features.",
    path: "/components/Todo",
    type: "component",
    methodCount: 3,
  },
  {
    name: "fibonacci",
    description: "A memoized implementation of the Fibonacci sequence calculator.",
    path: "/functions/fibonacci",
    type: "function",
    methodCount: 0,
  },
  {
    name: "HealthcareDashboard",
    description: "Dashboard component for healthcare data visualization.",
    path: "/components/HealthcareDashboard",
    type: "component",
    methodCount: 7,
  },
]

export function ComponentGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {featuredComponents.map((component) => (
        <Link key={component.name} href={component.path} className="group">
          <Card className="h-full overflow-hidden transition-all group-hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={component.type === "component" ? "default" : "secondary"}>
                  {component.type === "component" ? "Component" : "Function"}
                </Badge>
                {component.methodCount > 0 && (
                  <Badge variant="outline">
                    {component.methodCount} method{component.methodCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <CardTitle className="flex items-center gap-2 text-lg">
                {component.type === "component" ? <Package className="h-5 w-5" /> : <FileCode className="h-5 w-5" />}
                {component.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 text-sm text-muted-foreground">{component.description}</p>
            </CardContent>
            <CardFooter className="border-t bg-muted/50 p-3 text-xs text-muted-foreground">View details</CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}
