/**
 * File system utilities for the parser module.
 * Contains functions for path resolution, file access, and pattern matching.
 */

import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import { minimatch } from "minimatch";

// Enable debug logging
const DEBUG = true;

/**
 * Logs debug information when DEBUG is enabled
 * @param args - Arguments to log
 */
export function debug(...args: any[]): void {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

/**
 * Resolves a relative import path to an absolute file path
 * 
 * @param importPath - The import path string (e.g., './Button')
 * @param currentFilePath - The absolute path of the file containing the import
 * @param rootDir - The root directory of the project
 * @returns The resolved absolute path or null if it couldn't be resolved
 */
export function resolveImportPath(
  importPath: string,
  currentFilePath: string,
  rootDir: string
): string | null {
  try {
    debug(`Resolving import: ${importPath} from ${currentFilePath}`);
    
    if (importPath.startsWith(".")) {
      // Relative import path
      const baseDir = path.dirname(currentFilePath);
      
      // Try resolving with different extensions
      const extensions = [".tsx", ".jsx", ".ts", ".js"];
      
      // First try direct path with extensions
      for (const ext of extensions) {
        const resolvedPath = path.resolve(baseDir, `${importPath}${ext}`);
        if (fs.existsSync(resolvedPath)) {
          debug(`  Resolved to: ${resolvedPath}`);
          return resolvedPath;
        }
      }
      
      // Then try as directory with index files
      const dirPath = path.resolve(baseDir, importPath);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        for (const ext of extensions) {
          const indexPath = path.resolve(dirPath, `index${ext}`);
          if (fs.existsSync(indexPath)) {
            debug(`  Found index file with extension: ${ext}`);
            return indexPath;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error resolving import path ${importPath}:`, error);
    return null;
  }
}

/**
 * Checks if a file matches the include/exclude patterns
 * 
 * @param filePath - The file path to check
 * @param rootDir - The root directory of the project
 * @param includePatterns - Array of glob patterns to include
 * @param excludePatterns - Array of glob patterns to exclude
 * @returns True if the file should be included, false otherwise
 */
export function shouldIncludeFile(
  filePath: string,
  rootDir: string,
  includePatterns: string[],
  excludePatterns: string[]
): boolean {
  // Get relative path for pattern matching
  const relativePath = path.relative(rootDir, filePath);
  
  // Check include patterns
  const included = includePatterns.some((pattern) => {
    const matches = minimatch(relativePath, pattern);
    debug(`  Include pattern ${pattern}: ${matches ? "✓" : "✗"}`);
    return matches;
  });
  
  // Check exclude patterns
  const excluded = excludePatterns.some((pattern) => {
    const matches = minimatch(relativePath, pattern);
    debug(`  Exclude pattern ${pattern}: ${matches ? "✓" : "✗"}`);
    return matches;
  });
  
  return included && !excluded;
}

/**
 * Finds a suitable tsconfig.json file for the project
 * 
 * @param rootDir - The root directory of the project
 * @returns Path to the tsconfig.json file or null if not found
 */
export function findTsConfig(rootDir: string): string | null {
  // First check in the specified root directory
  let tsconfigPath = path.join(rootDir, "tsconfig.json");
  debug("Looking for tsconfig at:", tsconfigPath);
  
  // Check if the tsconfig exists, if not, try looking for it in parent directories
  if (!fs.existsSync(tsconfigPath)) {
    debug("tsconfig not found, looking in parent directories");
    let currentDir = rootDir;
    const rootDrive = path.parse(currentDir).root;
    
    while (currentDir !== rootDrive) {
      const testPath = path.join(currentDir, "tsconfig.json");
      debug("Checking for tsconfig at:", testPath);
      if (fs.existsSync(testPath)) {
        tsconfigPath = testPath;
        debug("Found tsconfig at:", tsconfigPath);
        return tsconfigPath;
      }
      currentDir = path.dirname(currentDir);
    }
  } else {
    return tsconfigPath;
  }
  
  // Fall back to the project's main tsconfig if none found
  debug("No tsconfig found in parent directories, falling back to project tsconfig");
  const projectRoot = path.resolve(__dirname, "../../..");
  tsconfigPath = path.join(projectRoot, "tsconfig.json");
  
  if (fs.existsSync(tsconfigPath)) {
    return tsconfigPath;
  }
  
  return null;
}

/**
 * Extract imported component paths from file content
 * 
 * @param fileContent - The content of the file to analyze
 * @param currentFilePath - The absolute path of the file
 * @param rootDir - The root directory of the project
 * @returns Array of absolute paths to imported components
 */
export function extractImportedComponentPaths(
  fileContent: string,
  currentFilePath: string,
  rootDir: string
): string[] {
  const importPaths: string[] = [];
  // Track processed paths to avoid circular dependencies
  const processedPaths = new Set<string>();

  try {
    // Create a simpler but more robust regex to match all imports
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(fileContent)) !== null) {
      const importPath = match[1]; // The captured import path
      debug(
        `Found import: "${importPath}" in ${path.basename(currentFilePath)}`
      );

      // Only process relative imports
      if (importPath.startsWith(".")) {
        // Avoid re-processing the same paths
        if (processedPaths.has(importPath)) {
          debug(`  Skipping already processed import: ${importPath}`);
          continue;
        }

        processedPaths.add(importPath);

        // Resolve the import path
        const resolvedPath = resolveImportPath(
          importPath,
          currentFilePath,
          rootDir
        );

        if (resolvedPath) {
          debug(`  Adding resolved path: ${resolvedPath}`);
          importPaths.push(resolvedPath);
        } else {
          debug(`  Could not resolve import path: ${importPath}`);
        }
      } else {
        debug(`  Skipping non-relative import: ${importPath}`);
      }
    }

    return importPaths;
  } catch (error) {
    console.error(
      `Error extracting import paths from ${currentFilePath}:`,
      error
    );
    return [];
  }
}
