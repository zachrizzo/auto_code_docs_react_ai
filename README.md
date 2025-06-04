# Code-y: AI-Powered React Documentation Generator

Code-y is an AI-powered documentation generator for React applications that provides automated documentation generation with AI chat capabilities, vector search, and component relationship visualization.

## 🚀 Features

- **Automated Documentation Generation**: Analyzes React components, TypeScript classes, and functions
- **AI-Powered Descriptions**: Generates meaningful descriptions using OpenAI or Ollama
- **Vector Search**: Semantic search across your codebase using embeddings
- **Interactive Chat**: Ask questions about your code with AI assistance
- **Component Relationships**: Visualize dependencies and prop flows
- **Modern UI**: Clean, responsive Next.js interface with dark mode support
- **CLI Interface**: Simple commands for initialization, generation, and serving

## 📦 Installation

```bash
npm install -g code-y
# or
yarn global add code-y
# or use directly with npx
npx code-y
```

## 🚀 Quick Start

### 1. Initialize Configuration

```bash
npx code-y init
```

This creates a `codey.config.js` file with default settings.

### 2. Generate and Serve Documentation

```bash
npx code-y serve
```

This command:
- Scans your React project
- Generates documentation with AI
- Starts the documentation UI server
- Opens your browser automatically

## 🛠️ CLI Commands

### `code-y init`
Initialize Code-y configuration in your project.

### `code-y generate`
Generate documentation without starting the server.

```bash
npx code-y generate [options]
```

**Options:**
- `-r, --root <path>` - Root directory of the project (default: current directory)
- `-c, --component <path>` - Path to root component file (optional)
- `-o, --output <path>` - Output directory (default: "documentation")
- `-p, --port <number>` - Port for documentation server (default: 3000)
- `--generate-descriptions` - Generate AI descriptions for components
- `--use-ollama` - Use Ollama for local AI processing
- `--ollama-url <url>` - Ollama server URL (default: http://localhost:11434)
- `--ollama-model <model>` - Ollama model for chat (default: gemma3:4b)

### `code-y serve`
Generate documentation and start the UI server.

```bash
npx code-y serve [options]
```

**Options:**
- `-r, --root <path>` - Root directory to scan
- `-p, --port <number>` - Port for UI server
- `--ollama-url <url>` - URL for Ollama API
- `--ollama-model <model>` - Model for chat
- `--ollama-embedding-model <model>` - Model for embeddings

### `code-y build`
Build static documentation files.

```bash
npx code-y build [options]
```

## ⚙️ Configuration

After running `code-y init`, customize your `codey.config.js`:

```javascript
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
  targetDir: '.',
  
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
  generateDescriptions: false
};
```

## 🤖 AI Integration

### Using Ollama (Recommended for Local Development)

1. [Install Ollama](https://ollama.ai/download)
2. Pull required models:
   ```bash
   ollama pull gemma3:4b
   ollama pull nomic-embed-text:latest
   ```
3. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

### Using OpenAI

1. Get an API key from [OpenAI](https://platform.openai.com)
2. Set in your config or environment:
   ```javascript
   // codey.config.js
   module.exports = {
     aiProvider: 'openai',
     openaiApiKey: 'your-api-key-here',
     // ...
   };
   ```

## 🎨 Features in Detail

### Component Analysis
- Parses React components using `react-docgen-typescript`
- Extracts props, methods, and relationships
- Supports TypeScript and JavaScript
- Handles class components and functional components

### Vector Search
- Creates embeddings for all code elements
- Enables semantic search across your codebase
- Find similar functions and components
- Powered by Ollama or OpenAI embeddings

### AI Chat Interface
- Ask questions about your codebase
- Get explanations for specific components
- Understand relationships between code elements
- Context-aware responses using vector search

### Relationship Visualization
- Interactive dependency graphs
- Component hierarchy views
- Import/export relationships
- Method call tracking

## 🔧 Programmatic Usage

```javascript
import { parseComponents, generateDocumentation } from 'code-y';

// Parse components with AI
const components = await parseComponents({
  rootDir: './src',
  useOllama: true,
  ollamaUrl: 'http://localhost:11434',
  similarityThreshold: 0.3
});

// Generate documentation
const outputPath = await generateDocumentation(components, {
  outputDir: './docs',
  theme: 'dark',
  showCode: true,
  showMethods: true
});
```

## 🐛 Troubleshooting

### Common Issues

**1. "Module not found" errors**
- Ensure you've run `npm install` after cloning
- Try rebuilding: `npm run build`

**2. Ollama connection issues**
- Check if Ollama is running: `curl http://localhost:11434/api/tags`
- Verify models are installed: `ollama list`

**3. Port conflicts**
- Code-y automatically finds free ports
- Or specify a different port: `npx code-y serve -p 3001`

**4. No components found**
- Check your include/exclude patterns in config
- Ensure your React components are properly exported

## 📁 Project Structure

```
code-y/
├── src/
│   ├── cli/          # CLI implementation
│   ├── core/         # Core parsing logic
│   ├── ai/           # AI services
│   └── ui/           # Next.js documentation UI
├── dist/             # Compiled output
└── codey.config.js   # User configuration
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT © [Zach]

## 🔗 Links

- [GitHub Repository](https://github.com/zachrizzo/auto_code_docs_react_ai)
- [Issue Tracker](https://github.com/zachrizzo/auto_code_docs_react_ai/issues)
- [NPM Package](https://www.npmjs.com/package/code-y)