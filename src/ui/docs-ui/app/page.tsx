import * as React from "react"

import { ComponentList } from "../components/component-list"
import { SearchBar } from "../components/search-bar"
import { Button } from "../components/ui/button"
import { ArrowRight, Code, BookOpen, Search } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Separator } from "../components/ui/separator"

export default function Home() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center space-y-6 text-center mb-12">
        <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
          Code Documentation
        </div>
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          Document Your <span className="text-primary">Codebase</span>
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Explore your codebase with interactive documentation, real-time parsing, and vector search.
        </p>
        <div className="w-full max-w-md">
          <SearchBar />
        </div>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Button asChild size="lg">
            <Link href="/components">
              Browse Components <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Features */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card>
          <CardHeader className="pb-2">
            <Code className="h-6 w-6 text-primary" />
            <CardTitle className="mt-2">Component Documentation</CardTitle>
            <CardDescription>
              Live documentation for all your components
            </CardDescription>
          </CardHeader>
          <CardContent>
            Browse detailed API references, usage examples, and component relationships directly from your codebase.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Search className="h-6 w-6 text-primary" />
            <CardTitle className="mt-2">Semantic Search</CardTitle>
            <CardDescription>
              Find exactly what you need with AI-powered semantic search
            </CardDescription>
          </CardHeader>
          <CardContent>
            Search for components by functionality, not just by name or keywords.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <CardTitle className="mt-2">Real-time Documentation</CardTitle>
            <CardDescription>
              Documentation updates as your codebase changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            See the most current documentation without having to regenerate files.
          </CardContent>
        </Card>
      </div>

      {/* Recent Components */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Recent Components</h2>
          <Button variant="outline" asChild>
            <Link href="/components">View all</Link>
          </Button>
        </div>
        <ComponentList limit={6} />
      </div>
    </div>
  )
}
