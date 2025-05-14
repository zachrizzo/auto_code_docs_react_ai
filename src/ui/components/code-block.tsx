"use client"
import * as React from "react"
import { useState } from "react"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
      <SyntaxHighlighter
        language={language}
        style={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? oneDark : oneLight}
        customStyle={{
          borderRadius: '0.75rem',
          border: '1px solid',
          borderColor: 'var(--border-color, #e5e7eb)',
          background: 'var(--background, #fff)',
          padding: '1.5rem',
          fontSize: '0.875rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          overflowX: 'auto',
        }}
        codeTagProps={{ style: { fontFamily: 'monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
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
