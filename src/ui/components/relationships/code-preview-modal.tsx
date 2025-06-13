"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Code, Component, ActivityIcon as Function, FileCode, ExternalLink, Info } from "lucide-react"
import { ArrowRightIcon } from "@radix-ui/react-icons"
import { CodeBlock } from "../code-block"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeHighlight from "rehype-highlight"
import { Relationship } from "./types"

interface CodePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNodeForCode: string | null
  nodeCodeData: any
  getEntityIcon: (type: string) => JSX.Element
  getRelationshipColor: (type: Relationship["type"]) => string
  getRelationshipLabel: (type: Relationship["type"]) => string
}

export function CodePreviewModal({
  isOpen,
  onClose,
  selectedNodeForCode,
  nodeCodeData,
  getEntityIcon,
  getRelationshipColor,
  getRelationshipLabel
}: CodePreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {nodeCodeData ? (
                <>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                    {getEntityIcon(nodeCodeData.type || "component")}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <DialogTitle className="font-bold text-slate-900 dark:text-slate-100 truncate text-lg">
                      {nodeCodeData.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {nodeCodeData.type || "component"}
                      </Badge>
                      {nodeCodeData.code && (
                        <Badge variant="outline" className="text-xs">
                          {nodeCodeData.code.split('\n').length} lines
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <DialogTitle className="font-bold text-slate-900 dark:text-slate-100 truncate text-lg">
                  Loading...
                </DialogTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              {nodeCodeData?.filePath && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/components/${selectedNodeForCode}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Details
                  </a>
                </Button>
              )}
            </div>
          </div>
          {nodeCodeData?.filePath && (
            <div className="mt-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
              📁 {nodeCodeData.filePath}
            </div>
          )}
          <DialogDescription className="sr-only">
            Full code preview and details for the selected component
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="p-4 md:p-6 lg:p-8 space-y-6">
              {nodeCodeData ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {/* Left Column - Info Cards */}
                  <div className="space-y-6">
                    {/* Description Card */}
                    {nodeCodeData.description && (
                      <Card className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-900 dark:text-blue-100">
                            <Info className="h-4 w-4" />
                            Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="prose dark:prose-invert max-w-none text-sm">
                            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                              {nodeCodeData.description}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Props Card */}
                    {nodeCodeData.props && nodeCodeData.props.length > 0 && (
                      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            Props ({nodeCodeData.props.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 max-h-64 overflow-y-auto">
                          <div className="space-y-3">
                            {nodeCodeData.props.map((prop: any, index: number) => (
                              <div key={index} className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 border border-white/50 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold">
                                    {prop.name}
                                  </code>
                                  <Badge variant="outline" className="text-xs">
                                    {prop.type}
                                  </Badge>
                                  {prop.required && (
                                    <Badge className="text-xs bg-red-100 text-red-700">
                                      required
                                    </Badge>
                                  )}
                                </div>
                                {prop.description && (
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1 prose dark:prose-invert max-w-none">
                                    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                                      {prop.description}
                                    </ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Relationships Card */}
                    {nodeCodeData.relationships && nodeCodeData.relationships.length > 0 && (
                      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-orange-900 dark:text-orange-100">
                            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                            Relationships ({nodeCodeData.relationships.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 max-h-48 overflow-y-auto">
                          <div className="space-y-2">
                            {nodeCodeData.relationships.map((rel: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-white/50 dark:border-slate-700/50 text-sm">
                                <Badge className={`${getRelationshipColor(rel.type)} text-xs`}>
                                  {getRelationshipLabel(rel.type)}
                                </Badge>
                                <ArrowRightIcon className="h-3 w-3 text-slate-400" />
                                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded flex-1 truncate">
                                  {rel.target}
                                </code>
                                {rel.context && (
                                  <span className="text-xs text-slate-500 bg-slate-100/50 px-1 rounded">
                                    {rel.context}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Methods Card */}
                    {nodeCodeData.methods && nodeCodeData.methods.length > 0 && (
                      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                            Methods ({nodeCodeData.methods.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 max-h-64 overflow-y-auto">
                          <div className="space-y-3">
                            {nodeCodeData.methods.map((method: any, index: number) => (
                              <div key={index} className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 border border-white/50 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <code className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs font-semibold text-purple-800 dark:text-purple-200">
                                    {method.name}()
                                  </code>
                                  {method.params && method.params.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {method.params.map((param: any, paramIndex: number) => (
                                        <Badge key={paramIndex} variant="outline" className="text-xs">
                                          {param.name}: {param.type}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {method.description && (
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 prose dark:prose-invert max-w-none">
                                    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                                      {method.description}
                                    </ReactMarkdown>
                                  </div>
                                )}
                                {method.code && (
                                  <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                                    <CodeBlock code={method.code} language="tsx" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Column - Source Code */}
                  <div className="xl:col-span-2 2xl:col-span-3">
                    {nodeCodeData.code && (
                      <Card className="h-full bg-gradient-to-br from-slate-50 to-stone-50 dark:from-slate-950/30 dark:to-stone-950/30 border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                            <div className="h-2 w-2 rounded-full bg-slate-500"></div>
                            Source Code
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 h-[calc(100%-4rem)]">
                          <ScrollArea className="h-full w-full">
                            <div className="bg-slate-900 rounded-lg h-full">
                              <CodeBlock code={nodeCodeData.code} language="tsx" />
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Loading code data...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}