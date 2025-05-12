/**
 * Core type definitions used throughout the application
 */

/**
 * General code item for documentation (function or class)
 */
export interface CodeItem {
  /**
   * Name of the code item
   */
  name: string;

  /**
   * Kind of the code item
   */
  kind: 'function' | 'class';

  /**
   * Code of the code item
   */
  code: string;

  /**
   * File path of the code item
   */
  filePath: string;
}

/**
 * Documentation configuration options
 */
export interface DocumentationConfig {
  /**
   * Title of the documentation
   * @default "React Component Documentation"
   */
  title?: string;

  /**
   * Description of the documentation
   * @default "Auto-generated documentation for React components"
   */
  description?: string;

  /**
   * Theme for the documentation
   * @default "light"
   */
  theme?: "light" | "dark";

  /**
   * Output directory for the generated documentation
   * @default "docs"
   */
  outputDir?: string;

  /**
   * Whether to show component source code
   * @default true
   */
  showCode?: boolean;

  /**
   * Whether to show component methods
   * @default true
   */
  showMethods?: boolean;

  /**
   * Whether to show similarity warnings
   * @default true
   */
  showSimilarity?: boolean;
}

/**
 * AI-generated content for summaries and descriptions
 */
export interface AIGeneratedContent {
  /**
   * AI-generated summary of the component or method
   */
  summary?: string;
  
  /**
   * AI-generated detailed description
   */
  description?: string;
}

/**
 * Component property definition
 */
export interface PropDefinition {
  /**
   * Name of the property
   */
  name: string;

  /**
   * Type of the property
   */
  type?: string;

  /**
   * Whether the property is required
   */
  required?: boolean;

  /**
   * Description of the property
   */
  description?: string;

  /**
   * Default value of the property
   */
  defaultValue?: any;
}

/**
 * Method parameter definition
 */
export interface ParamDefinition {
  /**
   * Name of the parameter
   */
  name: string;

  /**
   * Type of the parameter
   */
  type?: string;

  /**
   * Description of the parameter
   */
  description?: string;

  /**
   * Whether the parameter is optional
   */
  optional?: boolean;
}

/**
 * Similarity warning for methods
 */
export interface SimilarityWarning {
  /**
   * Score of the similarity (0-1)
   */
  score: number;

  /**
   * Component name that contains the similar method
   */
  similarTo: string;

  /**
   * Reason for the similarity warning
   */
  reason: string;

  /**
   * File path of the similar method
   */
  filePath: string;

  /**
   * Code of the similar method
   */
  code?: string;
}

/**
 * Method definition
 */
export interface MethodDefinition {
  /**
   * Name of the method
   */
  name: string;

  /**
   * Description of the method
   */
  description?: string;

  /**
   * Parameters of the method
   */
  params?: ParamDefinition[];

  /**
   * Return type of the method
   */
  returnType?: string;

  /**
   * Source code of the method
   */
  code?: string;

  /**
   * Similarity warnings for the method
   */
  similarityWarnings?: SimilarityWarning[];
}

/**
 * Component definition
 */
export interface ComponentDefinition {
  /**
   * Name of the component
   */
  name: string;

  /**
   * Display name of the component
   */
  displayName?: string;

  /**
   * Type of the component (component, function, etc.)
   */
  type?: string;

  /**
   * Description of the component
   */
  description?: string;

  /**
   * Path to the file containing the component
   */
  filePath: string;

  /**
   * Name of the file containing the component
   */
  fileName?: string;

  /**
   * Source code of the component
   */
  sourceCode?: string;

  /**
   * Properties of the component
   */
  props?: PropDefinition[];

  /**
   * Methods of the component
   */
  methods?: MethodDefinition[];

  /**
   * Child components of the component
   */
  childComponents?: ComponentDefinition[];

  /**
   * Category of the component
   */
  category?: string;

  /**
   * Similarity score of the component (0-1)
   */
  similarityScore?: number;

  /**
   * Similarity warnings for the component
   */
  similarityWarnings?: SimilarityWarning[];

  /**
   * AI-generated content for this component
   */
  ai?: AIGeneratedContent;
}

/**
 * Parser options for processing React components
 */
export interface ParserOptions {
  /**
   * Root directory of the project
   */
  rootDir: string;

  /**
   * Path to the component or directory to parse
   */
  componentPath: string;

  /**
   * Patterns to exclude from parsing (defaults to empty array)
   */
  excludePatterns?: string[];

  /**
   * Patterns to include in parsing (defaults to tsx, jsx, js, ts files)
   */
  includePatterns?: string[];

  /**
   * Maximum depth for recursive component parsing (defaults to Infinity)
   */
  maxDepth?: number;

  /**
   * OpenAI API key for similarity analysis
   */
  apiKey?: string | undefined;

  /**
   * Threshold for similarity warnings (0-1, defaults to 0.85)
   */
  similarityThreshold?: number;

  /**
   * Whether to use Ollama instead of OpenAI (defaults to false)
   */
  useOllama?: boolean;

  /**
   * URL for Ollama API (defaults to http://localhost:11434)
   */
  ollamaUrl?: string;

  /**
   * Model to use with Ollama (defaults to nomic-embed-text:latest)
   */
  ollamaModel?: string;
}
