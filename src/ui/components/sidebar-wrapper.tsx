"use client";
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { LayoutDashboard, GitCompare, Component, Code, FileCode, Layers, Network, BookOpen } from "lucide-react"

export function SidebarWrapper() {
    const pathname = usePathname() || ""

    const isComponentsActive = pathname ? pathname.startsWith("/components") || pathname.includes("?tab=components") : false
    const isClassesActive = pathname ? pathname.startsWith("/classes") || pathname.includes("?tab=classes") : false
    const isMethodsActive = pathname ? pathname.startsWith("/methods") || pathname.includes("?tab=methods") : false
    const isStructureActive = pathname ? pathname.startsWith("/structure") || pathname.includes("#structure") : false

    return (
        <div className="w-64 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <Link href="/" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                        <Component className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="font-bold text-xl">Code Docs</h2>
                </Link>
            </div>
            <ScrollArea className="flex-1">
                <div className="px-3 py-4">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                pathname === "/" && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/">
                                <LayoutDashboard className="h-4 w-4" />
                                Dashboard
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                pathname === "/similarity" && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/similarity">
                                <GitCompare className="h-4 w-4" />
                                Similarity Analysis
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                pathname === "/relationships" && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/relationships">
                                <Network className="h-4 w-4" />
                                Code Relationships
                            </Link>
                        </Button>

                    </div>

                    <div className="mt-6 space-y-1">
                        <h4 className="px-4 text-sm font-semibold text-muted-foreground mb-2">Code Documentation</h4>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                isComponentsActive && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/?tab=components" prefetch={false}>
                                <Component className="h-4 w-4" />
                                Components
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                isClassesActive && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/?tab=classes" prefetch={false}>
                                <Code className="h-4 w-4" />
                                Classes
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                isMethodsActive && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/?tab=methods" prefetch={false}>
                                <FileCode className="h-4 w-4" />
                                Methods
                            </Link>
                        </Button>
                    </div>

                    <div className="mt-6 space-y-1">
                        <h4 className="px-4 text-sm font-semibold text-muted-foreground mb-2">Structure</h4>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                isStructureActive && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/#structure">
                                <Layers className="h-4 w-4" />
                                Code Structure
                            </Link>
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
