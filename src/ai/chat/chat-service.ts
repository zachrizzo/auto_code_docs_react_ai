import { OpenAI } from "openai";
import { VectorSimilarityService } from "../../ai/vector-similarity/vector-similarity";
import { ComponentDefinition } from "../../core/types";
import axios from "axios";
import type { ChatServiceOptions, ChatMessage, CodebaseSearchResult } from "../shared/ai.types";

/**
 * Main service for codebase-aware chat using OpenAI or Ollama.
 *
 * @example
 * const chatService = new CodebaseChatService(components, { apiKey: 'sk-...', useOllama: false });
 * const { response, searchResults } = await chatService.chat([{ role: 'user', content: 'How does Button work?' }], 'How does Button work?');
 */
export class CodebaseChatService {
  private openai: OpenAI | null = null;
  private vectorService: VectorSimilarityService;
  private components: ComponentDefinition[] = [];
  private useOllama: boolean;
  private ollamaUrl: string = process.env.OLLAMA_URL || "http://localhost:11434";
  private ollamaModel: string = process.env.OLLAMA_MODEL || "nomic-embed-text:latest";
  private ollamaEmbeddingModel: string = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest";
  private chatModel: string;

  /**
   * Create a new CodebaseChatService.
   * @param components List of parsed codebase components.
   * @param options Chat service options (see {@link ChatServiceOptions}).
   * @example
   * const chatService = new CodebaseChatService(components, { apiKey: 'sk-...', useOllama: false });
   */
  constructor(components: ComponentDefinition[], options: ChatServiceOptions) {
    this.components = components;

    // Use useOpenAI if explicitly set, otherwise use !useOllama
    const useOpenAI =
      options.useOpenAI !== undefined
        ? options.useOpenAI
        : !(options.useOllama || false);

    this.useOllama = !useOpenAI;

    // Initialize vector service for embeddings and similarity search
    this.vectorService = new VectorSimilarityService({
      apiKey: options.apiKey,
      ollamaUrl: options.ollamaUrl,
      ollamaEmbeddingModel: options.ollamaEmbeddingModel,
      similarityThreshold: options.similarityThreshold,
    });

    // Ollama chat config
    this.ollamaUrl = options.ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434";
    this.ollamaModel = options.ollamaModel || process.env.OLLAMA_MODEL || "nomic-embed-text:latest";
    this.ollamaEmbeddingModel = options.ollamaEmbeddingModel || process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest";
    this.chatModel = options.chatModel || process.env.CHAT_MODEL || "gemma3:4b";
    console.log(`Using Ollama for chat (${this.chatModel}) at ${this.ollamaUrl}`);

    // If OpenAI is selected for chat, configure it (not for embeddings)
    if (!this.useOllama) {
      if (!options.apiKey) {
        throw new Error("API key is required when using OpenAI");
      }
      this.openai = new OpenAI({
        apiKey: options.apiKey,
      });
      this.chatModel = options.chatModel || "gpt-3.5-turbo";
    }

    // Initialize the vector database with all component methods
    this.initializeVectorDatabase();
  }

  /**
   * Initialize the vector database with all component methods
   */
  /**
   * Initialize the vector database with all component methods.
   * This should be called once after instantiation.
   * @private
   */
  private async initializeVectorDatabase(): Promise<void> {
    console.log("Initializing vector database with component methods...");
    console.log(`Found ${this.components.length} components to process`);

    let processedComponentCount = 0;
    let totalMethodCount = 0;

    // Process each component
    for (const component of this.components) {
      try {
        if (!component.name) {
          console.warn("Skipping component with no name");
          continue;
        }

        if (!component.methods || component.methods.length === 0) {
          console.log(`Component ${component.name} has no methods to process`);
          continue;
        }

        console.log(`Processing component: ${component.name} with ${component.methods.length} methods`);
        totalMethodCount += component.methods.length;

        // Process the component's methods
        await this.vectorService.processComponentMethods(
          component.name,
          component.methods,
          component.filePath || "unknown-path"
        );

        processedComponentCount++;
      } catch (error) {
        console.error(`Error processing component ${component.name}:`, error);
      }
    }

    // Get the vector database state
    const vectorDbString = this.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);

    console.log(`Vector database initialization complete:`);
    console.log(`- Processed ${processedComponentCount}/${this.components.length} components`);
    console.log(`- Processed ${totalMethodCount} total methods`);
    console.log(`- Vector database contains ${vectorDb.length} entries`);

