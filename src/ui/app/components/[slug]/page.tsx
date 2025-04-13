"use client"
import * as React from "react"
import { useState } from "react"
import { Sparkles, FileCode } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { CodeBlock } from "../../../components/code-block"
import { Badge } from "../../../components/ui/badge"
import { SimilarComponentsSection } from "../../../components/similar-components-section"
import { CodeRelationships } from "../../../components/code-relationships"
import { CodeGraph } from "../../../components/code-graph"

export default function ComponentPage({ params }: { params: { slug: string } }) {
  const [description, setDescription] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Mock data - in a real app this would come from your backend
  const componentData = {
    name: params.slug,
    type: "React Component",
    filePath: `src/components/${params.slug}.tsx`,
    route: `/components/${params.slug.toLowerCase()}`,
    lastUpdated: "2 days ago",
    similarComponents: [
      {
        name: params.slug === "Modal" ? "Dialog" : "Modal",
        similarity: 85,
        reason: "Both handle popup content with similar open/close behavior",
      },
      {
        name: "Dropdown",
        similarity: 65,
        reason: "Similar toggling behavior and content display",
      },
    ],
  }

  const generateDescription = () => {
    setIsGenerating(true)
    // Simulate API call
    setTimeout(() => {
      setDescription(
        "This component renders a user interface element that displays information in a structured format. It accepts props for customization and handles various user interactions.",
      )
      setIsGenerating(false)
    }, 1500)
  }

  const componentCode = `import React from 'react';

export function ${params.slug}({ title, children }) {
  return (
    <div className="component">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}`

  return (
    <div className="container max-w-5xl py-12">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{componentData.name}</h1>
          <Badge className="bg-violet-500 hover:bg-violet-600">{componentData.type}</Badge>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <FileCode className="h-4 w-4" />
          <span className="font-mono text-sm">{componentData.filePath}</span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-muted-foreground">Last updated {componentData.lastUpdated}</p>
          <Button onClick={generateDescription} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              "Generating..."
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate AI Description
              </>
            )}
          </Button>
        </div>
      </div>

      {description && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm mb-10 border border-slate-100 dark:border-slate-800">
          <h3 className="font-medium mb-3 text-violet-600 dark:text-violet-400">AI Description</h3>
          <p className="text-lg">{description}</p>
        </div>
      )}

      <Tabs defaultValue="code" className="mb-10">
        <TabsList className="mb-6 bg-white dark:bg-slate-900 p-1 rounded-lg">
          <TabsTrigger value="code" className="rounded-md">
            Code
          </TabsTrigger>
          <TabsTrigger value="usage" className="rounded-md">
            Usage
          </TabsTrigger>
          <TabsTrigger value="props" className="rounded-md">
            Props
          </TabsTrigger>
          <TabsTrigger value="relationships" className="rounded-md">
            Relationships
          </TabsTrigger>
        </TabsList>
        <TabsContent value="code">
          <CodeBlock code={componentCode} language="tsx" />
        </TabsContent>
        <TabsContent value="usage">
          <CodeBlock
            code={`import { ${params.slug} } from 'components/${params.slug.toLowerCase()}';

export default function Example() {
  return (
    <${params.slug} title="Example">
      This is an example usage
    </${params.slug}>
  );
}`}
            language="tsx"
          />
        </TabsContent>
        <TabsContent value="props">
          <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Default</th>
                  <th className="text-left p-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-medium">title</td>
                  <td className="p-4 text-muted-foreground">string</td>
                  <td className="p-4 text-muted-foreground">-</td>
                  <td className="p-4">The title to display</td>
                </tr>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-medium">children</td>
                  <td className="p-4 text-muted-foreground">ReactNode</td>
                  <td className="p-4 text-muted-foreground">-</td>
                  <td className="p-4">The content to render</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="relationships">
          <div className="space-y-8">
            <CodeRelationships entityId={params.slug.toLowerCase()} entityType="component" />
            <CodeGraph entityId={params.slug.toLowerCase()} />
          </div>
        </TabsContent>
      </Tabs>

      <SimilarComponentsSection
        components={componentData.similarComponents}
        currentComponent={{
          name: componentData.name,
          code: componentCode,
          filePath: componentData.filePath,
        }}
      />
    </div>
  )
}
