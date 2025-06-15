/**
 * Interface for all CLI options accepted by code-y.
 */
export interface CodeYOptions {
  root: string;
  component?: string;
  output: string;
  port: string;
  exclude: string;
  include: string;
  depth: string;
  open: boolean;
  startUi: boolean;
  ai?: string;
  similarityThreshold: string;
  theme: string;
  useOllama: boolean;
  ollamaUrl: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;
  chatModel: string;
  showCode: boolean;
  showMethods?: boolean;
  showSimilarity?: boolean;
  generateDescriptions?: boolean;
}

/**
 * Enhanced configuration structure for better organization
 */
export interface CodeYConfig {
  // Project settings
  project: {
    root: string;
    output: string;
    include: string[];
    exclude: string[];
    maxDepth?: number;
  };
  
  // AI configuration
  ai: {
    provider: 'ollama' | 'openai' | 'langflow';
    enabled: boolean;
    generateDescriptions: boolean;
    models: {
      chat: string;
      embedding: string;
    };
    ollama?: {
      url: string;
      timeout?: number;
    };
    openai?: {
      apiKey?: string;
      baseUrl?: string;
    };
    langflow?: {
      configPath?: string;
      url?: string;
    };
  };
  
  // UI settings
  ui: {
    port: number;
    theme: 'light' | 'dark' | 'auto';
    features: {
      showCode: boolean;
      showMethods: boolean;
      showSimilarity: boolean;
      enableChat: boolean;
    };
  };
  
  // Analysis settings
  analysis: {
    similarity: {
      enabled: boolean;
      threshold: number;
    };
    deduplication: boolean;
    extractMethods: boolean;
  };
}
