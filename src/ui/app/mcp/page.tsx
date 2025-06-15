"use client"
import * as React from "react"
import { McpServerControl } from "../../components/mcp-server-control"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"

export default function McpPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-4">MCP Server Management</h1>
      <p className="text-muted-foreground mb-8">
        Start, stop, and manage the MCP server from this page.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Server Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <McpServerControl />
        </CardContent>
      </Card>
    </div>
  )
}
