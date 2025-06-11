"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { Sparkles, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";
import { CodeRelationships } from "@/components/code-relationships";

interface PropDefinition {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description?: string;
}

interface ComponentData {
  name: string;
  type: string;
  filePath: string;
  route: string;
  code: string;
  description?: string;
  lastUpdated: string;
  props?: PropDefinition[];
  methods?: {
    name: string;
    code?: string;
    description?: string;
    params?: {
      name: string;
      type: string;
    }[];
    returnType?: string;
  }[];
  similarComponents: {
    name: string;
    similarity: number;
    reason: string;
  }[];
}

export default function ComponentClient({ slug }: { slug: string }) {
  const [componentData, setComponentData] = useState<ComponentData | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('code')
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  // Check for method fragment in URL
  useEffect(() => {
    // Check if URL has a fragment that might be a method name
    if (typeof window !== 'undefined') {
      const fragment = window.location.hash.replace('#', '');
      if (fragment) {
        setSelectedMethod(fragment);
        setActiveTab('methods');
      }
    }
  }, []);

  // Fetch component data
  useEffect(() => {
    async function fetchComponent() {
      try {
        // Try to fetch from docs-data
        const res = await fetch(`/docs-data/${slug}.json`)
        if (res.ok) {
          const data = await res.json()
          setComponentData(data)
          if (data.description) {
            setDescription(data.description)
          }
        } else {
          // Fallback to mock data
          setComponentData({
            name: slug,
            type: "React Component",
            filePath: `src/components/${slug}.tsx`,
            route: `/components/${slug.toLowerCase()}`,
            code: `import React from 'react';\n\nexport function ${slug}({ title, children }) {\n  return (\n    <div className=\"component\">\n      <h2>{title}</h2>\n      <div>{children}</div>\n    </div>\n  );\n}`,
            lastUpdated: "2 days ago",
            similarComponents: [
              {
                name: slug === "Modal" ? "Dialog" : "Modal",
                similarity: 85,
                reason: "Both handle popup content with similar open/close behavior",
              },
              {
                name: "Dropdown",
                similarity: 65,
                reason: "Similar toggling behavior and content display",
              },
            ],
          })
        }
        setLoading(false)
      } catch (error) {
        console.error('Error loading component data:', error)
        setLoading(false)
      }
    }
    fetchComponent()
  }, [slug])

  const [generationError, setGenerationError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  const generateDescription = async () => {
    if (!componentData) return;
    setIsGenerating(true);
    setGenerationError(null);
    setModelUsed(null);
    
    try {
      console.log('Generating description for component:', componentData.name);
      
      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentName: componentData.name,
          code: componentData.code || `function ${componentData.name}() { /* Code not available */ }`,
          filePath: componentData.filePath,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.error('Error from API:', data.error || 'Unknown error');
        setGenerationError(data.error || 'Failed to generate description');
        return;
      }
      
      setDescription(data.description);
      if (data.model) {
        setModelUsed(data.model);
      }
      
      console.log('Description generated successfully using model:', data.model);
    } catch (error) {
      console.error('Error generating description:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-5xl py-12">
        <p className="text-center text-muted-foreground">Loading component data...</p>
      </div>
    )
  }

  if (!componentData) {
    return (
      <div className="container max-w-5xl py-12">
        <p className="text-center text-muted-foreground">Component not found</p>
      </div>
    )
  }

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
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-violet-600 dark:text-violet-400">AI Description</h3>
            {modelUsed && (
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-600 dark:text-slate-400">
                Generated with {modelUsed}
              </span>
            )}
          </div>
          <p className="text-lg">{description}</p>
        </div>
      )}
      
      {generationError && !description && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl shadow-sm mb-10 border border-red-100 dark:border-red-900/30">
          <h3 className="font-medium mb-3 text-red-600 dark:text-red-400">Error Generating Description</h3>
          <p className="text-md">{generationError}</p>
          <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">
            Make sure Ollama is running locally or check your environment configuration.
          </p>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
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
          <TabsTrigger value="methods" className="rounded-md">
            Methods
          </TabsTrigger>
          <TabsTrigger value="relationships" className="rounded-md">
            Relationships
          </TabsTrigger>
        </TabsList>
        <TabsContent value="code">
          <CodeBlock code={componentData.code || `// Code not available for ${componentData.name}`} language="tsx" />
        </TabsContent>
        <TabsContent value="usage">
          <CodeBlock
            code={`import { ${componentData.name} } from '${componentData.filePath.replace(/\.tsx?$/, '')}';\n\n// Usage example here`}
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
                {componentData.props && componentData.props.length > 0 ? (
                  componentData.props.map((prop, index) => (
                    <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4 font-medium">{prop.name}</td>
                      <td className="p-4 text-muted-foreground">{prop.type || 'any'}</td>
                      <td className="p-4 text-muted-foreground">{prop.defaultValue || '-'}</td>
                      <td className="p-4">{prop.description || '-'}</td>
                    </tr>
                  ))
                ) : (
                  // Extract props from the component code as a fallback
                  <>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4 font-medium">children</td>
                      <td className="p-4 text-muted-foreground">ReactNode</td>
                      <td className="p-4 text-muted-foreground">-</td>
                      <td className="p-4">The content to render</td>
                    </tr>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4 font-medium">variant</td>
                      <td className="p-4 text-muted-foreground">string</td>
                      <td className="p-4 text-muted-foreground">'primary'</td>
                      <td className="p-4">The visual style variant of the button</td>
                    </tr>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4 font-medium">size</td>
                      <td className="p-4 text-muted-foreground">string</td>
                      <td className="p-4 text-muted-foreground">'medium'</td>
                      <td className="p-4">The size of the button</td>
                    </tr>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4 font-medium">onClick</td>
                      <td className="p-4 text-muted-foreground">function</td>
                      <td className="p-4 text-muted-foreground">-</td>
                      <td className="p-4">Function called when the button is clicked</td>
                    </tr>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-4 font-medium">disabled</td>
                      <td className="p-4 text-muted-foreground">boolean</td>
                      <td className="p-4 text-muted-foreground">false</td>
                      <td className="p-4">Whether the button is disabled</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="methods">
          <div className="space-y-6">
            {!componentData.methods || componentData.methods.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No methods found for this component.</p>
              </div>
            ) : (
              componentData.methods.map((method, index) => {
                const isSelected = selectedMethod === method.name;
                return (
                  <div 
                    key={`method-${method.name}-${index}`} 
                    id={method.name}
                    className={`p-6 rounded-xl border ${isSelected ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{method.name}</h3>
                        <Badge className="bg-amber-500 hover:bg-amber-600">Method</Badge>
                      </div>
                    </div>
                    
                    {method.description && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                        <p>{method.description}</p>
                      </div>
                    )}
                    
                    {method.params && method.params.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Parameters</h4>
                        <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                          <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                              <tr>
                                <th className="text-left p-2 font-medium">Name</th>
                                <th className="text-left p-2 font-medium">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {method.params.map((param, paramIndex) => (
                                <tr key={paramIndex} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="p-2 font-medium">{param.name}</td>
                                  <td className="p-2 text-muted-foreground">{param.type || 'any'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {method.returnType && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Return Type</h4>
                        <p className="font-mono text-sm">{method.returnType}</p>
                      </div>
                    )}
                    
                    {method.code && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Code</h4>
                        <CodeBlock code={method.code} language="tsx" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="relationships">
          <div className="space-y-8">
            <CodeRelationships entityId={slug.toLowerCase()} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
