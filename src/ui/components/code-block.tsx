"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "next-themes";

interface CodeBlockProps {
  code: string
  language: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure theme is only accessed after mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine which syntax highlighting theme to use based on the current theme
  const syntaxTheme = mounted && (theme === 'dark' || theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) 
    ? atomDark 
    : vs;

  // Custom modifications to the chosen theme
  const customizedTheme = {
    ...syntaxTheme,
    'pre[class*="language-"]': {
      ...syntaxTheme['pre[class*="language-"]'],
      margin: '0',
      borderRadius: '0.5rem',
      padding: '1.5rem',
    },
    'code[class*="language-"]': {
      ...syntaxTheme['code[class*="language-"]'],
      fontFamily: 'var(--font-mono), monospace',
    }
  };

  return (
    <div className="relative group my-4">
      <div className={cn(
        "rounded-lg overflow-hidden border",
        "shadow-sm transition-all duration-200",
        "group-hover:shadow-md",
        theme === 'dark' ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-slate-50"
      )}>
        <div className={cn(
          "flex items-center justify-between px-4 py-2",
          theme === 'dark' ? "bg-slate-900" : "bg-slate-100"
        )}>
          <span className={cn(
            "text-xs font-medium",
            theme === 'dark' ? "text-slate-400" : "text-slate-500"
          )}>
            {language.toUpperCase()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5 mr-1" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5 mr-1" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <SyntaxHighlighter
            language={language}
            style={customizedTheme}
            showLineNumbers={true}
            wrapLines={false}
            lineNumberStyle={{
              minWidth: '2.5em',
              paddingRight: '1em',
              textAlign: 'right',
              userSelect: 'none',
              opacity: 0.5,
              borderRight: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
              marginRight: '1em',
            }}
            customStyle={{
              fontSize: '0.8rem',
              lineHeight: '1.5',
              margin: 0,
              padding: '1rem',
              minWidth: 'max-content'
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
}
