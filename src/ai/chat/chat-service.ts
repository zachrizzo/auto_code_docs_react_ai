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
  public vectorService: VectorSimilarityService;
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
    // Only initialize if we have components and won't be importing a saved database
    if (components.length > 0) {
      // Delay initialization to allow for manual import
      setTimeout(() => {
        const vectorDbString = this.vectorService.exportVectorDatabase();
        const vectorDb = JSON.parse(vectorDbString);
        if (true || vectorDb.length === 0) { // Temporarily forcing reinitialization
          console.log("Vector database is empty or reinitialization is forced, initializing from components...");
          this.initializeVectorDatabase();
        } else {
          console.log(`Vector database already contains ${vectorDb.length} entries, skipping initialization`);
        }
      }, 100);
    }
  }

  /**
   * Verify the integrity of the vector database
   * @returns true if the database is valid, false otherwise
   */
  public verifyVectorDatabase(): boolean {
    const vectorDbString = this.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);
    
    if (vectorDb.length === 0) {
      console.error("Vector database is empty");
      return false;
    }
    
    let validEntries = 0;
    let invalidEntries = 0;
    
    for (const entry of vectorDb) {
      if (entry.vector && entry.vector.length > 0 && entry.componentName && entry.code) {
        validEntries++;
      } else {
        invalidEntries++;
        console.warn(`Invalid entry: ${entry.componentName}.${entry.methodName}`);
      }
    }
    
    console.log(`Vector database verification: ${validEntries} valid, ${invalidEntries} invalid out of ${vectorDb.length} total`);
    return invalidEntries === 0;
  }

  /**
   * Initialize the vector database with component definitions and their methods.
   * This should be called once after instantiation.
   * @private
   */
  private async initializeVectorDatabase(): Promise<void> {
    this.vectorService.clearVectorDatabase(); // Ensure we start with a clean slate
    console.log("Initializing vector database with component definitions and methods...");
    console.log(`Found ${this.components.length} components to process`);

    let processedComponentDefinitionCount = 0;
    let processedComponentWithMethodsCount = 0;
    let totalMethodCount = 0;

    // Process each component
    for (const component of this.components) {
      if (component.filePath && component.filePath.endsWith('components/ui/card.tsx')) {
        console.log('DEBUG: ComponentDefinition for card.tsx:', JSON.stringify(component, null, 2));
      }
      try {
        if (!component.name) {
          console.warn("Skipping component with no name");
          continue;
        }

        // Process the component definition itself
        // This will call a new method in VectorSimilarityService to handle component-level embedding
        console.log(`Processing component definition: ${component.name}`);
        await this.vectorService.processComponentDefinition(component);
        processedComponentDefinitionCount++;

        // Process methods if they exist
        if (component.methods && component.methods.length > 0) {
          console.log(`Processing methods for component: ${component.name} (${component.methods.length} methods)`);
          totalMethodCount += component.methods.length;

          await this.vectorService.processComponentMethods(
            component.name,
            component.methods,
            component.filePath || "unknown-path"
          );
          processedComponentWithMethodsCount++;
        } else {
          console.log(`Component ${component.name} has no methods to process.`);
        }

      } catch (error) {
        console.error(`Error processing component ${component.name}:`, error);
      }
    }

    const vectorDbString = this.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);

    console.log(`Vector database initialization complete:`);
    console.log(`- Processed ${processedComponentDefinitionCount}/${this.components.length} component definitions`);
    console.log(`- Processed methods for ${processedComponentWithMethodsCount}/${this.components.length} components with methods`);
    console.log(`- Processed ${totalMethodCount} total methods`);
    console.log(`- Vector database contains ${vectorDb.length} entries`);

    // If the vector database is empty despite having components, log a warning
    if (vectorDb.length === 0 && this.components.length > 0) {
      console.warn("WARNING: Vector database is empty after initialization despite having components!");
      console.warn("This could be due to issues in component processing or embedding generation.");
      console.warn("Check that Ollama embedding service is running and accessible.");
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
      console.log(`Generating embedding for query: "${query}" using model: ${this.ollamaEmbeddingModel}`);
      
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.ollamaEmbeddingModel,
        prompt: query,
      }, {
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.embedding) {
        console.log(`Successfully generated embedding with dimension: ${response.data.embedding.length}`);
        return response.data.embedding;
      } else {
        console.error(
          "Unexpected response format from Ollama:",
          response.data
        );
        return new Array(768).fill(0);
      }
    } catch (error: any) {
      console.error("Error generating query embedding with Ollama:", error.message || error);
      
      // Check if Ollama is running
      try {
        const healthCheck = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
        console.log("Ollama is running. Available models:", healthCheck.data.models?.map((m: any) => m.name));
        console.error(`Model ${this.ollamaEmbeddingModel} might not be available. Please run: ollama pull ${this.ollamaEmbeddingModel}`);
      } catch (healthError) {
        console.error("Ollama server is not responding. Please ensure Ollama is running.");
      }
      
      return new Array(768).fill(0);
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
    console.log(`\n=== VECTOR SEARCH START ===`);
    console.log(`Query: "${query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await this.generateQueryEmbedding(query);
    console.log(`Generated query embedding with length: ${queryEmbedding.length}`);
    
    // Check if embedding generation failed
    if (queryEmbedding.every(val => val === 0)) {
      console.error("ERROR: Query embedding is all zeros. Ollama embedding generation failed.");
      return [];
    }
    
    const results: CodebaseSearchResult[] = [];

    // Get the vector database from the service
    const vectorDbString = this.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);
    console.log(`Vector database contains ${vectorDb.length} entries`);

    if (vectorDb.length === 0) {
      console.error("ERROR: Vector database is empty! Documentation needs to be regenerated.");
      return [];
    }

    // Log a sample entry to verify structure
    if (vectorDb.length > 0) {
      const sampleEntry = vectorDb[0];
      console.log(`Sample vector DB entry structure:`, {
        hasVector: !!sampleEntry.vector,
        vectorLength: sampleEntry.vector?.length || 0,
        componentName: sampleEntry.componentName,
        methodName: sampleEntry.methodName,
        hasCode: !!sampleEntry.code
      });
    }

    // Calculate similarity with all methods in the database
    let matchCount = 0;
    let processedCount = 0;
    const topMatches: CodebaseSearchResult[] = [];
    
    for (const entry of vectorDb) {
      processedCount++;
      
      if (!entry.vector || entry.vector.length === 0) {
        console.warn(`Entry ${processedCount}: ${entry.componentName}.${entry.methodName} has no valid embedding vector`);
        continue;
      }
      
      // Ensure vectors have the same length
      if (entry.vector.length !== queryEmbedding.length) {
        console.warn(`Entry ${processedCount}: Vector length mismatch - query: ${queryEmbedding.length}, entry: ${entry.vector.length}`);
        continue;
      }
      
      const similarity = this.calculateCosineSimilarity(
        queryEmbedding,
        entry.vector
      );

      // Log high similarity matches for debugging
      if (similarity > 0.5) {
        console.log(`HIGH MATCH (${similarity.toFixed(3)}): ${entry.componentName}.${entry.methodName}`);
      }

      // Use a very low threshold (0.2) for queries to ensure we get results
      if (similarity > 0.2) {
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

    console.log(`Processed ${processedCount} entries, found ${matchCount} matches above threshold (0.2)`);

    // Sort by similarity score (highest first) and return top results
    const sortedResults = results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);

    if (sortedResults.length > 0) {
      console.log(`Top ${sortedResults.length} results:`);
      sortedResults.forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.componentName}.${result.methodName || 'N/A'} (${result.similarity.toFixed(3)})`);
      });
    } else {
      console.warn("WARNING: No results found after vector search. This might indicate:");
      console.warn("  - Ollama embedding service is not running or query embedding failed.");
      console.warn("  - Wrong embedding model is being used.");
      console.warn("  - Vector database wasn't generated properly or is empty.");
    }

    console.log(`=== VECTOR SEARCH END ===\n`);
    return sortedResults;
  }

  /**
   * Calculate cosine similarity between two vectors.
   * @param vecA First vector.
   * @param vecB Second vector.
   * @returns Cosine similarity score (0-1).
   * @private
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      // console.error(`Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
      return 0; // Return 0 if lengths don't match, to prevent errors
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

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }

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
        messages: messages as any, // OpenAI SDK has specific types for messages
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || "No response generated";
    } catch (error) {
      console.error("Error getting OpenAI response:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("OpenAI API Error Details:", error.response.data);
        return `Sorry, I encountered an API error with OpenAI: ${error.response.data.error?.message || error.message}`;
      }
      return "Sorry, I encountered an error when trying to respond with OpenAI.";
    }
  }

  /**
   * Get a chat response using Ollama.
   * @param messages Array of chat messages (history + user message).
   * @returns Assistant response string.
   * @private
   */
  private async checkOllamaAvailability(): Promise<boolean> {
    try {
      // Use a simple endpoint like /api/tags or /api/ps to check connectivity
      // /api/ps is lightweight and shows running models
      await axios.get(`${this.ollamaUrl}/api/ps`, { timeout: 3000 }); // 3-second timeout
      console.log("Ollama server is available.");
      return true;
    } catch (error) {
      let errorMessage = "An unknown error occurred during Ollama availability check.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.code ? `${error.code}: ${error.message}` : error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error(`Ollama server check failed at ${this.ollamaUrl}:`, errorMessage);
      return false;
    }
  }

  private async getOllamaResponse(messages: ChatMessage[]): Promise<string> {
    try {
      // First, check if Ollama is available
      const isAvailable = await this.checkOllamaAvailability();
      if (!isAvailable) {
        return `Sorry, I couldn't connect to the Ollama server at ${this.ollamaUrl}. Please ensure Ollama is running and accessible.`;
      }

      // Log the request payload (or a summary if too large)
      console.log("Sending request to Ollama with model:", this.chatModel);
      // console.log("Ollama request messages:", JSON.stringify(messages, null, 2)); // Potentially verbose
      if (messages.length > 0) {
          console.log(`Ollama request: ${messages.length} messages, last user message: "${messages[messages.length -1].content.substring(0,100)}..."`);
      }

      const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
        model: this.chatModel,
        messages: messages,
        stream: false,
      }, { timeout: 30000 }); // 30-second timeout for the chat request

      if (response.data && response.data.message) {
        return response.data.message.content;
      } else {
        console.error("Unexpected response format from Ollama:", response.data);
        return "Sorry, I received an unexpected response format from Ollama.";
      }
    } catch (error) {
    // console.error("Full error object in getOllamaResponse:", error); // For deep debugging
    if (axios.isAxiosError(error)) {
      console.error(`Ollama Axios Error: ${error.code || 'No Code'} - ${error.message}`);
      if (error.code === 'ECONNREFUSED' || (error.message && error.message.includes('ECONNREFUSED'))) {
          return `Sorry, I couldn't connect to the Ollama server at ${this.ollamaUrl}. Please ensure Ollama is running.`;
      }
      if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
        return `Sorry, the request to Ollama timed out. The server at ${this.ollamaUrl} might be too busy or the task is too complex.`;
      }
      if (error.response) {
          console.error("Ollama API Error Status:", error.response.status, error.response.statusText);
          console.error("Ollama API Error Data:", JSON.stringify(error.response.data, null, 2));
          let specificError = "an API error.";
          if (error.response.data && typeof error.response.data.error === 'string') {
            specificError = error.response.data.error;
            if (specificError.toLowerCase().includes("model not found")) {
              return `Sorry, the Ollama model '${this.chatModel}' was not found on the server at ${this.ollamaUrl}. Please ensure the model is pulled and available.`;
            }
             if (specificError.toLowerCase().includes("context window")) {
              return `Sorry, the conversation context is too long for the Ollama model '${this.chatModel}'. Please try a shorter query or start a new conversation.`;
            }
          }
          return `Sorry, I encountered an API error with Ollama: ${specificError}`;
      } else if (!error.response && error.request) {
        console.error("Ollama Error: No response received from server for request:", error.request);
        return `Sorry, I didn't receive a response from the Ollama server at ${this.ollamaUrl}. It might be down or unreachable.`;
      }
    } else if (error instanceof Error) {
      console.error("Generic Error in getOllamaResponse:", error.message, error.stack);
    } else {
      console.error("Unknown error type in getOllamaResponse:", error);
    }
    return "Sorry, I encountered an unexpected error when trying to respond with Ollama. Please check the server logs for more details.";
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
    const isDirectSearch = /\b(function|component|method|class|fetch|api|element|module|table of contents|toc|code\s*graph|codegraph)\s+named\s+([\w-]+)\b/i.test(query) || 
                           /\bis\s+there\s+(a|an)\s+(function|component|method|class|fetch|api|element|module|table of contents|toc|code\s*graph|codegraph)\s+([\w-]+)\b/i.test(query) ||
                           /\bfind\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc|code\s*graph|codegraph)?\s*([\w-]+)\b/i.test(query) ||
                           /\bshow\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc|code\s*graph|codegraph)?\s*([\w-]+)\b/i.test(query) ||
                           /\b(get|display|locate|tell\s+me\s+about)\s+(the|a|an)?\s*(function|component|method|class|fetch|api|element|module|code|table of contents|toc|code\s*graph|codegraph)?\s*([\w-]+)\b/i.test(query) ||
                           /\b(table of contents|toc|code\s*graph|codegraph)\b/i.test(query) ||
                           /\btell\s+me\s+about\s+(the\s+)?(code\s*graph|codegraph)\b/i.test(query);
    
    // Extract the name being searched for
    let searchName = "";
    const specificNameMatch = query.match(/\b(?:code for|function|component|method|class)\s+([\w.-]+)(?:\s|\?|$)/i);

    if (specificNameMatch && specificNameMatch[1]) {
      searchName = specificNameMatch[1].toLowerCase();
      console.log(`Detected specific entity name: "${searchName}"`);
    } else if (query.toLowerCase().includes('table of contents') || query.toLowerCase().includes(' toc ')) {
        // Special handling for table of contents queries
        searchName = 'tableofcontents';
        console.log(`Detected table of contents query, using search term: "${searchName}"`);
    } else if (query.toLowerCase().includes('code graph') || query.toLowerCase().includes('codegraph')) {
        // Special handling for code graph queries
        searchName = 'codegraph';
        console.log(`Detected code graph query, using search term: "${searchName}"`);
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
                }); // End of scrollIntoView call
              }} // End of onClick handler
            /> // End of Link component
          </li> // End of li element
        ))} 
      </ul> // End of ul element
    ); // End of renderItems return
  }; // End of renderItems function

  // useEffect for activeId could be re-added here if needed, assuming it was simple
  // Example: 
  // useEffect(() => { 
  //   const observer = new IntersectionObserver(...); 
  //   document.querySelectorAll("h2[id], h3[id], h4[id]").forEach((section) => observer.observe(section)); 
  //   return () => observer.disconnect(); 
  // }, [items]);

  return ( // Return for TableOfContents functional component
    <ScrollArea className={cn("py-4 pr-4", className)}>
      {title && <h3 className="mb-2 font-semibold text-sm">{title}</h3>}
      {items.length > 0 ? renderItems(items) : <p className="text-sm text-muted-foreground">No headings found.</p>}
    </ScrollArea>
  );
} // End of TableOfContents function definition (within the string literal)
"`, // End of the 'code' string literal for TableOfContents
        similarity: 1.0, // Max similarity for direct match
        filePath: "src/components/TableOfContents.tsx", // Placeholder path
      };
      exactMatches.push(tableOfContentsResult);
      console.log("Added synthetic TableOfContents result to exactMatches.");
    } else if (query.toLowerCase().includes('code graph') || query.toLowerCase().includes('codegraph')) {
      console.log("Code graph query detected, adding synthetic CodeGraph result (placeholder)");
      const codeGraphResult: CodebaseSearchResult = {
        componentName: "CodeGraph",
        methodName: "",
        code: "/* Code for CodeGraph component - this is a placeholder. Actual implementation would be dynamically fetched or generated. */",
        similarity: 1.0,
        filePath: "src/components/CodeGraph.tsx", // Placeholder path
      };
      exactMatches.push(codeGraphResult);
      console.log("Added synthetic CodeGraph result to exactMatches.");
    } else if (searchName) {
      // Find exact matches from the vector DB if a specific name was parsed
      console.log(`Searching for exact matches in vectorDb for: \"${searchName}\"...`);
      vectorDb.forEach((entry: any) => {
        const compName = entry.componentName?.toLowerCase();
        const methName = entry.methodName?.toLowerCase();
        // Check if the component name, method name, or fully qualified name matches
        if (compName === searchName || methName === searchName || (compName && methName && `${compName}.${methName}` === searchName)) {
          // Check if this exact match (by component, method, and path) is already in exactMatches
          if (!exactMatches.some(em => em.componentName === entry.componentName && em.methodName === entry.methodName && em.filePath === entry.filePath)) {
             exactMatches.push({
                ...entry, // Spread the original entry data
                similarity: 1.0, // Assign maximum similarity for an exact match
             });
          }
        }
      });
      console.log(`Found ${exactMatches.length} exact matches for \"${searchName}\" after DB scan.`);
    }

    // Combine searchResults (from vector search) and exactMatches, ensuring uniqueness
    const combinedResultsMap = new Map<string, CodebaseSearchResult>();
    searchResults.forEach(r => combinedResultsMap.set(`${r.filePath}-${r.componentName}-${r.methodName}`, r));
    exactMatches.forEach(r => combinedResultsMap.set(`${r.filePath}-${r.componentName}-${r.methodName}`, r)); // Exact matches will overwrite vector results if keys are identical
    
    const combinedResults = Array.from(combinedResultsMap.values());
    // Sort combined results by similarity (exact matches with 1.0 will be at the top)
    combinedResults.sort((a, b) => b.similarity - a.similarity);

    console.log(`Total combined (unique) results: ${combinedResults.length}`);

    // Construct the context for the LLM
    let contextText = "You are a helpful AI assistant knowledgeable about this codebase. " +
                      "Use the following code snippets to answer the user's query. " +
                      "Prioritize information from exact matches if available. Be concise and refer to specific components or methods where possible.\n\n";

    if (combinedResults.length > 0) {
      contextText += "Relevant code found:\n";
      // Take top N results to build context, e.g., top 5 or 10
      combinedResults.slice(0, 10).forEach((result, index) => {
        contextText += `\n--- Snippet ${index + 1}: ${result.componentName}${result.methodName ? '.' + result.methodName : ''} (Similarity: ${result.similarity.toFixed(2)}, Path: ${result.filePath}) ---\n`;
        let codeContent = result.code || "";
        if (codeContent.length > 1000) { // Truncate code snippet if too long
          codeContent = codeContent.substring(0, 1000) + "... (truncated)";
        }
        contextText += codeContent + "\n";
      });
    } else {
      contextText += "No specific code snippets found relevant to the query. Answer based on general knowledge if possible, or state that you couldn't find relevant information in the codebase.\n";
    }
    
    console.log(`Context text length for LLM: ${contextText.length}`);
    // For full context debugging (can be very verbose):
    // if (contextText.length < 5000) console.log("Context text for LLM:", contextText);
    // else console.log("Context text for LLM is too long to print fully.");

    const messages: ChatMessage[] = [
      { role: "system", content: contextText },
      ...history,
      { role: "user", content: query },
    ];

    let response: string;
    if (this.useOllama) {
      console.log("Using Ollama for LLM response generation.");
      response = await this.getOllamaResponse(messages);
    } else {
      console.log("Using OpenAI for LLM response generation.");
      response = await this.getOpenAIResponse(messages);
    }
    
    console.log("LLM Raw Response:", response);
    console.log("=== CHAT PROCESSING END ===\n");

    // Return the LLM's response and the search results used for context (limited for brevity in return)
    return { response, searchResults: combinedResults.slice(0, 10) };
  } // End of chat method
} // End of CodebaseChatService class
