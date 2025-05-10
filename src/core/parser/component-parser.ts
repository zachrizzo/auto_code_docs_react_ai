/**
 * Component parsing utilities for extracting component information.
 * Contains functions related to extracting component definitions from files.
 */

import * as reactDocgen from "react-docgen-typescript";
import * as path from "path";
import * as fs from "fs-extra";
import { ComponentDefinition, PropDefinition } from "../types";
import { debug, extractImportedComponentPaths, shouldIncludeFile } from "./file-utils";
import { extractComponentMethods, extractComponentSourceCode } from "./ast-utils";

/**
 * Parse a single component file to extract component definitions.
 * Does not perform similarity analysis.
 * 
 * @param filePath - Path to the component file
 * @param rootDir - Root directory of the project
 * @param parser - React-docgen-typescript parser instance
 * @returns Array of parsed component definitions
 */
export function parseComponentFile(
  filePath: string,
  rootDir: string,
  parser: reactDocgen.FileParser
): ComponentDefinition[] {
  try {
    debug(`Parsing component file: ${filePath}`);
    const components: ComponentDefinition[] = [];

    // Parse the file with react-docgen-typescript
    const result = parser.parse(filePath);
    
    if (result.length === 0) {
      debug(`No components found in ${filePath}`);
      return [];
    }

    debug(`Found ${result.length} components in ${filePath}`);

    // Read the file content once
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Process each component
    for (const component of result) {
      const componentName = component.displayName;
      debug(`Processing component: ${componentName}`);

      // Convert props to our format
      const props: PropDefinition[] = Object.entries(component.props || {}).map(
        ([name, propDef]) => {
          const prop = propDef as any;
          return {
            name,
            type: prop.type?.name || "any",
            required: prop.required || false,
            defaultValue: prop.defaultValue?.value,
            description: prop.description || "",
          };
        }
      );

      // Extract methods using TypeScript AST
      const methods = extractComponentMethods(fileContent, componentName);

      // Extract component source code
      const sourceCode = extractComponentSourceCode(fileContent, componentName);

      // Create component definition
      const componentDef: ComponentDefinition = {
        name: componentName,
        displayName: component.displayName,
        type: "component",
        description: component.description || "",
        filePath,
        fileName: path.basename(filePath),
        sourceCode,
        props,
        methods,
        childComponents: [],
        similarityWarnings: []
      };

      debug(`Added component: ${componentName} with ${methods.length} methods`);
      components.push(componentDef);
    }

    return components;
  } catch (error) {
    console.error(`Error parsing component file: ${filePath}`, error);
    return [];
  }
}

/**
 * Recursively collect component definitions from a file and its imports.
 * 
 * @param parser - React-docgen-typescript parser instance
 * @param componentPath - Path to the component file or directory
 * @param rootDir - Root directory of the project
 * @param includePatterns - Array of glob patterns to include
 * @param excludePatterns - Array of glob patterns to exclude
 * @param depth - Current recursion depth
 * @param maxDepth - Maximum recursion depth
 * @param processedPaths - Set of paths that have already been processed
 * @param collectedComponents - Array to store collected component definitions
 */
