"use client"
import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { CodeIcon, EnterFullScreenIcon, ExternalLinkIcon } from "@radix-ui/react-icons"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { diffLines, Change } from 'diff';

// Helper function to get the correct URL path based on entity kind
const getEntityUrl = (component: { slug?: string; kind?: string }, methodName?: string): string => {
  if (!component.slug) return '#';
  
  let basePath = '/components'; // default fallback
  
  if (component.kind === 'function') {
    basePath = '/functions';
  } else if (component.kind === 'class') {
    basePath = '/classes';
  } else if (component.kind === 'component') {
    basePath = '/components';
  }
  
  const url = `${basePath}/${component.slug}`;
  return methodName ? `${url}#${methodName}` : url;
};

interface ComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  component1: {
    name: string
    code: string
    filePath: string
    slug?: string
    kind?: string
  }
  component2: {
    name: string
    code: string
    filePath: string
    slug?: string
    kind?: string
  }
  similarityScore: number
  methodName?: string
  method1Name?: string
  method2Name?: string
  isMethodComparison?: boolean
}

export function ComparisonModal({
  isOpen,
  onClose,
  component1,
  component2,
  similarityScore: initialSimilarityScore,
  methodName,
  method1Name,
  method2Name,
  isMethodComparison = false
}: ComparisonModalProps) {
  const [view, setView] = useState<"split" | "unified">("split")
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showHighlights, setShowHighlights] = useState(true)
  const [similarityScore, setSimilarityScore] = useState(initialSimilarityScore)

  // Extract method code if we're comparing methods
  const extractMethodCode = (code: string, methodName?: string) => {
    if (!isMethodComparison || !methodName) return code;

    // If the code already appears to be just a method (starts with common function patterns) return as is
    if (code.trim().startsWith('function') ||
      code.trim().startsWith('const') ||
      code.trim().startsWith('let') ||
      code.trim().startsWith('export')) {
      return code;
    }

    try {
      // More comprehensive regex to find method definitions with various patterns
      const methodPatterns = [
        // Standard function declarations
        `function\\s+${methodName}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?}`,
        // Function expression assignments (const/let/var)
        `(const|let|var)\\s+${methodName}\\s*=\\s*function\\s*\\([^)]*\\)\\s*{[\\s\\S]*?}`,
        // Arrow function assignments
        `(const|let|var)\\s+${methodName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{[\\s\\S]*?}`,
        // Arrow function without braces (single expression)
        `(const|let|var)\\s+${methodName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*[^;{]*;?`,
        // Class methods
        `${methodName}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?}`,
        // Async functions
        `async\\s+function\\s+${methodName}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?}`,
        // Async arrow functions
        `(const|let|var)\\s+${methodName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*{[\\s\\S]*?}`
      ];

      // Join all patterns with OR
      const combinedPattern = methodPatterns.join('|');
      const methodRegex = new RegExp(combinedPattern, 'g');

      let match;
      // Find the first match
      if ((match = methodRegex.exec(code)) !== null) {
        return match[0];
      }

      // Alternative approach if the regex fails: try to find the method by looking for its name
      // and then extracting a reasonable block after it
      const methodStartIndex = code.indexOf(`function ${methodName}`) > -1
        ? code.indexOf(`function ${methodName}`)
        : code.indexOf(`${methodName} =`) > -1
          ? code.indexOf(`${methodName} =`)
          : code.indexOf(`${methodName}(`) > -1
            ? code.indexOf(`${methodName}(`)
            : -1;

      if (methodStartIndex > -1) {
        // Find a reasonable endpoint - either the next method or the end of the file
        let depth = 0;
        let endIndex = methodStartIndex;

        // Go through the code character by character looking for matching braces
        for (let i = methodStartIndex; i < code.length; i++) {
          if (code[i] === '{') depth++;
          else if (code[i] === '}') {
            depth--;
            if (depth === 0) {
              endIndex = i + 1;
              break;
            }
          }
        }

        if (endIndex > methodStartIndex) {
          return code.substring(methodStartIndex, endIndex);
        }
      }
    } catch (e) {
      console.error("Error extracting method code:", e);
    }

    return code;
  };

  // Process the component code
  const processedCode1 = extractMethodCode(component1.code || '', methodName);
  const processedCode2 = extractMethodCode(component2.code || '', methodName);

  // Calculate diff using jsdiff
  const diff = diffLines(processedCode1, processedCode2);

  // Normalize code for comparison - trim trailing whitespace on each line
  const normalizedCode1 = processedCode1.split('\n').map(line => line.trimRight());
  const normalizedCode2 = processedCode2.split('\n').map(line => line.trimRight());

  // Calculate diff for split view - more accurate line-by-line comparison
  const lines1 = normalizedCode1;
  const lines2 = normalizedCode2;

  // For the split view, we want to know which lines are different
  const normalizeForComparison = (line: string) => line.trim().replace(/\s+/g, ' ');

  const highlightedCode1 = lines1.map((line, i) => {
    // Consider a line different only if it's beyond the other file's length
    // or if the normalized content differs
    const isDifferent = i >= lines2.length ||
      normalizeForComparison(line) !== normalizeForComparison(lines2[i]);

    return {
      line: line,
      isDifferent: isDifferent
    };
  });

  const highlightedCode2 = lines2.map((line, i) => {
    // Consider a line different only if it's beyond the other file's length
    // or if the normalized content differs
    const isDifferent = i >= lines1.length ||
      normalizeForComparison(line) !== normalizeForComparison(lines1[i]);

    return {
      line: line,
      isDifferent: isDifferent
    };
  });

  // Count differences (using jsdiff results for accuracy)
  const diffCount = diff.reduce((count: number, part: Change) => {
    if (part.added || part.removed) {
      // Count lines in the changed part
      return count + (part.value.match(/\n/g) || []).length + (part.value.endsWith('\n') ? 0 : 1);
    }
    return count;
  }, 0);

  // Double-check for identical code
  React.useEffect(() => {
    // If the similarity score is already 100%, no need to check
    if (initialSimilarityScore >= 100 || initialSimilarityScore === 1) return;

    // Only override the similarity score if we can clearly detect identical code
    // This preserves the original semantic similarity calculation from the backend
    if (diffCount === 0) {
      console.log('No differences detected, setting similarity score to 100%');
      setSimilarityScore(100);
      return;
    }

    // Try a more robust comparison for truly identical code:
    // 1. Normalize whitespace (replace all whitespace with a single space)
    // 2. Remove comments
    // 3. Trim each line
    const normalize = (code: string) => {
      return code
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .split('\n')
        .map(line => line.trim()) // Trim each line
        .filter(line => line.length > 0) // Remove empty lines
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize remaining whitespace
        .trim();
    };

    const normalizedCode1 = normalize(processedCode1);
    const normalizedCode2 = normalize(processedCode2);

    // Only override if code is truly identical after normalization
    if (normalizedCode1 === normalizedCode2) {
      console.log('Components detected as identical after normalization, setting similarity score to 100%');
      setSimilarityScore(100);
    } else {
      // Preserve the original semantic similarity score from the backend
      // This represents AI-calculated functional similarity, not just text similarity
      console.log(`Preserving original semantic similarity score: ${initialSimilarityScore}%`);
      setSimilarityScore(initialSimilarityScore);
    }
  }, [processedCode1, processedCode2, initialSimilarityScore, diffCount]);

  const modalClasses = isFullScreen
    ? "max-w-[99vw] w-[99vw] h-[99vh] flex flex-col p-0 rounded-lg shadow-2xl border-2 border-slate-200 dark:border-slate-700"
    : "max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 rounded-lg shadow-2xl border-2 border-slate-200 dark:border-slate-700"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${modalClasses} !max-w-screen-2xl !w-screen`}>
        <DialogHeader className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-700 dark:from-indigo-400 dark:to-violet-500">
              {isMethodComparison ? "Method Comparison" : "Component Comparison"}
            </DialogTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <EnterFullScreenIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
              <Badge
                className={`py-1.5 px-3 text-sm font-medium ${similarityScore >= 100 || similarityScore === 1
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                  : similarityScore >= 80
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                  }`}
              >
                {similarityScore >= 100
                  ? "Identical Components"
                  : `${Math.round(similarityScore)}% Similar${
                      similarityScore === initialSimilarityScore 
                        ? " (Semantic)" 
                        : ""
                    }${diffCount > 0
                    ? ` • ${diffCount} Text Differences`
                    : similarityScore < 100 && similarityScore < 1
                      ? " • Semantic differences detected"
                      : ""}`}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-6">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className="flex-shrink-0 p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <CodeIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">
                    {component1.slug ? (
                      isMethodComparison && (method1Name || methodName) ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            href={getEntityUrl(component1)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                          >
                            {component1.name}
                            <ExternalLinkIcon className="h-3 w-3" />
                          </Link>
                          <span className="text-muted-foreground">::</span>
                          <Link 
                            href={getEntityUrl(component1, method1Name || methodName)}
                            className="font-mono text-sm bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors text-indigo-700 dark:text-indigo-300"
                          >
                            {method1Name || methodName}
                          </Link>
                        </div>
                      ) : (
                        <Link 
                          href={getEntityUrl(component1)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                        >
                          {component1.name}
                          <ExternalLinkIcon className="h-3 w-3" />
                        </Link>
                      )
                    ) : (
                      <span>
                        {isMethodComparison && methodName
                          ? `${component1.name}.${methodName}`
                          : component1.name}
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{component1.filePath}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className="flex-shrink-0 p-2 rounded-full bg-violet-100 dark:bg-violet-900/30">
                <CodeIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">
                    {component2.slug ? (
                      isMethodComparison && (method2Name || methodName) ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            href={getEntityUrl(component2)}
                            className="text-violet-600 dark:text-violet-400 hover:underline hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center gap-1"
                          >
                            {component2.name}
                            <ExternalLinkIcon className="h-3 w-3" />
                          </Link>
                          <span className="text-muted-foreground">::</span>
                          <Link 
                            href={getEntityUrl(component2, method2Name || methodName)}
                            className="font-mono text-sm bg-violet-100 dark:bg-violet-900/30 px-2 py-1 rounded hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors text-violet-700 dark:text-violet-300"
                          >
                            {method2Name || methodName}
                          </Link>
                        </div>
                      ) : (
                        <Link 
                          href={getEntityUrl(component2)}
                          className="text-violet-600 dark:text-violet-400 hover:underline hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center gap-1"
                        >
                          {component2.name}
                          <ExternalLinkIcon className="h-3 w-3" />
                        </Link>
                      )
                    ) : (
                      <span>
                        {isMethodComparison && methodName
                          ? `${component2.name}.${methodName}`
                          : component2.name}
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{component2.filePath}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end mt-4 gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="highlights-mode"
                checked={showHighlights}
                onCheckedChange={setShowHighlights}
              />
              <Label htmlFor="highlights-mode" className="cursor-pointer">Show Differences</Label>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as "split" | "unified")} className="w-auto">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <TabsTrigger value="split" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                  Split View
                </TabsTrigger>
                <TabsTrigger value="unified" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                  Unified View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0 bg-white dark:bg-slate-900 rounded-b-lg">
          {view === "split" ? (
            <div className="flex h-full w-full">
              <ScrollArea className="w-[50%] border-r border-slate-200 dark:border-slate-700">
                <div className="py-4 px-2 font-mono text-xs">
                  {highlightedCode1.map((line, i) => (
                    <div
                      key={i}
                      className={`py-0.5 px-6 flex leading-relaxed ${line.isDifferent && showHighlights
                        ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600"
                        : ""
                        }`}
                    >
                      <span className={`select-none text-slate-400 w-16 mr-4 text-right text-xs`}>{i + 1}</span>
                      <span className="whitespace-pre overflow-x-auto flex-1 text-xs">{line.line}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <ScrollArea className="w-[50%]">
                <div className="py-4 px-2 font-mono text-xs">
                  {highlightedCode2.map((line, i) => (
                    <div
                      key={i}
                      className={`py-0.5 px-6 flex leading-relaxed ${line.isDifferent && showHighlights
                        ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-600"
                        : ""
                        }`}
                    >
                      <span className={`select-none text-slate-400 w-16 mr-4 text-right text-xs`}>{i + 1}</span>
                      <span className="whitespace-pre overflow-x-auto flex-1 text-xs">{line.line}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="py-4 px-2 font-mono text-xs">
                {diff.map((part: Change, partIndex: number) => {
                  // Ensure part.value is treated as a string
                  const value = part.value || '';
                  // Split lines, handling potential trailing newline correctly
                  const lines = value.split('\n').filter((l: string, i: number, arr: string[]) => i < arr.length - 1 || l !== '');
                  const prefix = part.added ? '+' : part.removed ? '-' : ' ';
                  const bgColor = part.added ? 'bg-green-50 dark:bg-green-900/20' : part.removed ? 'bg-red-50 dark:bg-red-900/20' : '';
                  const textColor = part.added ? 'text-green-700 dark:text-green-400' : part.removed ? 'text-red-700 dark:text-red-400' : 'text-slate-400';
                  const borderColor = part.added ? 'border-l-4 border-green-400 dark:border-green-600' : part.removed ? 'border-l-4 border-red-400 dark:border-red-600' : '';

                  return lines.map((line: string, lineIndex: number) => (
                    <div
                      key={`${partIndex}-${lineIndex}`}
                      className={`py-0.5 px-6 flex leading-relaxed ${showHighlights ? bgColor : ''} ${showHighlights ? borderColor : ''}`}
                    >
                      <span className={`select-none ${textColor} w-6 mr-2 text-center font-bold ${!showHighlights && (part.added || part.removed) ? 'opacity-0' : ''}`}>{prefix}</span>
                      {/* No original line numbers in this basic view */}
                      <span className="whitespace-pre overflow-x-auto flex-1">{line}</span>
                    </div>
                  ));
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
