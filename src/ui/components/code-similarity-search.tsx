"use client"
import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Search } from "lucide-react"
import { Progress } from "@/components/ui/progress"

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
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Code Similarity Search
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Paste a code snippet below to find the most similar functions or components in your codebase. This can help identify duplicate logic.
                </p>
                <div className="grid gap-4">
                    <Textarea 
                        placeholder="Paste your code here..."
                        value={codeToCompare}
                        onChange={(e) => setCodeToCompare(e.target.value)}
                        rows={8}
                        className="font-mono"
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? "Searching..." : "Find Similar Code"}
                    </Button>
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    {loading && <p className="text-sm text-muted-foreground">Searching for similar code...</p>}

                    {results.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-semibold">Top {results.length} Matches:</h4>
                            <div className="space-y-3">
                                {results.map((result, index) => (
                                    <div key={index} className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <a href={`/components/${result.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">{result.name}</a>
                                                <p className="text-xs text-muted-foreground font-mono truncate max-w-xs" title={result.path}>{result.path}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-4">
                                                <p className="font-bold text-lg">{(result.similarity * 100).toFixed(1)}%</p>
                                                <p className="text-xs text-muted-foreground">Similarity</p>
                                            </div>
                                        </div>
                                        <Progress value={result.similarity * 100} className="mt-2 h-2" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
} 