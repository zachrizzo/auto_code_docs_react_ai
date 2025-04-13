import path from "path";

/**
 * Interface matching the expected parser options
 */
export interface ParserOptions {
  rootDir: string;
  componentPath: string;
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

/**
 * Get default parser configuration for the codebase
 */
export function getDefaultParserConfig(): ParserOptions {
  // Configure the parser options for your codebase
  // Adjust these settings to match your project structure
  return {
    rootDir: path.resolve(process.cwd(), "../../../"),
    componentPath: "src/components", // Adjust this to your component directory
    maxDepth: 3,
    includePatterns: ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
    excludePatterns: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  };
}
