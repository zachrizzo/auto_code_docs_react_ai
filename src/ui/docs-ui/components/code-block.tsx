"use client"

import * as React from "react"
import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "./ui/button"

type CodeBlockProps = {
  code: string
  language?: string
}

export function CodeBlock({ code, language = "tsx" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="relative">
      <pre className="rounded-lg bg-muted p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8" onClick={copyToClipboard}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="sr-only">Copy code</span>
      </Button>
    </div>
  )
}
