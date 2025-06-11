/**
 * Main entry point for the parser module.
 * Exports the public API for parsing React components.
 */

import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import * as reactDocgen from "react-docgen-typescript";
import { ComponentDefinition, ParserOptions, CodeItem, EntityDeclaration } from "../types";
import { findTsConfig, debug } from "./file-utils";
import { parseSingleComponentFile } from "./component-parser";
import { processComponentListSimilarities } from "./similarity";
import { VectorSimilarityService } from "../../ai/vector-similarity/vector-similarity";
import { extractAllTopLevelCodeItems, extractAllEntities, extractEntityDeclarations } from "./ast-utils";

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

  // First pass: Extract all available entities for relationship validation
  debug(`First pass: Extracting all entities...`);
  const availableEntities = await extractAllEntities(
    absoluteRootDir,
    includePatterns,
    excludePatterns
  );
  debug(`Found ${availableEntities.size} entities in codebase`);

  // Parse components with entity validation
  debug(`Second pass: Starting component parsing with react-docgen-typescript...`);
  const allParsedComponents = await parseSingleComponentFile(
    {
      rootDir,
      componentPath,
      excludePatterns,
      includePatterns,
      maxDepth,
      availableEntities,
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

/**
 * Build a map of all entity declarations in the codebase
 * @param rootDir - Root directory to scan
 * @param includePatterns - Patterns to include
 * @param excludePatterns - Patterns to exclude
 * @returns Map of entity slug to declaration info
 */
export async function buildEntityDeclarationMap(
  rootDir: string,
  includePatterns: string[] = ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
  excludePatterns: string[] = ["node_modules/**", "**/node_modules/**"]
): Promise<Map<string, EntityDeclaration>> {
  const entityMap = new Map<string, EntityDeclaration>();
  
  try {
    const files = await glob(includePatterns, {
      cwd: rootDir,
      ignore: excludePatterns,
      absolute: true
    });
    
    for (const filePath of files) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const declarations = extractEntityDeclarations(fileContent, filePath);
        
        // Add each declaration to the map
        declarations.forEach(decl => {
          // If we already have this entity, prefer exported versions
          const existing = entityMap.get(decl.entitySlug);
          if (!existing || 
              (decl.exportType !== 'none' && existing.exportType === 'none') ||
              (decl.exportType === 'default' && existing.exportType === 'named')) {
            entityMap.set(decl.entitySlug, decl);
          }
        });
      } catch (error) {
        debug(`Error processing file ${filePath}:`, error);
      }
    }
    
    debug(`Built entity map with ${entityMap.size} entities`);
    return entityMap;
  } catch (error) {
    console.error('Error building entity declaration map:', error);
    return entityMap;
  }
}

/**
 * Parse all top-level functions and classes in all JS/TS files in a directory tree (excluding node_modules)
 */
export async function parseAllCodeItems(rootDir: string): Promise<CodeItem[]> {
  const patterns = ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"];
  const ignore = ["**/node_modules/**"];
  const files = await glob(patterns, {
    cwd: rootDir,
    ignore,
    absolute: true,
  });
  const allItems: CodeItem[] = [];
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const items = extractAllTopLevelCodeItems(content).map(item => ({
        ...item,
        filePath,
        type: item.kind, // Map kind to type for compatibility
      }));
      allItems.push(...items);
    } catch (err) {
      debug(`Failed to parse file: ${filePath}`, err);
    }
  }
  return allItems;
}

// Re-export utility functions that may be useful to consumers
export { parseSingleComponentFile } from "./component-parser";
export { calculateCosineSimilarity, processComponentListSimilarities } from "./similarity";
export { debug } from "./file-utils";
