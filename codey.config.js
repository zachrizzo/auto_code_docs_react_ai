module.exports = {
  // AI Provider: 'openai' or 'ollama'
  aiProvider: 'ollama',
  
  // OpenAI API Key (if using OpenAI)
  openaiApiKey: process.env.OPENAI_API_KEY,
  
  // Ollama configuration (if using Ollama)
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'gemma3:4b',
  ollamaEmbeddingModel: 'nomic-embed-text:latest',
  
  // Target directory for scanning
  targetDir: './test-project',
  
  // Patterns to exclude from scanning
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**'
  ],
  
  // Patterns to include in scanning
  includePatterns: [
    '**/*.tsx',
    '**/*.jsx',
    '**/*.ts',
    '**/*.js'
  ],
  
  // Output directory for documentation
  outputDir: 'documentation',
  
  // Port for documentation UI server
  uiPort: 3000,
  
  // Theme for documentation
  theme: 'light',
  
  // Feature flags
  showCode: true,
  showMethods: true,
  showSimilarity: true,
  generateDescriptions: true
};
