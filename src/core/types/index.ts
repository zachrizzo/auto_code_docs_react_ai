/**
 * Core type definitions used throughout the application
 */

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
  filePath?: string;

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
}
