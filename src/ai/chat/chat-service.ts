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
  private ollamaUrl: string =
    process.env.OLLAMA_URL || "http://localhost:11434";
  private ollamaModel: string =
    process.env.OLLAMA_MODEL || "nomic-embed-text:latest";
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
      useOllama: this.useOllama,
      ollamaUrl: options.ollamaUrl,
      ollamaModel: options.ollamaModel,
    });

    if (this.useOllama) {
      // Use Ollama for chat completions
      this.ollamaUrl =
        options.ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434";
      this.ollamaModel =
        options.ollamaModel ||
        process.env.OLLAMA_MODEL ||
        "nomic-embed-text:latest";
      this.chatModel =
        options.chatModel || process.env.CHAT_MODEL || "gemma:3b";
      console.log(
        `Using Ollama for chat (${this.chatModel}) at ${this.ollamaUrl}`
      );
    } else {
      // Use OpenAI for chat completions
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

    for (const component of this.components) {
      if (component.methods && component.methods.length > 0) {
        await this.vectorService.processComponentMethods(
          component.name,
          component.methods,
          component.filePath
        );
      }
    }

    console.log("Vector database initialization complete");
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
    if (this.useOllama) {
      try {
        const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
          model: this.ollamaModel,
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
    } else {
      try {
        if (!this.openai) {
          throw new Error("OpenAI client not initialized");
        }

        const response = await this.openai.embeddings.create({
          input: query,
          model: "text-embedding-3-small",
        });

        return response.data[0].embedding;
      } catch (error) {
        console.error(`Error generating embedding for query:`, error);
        return new Array(1536).fill(0);
      }
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
    const queryEmbedding = await this.generateQueryEmbedding(query);
    const results: CodebaseSearchResult[] = [];

    // Get the vector database from the service
    const vectorDbString = this.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);

    // Calculate similarity with all methods in the database
    for (const entry of vectorDb) {
      const similarity = this.calculateCosineSimilarity(
        queryEmbedding,
        entry.vector
      );

      if (similarity > 0.6) {
        // Use a lower threshold for queries
        results.push({
          componentName: entry.componentName,
          methodName: entry.methodName,
          code: entry.code,
          filePath: entry.filePath,
          similarity: similarity,
        });
      }
    }

    // Sort by similarity score (highest first)
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 5); // Return top 5 results
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
    // Search for relevant code
    const searchResults = await this.searchCodebase(query);

    // Create a system message that includes context from the search results
    let contextText =
      "You are a helpful assistant that can answer questions about the codebase.";

    if (searchResults.length > 0) {
      contextText +=
        " Here is some relevant code from the codebase that might help answer the question:\n\n";

      for (const [index, result] of searchResults.entries()) {
        contextText += `[${index + 1}] Component: ${result.componentName}${
          result.methodName ? `, Method: ${result.methodName}` : ""
        }\n`;
        contextText += `File: ${result.filePath}\n`;
        contextText += "```\n" + result.code + "\n```\n\n";
      }
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
