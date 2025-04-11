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
  cachePath?: string; // Path for documentation cache
  useOpenAI?: boolean; // New flag to explicitly use OpenAI instead of Ollama
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
    useOpenAI = false, // Default to not using OpenAI
    useOllama = !useOpenAI, // Use Ollama by default
    ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434",
    ollamaModel = process.env.OLLAMA_MODEL || "nomic-embed-text:latest", // Default from shell script
    cachePath = path.join(process.cwd(), ".docs-cache", "docs-cache.json"), // Default cache path
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

  // If explicitly using OpenAI and API key is provided, enhance components with AI descriptions
  if (useOpenAI && apiKey) {
    const aiGenerator = new AiDescriptionGenerator({
      apiKey,
      cachePath,
      model: options.chatModel,
    });

    // Enhance with descriptions
    await aiGenerator.enhanceComponentsWithDescriptions(uniqueComponents);
  }

  return absoluteOutputDir;
}

/**
 * Remove duplicate components based on name and file path
 */
function deduplicateComponents(
  components: ComponentDefinition[]
): ComponentDefinition[] {
  const seen = new Map<string, ComponentDefinition>();
  const result: ComponentDefinition[] = [];

  // Helper function to recursively process components and their children
  function processComponent(
    component: ComponentDefinition
  ): ComponentDefinition {
    const key = `${component.name}:${component.filePath}`;

    // Process child components recursively
    if (component.childComponents && component.childComponents.length > 0) {
      const uniqueChildren: ComponentDefinition[] = [];
      const childNameSet = new Set<string>();

      for (const child of component.childComponents) {
        const childKey = `${child.name}:${child.filePath}`;

        // Only add this child if we haven't already seen it at this level
        if (!childNameSet.has(childKey)) {
          childNameSet.add(childKey);
          uniqueChildren.push(processComponent(child));
        }
      }

      // Replace with deduplicated children
      component.childComponents = uniqueChildren;
    }

    return component;
  }

  // First pass: collect all unique components by name + file path
  for (const component of components) {
    const key = `${component.name}:${component.filePath}`;

    // If this is a new component, add it to our seen map
    if (!seen.has(key)) {
      seen.set(key, component);
    } else {
      // If we've seen it before, keep the one with more information
      const existing = seen.get(key)!;

      // Choose the better component (prefer ones with more details)
      const currentHasMoreInfo =
        (component.description && !existing.description) ||
        (component.props?.length || 0) > (existing.props?.length || 0) ||
        (component.methods?.length || 0) > (existing.methods?.length || 0);

      if (currentHasMoreInfo) {
        seen.set(key, component);
      }
    }
  }

  // Process all top-level components and deduplicate their children
  for (const component of seen.values()) {
    result.push(processComponent(component));
  }

  console.log(`Initial components: ${components.length}`);
  console.log(`After deduplication: ${result.length}`);

  return result;
}
