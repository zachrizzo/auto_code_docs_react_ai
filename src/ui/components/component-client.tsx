"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { Sparkles, FileCode, Clock, Tag, GitBranch, Users, Code2, BookOpen, Lightbulb, Copy, Check, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";
import { CodeRelationships } from "@/components/code-relationships";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { motion, AnimatePresence } from "framer-motion"

interface PropDefinition {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description?: string;
}

interface ComponentData {
  name: string;
  type?: string;
  filePath: string;
  route?: string;
  code: string;
  description?: string;
  lastUpdated?: string;
  exportedFrom?: string[];
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
  similarComponents?: {
    name: string;
    similarity: number;
    reason: string;
    slug?: string;
  }[];
}

export default function ComponentClient({ slug }: { slug: string }) {
  const [componentData, setComponentData] = useState<ComponentData | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('code')
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [codeStats, setCodeStats] = useState<{
    lines: number
    complexity: number
    maintainability: string
  } | null>(null)

  // Check for method fragment in URL
  useEffect(() => {
    // Check if URL has a fragment that might be a method name
    if (typeof window !== 'undefined') {
      const fragment = window.location.hash.replace('#', '');
      if (fragment) {
        setSelectedMethod(fragment);
        setActiveTab('methods');
        
        // Scroll to the method after a brief delay to ensure the tab has switched
        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, []);

  // Calculate code statistics
  const calculateCodeStats = (code: string) => {
    const lines = code.split('\n').filter(line => line.trim() !== '').length
    const complexity = Math.min(Math.max(Math.floor(lines / 10), 1), 10)
    const maintainability = complexity <= 3 ? 'Excellent' : complexity <= 6 ? 'Good' : complexity <= 8 ? 'Fair' : 'Needs Attention'
    return { lines, complexity, maintainability }
  }

  // Copy to clipboard functionality
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(type)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  // Fetch component data
  useEffect(() => {
    async function fetchComponent() {
      try {
        // Try to fetch from docs-data
        const res = await fetch(`/docs-data/${slug}.json`)
        if (res.ok) {
          const data = await res.json()
          // Ensure all required fields exist with defaults
          const componentData = {
            ...data,
            similarComponents: data.similarComponents || [],
            lastUpdated: data.lastUpdated || new Date().toLocaleDateString(),
            type: data.type || "Component",
            route: data.route || `/components/${slug}`,
            props: data.props || [],
            methods: data.methods || []
          }
          setComponentData(componentData)
          if (componentData.code) {
            setCodeStats(calculateCodeStats(componentData.code))
          }
          if (data.description) {
            setDescription(data.description)
          }
        } else {
          // Fallback to mock data
          setComponentData({
            name: slug,
            type: "React Component",
            filePath: `src/components/${slug}.tsx`,
            route: `/components/${slug}`,
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
        // Set fallback data on error
        setComponentData({
          name: slug,
          type: "Component",
          filePath: `src/components/${slug}.tsx`,
          route: `/components/${slug}`,
          code: `// Error loading component data for ${slug}`,
          lastUpdated: new Date().toLocaleDateString(),
          similarComponents: [],
          props: [],
          methods: []
        })
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
          slug: slug,
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
      
      // Update the component data with the new description
      if (componentData) {
        setComponentData({
          ...componentData,
          description: data.description,
          lastUpdated: new Date().toISOString()
        });
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

  const selectedMethodData = componentData.methods?.find(m => m.name === selectedMethod)

  return (
    <div className="container max-w-5xl py-12">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{componentData.name}</h1>
          <Badge className="bg-violet-500 hover:bg-violet-600">{componentData.type || "Component"}</Badge>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCode className="h-4 w-4" />
            <span className="font-mono text-sm">{componentData.filePath}</span>
          </div>
          {componentData.exportedFrom && componentData.exportedFrom.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Also exported from:</span>
              <div className="flex flex-wrap gap-1">
                {componentData.exportedFrom
                  .filter((path: string) => path !== componentData.filePath)
                  .map((exportPath: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {exportPath.split('/').pop()}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-muted-foreground">Last updated {componentData.lastUpdated || "recently"}</p>
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
      <AnimatePresence>
        {description && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <Card className="mt-4 bg-white/5 border-violet-500/30">
              <CardHeader>
                <CardTitle className="text-violet-600 dark:text-violet-400">AI Description</CardTitle>
                {modelUsed && (
                  <CardDescription>
                    Generated with {modelUsed}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  >
                    {description}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
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
          <Card>
            <CodeBlock code={componentData.code || `// Code not available for ${componentData.name}`} language="tsx" />
          </Card>
        </TabsContent>
        <TabsContent value="usage">
          <Card>
            <CodeBlock
              code={`import { ${componentData.name} } from '${componentData.filePath.replace(/\.tsx?$/, '')}';\n\n// Usage example here`}
              language="tsx"
            />
          </Card>
        </TabsContent>
        <TabsContent value="props">
          <Card>
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Prop</th>
                    <th className="p-3 text-left font-medium">Type</th>
                    <th className="p-3 text-left font-medium">Required</th>
                    <th className="p-3 text-left font-medium">Default</th>
                    <th className="p-3 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {componentData.props && componentData.props.length > 0 ? componentData.props.map((prop) => (
                    <tr key={prop.name} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3 font-mono text-sm">{prop.name}</td>
                      <td className="p-3 font-mono text-sm text-violet-500">{prop.type}</td>
                      <td className="p-3">{prop.required ? 'Yes' : 'No'}</td>
                      <td className="p-3 font-mono text-sm">{prop.defaultValue || 'N/A'}</td>
                      <td className="p-3">{prop.description || 'N/A'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No props defined for this component
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="methods">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                {componentData.methods && componentData.methods.length > 0 ? (
                  <ul className="space-y-4">
                    {componentData.methods.map((method, index) => (
                      <li
                        key={method.name}
                        id={method.name}
                        className={`p-3 cursor-pointer ${selectedMethod === method.name ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => setSelectedMethod(method.name)}
                      >
                        <a href={`#${method.name}`} className="font-medium">{method.name}</a>
                        <div className="text-sm text-muted-foreground line-clamp-2 prose dark:prose-invert max-w-none">
                          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                            {method.description || ""}
                          </ReactMarkdown>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    No methods defined for this component
                  </div>
                )}
              </Card>
            </div>
            <div className="md:col-span-2">
              {selectedMethodData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{selectedMethodData.name}</CardTitle>
                      <CardDescription>
                        <div className="text-muted-foreground pt-2 prose dark:prose-invert max-w-none">
                          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeHighlight]}>
                            {selectedMethodData.description || ""}
                          </ReactMarkdown>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedMethodData.params && selectedMethodData.params.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium mb-2">Parameters</h5>
                          <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <table className="w-full">
                              <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                  <th className="p-3 text-left font-medium">Name</th>
                                  <th className="p-3 text-left font-medium">Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedMethodData.params.map((param) => (
                                  <tr key={param.name} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="p-3 font-mono text-sm">{param.name}</td>
                                    <td className="p-3 font-mono text-sm text-violet-500">{param.type}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <Card>
                        <CodeBlock
                          code={selectedMethodData.code || ''}
                          language="typescript"
                        />
                      </Card>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="relationships">
          <Card>
            <CodeRelationships entityId={slug} />
          </Card>
        </TabsContent>
      </Tabs>
      <Card>
        <CardHeader>
          <CardTitle>Similar Components</CardTitle>
          <CardDescription>Based on an analysis of the codebase, here are some components with similar functionality or implementation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {componentData.similarComponents?.map((comp) => (
              <a href={`/components/${comp.slug || comp.name.toLowerCase()}`} key={comp.name} className="block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold">{comp.name}</h4>
                  <div className="text-sm font-semibold text-violet-500">{comp.similarity}%</div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{comp.reason}</p>
              </a>
            )) || (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No similar components found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
