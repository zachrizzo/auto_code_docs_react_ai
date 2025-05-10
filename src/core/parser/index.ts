/**
 * Main entry point for the parser module.
 * Exports the public API for parsing React components.
 */

import path from "path";
import * as reactDocgen from "react-docgen-typescript";
import { ComponentDefinition, ParserOptions } from "../types";
import { findTsConfig, debug } from "./file-utils";
import { parseSingleComponentFile } from "./component-parser";
import { processComponentListSimilarities } from "./similarity";
import { VectorSimilarityService } from "../../ai/vector-similarity/vector-similarity";

/**
 * Recursively parse React components starting from the root component.
 * This is the main entry point for parsing components.
 * 
 * @param options - Parser options
 * @returns Promise resolving to an array of parsed component definitions
 * 
 * @example
 * ```typescript
 * const components = await parseComponents({
 *   rootDir: "./src",
 *   componentPath: "./components",
 *   maxDepth: 3
 * });
 * ```
 */
export async function parseComponents(
  options: ParserOptions
): Promise<ComponentDefinition[]> {
  const {
    rootDir,
    componentPath,
    excludePatterns = [],
    includePatterns = ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
    maxDepth = Infinity,
    apiKey,
    similarityThreshold,
    useOllama,
    ollamaUrl,
    ollamaModel,
  } = options;

  // Initialize vector similarity service if API key is provided or Ollama is enabled
  let vectorSimilarityService: VectorSimilarityService | null = null;

  if (useOllama) {
    vectorSimilarityService = new VectorSimilarityService({
      useOllama: true,
      ollamaUrl,
      ollamaModel,
      similarityThreshold,
    });
    debug("Vector similarity service initialized with Ollama");
  } else if (apiKey) {
    vectorSimilarityService = new VectorSimilarityService({
      apiKey,
      similarityThreshold,
    });
    debug("Vector similarity service initialized with OpenAI");
  } else {
    // Always initialize with Ollama as fallback rather than skipping
    vectorSimilarityService = new VectorSimilarityService({
      useOllama: true,
      ollamaUrl: "http://localhost:11434", // Default Ollama URL
      ollamaModel: "nomic-embed-text:latest", // Default Ollama embedding model
      similarityThreshold: similarityThreshold || 0.85,
    });
    debug(
      "Vector similarity service initialized with default Ollama settings (fallback)"
    );
  }

  // Resolve absolute paths
  const absoluteRootDir = path.resolve(rootDir);
  
  debug("Absolute Root Dir:", absoluteRootDir);
  debug("Include Patterns:", includePatterns);
  debug("Exclude Patterns:", excludePatterns);

  // Find suitable tsconfig.json file
  const tsconfigPath = findTsConfig(absoluteRootDir);
  
  if (!tsconfigPath) {
    console.warn("No tsconfig.json found, using default TypeScript settings");
  }

  // Set up react-docgen-typescript parser
  const parserOptions = {
    propFilter: (prop: any) => {
      return !prop.parent || !prop.parent.fileName.includes("node_modules");
    },
    shouldExtractLiteralValuesFromEnum: true,
    shouldRemoveUndefinedFromOptional: true,
  };

  const parser = tsconfigPath 
    ? reactDocgen.withCustomConfig(tsconfigPath, parserOptions)
    : reactDocgen.withDefaultConfig(parserOptions);

  // Parse components
  debug(`Starting component parsing with react-docgen-typescript...`);
  const allParsedComponents = await parseSingleComponentFile(
    {
      rootDir,
      componentPath,
      excludePatterns,
      includePatterns,
      maxDepth,
    },
    parser
  );

  debug(`Parsed ${allParsedComponents.length} components initially`);

  // Only run similarity analysis if we have a vector service and components with methods
  if (vectorSimilarityService) {
    debug(`Starting similarity analysis pass...`);
    
    // Perform similarity analysis
    await processComponentListSimilarities(
      allParsedComponents,
      vectorSimilarityService
    );
    
    debug(`Similarity analysis completed`);
  } else {
    debug("Skipping similarity analysis (no vector service)");
  }

  return allParsedComponents;
}

// Re-export utility functions that may be useful to consumers
export { parseSingleComponentFile } from "./component-parser";
export { calculateCosineSimilarity } from "./similarity";
export { debug } from "./file-utils";
