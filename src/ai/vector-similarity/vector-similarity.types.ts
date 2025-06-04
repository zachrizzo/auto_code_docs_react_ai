// Types and interfaces for vector similarity feature
import { MethodDefinition, SimilarityWarning } from "../../core/types";

/**
 * Represents a single vector entry for a method in the vector database.
 */
export interface VectorEntry {
  id: string; // Unique ID: componentName_methodName_filePath
  vector: number[];
  methodName: string;
  componentName: string;
  filePath: string;
  code: string;
  description?: string; // Optional description for the component or method
}

/**
 * Options for configuring the VectorSimilarityService.
 */
export interface VectorSimilarityOptions {
  apiKey?: string;
  useOllama?: boolean;
  useOpenAI?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string; // For backwards compatibility (chat model)
  ollamaEmbeddingModel?: string; // Explicit embedding model for vector search
  similarityThreshold?: number; // Default 0.85 (85%)
  model?: string;
}