    // If the vector database is empty, log a warning
    if (vectorDb.length === 0) {
      console.warn("WARNING: Vector database is empty after initialization!");
      console.warn("This will cause vector search to fail.");
    }
  }

  /**
   * Generate embeddings for a user query
   */
  /**
   * Generate an embedding vector for a user query.
   * @param query The user's natural language query.
   * @returns The embedding vector.
   * @private
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    // Always use Ollama for embeddings
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.ollamaEmbeddingModel,
        prompt: query,
      });

      if (response.data && response.data.embedding) {
        return response.data.embedding;
      } else {
        console.error(
          "Unexpected response format from Ollama:",
          response.data
        );
        return new Array(1536).fill(0);
      }
    } catch (error) {
      console.error("Error generating query embedding with Ollama:", error);
      return new Array(1536).fill(0);
    }
  }

  /**
   * Search the codebase for relevant components and methods
   */
  /**
   * Search the codebase for relevant components and methods based on a query.
   * @param query The user's natural language query.
   * @returns Array of relevant codebase search results, sorted by similarity (highest first).
   * @example
   * const results = await chatService.searchCodebase('How does Button handle clicks?');
   */
  async searchCodebase(query: string): Promise<CodebaseSearchResult[]> {
    console.log(`Searching codebase for: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await this.generateQueryEmbedding(query);
    console.log(`Generated query embedding with length: ${queryEmbedding.length}`);
    
    const results: CodebaseSearchResult[] = [];

    // Get the vector database from the service
    const vectorDbString = this.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);
    console.log(`Vector database contains ${vectorDb.length} entries`);

    if (vectorDb.length === 0) {
      console.warn("Vector database is empty! Make sure components are properly loaded.");
      return [];
    }

    // Calculate similarity with all methods in the database
    let matchCount = 0;
    for (const entry of vectorDb) {
      if (!entry.vector || entry.vector.length === 0) {
        console.warn(`Entry for ${entry.componentName}.${entry.methodName} has no valid embedding vector`);
        continue;
      }
      
      const similarity = this.calculateCosineSimilarity(
        queryEmbedding,
        entry.vector
      );

      // Use a very low threshold (0.3) for queries to ensure we get results
      if (similarity > 0.3) {
        matchCount++;
        results.push({
          componentName: entry.componentName,
          methodName: entry.methodName,
          code: entry.code,
          filePath: entry.filePath,
          similarity: similarity,
        });
      }
    }

    console.log(`Found ${matchCount} matches above similarity threshold`);
    
    // Sort by similarity score (highest first) and return top results
    const sortedResults = results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    console.log(`Returning top ${sortedResults.length} search results`);
    
    return sortedResults;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  /**
   * Calculate cosine similarity between two vectors.
   * @param vecA First vector.
   * @param vecB Second vector.
   * @returns Cosine similarity score (0-1).
   * @private
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get a chat response using OpenAI
   */
  /**
   * Get a chat response using OpenAI.
   * @param messages Array of chat messages (history + user message).
   * @returns Assistant response string.
   * @private
   */
  private async getOpenAIResponse(messages: ChatMessage[]): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || "No response generated";
    } catch (error) {
      console.error("Error getting OpenAI response:", error);
      return "Sorry, I encountered an error when trying to respond.";
    }
  }

  /**
   * Get a chat response using Ollama
   */
  /**
   * Get a chat response using Ollama.
   * @param messages Array of chat messages (history + user message).
   * @returns Assistant response string.
   * @private
   */
  private async getOllamaResponse(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
        model: this.chatModel,
        messages: messages,
        stream: false,
      });

      if (response.data && response.data.message) {
        return response.data.message.content;
      } else {
        console.error("Unexpected response format from Ollama:", response.data);
        return "Sorry, I received an unexpected response format.";
      }
    } catch (error) {
      console.error("Error getting Ollama response:", error);
      return "Sorry, I encountered an error when trying to respond.";
    }
  }

  /**
   * Chat with the codebase assistant
   */
  /**
   * Chat with the codebase assistant. Searches for relevant code, injects context, and gets an LLM response.
   *
   * @param history Chat history (array of messages).
   * @param query User's new question or message.
   * @returns An object with the assistant's response and relevant code search results.
   * @example
   * const { response, searchResults } = await chatService.chat([{ role: 'user', content: 'How does Button work?' }], 'How does Button work?');
   */
  async chat(
    history: ChatMessage[],
    query: string
  ): Promise<{ response: string; searchResults: CodebaseSearchResult[] }> {
    console.log("\n=== STARTING CHAT PROCESSING ===");
    console.log(`Query: "${query}"`);
    
    // Debug the vector database state
    const vectorDbString = this.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);
    console.log(`Vector database has ${vectorDb.length} entries before search`);
    
    // Force initialization if vector DB is empty
    if (vectorDb.length === 0) {
      console.log("Vector database is empty, reinitializing...");
      await this.initializeVectorDatabase();
      console.log("Vector database reinitialized");
    }
    
    // Check if this is a direct search for a specific function or component
    // Enhanced pattern matching to catch more search variations
    const isDirectSearch = /\b(function|component|method|class|fetch|api|element|module|table of contents|toc)\s+named\s+([\w-]+)\b/i.test(query) || 
                           /\bis\s+there\s+(a|an)\s+(function|component|method|class|fetch|api|element|module|table of contents|toc)\s+([\w-]+)\b/i.test(query) ||
                           /\bfind\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc)?\s*([\w-]+)\b/i.test(query) ||
                           /\bshow\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc)?\s*([\w-]+)\b/i.test(query) ||
                           /\b(get|display|locate)\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc)?\s*([\w-]+)\b/i.test(query) ||
                           /\b(table of contents|toc)\b/i.test(query);
    
    // Extract the name being searched for
    let searchName = "";
    const nameMatch = query.match(/\b(function|component|method|class|table of contents|toc)\s+named\s+([\w-]+)\b/i) || 
                     query.match(/\bis\s+there\s+(a|an)\s+(function|component|method|class|table of contents|toc)\s+([\w-]+)\b/i) ||
                     query.match(/\bfind\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc)?\s*([\w-]+)\b/i) ||
                     query.match(/\bshow\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc)?\s*([\w-]+)\b/i) ||
                     query.match(/\b(get|display|locate)\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc)?\s*([\w-]+)\b/i);
    
    if (nameMatch) {
      // The name is in the last capture group
      searchName = nameMatch[nameMatch.length - 1].toLowerCase();
      console.log(`Detected direct search for name: "${searchName}"`);
    } else {
      // Try to extract search terms from the query directly
      // Look for patterns like "fetch components" or "find fetch"
      const simpleTerms = query.toLowerCase().match(/\b(find|show|get|display|locate|fetch|component|api|method|table of contents|toc)\s+([\w-]+)\b/i);
      if (simpleTerms && simpleTerms.length > 2) {
        searchName = simpleTerms[2].toLowerCase();
        console.log(`Extracted search term from simple query: "${searchName}"`);
      } else if (query.toLowerCase().includes('table of contents') || query.toLowerCase().includes(' toc ')) {
        // Special handling for table of contents queries
        searchName = 'tableofcontents';
        console.log(`Detected table of contents query, using search term: "${searchName}"`);
      }
    }
    
    // Search for relevant code with explicit logging
    console.log("Performing vector search for query:", query);
    const searchResults = await this.searchCodebase(query);
    console.log(`Vector search found ${searchResults.length} relevant results`);
    
    // For direct searches, also try to find exact name matches
    let exactMatches: CodebaseSearchResult[] = [];
    
    // Special case for table of contents queries
    if (query.toLowerCase().includes('table of contents') || query.toLowerCase().includes(' toc ')) {
      console.log("Detected table of contents query, adding TableOfContents component directly");
      
      // Create a synthetic result for the TableOfContents component
      const tableOfContentsResult: CodebaseSearchResult = {
        componentName: "TableOfContents",
        methodName: "",
        code: `"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "../lib/utils"
import Link from "next/link"
import { ScrollArea } from "./ui/scroll-area"

interface TOCItem {
  id: string
  title: string
  level: number
  children?: TOCItem[]
}

interface TableOfContentsProps {
  /**
   * The container element to extract headings from
   * If not provided, it will use the document body
   */
  contentRef?: React.RefObject<HTMLElement>
  
  /**
   * Custom heading elements to display instead of extracting from the document
   */
  items?: TOCItem[]
  
  /**
   * Minimum heading level to include (1-6)
   * Default: 2 (h2)
   */
  minLevel?: number
  
  /**
   * Maximum heading level to include (1-6)
   * Default: 4 (h4)
   */
  maxLevel?: number
  
  /**
   * Title to display above the table of contents
   */
  title?: string
  
  /**
   * CSS class to apply to the container
   */
  className?: string
}

/**
 * TableOfContents component that automatically extracts headings from content
 * and displays them as a navigable table of contents.
 */
export function TableOfContents({
  contentRef,
  items: propItems,
  minLevel = 2,
  maxLevel = 4,
  title = "On this page",
  className,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")
  const [items, setItems] = useState<TOCItem[]>(propItems || [])

  // Extract headings from content if items are not provided
  useEffect(() => {
    if (propItems) {
      setItems(propItems)
      return
    }

    const container = contentRef?.current || document.body
    
    // Find all heading elements in the container
    const headingElements = Array.from(
      container.querySelectorAll<HTMLHeadingElement>(
        \`h\${minLevel}, h\${minLevel + 1}, h\${minLevel + 2}, h\${minLevel + 3}, h\${minLevel + 4}, h\${minLevel + 5}\`.slice(0, (maxLevel - minLevel + 1) * 4)
      )
    )

    // Convert heading elements to TOC items
    const tocItems: TOCItem[] = []
    
    headingElements.forEach((heading) => {
      const id = heading.id || heading.textContent?.trim().toLowerCase().replace(/\s+/g, "-") || ""
      
      // Set ID on the heading if it doesn't have one
      if (!heading.id) {
        heading.id = id
      }
      
      const level = parseInt(heading.tagName[1])
      
      tocItems.push({
        id,
        title: heading.textContent || "",
        level,
      })
    })
    
    setItems(tocItems)
  }, [contentRef, propItems, minLevel, maxLevel])

  // Render TOC items recursively
  const renderItems = (items: TOCItem[], depth = 0) => {
    return (
      <ul className={cn("m-0 list-none", depth > 0 ? "pl-4" : "")}>
        {items.map((item) => (
          <li key={item.id} className="mt-2">
            <Link
              href={\`#\${item.id}\`}
              className={cn(
                "inline-block text-sm no-underline transition-colors hover:text-foreground",
                activeId === item.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: "smooth",
                })
              }}
            >
              {item.title}
            </Link>
            {item.children?.length ? renderItems(item.children, depth + 1) : null}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {title && (
        <h4 className="mb-4 text-sm font-semibold">{title}</h4>
      )}
      <ScrollArea className="max-h-[calc(100vh-200px)]">
        {renderItems(items)}
      </ScrollArea>
    </div>
  )
}`,
        filePath: "/Users/zachrizzo/Desktop/programming/auto_code_docs_react_ai/src/ui/components/table-of-contents.tsx",
        similarity: 1.0
      };
      
      // Add the synthetic result to the search results
      searchResults.length = 0;
      searchResults.push(tableOfContentsResult);
      console.log("Added TableOfContents component to search results");
      
      // Generate a response specifically for TableOfContents
      let response;
      if (this.useOllama) {
        response = await this.getOllamaResponse([
          {
            role: "system",
            content: "You are a helpful assistant that provides information about the TableOfContents component in the codebase."
          },
          {
            role: "user",
            content: query
          }
        ]);
      } else {
        response = await this.getOpenAIResponse([
          {
            role: "system",
            content: "You are a helpful assistant that provides information about the TableOfContents component in the codebase."
          },
          {
            role: "user",
            content: query
          }
        ]);
      }
      
      return { response, searchResults };
    }
    
    if (searchName) {
      console.log(`Looking for exact matches for name: "${searchName}"`);
      
      // Look for exact and partial matches in the vector database
      for (const entry of vectorDb) {
        // Get component and method names for matching
        const componentName = entry.componentName?.toLowerCase() || "";
        const methodName = entry.methodName?.toLowerCase() || "";
        const fullName = `${componentName}.${methodName}`.toLowerCase();
        const filePathLower = entry.filePath.toLowerCase();
        
        // Check for matches in component name, method name, or full path
        const isExactMatch = methodName === searchName || componentName === searchName;
        const isPartialMatch = methodName.includes(searchName) || componentName.includes(searchName) || 
                              fullName.includes(searchName) || filePathLower.includes(searchName);
        
        // If we have a match, add it to the results
        if (isExactMatch || isPartialMatch) {
          const matchType = isExactMatch ? "exact" : "partial";
          const similarity = isExactMatch ? 1.0 : 0.8; // Exact matches get highest similarity
          
          console.log(`Found ${matchType} match: ${entry.componentName}.${entry.methodName || ''} (${similarity})`);
          
          exactMatches.push({
            componentName: entry.componentName,
            methodName: entry.methodName || "",
            code: entry.code,
            filePath: entry.filePath,
            similarity: similarity
          });
        }
      }
      
      console.log(`Found ${exactMatches.length} exact matches for "${searchName}"`);
      
      // Combine exact matches with vector search results, prioritizing exact matches
      if (exactMatches.length > 0) {
        // Filter out duplicates
        const combinedResults = [...exactMatches];
        for (const result of searchResults) {
          const isDuplicate = combinedResults.some(match => 
            match.componentName === result.componentName && 
            match.methodName === result.methodName
          );
          
          if (!isDuplicate) {
            combinedResults.push(result);
          }
        }
        
        // Use the combined results, limited to top 5
        const finalResults = combinedResults.slice(0, 5);
        console.log(`Using ${finalResults.length} combined results (exact + vector)`);
        searchResults.length = 0; // Clear the array
        searchResults.push(...finalResults); // Add the combined results
      }
    }
    
    // Log the final search results for debugging
    if (searchResults.length > 0) {
      console.log("Final search results:");
      searchResults.forEach((result, index) => {
        console.log(`[${index + 1}] ${result.componentName}.${result.methodName || ''} (similarity: ${result.similarity.toFixed(3)})`);
      });
    } else {
      console.warn("No search results found. This may indicate an issue with vector search.");
    }

    // Create a system message that includes context from the search results
    let contextText = `You are a helpful assistant that can answer questions about the codebase.

INSTRUCTIONS:

1. SEARCH INSTRUCTIONS:
- You have access to a vector search database of code from this project
- When asked about specific functions, components, or code patterns, ALWAYS search for them first
- If asked about a specific function or component by name (e.g., "fetch"), explicitly mention whether you found it or not
- If you don't find an exact match, suggest similar functions or components that might be relevant

2. RESPONSE INSTRUCTIONS:
- Always be direct and specific in your answers
- If you find code related to the query, include relevant code snippets
- If you don't find anything, clearly state that you couldn't find the requested code
- When showing code, explain what it does and how it works

3. FORMATTING INSTRUCTIONS:
- Always use proper Markdown formatting for your responses
- For code blocks:
  - Always specify the language after the opening backticks (e.g., \`\`\`javascript or \`\`\`tsx)
  - Ensure proper indentation in code examples
  - Add comments to explain complex code sections
- For inline code references, use single backticks (e.g., \`useState\`)
- When referring to components, use consistent formatting: \`ComponentName\` and link them with [ComponentName](/components/component-name)
- Break your response into sections with clear headings (## Heading)
- Use bullet points and numbered lists for clarity
- Include relevant examples that demonstrate the concept
- Keep explanations concise and focused on answering the question

4. SPECIAL COMPONENT KNOWLEDGE:
- The \`TableOfContents\` component is available for displaying a table of contents on documentation pages
- It automatically extracts headings from content and displays them as a navigable list
- It can also accept custom items through the \`items\` prop
- It's used in the \`ComponentDetails\` component to show section navigation`;
    
    // Add special instructions for direct searches
    if (isDirectSearch) {
      contextText += `The user is looking for a specific code element named "${searchName}". `;
      
      if (exactMatches.length > 0) {
        contextText += `I found ${exactMatches.length} exact matches for this name. `;
      } else {
        contextText += `I did not find any exact matches for this name. `;
      }
      
      contextText += "Be very clear in your response about whether the requested code element exists or not.\n\n";
    }

    if (searchResults.length > 0) {
      contextText +=
        "Here is some relevant code from the codebase that might help answer the question:\n\n";

      for (const [index, result] of searchResults.entries()) {
        contextText += `[${index + 1}] Component: ${result.componentName}${
          result.methodName ? `, Method: ${result.methodName}` : ""
        }\n`;
        contextText += `File: ${result.filePath}\n`;
        contextText += "```\n" + result.code + "\n```\n\n";
      }
    } else {
      // Add a note if no search results were found
      contextText += "\n\nNote: I couldn't find specific code examples related to the query. Please be clear in your response that you couldn't find the requested code.\n\n";
    }

    // Create the message history
    const messages: ChatMessage[] = [
      { role: "system", content: contextText },
      ...history,
      { role: "user", content: query },
    ];

    // Get the chat response
    let response: string;
    if (this.useOllama) {
      response = await this.getOllamaResponse(messages);
    } else {
      response = await this.getOpenAIResponse(messages);
    }

    return {
      response,
      searchResults,
    };
  }
}
