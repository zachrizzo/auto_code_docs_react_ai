/**
 * Similarity analysis utilities for detecting similar methods.
 * Contains functions for calculating code similarity and processing similarity warnings.
 */

import { ComponentDefinition, MethodDefinition, SimilarityWarning } from "../types";
import { VectorSimilarityService } from "../../ai/vector-similarity/vector-similarity";
import { debug } from "./file-utils";

/**
 * Type definitions for interacting with the Vector Similarity Service
 */
interface SearchResult {
  id: string;
  score: number;
  text?: string;
  metadata?: {
    componentName?: string;
    methodName?: string;
    filePath?: string;
  };
}

/**
 * Adapter for the VectorSimilarityService to simplify the interface for the parser.
 * This adapts the existing VectorSimilarityService to a consistent interface that
 * supports adding documents and searching.
 */
class VectorServiceAdapter {
  private service: VectorSimilarityService;
  
  constructor(service: VectorSimilarityService) {
    this.service = service;
  }
  
  /**
   * Add a document to the vector similarity service
   */
  async addDocument(document: {
    id: string;
    text: string;
    metadata: {
      componentName: string;
      methodName: string;
      filePath: string;
    }
  }): Promise<void> {
    // Create a MethodDefinition object from the document
    const methodDef: MethodDefinition = {
      name: document.metadata.methodName,
      code: document.text,
      params: [],
      returnType: 'unknown'
    };
    
    // Use the original service's addMethod function
    await this.service.addMethod(
      methodDef,
      document.metadata.componentName,
      document.metadata.filePath
    );
  }
  
  /**
   * Search for similar documents
   */
  async search(options: {
    query: string;
    limit?: number;
    excludeIds?: string[];
  }): Promise<SearchResult[]> {
    // Create a temporary method for searching
    const tempMethod: MethodDefinition = {
      name: 'temp_search_method',
      code: options.query,
      params: [],
      returnType: 'unknown'
    };
    
    // Use original findSimilarMethods function
    const results = await this.service.findSimilarMethods(
      tempMethod,
      'temp_component',
      'temp_path'
    );
    
    // Convert to SearchResult format
    return results.map(warning => ({
      id: `${warning.similarTo}`,
      score: warning.score,
      text: warning.code || '',
      metadata: {
        componentName: warning.similarTo.split('.')[0],
        methodName: warning.similarTo,
        filePath: warning.filePath
      }
    })).slice(0, options.limit || 5);
  }
}

/**
 * Takes a list of all parsed components and processes similarities using a provided service.
 * Modifies the component definitions in place by adding similarityWarnings.
 * 
 * @param allParsedComponents - List of all parsed component definitions
 * @param vectorSimilarityService - Vector similarity service instance
 */
export async function processComponentListSimilarities(
  allParsedComponents: ComponentDefinition[],
  vectorSimilarityService: VectorSimilarityService
): Promise<void> {
  debug("Starting similarity processing pass for all components...");

  // Create an adapter for the vector similarity service
  const vectorAdapter = new VectorServiceAdapter(vectorSimilarityService);

  // 2a: Add all methods to the vector database
  debug("Building vector database...");
  let methodCount = 0;
  for (const component of allParsedComponents) {
    if (component.methods) {
      for (const method of component.methods) {
        // Debug log before the check in Pass 2a
        if (method.name.toLowerCase().includes("zach")) {
          console.log(
            `[DEBUG ZACH PARSER 2A] Checking method ${component.name}.${method.name}`
          );
          console.log(`[DEBUG ZACH PARSER 2A] Code exists: ${!!method.code}`);
          console.log(
            `[DEBUG ZACH PARSER 2A] Code trimmed: "${method.code?.trim()}"`
          );
        }

        if (method.code && method.code.trim().length > 0) {
          // Construct a unique ID for the method
          const methodId = `${component.name}.${method.name}`;
          
          // Create a document object for the vector service
          await vectorAdapter.addDocument({
            id: methodId,
            text: method.code,
            metadata: {
              componentName: component.name,
              methodName: method.name,
              filePath: component.filePath
            }
          });
          
          methodCount++;
          debug(`Added method ${methodId} to vector DB`);
        } else {
          debug(
            `Skipping method with no code: ${component.name}.${method.name}`
          );
        }
      }
    }
  }
  debug(`Added ${methodCount} methods to vector database`);

  // 2b: Compare all methods against each other and add warnings
  debug("Processing similarity warnings...");
  let warningCount = 0;
  for (const component of allParsedComponents) {
    if (component.methods) {
      for (const method of component.methods) {
        if (method.code && method.code.trim().length > 0) {
          // Find similar methods in the database
          const searchResults = await vectorAdapter.search({
            query: method.code,
            limit: 5,  // Get top 5 similar methods
            excludeIds: [`${component.name}.${method.name}`] // Exclude current method
          });
          
          // Convert search results to SimilarityWarning objects
          const similarMethods = searchResults.map(result => ({
            score: result.score,
            similarTo: result.metadata?.componentName || 'Unknown Component',
            reason: `Similar implementation to ${result.metadata?.methodName || 'Unknown Method'}`,
            filePath: result.metadata?.filePath || '',
            code: result.text
          }));
          
          if (similarMethods.length > 0) {
            // IMPORTANT: Modify the original object in the list
            method.similarityWarnings = similarMethods;
            warningCount += similarMethods.length;
            debug(
              `Found ${similarMethods.length} warnings for ${component.name}.${method.name}`
            );
          }
        }
      }
    }
  }
  debug(`Found a total of ${warningCount} similarity warnings.`);
}

/**
 * Calculate cosine similarity between two vectors.
 * 
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Cosine similarity score (0-1)
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
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
