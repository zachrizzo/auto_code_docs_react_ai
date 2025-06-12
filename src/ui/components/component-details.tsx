"use client"
import * as React from "react"
import { useRef } from "react"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { CodeBlock } from "./code-block"
import { TableOfContents } from "./table-of-contents"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeHighlight from "rehype-highlight"

interface ComponentDetailsProps {
  component: any
}

export function ComponentDetails({ component }: ComponentDetailsProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  if (!component) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Component not found</h2>
        <p>The requested component could not be found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-3">
        <div ref={contentRef} className="space-y-8">
          <div>
            <h1 id="overview" className="text-3xl font-bold mb-2">{component.name}</h1>
            <p className="text-muted-foreground mb-4">{component.filePath}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="outline">{component.type || 'Component'}</Badge>
              {component.props && component.props.length > 0 && (
                <Badge variant="outline">{component.props.length} Props</Badge>
              )}
              {component.methods && component.methods.length > 0 && (
                <Badge variant="outline">{component.methods.length} Methods</Badge>
              )}
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {component.description ? (
                <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                  {component.description}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">No description available.</p>
              )}
            </div>
          </div>

          {component.props && component.props.length > 0 && (
            <div>
              <h2 id="props" className="text-2xl font-bold mb-4">Props</h2>
              <div className="space-y-4">
                {component.props.map((prop: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{prop.name}</h3>
                        <Badge variant="outline">{prop.type}</Badge>
                        {prop.required && <Badge>Required</Badge>}
                      </div>
                      {prop.description && (
                        <div className="text-sm text-muted-foreground prose dark:prose-invert max-w-none">
                          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                            {prop.description}
                          </ReactMarkdown>
                        </div>
                      )}
                      {prop.defaultValue && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Default:</span>{" "}
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">{prop.defaultValue}</code>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {component.methods && component.methods.length > 0 && (
            <div>
              <h2 id="methods" className="text-2xl font-bold mb-4">Methods</h2>
              <div className="space-y-6">
                {component.methods.map((method: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <h3 id={`method-${method.name}`} className="text-xl font-semibold">{method.name}</h3>
                    {method.description && (
                      <div className="text-muted-foreground prose dark:prose-invert max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                          {method.description}
                        </ReactMarkdown>
                      </div>
                    )}
                    
                    {method.params && method.params.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-md font-medium mb-2">Parameters</h4>
                        <ul className="space-y-1 list-disc list-inside">
                          {method.params.map((param: any, paramIndex: number) => (
                            <li key={paramIndex}>
                              <code>{param.name}</code>: <span className="text-sm">{param.type}</span>
                              {param.description && (
                                <div className="text-muted-foreground inline-block ml-1 prose dark:prose-invert max-w-none">
                                  -&nbsp;
                                  <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                                    {param.description}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {method.returnType && method.returnType !== 'void' && (
                      <div className="mt-2">
                        <h4 className="text-md font-medium">Returns</h4>
                        <p><code>{method.returnType}</code></p>
                      </div>
                    )}
                    
                    {method.code && (
                      <div className="mt-3">
                        <CodeBlock code={method.code} language="typescript" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {component.code && (
            <div>
              <h2 id="source-code" className="text-2xl font-bold mb-4">Source Code</h2>
              <CodeBlock code={component.code} language="typescript" />
            </div>
          )}

          {component.similarityWarnings && component.similarityWarnings.length > 0 && (
            <div>
              <h2 id="similar-code" className="text-2xl font-bold mb-4">Similar Code</h2>
              <p className="mb-4 text-muted-foreground">
                These components or methods have similar implementation to this component.
              </p>
              <div className="space-y-4">
                {component.similarityWarnings.map((warning: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">
                          {warning.similarTo} in {warning.componentName}
                        </h3>
                        <Badge variant="outline">
                          {Math.round(warning.score * 100)}% similar
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{warning.reason}</p>
                      {warning.filePath && (
                        <p className="text-xs text-muted-foreground">{warning.filePath}</p>
                      )}
                      {warning.code && (
                        <div className="mt-2">
                          <CodeBlock code={warning.code} language="typescript" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="hidden md:block">
        <div className="sticky top-20">
          <TableOfContents 
            contentRef={contentRef}
            title="On this page"
            className="p-4 rounded-lg border"
          />
        </div>
      </div>
    </div>
  )
}
