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
    const searchParams = usePathname()

    const isDocsActive = pathname.startsWith('/docs');

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
                                <Network className="h-4 w-4" />
                                Relationships
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
                                Similarity
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                pathname === "/structure" && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/structure">
                                <Layers className="h-4 w-4" />
                                Code Structure
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            asChild
                            className={cn(
                                "w-full justify-start gap-2",
                                isDocsActive && "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400",
                            )}
                        >
                            <Link href="/docs">
                                <BookOpen className="h-4 w-4" />
                                Documentation
                            </Link>
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
