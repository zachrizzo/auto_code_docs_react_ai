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
      if (!options.apiKey && !process.env.OPENAI_API_KEY) {
        throw new Error("API key is required when using OpenAI");
      }

      this.openai = new OpenAI({
        apiKey: options.apiKey || process.env.OPENAI_API_KEY,
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
      ? method.params.map((param) => `${param.name}: ${param.type}`).join(", ")
      : "";

    const methodText = `\nMethod Name: ${method.name}\nParameters: ${paramsText}\nReturn Type: ${method.returnType || "void"}\nDescription: ${method.description || ""}\nImplementation: ${method.code || ""}\n    `.trim();

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
