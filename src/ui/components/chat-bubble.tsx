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
          return <div className="my-3 text-slate-700 dark:text-slate-300 leading-relaxed">{children}</div>
        },
        // Style for code blocks
        code({ className, children, ...props }: React.HTMLProps<HTMLElement> & { inline?: boolean }) {
          const match = /language-(\w+)/.exec(className || '')
          const inline = props.inline
          return !inline ? (
            <div className="relative rounded-md overflow-hidden my-3 shadow-md">
              <div className="px-4 py-1.5 bg-slate-700 text-xs font-mono text-slate-200 rounded-t-md border-b border-slate-600 flex items-center justify-between">
                <span>{match?.[1] || 'code'}</span>
              </div>
              <pre className="p-4 overflow-x-auto bg-[#161b22] text-white">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          ) : (
            <code className="px-1.5 py-0.5 mx-0.5 bg-gray-200 dark:bg-slate-700 dark:text-gray-200 text-gray-800 rounded text-sm font-mono" {...props}>
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
          return <ul className="list-disc pl-6 my-3 space-y-2">{children}</ul>
        },
        ol({ children }) {
          return <ol className="list-decimal pl-6 my-3 space-y-2">{children}</ol>
        },
        // Style for list items
        li({ children }) {
          return <li className="text-slate-700 dark:text-slate-300">{children}</li>
        },
        // Style for headings
        h1({ children }) {
          return <h1 className="text-xl font-bold my-4 pb-1 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">{children}</h1>
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold my-3 text-slate-800 dark:text-slate-200">{children}</h2>
        },
        h3({ children }) {
          return <h3 className="text-md font-semibold my-2 text-slate-700 dark:text-slate-300">{children}</h3>
        },
        // Style for blockquotes
        blockquote({ children }) {
          return <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-1 my-3 text-slate-600 dark:text-slate-400 italic">{children}</blockquote>
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
            className={`fixed ${isExpanded ? "inset-4 md:inset-10" : "bottom-6 right-6 w-96 sm:w-[460px] h-[600px]"
              } bg-white dark:bg-slate-900 rounded-xl shadow-xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 z-50`}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <h3 className="font-medium">Code Assistant hh</h3>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, i) => (
                <div key={i} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                  {!message.isUser && (
                    <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[87%] rounded-xl ${message.isUser
                      ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white p-3"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-4"
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
                  <div className="max-w-[87%] rounded-xl p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder="Ask about your code..."
                  className="min-h-10 resize-none rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-violet-500"
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
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
                  disabled={isLoading}
                >
                  <PaperPlaneIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
