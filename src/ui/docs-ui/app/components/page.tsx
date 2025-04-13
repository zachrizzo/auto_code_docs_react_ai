import * as React from "react"

import { ComponentList } from "../../components/component-list"
import { Button } from "../../components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ComponentsPage() {
    return (
        <div className="container mx-auto py-10 px-4 md:px-6">
            <div className="flex flex-col space-y-8">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back to home</span>
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">All Components</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                        Browse all components in the codebase
                    </p>
                </div>

                <ComponentList />
            </div>
        </div>
    )
}
