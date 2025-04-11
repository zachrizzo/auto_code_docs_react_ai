import { OpenAI } from "openai";
import { MethodDefinition, SimilarityWarning } from "../core/types";
import axios from "axios";
import crypto from "crypto";
import path from "path";

// Vector database for storing embeddings locally
interface VectorEntry {
  id: string;
  vector: number[];
  methodName: string;
  componentName: string;
  filePath: string;
  code: string;
  codeHash: string;
}

export interface VectorSimilarityOptions {
  apiKey?: string;
  useOllama?: boolean;
  useOpenAI?: boolean;
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
  private ollamaUrl: string =
    process.env.OLLAMA_URL || "http://localhost:11434";
  private ollamaModel: string =
    process.env.OLLAMA_MODEL || "nomic-embed-text:latest";

  constructor(options: VectorSimilarityOptions) {
    // Use useOpenAI if explicitly set, otherwise use !useOllama
    const useOpenAI =
      options.useOpenAI !== undefined
        ? options.useOpenAI
        : !(options.useOllama || false);

    this.useOllama = !useOpenAI;

    if (this.useOllama) {
      // Use Ollama for local embeddings
      this.ollamaUrl =
        options.ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434";
      this.ollamaModel =
        options.ollamaModel ||
        process.env.OLLAMA_MODEL ||
        "nomic-embed-text:latest";
      this.model = "ollama";
      console.log(
        `Using local embeddings with Ollama (${this.ollamaModel}) at ${this.ollamaUrl}`
      );
    } else {
      // Use OpenAI for embeddings
      if (!options.apiKey) {
        throw new Error("API key is required when using OpenAI");
      }

      this.openai = new OpenAI({
        apiKey: options.apiKey,
      });
      this.model = options.model || "text-embedding-3-small";
    }

    this.similarityThreshold =
      options.similarityThreshold ||
      (process.env.SIMILARITY_THRESHOLD
        ? parseFloat(process.env.SIMILARITY_THRESHOLD)
        : 0.85);
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
    const codeHash = crypto
      .createHash("md5")
      .update(method.code || "")
      .digest("hex");

    // Normalize the file path to ensure consistent comparison
    const normalizedPath = path.normalize(filePath);

    // Create a unique ID that includes code hash to ensure uniqueness
    const id = `${componentName}_${method.name}_${normalizedPath}_${codeHash}`;

    this.vectorDb.push({
      id,
      vector,
      methodName: method.name,
      componentName,
      filePath: normalizedPath,
      code: method.code || "",
      codeHash,
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

    // Generate the same hash as in addMethod
    const codeHash = crypto
      .createHash("md5")
      .update(method.code || "")
      .digest("hex");

    // Normalize the file path to ensure consistent comparison
    const normalizedPath = path.normalize(filePath);

    // Create the same unique ID format as in addMethod
    const currentId = `${componentName}_${method.name}_${normalizedPath}_${codeHash}`;
    const methodNameLower = method.name.toLowerCase();

    const similarityResults: SimilarityWarning[] = [];

    // Compare with all vectors in the database
    for (const entry of this.vectorDb) {
      // Skip comparing to itself by ID
      if (entry.id === currentId) continue;

      // Additional check: also skip if code hash is identical (same method in different places)
      if (entry.codeHash === codeHash && entry.code === (method.code || ""))
        continue;

      // Skip methods with the same name from the same component in the same file
      // This handles cases where a method might be processed multiple times with slight differences
      if (
        entry.componentName === componentName &&
        entry.methodName === method.name &&
        entry.filePath === normalizedPath
      )
        continue;

      // Skip trivial methods (common utility functions with the same name)
      const entryNameLower = entry.methodName.toLowerCase();
      if (
        methodNameLower === entryNameLower &&
        [
          "get",
          "set",
          "is",
          "has",
          "update",
          "delete",
          "create",
          "handle",
          "on",
          "toggle",
          "add",
          "remove",
        ].some((prefix) => methodNameLower.startsWith(prefix))
      ) {
        // Higher threshold for common utility methods with same name
        const minThreshold = this.similarityThreshold + 0.1;
        const similarity = this.cosineSimilarity(vector, entry.vector);
        if (similarity < minThreshold) continue;
      }

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
          code: entry.code,
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
      // Ensure the method code is set
      if (!method.code) {
        console.warn(
          `Method ${method.name} in ${componentName} has no code defined`
        );
      }

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
