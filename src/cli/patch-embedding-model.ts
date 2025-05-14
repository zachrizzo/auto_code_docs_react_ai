/**
 * This file patches the CLI to ensure Ollama embedding model is properly used for similarity search
 * without requiring explicit flags
 */
import { VectorSimilarityService } from "../ai/vector-similarity/vector-similarity";

/**
 * Create a vector similarity service that always uses Ollama for embeddings
 * This is a wrapper to ensure the correct embedding model is used by default
 */
export function createVectorSimilarityService(options?: {
  ollamaUrl?: string;
  ollamaEmbeddingModel?: string;
  similarityThreshold?: number;
}) {
  // Set environment variables to ensure Ollama is used by default throughout the app
  process.env.OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
  process.env.OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest";
  
  // Always use Ollama for embeddings with the specified embedding model
  return new VectorSimilarityService({
    // Use options if provided, otherwise use environment variables with defaults
    ollamaUrl: options?.ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434",
    ollamaEmbeddingModel: options?.ollamaEmbeddingModel || process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest",
    similarityThreshold: options?.similarityThreshold || 0.65,
  });
}
