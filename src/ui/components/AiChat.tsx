import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AiChatProps {
    initialContext?: string;
    placeholder?: string;
    title?: string;
    onClose?: () => void;
}

export const AiChat: React.FC<AiChatProps> = ({
    initialContext = 'Ask me anything about the components in this documentation.',
    placeholder = 'Ask a question about the components...',
    title = 'AI Assistant',
    onClose
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: initialContext,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (endOfMessagesRef.current) {
            endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim()) return;

        // Add user message
        const userMessage: ChatMessage = {
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // This would normally connect to an actual AI backend
            // For now, we'll simulate a response with a timeout
            setTimeout(() => {
                // Get component data from window if available
                const componentData = window.COMPONENT_DATA || [];
                let response = "I'm sorry, I don't have enough information to answer that question.";

                // Simple keyword matching for demonstration
                const query = input.toLowerCase();
                if (query.includes('how many components')) {
                    response = `There are ${componentData.length} components in the documentation.`;
                } else if (query.includes('similar') || query.includes('duplicate')) {
                    const similarComponents = componentData.filter(c => c.similarityWarnings && c.similarityWarnings.length > 0);
                    response = `I found ${similarComponents.length} components with similarity warnings.`;
                } else if (query.includes('help') || query.includes('what can you do')) {
                    response = `I can help you explore the component documentation. You can ask me about:
- Components in the codebase
- Similar or duplicate components
- Component methods and properties
- Best practices for using components`;
                }

                const aiMessage: ChatMessage = {
                    role: 'assistant',
                    content: response,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, aiMessage]);
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Error getting AI response:', error);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                    timestamp: new Date()
                }
            ]);
            setIsLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Card className="w-full max-w-md h-[500px] flex flex-col shadow-lg">
            <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">{title}</CardTitle>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={onClose}
                        aria-label="Close chat"
                    >
                        <span className="sr-only">Close</span>
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 15 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                        >
                            <path
                                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                            ></path>
                        </svg>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] px-4 py-2 rounded-lg ${message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            <div className="text-sm">{message.content}</div>
                            <div className="text-xs opacity-70 mt-1 text-right">
                                {formatTime(message.timestamp)}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] px-4 py-2 rounded-lg bg-muted">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </CardContent>
            <CardFooter className="p-4 pt-2 border-t">
                <form onSubmit={handleSubmit} className="flex w-full gap-2">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholder}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4"
                        >
                            <path d="M22 2L11 13"></path>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                        </svg>
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
};
