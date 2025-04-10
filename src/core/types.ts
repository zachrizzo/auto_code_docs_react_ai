export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface SimilarityWarning {
  similarTo: string;
  score: number;
  reason: string;
  filePath: string;
}

export interface ComponentDefinition {
  name: string;
  description?: string;
  props: PropDefinition[];
  filePath: string;
  sourceCode?: string;
  childComponents?: ComponentDefinition[];
  methods?: MethodDefinition[];
  similarityWarnings?: SimilarityWarning[];
}

export interface MethodDefinition {
  name: string;
  description?: string;
  params: {
    name: string;
    type: string;
    description?: string;
  }[];
  returnType?: string;
  returnDescription?: string;
  code?: string;
  similarityWarnings?: SimilarityWarning[];
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

export interface DocumentationConfig {
  title?: string;
  description?: string;
  theme?: "light" | "dark" | "auto";
  outputDir?: string;
  openBrowser?: boolean;
  port?: number;
}
