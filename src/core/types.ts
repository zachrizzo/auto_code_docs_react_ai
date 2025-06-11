export interface ParamDefinition {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
}

export interface MethodDefinition {
  name: string;
  description?: string;
  params?: ParamDefinition[];
  returns?: string;
  returnType?: string;
  code?: string;
  similarityWarnings?: SimilarityWarning[];
  declarationLineStart?: number;
  declarationLineEnd?: number;
}

export interface SimilarityWarning {
  similarTo: string;
  score: number;
  reason: string;
  filePath: string;
  code: string;
  slug?: string;
}

export interface MethodCallInfo {
  callingEntitySlug: string; // Slug of the entity (component, class, function) making the call
  targetEntitySlug: string;  // Slug of the entity (component, class, function) being called
  targetMethodName?: string; // Optional: Name of the specific method if applicable
  sourceFile: string;        // File path where the call occurs
  sourceLine: number;        // Line number of the call
}

export interface EntityUsage {
  entitySlug: string;        // Entity being used
  usedInFile: string;        // File where it's used
  usedByEntity: string;      // Entity that's using it
  usageType: 'import' | 'call' | 'render' | 'extends' | 'implements';
  usageLine: number;         // Line where it's used
}

export interface DuplicateCodeMatch {
  sourceEntity: string;
  targetEntity: string;
  sourceMethod?: string;
  targetMethod?: string;
  similarity: number;
  reason: string;
  sourceCode: string;
  targetCode: string;
  sourceFile: string;
  targetFile: string;
  sourceLine?: number;
  targetLine?: number;
}

export interface PropDrillingInfo {
  entitySlug: string;
  filePath: string;
  propsCount: number;
  propNames: string[];
  line: number;
  severity: 'low' | 'medium' | 'high';
}

export interface EntityDeclaration {
  entitySlug: string;        // Unique identifier for the entity
  entityName: string;        // Original name of the entity
  entityType: 'component' | 'class' | 'function' | 'method';
  declarationFile: string;   // File where this entity is declared
  declarationLine: number;   // Line number where declared
  exportType?: 'default' | 'named' | 'none'; // How it's exported
}

export interface CodeItem {
  name: string;
  type: string;
  filePath: string;
  code: string;
  kind?: 'function' | 'class';
}

export interface ParserOptions {
  rootDir: string;
  componentPath: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  maxDepth?: number;
  apiKey?: string | undefined;
  similarityThreshold?: number;
  useOllama?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export interface ComponentDefinition {
  name: string;
  type: string;
  filePath: string;
  fileName?: string;
  description?: string;
  props?: PropDefinition[];
  methods?: MethodDefinition[];
  sourceCode: string;
  code?: string;
  slug?: string;
  childComponents?: string[];
  displayName?: string;
  declarationLineStart?: number;
  declarationLineEnd?: number;
  imports?: string[];
  references?: string[];
  relationships?: any[];
  declaration?: EntityDeclaration;
  usages?: EntityUsage[];
  propDrilling?: PropDrillingInfo[];
  similarityWarnings?: SimilarityWarning[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description?: string;
} 