import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Sheet, SheetContent } from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Separator } from './ui/separator';
import { Command, CommandInput, CommandList, CommandItem } from './ui/command';
import { Loader2 } from 'lucide-react';
import { codeSearchService, CodeReference } from '../services/codeSearchService';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    codeReferences?: CodeReference[];
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
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('chat');
    const [searchResults, setSearchResults] = useState<CodeReference[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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

    const searchCodebase = useCallback(async (query: string): Promise<CodeReference[]> => {
        setIsSearching(true);
        try {
            // Use the code search service instead of the mock implementation
            return await codeSearchService.searchCode(query);
        } catch (error) {
            console.error('Error searching codebase:', error);
            return [];
        } finally {
            setIsSearching(false);
        }
    }, []);

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
            // Search the codebase for relevant code
            const codeReferences = await searchCodebase(input);
            setSearchResults(codeReferences);

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
                    timestamp: new Date(),
                    codeReferences: codeReferences.length > 0 ? codeReferences : undefined
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

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // When in expanded mode, render the chat in a Sheet
    if (isExpanded) {
        return (
            <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
                <SheetContent side="right" className="w-full md:w-[600px] overflow-hidden p-0 flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-medium">{title}</h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleExpand}
                                className="h-8 w-8 p-0"
                            >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.5 2C5.22386 2 5 2.22386 5 2.5C5 2.77614 5.22386 3 5.5 3H9.29289L3.14645 9.14645C2.95118 9.34171 2.95118 9.65829 3.14645 9.85355C3.34171 10.0488 3.65829 10.0488 3.85355 9.85355L10 3.70711V7.5C10 7.77614 10.2239 8 10.5 8C10.7761 8 11 7.77614 11 7.5V2.5C11 2.22386 10.7761 2 10.5 2H5.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                </svg>
                            </Button>
                            {onClose && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={onClose}
                                >
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                    </svg>
                                </Button>
                            )}
                        </div>
                    </div>

                    <Tabs defaultValue="chat" className="flex flex-col h-full">
                        <TabsList className="px-4 pt-2 justify-start">
                            <TabsTrigger value="chat" onClick={() => setActiveTab("chat")}>Chat</TabsTrigger>
                            <TabsTrigger value="code" onClick={() => setActiveTab("code")}>
                                Code Search
                                {searchResults.length > 0 && (
                                    <Badge className="ml-2" variant="secondary">{searchResults.length}</Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="chat" className="flex-1 flex flex-col data-[state=active]:flex-1 mt-0 border-0 p-0">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-4 py-2 rounded-lg ${message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                                }`}
                                        >
                                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                                            {message.codeReferences && message.codeReferences.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-t-muted-foreground/20">
                                                    <p className="text-xs text-muted-foreground mb-1">Found {message.codeReferences.length} related code references:</p>
                                                    {message.codeReferences.slice(0, 2).map((ref, i) => (
                                                        <div key={i} className="text-xs mt-1 p-1 bg-background/50 rounded">
                                                            <div className="font-medium">{ref.componentName}{ref.methodName ? `.${ref.methodName}` : ''}</div>
                                                            <div className="opacity-80 text-[10px]">{ref.filePath}</div>
                                                        </div>
                                                    ))}
                                                    {message.codeReferences.length > 2 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs mt-1 h-auto py-1"
                                                            onClick={() => setActiveTab("code")}
                                                        >
                                                            See all {message.codeReferences.length} results
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            <div className="text-xs opacity-70 mt-1 text-right">
                                                {formatTime(message.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] px-4 py-2 rounded-lg bg-muted">
                                            <div className="flex space-x-2">
                                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"></div>
                                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={endOfMessagesRef} />
                            </div>

                            <div className="p-4 border-t">
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
                            </div>
                        </TabsContent>

                        <TabsContent value="code" className="flex-1 flex flex-col data-[state=active]:flex-1 mt-0 border-0 p-0">
                            <div className="p-4 flex-1 overflow-y-auto">
                                <div className="mb-4">
                                    <h3 className="text-sm font-medium mb-2">Code Search Results</h3>
                                    {isSearching ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="space-y-3">
                                            {searchResults.map((result, index) => (
                                                <div key={index} className="border rounded-md p-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-medium">{result.componentName}{result.methodName ? `.${result.methodName}` : ''}</div>
                                                        <Badge variant="outline">{Math.round(result.similarity * 100)}%</Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mb-2">{result.filePath}</div>
                                                    <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                                                        {result.code}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No code references found. Try asking a question about specific components.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Card className="w-full max-w-[450px] h-[600px] flex flex-col shadow-lg">
            <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">{title}</CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleExpand}
                        className="h-8 w-8 p-0"
                    >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4.5 1C4.22386 1 4 1.22386 4 1.5C4 1.77614 4.22386 2 4.5 2H10.5C10.7761 2 11 2.22386 11 2.5V8.5C11 8.77614 11.2239 9 11.5 9C11.7761 9 12 8.77614 12 8.5V2.5C12 1.67157 11.3284 1 10.5 1H4.5ZM1.5 4C1.22386 4 1 4.22386 1 4.5V11.5C1 12.3284 1.67157 13 2.5 13H9.5C9.77614 13 10 12.7761 10 12.5C10 12.2239 9.77614 12 9.5 12H2.5C2.22386 12 2 11.7761 2 11.5V4.5C2 4.22386 1.77614 4 1.5 4Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                    </Button>
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
                </div>
            </CardHeader>

            <Tabs defaultValue="chat" className="flex flex-col h-full">
                <TabsList className="px-4 pt-2 justify-start">
                    <TabsTrigger value="chat" onClick={() => setActiveTab("chat")}>Chat</TabsTrigger>
                    <TabsTrigger value="code" onClick={() => setActiveTab("code")}>
                        Code Search
                        {searchResults.length > 0 && (
                            <Badge className="ml-2" variant="secondary">{searchResults.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 flex flex-col data-[state=active]:flex-1 mt-0 border-0 p-0">
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-4 py-2 rounded-lg ${message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                        }`}
                                >
                                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                                    {message.codeReferences && message.codeReferences.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-t-muted-foreground/20">
                                            <p className="text-xs text-muted-foreground mb-1">Found {message.codeReferences.length} related code references:</p>
                                            {message.codeReferences.slice(0, 1).map((ref, i) => (
                                                <div key={i} className="text-xs mt-1 p-1 bg-background/50 rounded">
                                                    <div className="font-medium">{ref.componentName}{ref.methodName ? `.${ref.methodName}` : ''}</div>
                                                    <div className="opacity-80 text-[10px]">{ref.filePath}</div>
                                                </div>
                                            ))}
                                            {message.codeReferences.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs mt-1 h-auto py-1"
                                                    onClick={() => setActiveTab("code")}
                                                >
                                                    See all {message.codeReferences.length} results
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-xs opacity-70 mt-1 text-right">
                                        {formatTime(message.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] px-4 py-2 rounded-lg bg-muted">
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
                </TabsContent>

                <TabsContent value="code" className="flex-1 flex flex-col data-[state=active]:flex-1 mt-0 border-0 p-0">
                    <CardContent className="flex-1 overflow-y-auto p-4">
                        <div className="mb-4">
                            <h3 className="text-sm font-medium mb-2">Code Search Results</h3>
                            {isSearching ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="space-y-3">
                                    {searchResults.map((result, index) => (
                                        <div key={index} className="border rounded-md p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-medium">{result.componentName}{result.methodName ? `.${result.methodName}` : ''}</div>
                                                <Badge variant="outline">{Math.round(result.similarity * 100)}%</Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground mb-2">{result.filePath}</div>
                                            <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                                                {result.code}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No code references found. Try asking a question about specific components.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>
    );
};
