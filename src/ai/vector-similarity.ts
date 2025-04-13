import { OpenAI } from "openai";
import { MethodDefinition, SimilarityWarning } from "../core/types";
import axios from "axios";
import crypto from "crypto";
import path from "path";

// Vector database for storing embeddings locally
interface VectorEntry {
  id: string; // Unique ID: componentName_methodName_filePath
  vector: number[];
  methodName: string;
  componentName: string;
  filePath: string;
  code: string;
}

export interface VectorSimilarityOptions {
  apiKey?: string;
  useOllama?: boolean;
  useOpenAI?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string;
  similarityThreshold?: number; // Default 0.85 (85%)
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

    // Use a lower default threshold to catch more potential matches
    this.similarityThreshold =
      options.similarityThreshold ||
      (process.env.SIMILARITY_THRESHOLD
        ? parseFloat(process.env.SIMILARITY_THRESHOLD)
        : 0.65); // Use a 65% threshold by default for better detection

    console.log(
      `Vector similarity service initialized with threshold: ${this.similarityThreshold}`
    );
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
Implementation: ${method.code || ""}
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
        `Error adding method ${method.name} from ${componentName} to vector DB:`,
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
    // Ensure method has code
    if (!method.code || method.code.trim() === "") {
      return [];
    }

    // *** Debug log for finding ***
    if (method.name.toLowerCase().includes("zach")) {
      console.log(
        `[DEBUG ZACH FIND EMBED-ONLY] Processing method: ${componentName}.${method.name}`
      );
      console.log(
        `[DEBUG ZACH FIND EMBED-ONLY] Original code:\n---\n${method.code}\n---`
      );
    }

    // Skip extremely short methods (simple heuristic, could be removed if desired)
    // if (method.code.trim().length < 20) {
    //   return [];
    // }

    // Create a unique ID for the current method for self-comparison
    const normalizedPath = path.normalize(filePath);
    const currentId = `${componentName}_${method.name}_${normalizedPath}`;

    // Generate vector for the current method (only needed once)
    const vector = await this.generateEmbedding(method);

    const similarityResults: SimilarityWarning[] = [];

    // Compare with all vectors in the database
    for (const entry of this.vectorDb) {
      // Skip comparing to itself using the ID
      if (entry.id === currentId) continue;

      // Always calculate vector similarity
      const similarity = this.cosineSimilarity(vector, entry.vector);

      // Debug log comparing similarity score
      if (
        method.name.toLowerCase().includes("zach") ||
        entry.methodName.toLowerCase().includes("zach")
      ) {
        console.log(
          `[DEBUG ZACH COMPARE EMBED-ONLY] Comparing ${currentId} with ${entry.id}`
        );
        console.log(
          `[DEBUG ZACH COMPARE EMBED-ONLY] Vector similarity calculated: ${similarity}. Threshold: ${this.similarityThreshold}`
        );
      }

      // If similarity exceeds threshold, add a warning
      if (similarity >= this.similarityThreshold) {
        // Log when pushing warning
        if (
          method.name.toLowerCase().includes("zach") ||
          entry.methodName.toLowerCase().includes("zach")
        ) {
          console.log(
            `[DEBUG ZACH COMPARE EMBED-ONLY] Similarity above threshold! Pushing warning.`
          );
        }
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

    console.log(
      `Processing ${methods.length} methods in ${componentName} for similarity`
    );

    // Important: First add ALL methods to the vector database
    // This ensures that methods within this component can be compared to each other
    for (const method of methods) {
      if (!method.code || method.code.trim() === "") {
        console.warn(
          `Method ${method.name} in ${componentName} has no code defined`
        );
        continue;
      }

      // Add method to database
      await this.addMethod(method, componentName, filePath);
    }

    // Now process each method to find similarities
    for (const method of methods) {
      // Skip methods without code
      if (!method.code || method.code.trim() === "") {
        enhancedMethods.push(method);
        continue;
      }

      // Find similar methods
      const similarMethods = await this.findSimilarMethods(
        method,
        componentName,
        filePath
      );

      if (similarMethods.length > 0) {
        method.similarityWarnings = similarMethods;
      }

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
