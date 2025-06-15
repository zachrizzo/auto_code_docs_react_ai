"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Skeleton } from "../../components/ui/skeleton"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { AlertTriangle, InfoIcon, FileText, Code, Search } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip"

interface UnusedFunction {
  name: string;
  filePath: string;
  lineNumber: number;
  type: 'function' | 'method' | 'arrow-function';
  parameters: string[];
  isExported: boolean;
  lastModified?: string;
}

interface ComponentData {
  name: string;
  filePath: string;
  unusedFunctions: UnusedFunction[];
}

export default function UnusedFunctionsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [componentsData, setComponentsData] = useState<ComponentData[]>([])
  const [totalUnusedCount, setTotalUnusedCount] = useState(0)

  // Load unused functions data
  useEffect(() => {
    async function loadUnusedFunctionsData() {
      try {
        // First check if MCP server is running
        const healthResponse = await fetch('http://localhost:6270/health');
        if (!healthResponse.ok) {
          throw new Error('MCP server is not running. Please start the server from the MCP page.');
        }

        // Call the MCP server's unused functions endpoint
        const response = await fetch('http://localhost:6270/unused-functions');
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Unused functions endpoint not found. Please restart the MCP server.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ComponentData[] = await response.json();
        const totalCount = data.reduce((sum, comp) => sum + comp.unusedFunctions.length, 0);
        
        setComponentsData(data);
        setTotalUnusedCount(totalCount);
        setIsLoading(false);
      } catch (error: any) {
        console.error("Error loading unused functions data:", error);
        let errorMessage = "Unknown error";
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = 'Cannot connect to MCP server. Please ensure the server is running.';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    }

    loadUnusedFunctionsData();
  }, []);

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-12">
        <div className="mb-12">
          <Skeleton className="h-10 w-80 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="sticky top-24 border-none shadow-md bg-white dark:bg-slate-900">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-6" />
                <Skeleton className="h-8 w-16 mb-4" />
                <Skeleton className="h-4 w-full mb-6" />
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-3">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl py-12">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Unable to Load Unused Functions</h3>
            <p className="text-red-500 mb-4">{error}</p>
            {error.includes('server') && (
              <Button asChild variant="outline">
                <a href="/mcp">Go to MCP Server Management</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container max-w-7xl py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-10 w-10 text-orange-500" />
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Unused Functions Analysis
            </h1>
          </div>
          <p className="text-muted-foreground text-xl mt-2 max-w-3xl">
            Identify functions and methods that are declared but never called, helping you clean up your codebase and reduce bundle size.
          </p>
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <InfoIcon className="h-3 w-3" />
              Static Analysis
            </Badge>
            <Badge variant="outline">
              {totalUnusedCount} Unused Functions Found
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="sticky top-24 border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" />
                  Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-500 mb-2">
                      {totalUnusedCount}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unused Functions
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Components Scanned</span>
                      <span>{componentsData.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Functions</span>
                      <span>{componentsData.reduce((sum, comp) => 
                        sum + comp.unusedFunctions.filter(f => f.type === 'function').length, 0
                      )}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Methods</span>
                      <span>{componentsData.reduce((sum, comp) => 
                        sum + comp.unusedFunctions.filter(f => f.type === 'method').length, 0
                      )}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Arrow Functions</span>
                      <span>{componentsData.reduce((sum, comp) => 
                        sum + comp.unusedFunctions.filter(f => f.type === 'arrow-function').length, 0
                      )}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> This feature is currently in development. 
                      The analysis engine will be enhanced to provide more accurate detection of unused functions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            <div className="space-y-6">
              {totalUnusedCount === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Great job! No unused functions detected</h3>
                    <p className="text-muted-foreground">
                      Your codebase appears to be clean with all functions being utilized.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                componentsData.map((component, index) => (
                  <Card key={index} className="border-orange-200 dark:border-orange-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-orange-500" />
                          <CardTitle className="text-lg">{component.name}</CardTitle>
                        </div>
                        <Badge variant="secondary">
                          {component.unusedFunctions.length} unused
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{component.filePath}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {component.unusedFunctions.map((func, funcIndex) => (
                          <div key={funcIndex} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center gap-3">
                              <Code className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              <div>
                                <div className="font-medium text-sm">{func.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Line {func.lineNumber} • {func.type}
                                  {func.parameters.length > 0 && ` • ${func.parameters.length} params`}
                                  {func.isExported && " • Exported"}
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}