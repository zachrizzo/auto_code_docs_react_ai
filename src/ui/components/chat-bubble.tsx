"use client"
import * as React from "react"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MessageSquare, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Cross2Icon, PaperPlaneIcon } from "@radix-ui/react-icons"

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([
    { text: "Hi there! I can help you understand your code. What would you like to know?", isUser: false },
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return

    setMessages([...messages, { text: input, isUser: true }])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          text: "I've analyzed this component. It appears to be a UI element that handles user interaction and displays dynamic content based on props.",
          isUser: false,
        },
      ])
    }, 1000)
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

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
            className={`fixed ${isExpanded ? "inset-4 md:inset-10" : "bottom-6 right-6 w-80 sm:w-96 h-[500px]"
              } bg-white dark:bg-slate-900 rounded-xl shadow-xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 z-50`}
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
                    className={`max-w-[80%] rounded-xl p-4 ${message.isUser
                        ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800"
                      }`}
                  >
                    {message.text}
                  </div>
                  {message.isUser && (
                    <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
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
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
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
