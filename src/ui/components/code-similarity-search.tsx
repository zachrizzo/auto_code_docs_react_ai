"use client"
import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Search, Code2, ExternalLink, AlertCircle, Lightbulb } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"

interface SimilarityResult {
    name: string;
    similarity: number;
    path: string;
    id: string;
}

export function CodeSimilaritySearch() {
    const [codeToCompare, setCodeToCompare] = useState("");
    const [results, setResults] = useState<SimilarityResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!codeToCompare.trim()) {
            setError("Please paste some code to compare.");
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const res = await fetch('http://localhost:6270/similarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeToCompare, limit: 5 })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch similarity results');
            }

            const data = await res.json();
            setResults(data);

        } catch (e: any) {
            setError(e.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Code2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">Code Similarity Search</h3>
                        <p className="text-sm text-muted-foreground mt-1">Find duplicate or similar code patterns</p>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">How it works</p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Paste any code snippet below to find similar functions or components in your codebase. This helps identify duplicate logic and refactoring opportunities.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="grid gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Code to analyze
                        </label>
                        <Textarea 
                            placeholder={`// Example: Paste any code snippet here
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`}
                            value={codeToCompare}
                            onChange={(e) => setCodeToCompare(e.target.value)}
                            rows={10}
                            className="font-mono text-sm resize-none border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 focus:border-primary transition-colors"
                        />
                        <p className="text-xs text-muted-foreground">
                            Tip: Works best with complete functions or code blocks
                        </p>
                    </div>
                    <Button 
                        onClick={handleSearch} 
                        disabled={loading || !codeToCompare.trim()}
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        {loading ? "Analyzing Code..." : "Find Similar Code"}
                    </Button>
                    
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-900 dark:text-red-100">Search Failed</p>
                                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {loading && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                <span>Analyzing code patterns...</span>
                            </div>
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2 flex-1">
                                                <Skeleton className="h-5 w-32" />
                                                <Skeleton className="h-4 w-48" />
                                            </div>
                                            <Skeleton className="h-6 w-12" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-semibold flex items-center gap-2">
                                    <Badge variant="secondary">{results.length}</Badge>
                                    Similar Code Found
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                    Sorted by similarity
                                </Badge>
                            </div>
                            <div className="space-y-4">
                                {results.map((result, index) => {
                                    const similarityPercent = result.similarity * 100;
                                    return (
                                        <div key={index} className={`border-2 p-5 rounded-xl transition-all hover:shadow-md ${
                                            similarityPercent >= 80 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' :
                                            similarityPercent >= 60 ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30' :
                                            'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                                        }`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <a 
                                                            href={`/components/${result.id}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                                                        >
                                                            {result.name}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                        <Badge 
                                                            variant={similarityPercent >= 80 ? 'destructive' : similarityPercent >= 60 ? 'default' : 'secondary'}
                                                            className="text-xs"
                                                        >
                                                            {similarityPercent >= 80 ? 'High Match' : similarityPercent >= 60 ? 'Good Match' : 'Partial Match'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground font-mono truncate max-w-md" title={result.path}>
                                                        {result.path}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-4">
                                                    <p className={`font-bold text-2xl ${
                                                        similarityPercent >= 80 ? 'text-red-600 dark:text-red-400' :
                                                        similarityPercent >= 60 ? 'text-orange-600 dark:text-orange-400' :
                                                        'text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                        {similarityPercent.toFixed(1)}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Similarity</p>
                                                </div>
                                            </div>
                                            <Progress 
                                                value={similarityPercent} 
                                                className={`h-3 ${
                                                    similarityPercent >= 80 ? '[&>div]:bg-red-500' :
                                                    similarityPercent >= 60 ? '[&>div]:bg-orange-500' :
                                                    '[&>div]:bg-slate-500'
                                                }`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            {results.length >= 5 && (
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Showing top 5 matches. Refine your search for more specific results.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {results.length === 0 && !loading && !error && codeToCompare.trim() && (
                        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                            <div className="flex flex-col items-center space-y-3">
                                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                                    <Search className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-green-900 dark:text-green-100">No Similar Code Found</p>
                                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                                        Great! This code appears to be unique in your codebase.
                                    </p>
                                </div>
                                <div className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 px-3 py-2 rounded">
                                    Try different code patterns or reduce complexity for broader matches
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}