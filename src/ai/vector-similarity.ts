import { OpenAI } from "openai";
import { MethodDefinition, SimilarityWarning } from "../core/types";
import axios from "axios";

// Vector database for storing embeddings locally
interface VectorEntry {
  id: string;
  vector: number[];
  methodName: string;
  componentName: string;
  filePath: string;
  code: string;
}

export interface VectorSimilarityOptions {
  apiKey?: string;
  useOllama?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string;
  similarityThreshold?: number; // Default 0.8 (80%)
  model?: string;
}

export class VectorSimilarityService {
  private openai: OpenAI | null = null;
  private vectorDb: VectorEntry[] = [];
  private similarityThreshold: number;
  private model: string;
  private useOllama: boolean;
  private ollamaUrl: string = "http://localhost:11434";
  private ollamaModel: string = "gemma3:27b";

  constructor(options: VectorSimilarityOptions) {
    this.useOllama = options.useOllama || false;

    if (this.useOllama) {
      // Use Ollama for local embeddings
      this.ollamaUrl = options.ollamaUrl || "http://localhost:11434";
      this.ollamaModel = options.ollamaModel || "gemma3:27b"; // Default model - this should be available on most Ollama installs
      this.model = "ollama";
      console.log(
        `Using local embeddings with Ollama (${this.ollamaModel}) at ${this.ollamaUrl}`
      );
    } else {
      // Use OpenAI for embeddings
      if (!options.apiKey) {
        throw new Error("API key is required when not using Ollama");
      }

      this.openai = new OpenAI({
        apiKey: options.apiKey,
      });
      this.model = options.model || "text-embedding-3-small";
    }

    this.similarityThreshold = options.similarityThreshold || 0.8;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
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
   * Generate embedding vector using Ollama
   */
  private async generateOllamaEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.ollamaModel,
        prompt: text,
      });

      if (response.data && response.data.embedding) {
        return response.data.embedding;
      } else {
        console.error("Unexpected response format from Ollama:", response.data);
        // Return a zero vector as fallback
        return new Array(1536).fill(0);
      }
    } catch (error) {
      console.error("Error generating embedding with Ollama:", error);
      // Return a zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  /**
   * Generate embedding vector for a method
   */
  private async generateEmbedding(method: MethodDefinition): Promise<number[]> {
    // Create a text representation of the method
    const paramsText = method.params
      .map((param) => `${param.name}: ${param.type}`)
      .join(", ");

    const methodText = `
Method Name: ${method.name}
Parameters: ${paramsText}
Return Type: ${method.returnType || "void"}
Description: ${method.description || ""}
Code: ${method.code || ""}
    `.trim();

    if (this.useOllama) {
      return this.generateOllamaEmbedding(methodText);
    } else {
      try {
        if (!this.openai) {
          throw new Error("OpenAI client not initialized");
        }

        const response = await this.openai.embeddings.create({
          input: methodText,
          model: this.model,
        });

        return response.data[0].embedding;
      } catch (error) {
        console.error(
          `Error generating embedding for method ${method.name}:`,
          error
        );
        // Return a zero vector as fallback
        return new Array(1536).fill(0);
      }
    }
  }

  /**
   * Add a method to the vector database
   */
  async addMethod(
    method: MethodDefinition,
    componentName: string,
    filePath: string
  ): Promise<void> {
    const vector = await this.generateEmbedding(method);
    const id = `${componentName}_${method.name}_${filePath}`;

    this.vectorDb.push({
      id,
      vector,
      methodName: method.name,
      componentName,
      filePath,
      code: method.code || "",
    });
  }

  /**
   * Find similar methods for a given method
   */
  async findSimilarMethods(
    method: MethodDefinition,
    componentName: string,
    filePath: string
  ): Promise<SimilarityWarning[]> {
    // Generate vector for the current method
    const vector = await this.generateEmbedding(method);
    const currentId = `${componentName}_${method.name}_${filePath}`;

    const similarityResults: SimilarityWarning[] = [];

    // Compare with all vectors in the database
    for (const entry of this.vectorDb) {
      // Skip comparing to itself
      if (entry.id === currentId) continue;

      const similarity = this.cosineSimilarity(vector, entry.vector);

      // If similarity exceeds threshold, add a warning
      if (similarity >= this.similarityThreshold) {
        similarityResults.push({
          similarTo: `${entry.componentName}.${entry.methodName}`,
          score: similarity,
          reason: `Function appears to have similar functionality (${Math.round(
            similarity * 100
          )}% similar)`,
          filePath: entry.filePath,
        });
      }
    }

    // Sort by similarity score (highest first)
    return similarityResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Process all methods in a component to find similarities
   */
  async processComponentMethods(
    componentName: string,
    methods: MethodDefinition[],
    filePath: string
  ): Promise<MethodDefinition[]> {
    const enhancedMethods: MethodDefinition[] = [];

    for (const method of methods) {
      // First check for similarity with existing methods
      const similarMethods = await this.findSimilarMethods(
        method,
        componentName,
        filePath
      );

      // Add similarity warnings if any were found
      if (similarMethods.length > 0) {
        method.similarityWarnings = similarMethods;
      }

      // Then add this method to the database for future comparisons
      await this.addMethod(method, componentName, filePath);

      enhancedMethods.push(method);
    }

    return enhancedMethods;
  }

  /**
   * Export the vector database to JSON
   */
  exportVectorDatabase(): string {
    return JSON.stringify(this.vectorDb, null, 2);
  }

  /**
   * Import vector database from JSON
   */
  importVectorDatabase(json: string): void {
    try {
      this.vectorDb = JSON.parse(json);
    } catch (error) {
      console.error("Error importing vector database:", error);
    }
  }
}
