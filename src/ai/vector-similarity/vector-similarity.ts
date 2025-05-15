import { OpenAI } from "openai";
import { MethodDefinition, SimilarityWarning } from "../../core/types";
import axios from "axios";
import crypto from "crypto";
import path from "path";
import { VectorEntry, VectorSimilarityOptions } from "./vector-similarity.types";
import { cosineSimilarity } from "./utils/vector-similarity-utils";

/**
 * Service for vector similarity search and embeddings.
 */
export class VectorSimilarityService {
  private vectorDb: VectorEntry[] = [];
  private similarityThreshold: number;
  private ollamaUrl: string = process.env.OLLAMA_URL || "http://localhost:11434";
  private ollamaEmbeddingModel: string = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest";

  constructor(options: VectorSimilarityOptions) {
    // Always use Ollama for embeddings by default
    this.ollamaUrl = options.ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434";
    this.ollamaEmbeddingModel = options.ollamaEmbeddingModel || process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest";

    // Use a lower default threshold to catch more potential matches
    this.similarityThreshold =
      options.similarityThreshold ||
      (process.env.SIMILARITY_THRESHOLD
        ? parseFloat(process.env.SIMILARITY_THRESHOLD)
        : 0.65); // Use a 65% threshold by default for better detection

    console.log(
      `Vector similarity service initialized with Ollama embeddings (model: ${this.ollamaEmbeddingModel}) at ${this.ollamaUrl} and threshold: ${this.similarityThreshold}`
    );
  }

  /**
   * Generate embedding vector using Ollama
   */
  private async generateOllamaEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`Generating embedding for text (length: ${text.length}) with model: ${this.ollamaEmbeddingModel}`);
      
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.ollamaEmbeddingModel,
        prompt: text,
      });

      if (response.data && response.data.embedding) {
        console.log(`Successfully generated embedding vector with length: ${response.data.embedding.length}`);
        return response.data.embedding;
      } else {
        console.error("Unexpected response format from Ollama:", response.data);
        // Return a zero vector as fallback
        return new Array(1536).fill(0);
      }
    } catch (error) {
      console.error("Error generating embedding with Ollama:", error);
      console.error("Make sure Ollama is running and the embedding model is available");
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
      ? method.params.map((param) => `${param.name}: ${param.type}`).join(", ")
      : "";

    const methodText = `\nMethod Name: ${method.name}\nParameters: ${paramsText}\nReturn Type: ${method.returnType || "void"}\nDescription: ${method.description || ""}\nImplementation: ${method.code || ""}\n    `.trim();

    // Always use Ollama for embeddings
    return this.generateOllamaEmbedding(methodText);
  }

  /**
   * Add a method to the vector database
   */
  async addMethod(
    method: MethodDefinition,
    componentName: string,
    filePath: string
  ): Promise<void> {
    // Don't add empty methods
    if (!method.code || method.code.trim() === "") return;

    try {
      // Generate embedding vector for the method
      const vector = await this.generateEmbedding(method);

      // Normalize the file path to ensure consistent comparison
      const normalizedPath = path.normalize(filePath);

      // Create a unique ID based on component, method name and path
      const id = `${componentName}_${method.name}_${normalizedPath}`;

      // *** Debug log for adding ***
      if (method.name.toLowerCase().includes("zach")) {
        console.log(`[DEBUG ZACH ADD EMBED-ONLY] Adding method: ${id}`);
        console.log(
          `[DEBUG ZACH ADD EMBED-ONLY] Original code:\n---\n${method.code}\n---`
        );
      }

      // Add to vector database
      this.vectorDb.push({
        id,
        vector,
        methodName: method.name,
        componentName,
        filePath: normalizedPath,
        code: method.code,
      });
    } catch (error) {
      console.error(
        `Error adding method ${method.name} to vector database:`,
        error
      );
    }
  }

  /**
   * Find similar methods for a given method
   */
  async findSimilarMethods(
    method: MethodDefinition,
    componentName: string,
    filePath: string
  ): Promise<SimilarityWarning[]> {
    // Generate embedding for the input method
    const inputVector = await this.generateEmbedding(method);
    const warnings: SimilarityWarning[] = [];

    for (const entry of this.vectorDb) {
      // Skip self-comparison
      if (
        entry.componentName === componentName &&
        entry.methodName === method.name &&
        entry.filePath === filePath
      ) {
        continue;
      }
      const similarity = cosineSimilarity(inputVector, entry.vector);
      if (similarity >= this.similarityThreshold) {
        warnings.push({
          similarTo: entry.methodName,
          score: similarity,
          reason: `Similar to ${entry.methodName} in ${entry.componentName}`,
          filePath: entry.filePath,
          code: entry.code,
        });
      }
    }
    return warnings;
  }

  /**
   * Process all methods in a component to find similarities
   */
  async processComponentMethods(
    componentName: string,
    methods: MethodDefinition[],
    filePath: string
  ): Promise<MethodDefinition[]> {
    for (const method of methods) {
      await this.addMethod(method, componentName, filePath);
      const warnings = await this.findSimilarMethods(method, componentName, filePath);
      method.similarityWarnings = warnings;
    }
    return methods;
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
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        this.vectorDb = data;
      } else {
        throw new Error("Invalid vector database format");
      }
    } catch (error) {
      console.error("Error importing vector database:", error);
    }
  }
}
