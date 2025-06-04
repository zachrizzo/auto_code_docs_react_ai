import { OpenAI } from "openai";
import { ComponentDefinition, MethodDefinition, SimilarityWarning } from "../../core/types";
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
        : 0.3); // Use a 30% threshold by default for better detection

    console.log(
      `Vector similarity service initialized with Ollama embeddings (model: ${this.ollamaEmbeddingModel}) at ${this.ollamaUrl} and threshold: ${this.similarityThreshold}`
    );
  }

  /**
   * Generate embedding vector using Ollama
   */
  private async generateOllamaEmbedding(text: string): Promise<number[]> {
    // Ensure we have text to embed
    if (!text || text.trim() === "") {
      console.warn("Empty text provided for embedding generation");
      return new Array(1536).fill(0);
    }
    
    // Trim text if it's too long (Ollama may have token limits)
    const trimmedText = text.length > 8000 ? text.substring(0, 8000) : text;
    
    try {
      console.log(`Generating embedding for text (length: ${trimmedText.length}) with model: ${this.ollamaEmbeddingModel}`);
      
      // Make the request to Ollama
      const response = await axios.post(`${this.ollamaUrl}/api/embeddings`, {
        model: this.ollamaEmbeddingModel,
        prompt: trimmedText,
      });

      // Validate the response
      if (response.data && response.data.embedding && response.data.embedding.length > 0) {
        console.log(`Successfully generated embedding vector with length: ${response.data.embedding.length}`);
        return response.data.embedding;
      } else {
        console.error("Unexpected response format from Ollama:", response.data);
        throw new Error("Invalid embedding response from Ollama");
      }
    } catch (error) {
      console.error("Error generating embedding with Ollama:", error);
      console.error("Make sure Ollama is running and the embedding model is available");
      
      // For debugging purposes, let's try to make a simple request to Ollama
      try {
        const testResponse = await axios.get(`${this.ollamaUrl}/api/tags`);
        console.log("Ollama is running. Available models:", testResponse.data);
      } catch (testError) {
        console.error("Failed to connect to Ollama server. Is it running?", testError);
      }
      
      // Return a zero vector as fallback (nomic-embed-text uses 768 dimensions)
      return new Array(768).fill(0);
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
   * Generate embedding vector for a component definition
   */
  private async generateComponentEmbedding(component: ComponentDefinition): Promise<number[]> {
    // Create a text representation of the component
    const componentText = `
Component Name: ${component.name}
Description: ${component.description || ""}
File Path: ${component.filePath || "unknown-path"}
Kind: ${component.type || "component"} 
Source Code:
${component.sourceCode || component.code || ""}
    `.trim();

    // Always use Ollama for embeddings
    return this.generateOllamaEmbedding(componentText);
  }

  /**
   * Add a component definition to the vector database
   */
  private async addComponentDefinitionToDb(component: ComponentDefinition): Promise<void> {
    // Don't add components without source code (either sourceCode or code property)
    if (!(component.sourceCode?.trim() || component.code?.trim())) {
      console.warn(`Skipping component definition ${component.name} without source code.`);
      return;
    }
    if (!component.filePath) {
      console.warn(`Skipping component definition ${component.name} due to missing filePath.`);
      return;
    }

    try {
      // Generate embedding vector for the component definition
      const vector = await this.generateComponentEmbedding(component);

      const normalizedPath = path.normalize(component.filePath);
      const id = `${component.name}__COMPONENT_DEFINITION__${normalizedPath}`;

      this.vectorDb.push({
        id,
        vector,
        componentName: component.name,
        methodName: "", // Empty string for component-level entries
        filePath: normalizedPath,
        code: component.sourceCode || component.code || "", // This is what's used for display
        description: component.description || "",
      });
      console.log(`Added component definition to vector DB: ${id}`);
    } catch (error) {
      console.error(
        `Error adding component definition ${component.name} to vector database:`,
        error
      );
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
   * Process a component definition to add its main information to the vector database.
   */
  async processComponentDefinition(component: ComponentDefinition): Promise<void> {
    console.log(`Processing component definition for: ${component.name}`);
    
    if (!component.name) {
      console.warn("Skipping component definition with no name.");
      return;
    }
    // Check for main code in either sourceCode or code property
    if (!(component.sourceCode?.trim() || component.code?.trim())) {
      console.warn(`Skipping component definition ${component.name} due to empty source code.`);
      return;
    }
    if (!component.filePath) {
      console.warn(`Skipping component definition ${component.name} due to missing filePath.`);
      return;
    }

    try {
      await this.addComponentDefinitionToDb(component);
      console.log(`Successfully processed component definition for: ${component.name}`);
    } catch (error) {
      console.error(`Error processing component definition ${component.name}:`, error);
    }
  }

  /**
   * Process all methods in a component to find similarities
   */
  async processComponentMethods(
    componentName: string,
    methods: MethodDefinition[],
    filePath: string
  ): Promise<MethodDefinition[]> {
    console.log(`Processing ${methods.length} methods for component: ${componentName}`);
    
    // Skip if no methods to process
    if (!methods || methods.length === 0) {
      console.warn(`No methods to process for component: ${componentName}`);
      return methods;
    }
    
    // Process each method
    let processedCount = 0;
    let errorCount = 0;
    
    for (const method of methods) {
      try {
        // Skip methods without code
        if (!method.code || method.code.trim() === "") {
          console.warn(`Skipping method without code: ${method.name} in ${componentName}`);
          continue;
        }
        
        // Add method to vector database
        await this.addMethod(method, componentName, filePath);
        processedCount++;
        
        // Find similar methods
        const warnings = await this.findSimilarMethods(method, componentName, filePath);
        method.similarityWarnings = warnings;
        
        if (warnings.length > 0) {
          console.log(`Found ${warnings.length} similar methods for ${method.name} in ${componentName}`);
        }
      } catch (error) {
        console.error(`Error processing method ${method.name} in ${componentName}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Processed ${processedCount}/${methods.length} methods for ${componentName} (${errorCount} errors)`);
    console.log(`Vector database now contains ${this.vectorDb.length} entries`);
    
    return methods;
  }

  /**
   * Export the vector database to JSON
   */
  exportVectorDatabase(): string {
    return JSON.stringify(this.vectorDb, null, 2);
  }

  /**
   * Clear the in-memory vector database
   */
  public clearVectorDatabase(): void {
    this.vectorDb = [];
    console.log("In-memory vector database cleared.");
    // Optionally, also delete the file if it exists to prevent reloading old data on next full app restart
    // if (fs.existsSync(this.vectorDbPath)) {
    //   try {
    //     fs.unlinkSync(this.vectorDbPath);
    //     console.log(`Deleted vector database file: ${this.vectorDbPath}`);
    //   } catch (err) {
    //     console.error(`Error deleting vector database file ${this.vectorDbPath}:`, err);
    //   }
    // }
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
