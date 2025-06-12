# Code-y: AI-Powered React Documentation Generator

Code-y is a powerful command-line tool that automates the generation of documentation for your React, TypeScript, and JavaScript projects. It leverages AI to create meaningful descriptions, provides vector-based semantic search, and visualizes component relationships to give you a deep understanding of your codebase.

## 🚀 Features

- **Automated Code Analysis**: Scans your entire project to identify components, functions, classes, and their relationships.
- **AI-Powered Descriptions**: Uses Ollama to automatically generate insightful descriptions for your code.
- **Vector Search**: Embeds your code for powerful semantic search capabilities across the entire codebase.
- **Interactive Documentation UI**: A modern Next.js interface to explore, search, and understand your code.
- **Component Relationship Graphs**: Visualize dependencies, import/export flows, and component hierarchies.
- **Highly Configurable**: Use a `codey.config.js` file to tailor the tool to your project's needs.

## 📦 Installation

```bash
# Install globally to use the CLI anywhere
npm install -g @zachrizzo/code-y
```

Alternatively, you can run it directly in your project without installation:

```bash
# Use npx for one-time commands
npx @zachrizzo/code-y <command>
```

## 🚀 Quick Start

Getting started with Code-y is simple.

### 1. Initialize Configuration

In the root of your project, run the `init` command:

```bash
npx @zachrizzo/code-y init
```

This will create a `codey.config.js` file in your project. This file contains all the options for customizing how Code-y scans your project and generates documentation.

### 2. Generate Documentation and Start the Server

Once you are happy with your configuration, run the `generate` command:

```bash
npx @zachrizzo/code-y generate
```

This single command will:
1.  Scan your project based on your configuration.
2.  Analyze all found code files to extract components, functions, and relationships.
3.  Generate vector embeddings for semantic search.
4.  Optionally, generate AI-powered descriptions for your code (if enabled).
5.  Start the documentation UI server.
6.  Automatically open your browser to the documentation site.

## 🛠️ CLI Commands

Code-y provides a few simple commands to manage your documentation workflow.

### `init`

Initializes Code-y by creating a `codey.config.js` file in the current directory.

```bash
npx @zachrizzo/code-y init
```

### `generate`

This is the main command. It scans your codebase, generates all documentation assets, and starts the development server to view the UI.

```bash
npx @zachrizzo/code-y generate [options]
```

**Options:**
- `-r, --root <path>`: The root directory of your project to scan. Overrides `targetDir` in your config.
- `-p, --port <number>`: The port to run the documentation server on. Overrides `uiPort` in your config.
- `--generate-descriptions`: A flag to enable the generation of AI descriptions. Overrides `generateDescriptions` in your config.
- `--ollama-url <url>`: The URL of your Ollama server. Overrides `ollamaBaseUrl` in your config.
- `--ollama-model <model>`: The Ollama model to use for generating descriptions. Overrides `ollamaModel` in your config.
- `--ollama-embedding-model <model>`: The Ollama model to use for creating embeddings. Overrides `ollamaEmbeddingModel` in your config.

### `build`

Generates a static, production-ready build of your documentation UI. This is useful for deploying your documentation to a static hosting service.

```bash
npx @zachrizzo/code-y build [options]
```

**Options:**
- `-r, --root <path>`: Root directory of the project. (Default: current directory)
- `-o, --output <path>`: The output directory for the static build. (Default: "documentation")

You must run the `generate` command at least once before using `build`.

## ⚙️ Configuration (`codey.config.js`)

The `codey.config.js` file provides fine-grained control over the documentation process.

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
  generateDescriptions: false // Set to true to enable AI descriptions by default
};
```

## 🤖 AI Integration

### Using Ollama (Recommended)

Code-y is optimized for local AI processing with Ollama.

1.  **[Install Ollama](https://ollama.ai/download)** on your machine.
2.  Pull the necessary models. The defaults are a great starting point:
    ```bash
    ollama pull gemma3:4b
    ollama pull nomic-embed-text:latest
    ```
3.  Ensure the Ollama server is running before you use Code-y.
4.  Update your `codey.config.js` if you use different models or a different server address.

### Using OpenAI

You can also use OpenAI for description generation.

1.  Get an API key from the [OpenAI Platform](https://platform.openai.com).
2.  Set it in your `codey.config.js` or as an environment variable:
    ```javascript
    // codey.config.js
    module.exports = {
      aiProvider: 'openai',
      openaiApiKey: 'your-api-key-here',
      // ...
    };
    ```
    *Note: The embedding generation still uses Ollama locally for performance and cost-efficiency.*

## License

This project is licensed under the MIT License.

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