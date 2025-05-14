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
  showMethods: boolean;
  showSimilarity: boolean;
  generateDescriptions: boolean;
}
