"use client"
import * as React from "react"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MessageSquare, Maximize2, Minimize2, Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Cross2Icon, PaperPlaneIcon } from "@radix-ui/react-icons"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeHighlight from "rehype-highlight"
import 'highlight.js/styles/github-dark.css'

// Interface for chat messages
interface ChatMessage {
  text: string
  isUser: boolean
  role?: "system" | "user" | "assistant"
}

// Interface for API chat message format
interface ApiChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: "Hi there! I can help you understand your code. What would you like to know?", isUser: false, role: "assistant" },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  // Convert UI chat messages to API format
  const getApiMessages = (): ApiChatMessage[] => {
    return messages
      .filter(msg => msg.role !== "system") // Filter out system messages if any
      .map(msg => ({
        role: msg.role || (msg.isUser ? "user" : "assistant"),
        content: msg.text
      }))
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Add user message to chat
    setMessages([...messages, { text: input, isUser: true, role: "user" }])
    const userQuery = input
    setInput("")
    setIsLoading(true)

    try {
      // Make API request to chat endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: getApiMessages(),
          query: userQuery,
          sessionId: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        { text: data.response, isUser: false, role: "assistant" },
      ])
    } catch (error) {
      console.error("Error sending message:", error)

      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          text: "Sorry, I encountered an error. Please try again or check if Ollama is running properly.",
          isUser: false,
          role: "assistant"
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const clearMessages = () => {
    setMessages([
      { text: "Hi there! I can help you understand your code. What would you like to know?", isUser: false, role: "assistant" },
    ])
  }

  // Custom renderer for code blocks with syntax highlighting
  const MarkdownMessage = ({ content }: { content: string }) => (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, rehypeHighlight]}
      components={{
        // Override paragraph to avoid nesting issues
        p({ children }) {
          return <div className="my-3 text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed">{children}</div>
        },
        // Style for code blocks
        code({ className, children, ...props }: React.HTMLProps<HTMLElement> & { inline?: boolean }) {
          const match = /language-(\w+)/.exec(className || '')
          const inline = props.inline
          return !inline ? (
            <div className="relative rounded-lg overflow-hidden my-4 shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-800 text-xs font-mono text-slate-200 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider">{match?.[1] || 'code'}</span>
              </div>
              <pre className="p-4 overflow-x-auto bg-[#1a1b26] text-[#c9d1d9] text-sm">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          ) : (
            <code className="px-2 py-1 mx-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-md text-sm font-mono" {...props}>
              {children}
            </code>
          )
        },
        // Style for links
        a(props) {
          return (
            <a
              {...props}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            />
          )
        },
        // Style for lists
        ul({ children }) {
          return <ul className="list-disc pl-6 my-3 space-y-2 marker:text-violet-500">{children}</ul>
        },
        ol({ children }) {
          return <ol className="list-decimal pl-6 my-3 space-y-2 marker:text-violet-500">{children}</ol>
        },
        // Style for list items
        li({ children }) {
          return <li className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed">{children}</li>
        },
        // Style for headings
        h1({ children }) {
          return <h1 className="text-2xl font-bold my-4 pb-2 border-b-2 border-violet-200 dark:border-violet-800 text-slate-900 dark:text-white">{children}</h1>
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold my-3 text-violet-700 dark:text-violet-400">{children}</h2>
        },
        h3({ children }) {
          return <h3 className="text-lg font-semibold my-2 text-slate-800 dark:text-slate-200">{children}</h3>
        },
        // Style for blockquotes
        blockquote({ children }) {
          return <blockquote className="border-l-4 border-violet-400 dark:border-violet-600 pl-4 py-2 my-3 bg-violet-50 dark:bg-violet-900/10 rounded-r-lg text-slate-700 dark:text-slate-300 italic">{children}</blockquote>
        },
        // Style for horizontal rules
        hr() {
          return <hr className="my-4 border-slate-200 dark:border-slate-700" />
        },
        // Style for tables
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-md">
                {children}
              </table>
            </div>
          )
        },
        thead({ children }) {
          return <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>
        },
        tr({ children }) {
          return <tr>{children}</tr>
        },
        th({ children }) {
          return <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{children}</th>
        },
        td({ children }) {
          return <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{children}</td>
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${isExpanded ? "inset-4 md:inset-8" : "bottom-6 right-6 w-[90vw] max-w-[600px] h-[80vh] max-h-[700px]"
              } bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 z-50`}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <h3 className="font-medium">Code Assistant</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  onClick={clearMessages}
                  className="text-white hover:bg-white/20 flex items-center gap-1"
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleExpand} className="text-white hover:bg-white/20">
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <Cross2Icon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message, i) => (
                <div key={i} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                  {!message.isUser && (
                    <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl ${message.isUser
                      ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-4 py-3 shadow-md"
                      : "bg-gray-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4"
                      }`}
                  >
                    {message.isUser ? (
                      message.text
                    ) : (
                      <MarkdownMessage content={message.text} />
                    )}
                  </div>
                  {message.isUser && (
                    <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="h-3 w-3 bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="h-3 w-3 bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="h-3 w-3 bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="flex gap-3 items-end">
                <Textarea
                  placeholder="Ask me anything about your code..."
                  className="min-h-12 max-h-32 resize-none rounded-2xl border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-violet-500 bg-white dark:bg-slate-800 text-sm md:text-base"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  className="h-12 w-12 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-lg transition-all hover:shadow-xl"
                  disabled={isLoading}
                >
                  <PaperPlaneIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
