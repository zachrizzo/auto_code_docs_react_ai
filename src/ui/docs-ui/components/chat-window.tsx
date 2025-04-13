"use client"

import * as React from "react"

import { useState, useEffect, useRef } from "react"
import { X, Send, Maximize2, Minimize2, MessageSquare } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { CodeBlock } from "./code-block"

type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. How can I help you with your code documentation today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const toggleChat = () => setIsOpen(!isOpen)
  const toggleExpand = () => setIsExpanded(!isExpanded)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I found some information about your query "${input}". This would be where the AI response with vector search results would appear.`,
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g)
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3)
        const language = code.split("\n")[0].trim()
        const codeContent = language ? code.substring(language.length + 1) : code

        return (
          <div key={index} className="my-2">
            <CodeBlock code={codeContent} language={language || "tsx"} />
          </div>
        )
      }
      return (
        <p key={index} className="whitespace-pre-wrap">
          {part}
        </p>
      )
    })
  }

  return (
    <>
      {/* Chat toggle button */}
      <Button onClick={toggleChat} className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-40" size="icon">
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chat window */}
      <div
        className={`fixed bottom-20 right-4 z-50 transition-all duration-200 ease-in-out ${
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        } ${isExpanded ? "h-[80vh] w-[80vw] max-w-4xl" : "h-[400px] w-[350px]"}`}
      >
        <Card className="flex h-full flex-col shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 border-b">
            <div className="font-medium">AI Code Assistant</div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleExpand} className="h-8 w-8">
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleChat} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0" ref={scrollAreaRef}>
            <ScrollArea className="h-full px-3">
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`flex max-w-[80%] rounded-lg px-3 py-2 ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-sm">{renderMessageContent(message.content)}</div>
                        <p className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex max-w-[80%] rounded-lg bg-muted px-3 py-2">
                      <div className="flex space-x-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-current"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex w-full items-center space-x-2"
            >
              <Input
                placeholder="Ask about your code..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
