"use client"
import * as React from "react"
import { useState } from "react"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons"

interface CodeBlockProps {
  code: string
  language: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre
        className={cn(
          "rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-x-auto shadow-sm",
          language === "tsx" && "language-tsx",
          language === "jsx" && "language-jsx",
          language === "css" && "language-css",
        )}
      >
        <code className="text-sm font-mono">{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={copyToClipboard}
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      </Button>
    </div>
  )
}
