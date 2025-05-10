/**
 * Options for configuring the chat service.
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
  /** Ollama model name */
  ollamaModel?: string;
  /** Chat model name (OpenAI or Ollama) */
  chatModel?: string;
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
