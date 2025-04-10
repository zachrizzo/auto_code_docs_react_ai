import { parseComponents } from "./core/parser";
import { AiDescriptionGenerator } from "./ai/generator";
import { generateDocumentation as generateDocUI } from "./ui/generator";
import { CodebaseChatService } from "./ai/chat-service";
import {
  ComponentDefinition,
  PropDefinition,
  MethodDefinition,
  ParserOptions,
  DocumentationConfig,
} from "./core/types";
import * as path from "path";
import * as fs from "fs/promises";

// Define the interface for the main API options
export interface DocumentationOptions extends ParserOptions {
  outputDir?: string;
  title?: string;
  description?: string;
  theme?: "light" | "dark" | "auto";
  openBrowser?: boolean;
  port?: number;
  apiKey?: string;
  similarityThreshold?: number;
  useOllama?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string;
  enableChat?: boolean;
  chatModel?: string;
}

export {
  // Core functions
  parseComponents,
  AiDescriptionGenerator,
  generateDocUI,
  CodebaseChatService,

  // Types
  ComponentDefinition,
  PropDefinition,
  MethodDefinition,
  ParserOptions,
  DocumentationConfig,
};

/**
 * Generate documentation for React components
 */
export async function generateDocumentation(
  options: DocumentationOptions
): Promise<string> {
  const {
    componentPath,
    rootDir = process.cwd(),
    outputDir = "./component-docs",
    excludePatterns = [],
    includePatterns = ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
    maxDepth = Infinity,
    title = "React Component Documentation",
    description = "Auto-generated documentation for React components",
    theme = "light",
    openBrowser = false,
    port = process.env.PORT ? parseInt(process.env.PORT) : 3000,
    apiKey = process.env.OPENAI_API_KEY, // Use environment variable if available
    similarityThreshold = process.env.SIMILARITY_THRESHOLD
      ? parseFloat(process.env.SIMILARITY_THRESHOLD)
      : 0.6,
    useOllama = false, // Use Ollama for local embeddings instead of OpenAI
    ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434",
    ollamaModel = process.env.OLLAMA_MODEL || "nomic-embed-text:latest", // Default from shell script
  } = options;

  // Parse components
  const components = await parseComponents({
    rootDir,
    componentPath,
    excludePatterns,
    includePatterns,
    maxDepth,
    apiKey,
    similarityThreshold,
    useOllama,
    ollamaUrl,
    ollamaModel,
  });

  console.log(`Found components before deduplication: ${components.length}`);

  // Deduplicate components (sometimes the same component is found multiple times)
  const uniqueComponents = deduplicateComponents(components);
  console.log(`Components after deduplication: ${uniqueComponents.length}`);

  // Configure output directory
  const absoluteOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.resolve(rootDir, outputDir);

  // Ensure output directory exists
  await fs.mkdir(absoluteOutputDir, { recursive: true });

  // Generate UI files
  await generateDocUI(uniqueComponents, {
    title,
    description,
    theme,
    outputDir: absoluteOutputDir,
    openBrowser,
    port,
  });

  return absoluteOutputDir;
}

/**
 * Remove duplicate components based on name and file path
 */
function deduplicateComponents(
  components: ComponentDefinition[]
): ComponentDefinition[] {
  const seen = new Map<string, ComponentDefinition>();

  for (const component of components) {
    const key = `${component.name}:${component.filePath}`;
    if (!seen.has(key)) {
      seen.set(key, component);
    }
  }

  return Array.from(seen.values());
}
