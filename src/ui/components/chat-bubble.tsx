"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MessageSquare, Maximize2, Minimize2, Trash2, Settings, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Cross2Icon, PaperPlaneIcon } from "@radix-ui/react-icons"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeHighlight from "rehype-highlight"
import 'highlight.js/styles/github-dark.css'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Interface for chat messages
interface ChatMessage {
  text: string
  isUser: boolean
  role?: "system" | "user" | "assistant"
  thinking?: {
    title: string
    details: any 
  } | null
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
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [currentModel, setCurrentModel] = useState<string>("")
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({})
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    // Fetch available models when the component mounts
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/ai-models")
        if (!response.ok) {
          throw new Error("Failed to fetch models")
        }
        const data = await response.json()
        setAvailableModels(data.availableModels || [])
        setCurrentModel(data.currentModel || "")
      } catch (error) {
        console.error("Error fetching AI models:", error)
      }
    }
    if (isOpen) {
        fetchModels()
    }
  }, [isOpen])

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
    const newMessages: ChatMessage[] = [...messages, { text: input, isUser: true, role: "user" as const }]
    setMessages(newMessages)
    const userQuery = input
    setInput("")
    setIsLoading(true)
    setIsStreaming(true)

    // Add placeholder message for streaming response
    const placeholderMessage: ChatMessage = { 
      text: "", 
      isUser: false, 
      role: "assistant",
      thinking: null,
    }
    setMessages(prev => [...prev, placeholderMessage])
    const responseIndex = newMessages.length // Index of the streaming response message

    try {
      // Make streaming API request
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: getApiMessages(),
          query: userQuery,
          sessionId: sessionId,
          model: currentModel,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body reader available")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let fullResponse = ""

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('Received streaming data:', data) // Debug log
              
              if (data.content) {
                fullResponse += data.content
                console.log('Updated fullResponse:', fullResponse) // Debug log
                
                // Update the streaming message in real-time
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[responseIndex]) {
                    updated[responseIndex] = {
                      ...updated[responseIndex],
                      text: fullResponse
                    }
                  }
                  return updated
                })
              } else if (data.error) {
                console.error('Streaming error received:', data.error) // Debug log
                throw new Error(data.error)
              } else if (data.done) {
                console.log('Streaming completed, final response:', fullResponse) // Debug log
                // Process thinking data from complete response if available
                let responseText = fullResponse
                let thinkingData = null

                const thinkingMatch = responseText.match(/<thinking>([\s\S]*?)<\/thinking>/)
                
                if (thinkingMatch && thinkingMatch[1]) {
                  try {
                    const thinkingDetails = JSON.parse(thinkingMatch[1])
                    thinkingData = {
                      title: "Thinking Process",
                      details: thinkingDetails,
                    }
                  } catch (e) {
                    thinkingData = {
                      title: "Thinking Process",
                      details: thinkingMatch[1],
                    }
                  }
                  responseText = responseText.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim()
                } else {
                  // Fallback heuristic for models that prepend thinking without tags
                  const parts = responseText.split(/\n\n+/)
                  if (parts.length > 1) {
                    const firstPart = parts[0].trim()
                    // Consider it "thinking" if it's a substantial block of text
                    // and doesn't start with common markdown elements.
                    const seemsLikeThinking =
                      firstPart.length > 80 &&
                      !firstPart.startsWith("#") &&
                      !firstPart.startsWith("*") &&
                      !firstPart.startsWith("-") &&
                      !firstPart.startsWith("```")

                    if (seemsLikeThinking) {
                      thinkingData = {
                        title: "Thinking Process",
                        details: firstPart,
                      }
                      responseText = parts.slice(1).join("\n\n").trim()
                    }
                  }
                }

                // Final update with thinking data
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[responseIndex]) {
                    updated[responseIndex] = {
                      ...updated[responseIndex],
                      text: responseText,
                      thinking: thinkingData
                    }
                  }
                  return updated
                })
                setIsStreaming(false)
                return
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)

      // Update the placeholder message with error
      setMessages(prev => {
        const updated = [...prev]
        if (updated[responseIndex]) {
          updated[responseIndex] = {
            ...updated[responseIndex],
            text: "Sorry, I encountered an error. Please try again or check if the AI server is running properly."
          }
        }
        return updated
      })
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const toggleThinking = (index: number) => {
    setExpandedThinking(prev => ({...prev, [index]: !prev[index]}))
  }

  const clearMessages = () => {
    setMessages([
      { text: "Hi there! I can help you understand your code. What would you like to know?", isUser: false, role: "assistant" },
    ])
  }

  // Custom renderer for code blocks with syntax highlighting
  const MarkdownMessage = ({ content, isUser }: { content: string, isUser?: boolean }) => (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, rehypeHighlight]}
      components={{
        p({ children }) {
          return <div className={`my-3 text-sm md:text-base leading-relaxed ${isUser ? '' : 'text-slate-700 dark:text-slate-300'}`}>{children}</div>
        },
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
            <code className={`px-2 py-1 mx-0.5 rounded-md text-sm font-mono ${isUser ? 'bg-white/20' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'}`} {...props}>
              {children}
            </code>
          )
        },
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
        ul({ children }) {
          return <ul className="list-disc pl-6 my-3 space-y-2 marker:text-violet-500">{children}</ul>
        },
        ol({ children }) {
          return <ol className="list-decimal pl-6 my-3 space-y-2 marker:text-violet-500">{children}</ol>
        },
        li({ children }) {
          return <li className={`text-sm md:text-base leading-relaxed ${isUser ? '' : 'text-slate-700 dark:text-slate-300'}`}>{children}</li>
        },
        h1({ children }) {
          return <h1 className={`text-2xl font-bold my-4 pb-2 border-b-2 ${isUser ? 'border-white/30 text-white' : 'border-violet-200 dark:border-violet-800 text-slate-900 dark:text-white'}`}>{children}</h1>
        },
        h2({ children }) {
          return <h2 className={`text-xl font-bold my-3 ${isUser ? 'text-white' : 'text-violet-700 dark:text-violet-400'}`}>{children}</h2>
        },
        h3({ children }) {
          return <h3 className={`text-lg font-semibold my-2 ${isUser ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{children}</h3>
        },
        blockquote({ children }) {
          return <blockquote className={`border-l-4 pl-4 py-2 my-3 rounded-r-lg italic ${isUser ? 'border-white/40 bg-white/10' : 'border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/10 text-slate-700 dark:text-slate-300'}`}>{children}</blockquote>
        },
        hr() {
          return <hr className={`my-4 ${isUser ? 'border-white/20' : 'border-slate-200 dark:border-slate-700'}`} />
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className={`min-w-full divide-y rounded-md ${isUser ? 'divide-white/20 border border-white/20' : 'divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700'}`}>
                {children}
              </table>
            </div>
          )
        },
        thead({ children }) {
          return <thead className={`${isUser ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800'}`}>{children}</thead>
        },
        tbody({ children }) {
          return <tbody className={`${isUser ? 'divide-white/20' : 'divide-slate-200 dark:divide-slate-700'}`}>{children}</tbody>
        },
        tr({ children }) {
          return <tr>{children}</tr>
        },
        th({ children }) {
          return <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${isUser ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{children}</th>
        },
        td({ children }) {
          return <td className={`px-4 py-3 text-sm ${isUser ? '' : 'text-slate-600 dark:text-slate-300'}`}>{children}</td>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )

  const ThinkingBlock = ({ title, details, isExpanded, onToggle }: { title: string, details: any, isExpanded: boolean, onToggle: () => void }) => {
    let formattedDetails
    if (typeof details === 'string') {
        formattedDetails = "```\n" + details + "\n```"
    } else {
        formattedDetails = "```json\n" + JSON.stringify(details, null, 2) + "\n```"
    }

    return (
        <div className="my-2 p-2 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
            <button onClick={onToggle} className="flex items-center w-full text-left text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                {isExpanded ? <ChevronDown className="w-4 h-4 mr-2 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 mr-2 flex-shrink-0" />}
                <span className="truncate">{title}</span>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: '8px' }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-2 bg-slate-100 dark:bg-slate-900/50 rounded">
                           <MarkdownMessage content={formattedDetails} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`
              ${isExpanded ? 'w-[80vw] max-w-[800px] h-[80vh]' : 'w-96 h-[60vh]'}
              bg-white dark:bg-slate-900 shadow-2xl rounded-2xl flex flex-col transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-800
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-lg">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">AI Assistant</h3>
              </div>
              <div className="flex items-center space-x-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>Chat Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <label className="text-xs font-medium px-2 text-slate-600 dark:text-slate-400">AI Model</label>
                      {availableModels.length > 0 ? (
                        <Select value={currentModel} onValueChange={setCurrentModel}>
                          <SelectTrigger className="w-full text-xs h-9 mt-1">
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model} value={model} className="text-xs">
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 px-2">Models loading...</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={clearMessages}
                      className="text-red-500 focus:bg-red-50 focus:text-red-500 dark:focus:bg-red-900/50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" onClick={toggleExpand} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                  {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                  <Cross2Icon className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-4">
                {messages.map((message, i) => (
                  <div key={i} className={`flex items-start gap-3 ${message.isUser ? "justify-end" : "justify-start"}`}>
                    {!message.isUser && (
                      <Avatar className="w-8 h-8 border-2 border-violet-200 dark:border-violet-700">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`p-3 rounded-2xl max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl ${
                        message.isUser
                          ? "bg-violet-500 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {message.thinking && (
                        <ThinkingBlock 
                          title={message.thinking.title}
                          details={message.thinking.details}
                          isExpanded={!!expandedThinking[i]}
                          onToggle={() => toggleThinking(i)}
                        />
                      )}
                      <div className="relative">
                        <MarkdownMessage content={message.text} isUser={message.isUser} />
                        {isStreaming && i === messages.length - 1 && (
                          <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-1 align-middle"></span>
                        )}
                      </div>
                    </div>
                    {message.isUser && (
                      <Avatar className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 border-2 border-violet-200 dark:border-violet-700">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse delay-150"></div>
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse delay-300"></div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">Streaming response...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-b-2xl border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask about components, methods, or anything else..."
                  className="w-full pr-12 resize-none bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500"
                  rows={2}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute bottom-2 right-2 w-9 h-9 bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                >
                  <PaperPlaneIcon className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-center text-slate-400 dark:text-slate-600 mt-2">
                Shift+Enter for new line. Powered by LangFlow.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isOpen && (
        <Button
          className="h-16 w-16 rounded-full shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 flex items-center justify-center text-white"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          <MessageSquare className="h-7 w-7" />
        </Button>
      )}
    </div>
  )
}
