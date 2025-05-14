/**
 * Shared types for AI features (chat, vector-similarity, generator, etc).
 * Use this file for any types/interfaces used across multiple features.
 */

/**
 * Options for configuring the chat service or generator.
 * @example
 * const options: ChatServiceOptions = {
 *   apiKey: 'sk-...'
 *   useOllama: false,
 *   chatModel: 'gpt-4',
 * };
 */
export interface ChatServiceOptions {
  /** OpenAI API key (required if using OpenAI) */
  apiKey?: string;
  /** Use Ollama for local chat (overrides useOpenAI if true) */
  useOllama?: boolean;
  /** Use OpenAI for chat (overrides useOllama if true) */
  useOpenAI?: boolean;
  /** Ollama server URL */
  ollamaUrl?: string;
  /** Ollama model name (for chat) */
  ollamaModel?: string;
  /** Ollama embedding model name (for vector search) */
  ollamaEmbeddingModel?: string;
  /** Chat model name (OpenAI or Ollama) */
  chatModel?: string;
  /** Similarity threshold for vector search */
  similarityThreshold?: number;
}

/**
 * Represents a single message in a chat conversation.
 * @example
 * const msg: ChatMessage = { role: 'user', content: 'Hello!' };
 */
export interface ChatMessage {
  /** The sender's role */
  role: 'system' | 'user' | 'assistant';
  /** The message content */
  content: string;
}

/**
 * Result of a codebase search for relevant code.
 * @example
 * const result: CodebaseSearchResult = {
 *   componentName: 'Button',
 *   methodName: 'handleClick',
 *   code: 'function handleClick() {}',
 *   filePath: 'src/components/Button.tsx',
 *   similarity: 0.82,
 * };
 */
export interface CodebaseSearchResult {
  /** Name of the component */
  componentName: string;
  /** Optional method name within the component */
  methodName?: string;
  /** Source code of the component or method */
  code: string;
  /** File path of the code */
  filePath: string;
  /** Optional description of the code */
  description?: string;
  /** Similarity score (0-1) */
  similarity: number;
}

/**
 * Options for configuring the generator service.
 * @example
 * const options: GeneratorServiceOptions = {
 *   apiKey: 'sk-...',
 *   useOllama: false,
 *   model: 'gpt-4',
 * };
 */
export interface GeneratorServiceOptions {
  apiKey?: string;
  useOllama?: boolean;
  ollamaUrl?: string;
  model?: string;
}

/**
 * Result of a code generation request.
 * @example
 * const result: GeneratorResult = { code: 'function foo() {}' };
 */
export interface GeneratorResult {
  code: string;
}