export async function collectComponentsRecursively(
  parser: reactDocgen.FileParser,
  componentPath: string,
  rootDir: string,
  includePatterns: string[],
  excludePatterns: string[],
  depth: number,
  maxDepth: number,
  processedPaths: Set<string>,
  collectedComponents: ComponentDefinition[]
): Promise<void> {
  debug(`Collecting component at depth ${depth}: ${componentPath}`);

  // Stop if we've reached max depth
  if (depth > maxDepth) {
    debug(`Reached max depth (${maxDepth}), stopping recursion`);
    return;
  }

  // Skip if we've already processed this path
  if (processedPaths.has(componentPath)) {
    debug(`Already processed: ${componentPath}, skipping`);
    return;
  }

  // Mark as processed to avoid cycles
  processedPaths.add(componentPath);

  try {
    const stats = await fs.stat(componentPath);

    // If it's a directory, get all files in it
    if (stats.isDirectory()) {
      debug(`${componentPath} is a directory, scanning files`);
      const files = await fs.readdir(componentPath);

      for (const file of files) {
        const filePath = path.join(componentPath, file);
        
        // Skip node_modules and hidden files
        if (file === "node_modules" || file.startsWith(".")) {
          continue;
        }

        // Recursively process
        await collectComponentsRecursively(
          parser,
          filePath,
          rootDir,
          includePatterns,
          excludePatterns,
          depth + 1,
          maxDepth,
          processedPaths,
          collectedComponents
        );
      }
    } 
    // If it's a file, parse it if it matches patterns
    else if (stats.isFile()) {
      const relativePath = path.relative(rootDir, componentPath);
      
      // Check if this file should be included based on patterns
      if (shouldIncludeFile(componentPath, rootDir, includePatterns, excludePatterns)) {
        debug(`Parsing file: ${relativePath}`);
        
        // Parse the current file
        const components = parseComponentFile(componentPath, rootDir, parser);
        
        // Add components to the collection
        for (const component of components) {
          collectedComponents.push(component);
        }
        
        // Read file content once for import extraction
        const fileContent = await fs.readFile(componentPath, "utf8");
        
        // Extract and process imported components
        const importPaths = extractImportedComponentPaths(
          fileContent,
          componentPath,
          rootDir
        );
        
        debug(`Found ${importPaths.length} imports in ${relativePath}`);
        
        // Filter to only valid paths based on patterns
        const validPaths = importPaths.filter((importPath) => {
          // Skip already processed paths
          if (processedPaths.has(importPath)) {
            debug(`  Skipping already processed import: ${importPath}`);
            return false;
          }
          
          // Check against include/exclude patterns
          const relativePath = path.relative(rootDir, importPath);
          
          const included = includePatterns.some((pattern) => {
            const matches = shouldIncludeFile(importPath, rootDir, includePatterns, excludePatterns);
            debug(`  Include pattern ${pattern}: ${matches ? "✓" : "✗"}`);
            return matches;
          });
          
          const excluded = excludePatterns.some((pattern) => {
            const matches = shouldIncludeFile(importPath, rootDir, includePatterns, excludePatterns);
            debug(`  Exclude pattern ${pattern}: ${matches ? "✓" : "✗"}`);
            return matches;
          });
          
          return included && !excluded;
        });
        
        debug(`Found ${validPaths.length} valid child component paths`);
        
        // Recursively process imported components
        for (const importPath of validPaths) {
          debug(`Recursively collecting children for: ${importPath}`);
          // Pass the set of processed paths to avoid circular dependencies
          await collectComponentsRecursively(
            parser,
            importPath,
            rootDir,
            includePatterns,
            excludePatterns,
            depth + 1,
            maxDepth,
            processedPaths,
            collectedComponents
          );
        }
      } else {
        debug(`Skipping file (excluded by patterns): ${relativePath}`);
      }
    }
  } catch (error) {
    console.error(
      `Error collecting components recursively from ${componentPath}:`,
      error
    );
  }
}

/**
 * Parses a single component file and its direct imports.
 * This is intended to be called repeatedly for each entry file.
 * 
 * @param options - Parser options object (minus API-related options)
 * @param parserInstance - Pre-configured parser instance
 * @returns Array of parsed component definitions
 */
export async function parseSingleComponentFile(
  options: {
    rootDir: string;
    componentPath: string;
    excludePatterns?: string[];
    includePatterns?: string[];
    maxDepth?: number;
  },
  parserInstance: reactDocgen.FileParser
): Promise<ComponentDefinition[]> {
  const {
    rootDir,
    componentPath,
    excludePatterns = [],
    includePatterns = ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
    maxDepth = Infinity,
  } = options;

  // Resolve absolute paths
  const absoluteRootDir = path.resolve(rootDir);
  const absoluteComponentPath = path.resolve(rootDir, componentPath);

  debug("Absolute Root Dir:", absoluteRootDir);
  debug("Absolute Component Path:", absoluteComponentPath);

  const collectedComponents: ComponentDefinition[] = [];
  await collectComponentsRecursively(
    parserInstance,
    absoluteComponentPath,
    absoluteRootDir,
    includePatterns,
    excludePatterns,
    0, // Start depth at 0
    maxDepth,
    new Set(), // New set for each file parse to handle its own recursion tracking
    collectedComponents
  );

  debug(
    `Collected ${collectedComponents.length} component definitions from ${componentPath}.`
  );
  return collectedComponents;
}
