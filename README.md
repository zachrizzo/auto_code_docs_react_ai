# Code-y: Your Complete Local-First AI-Powered Code Documentation Platform

Code-y is the most comprehensive, **100% local-first** command-line tool and documentation platform for React, TypeScript, and JavaScript projects. It combines advanced static code analysis, AI-powered insights, and an interactive web interface to give you unprecedented visibility into your codebase. **Everything runs on your machine** - your code never leaves your workstation.

## 🔒 Privacy-First Philosophy

**Your code stays on your machine.** Code-y is designed with privacy as the foundation:
- All AI processing happens locally via Ollama or your own OpenAI API key
- Vector embeddings are generated and stored locally
- No data transmission to external services (unless you explicitly configure OpenAI)
- Complete offline capability with local AI models
- Full control over your documentation and analysis data

## 🚀 Complete Feature Overview

### 🧠 Advanced Code Analysis Engine

#### Deep AST (Abstract Syntax Tree) Parsing
- **Multi-language Support**: Full TypeScript (`.ts`, `.tsx`) and JavaScript (`.js`, `.jsx`) analysis
- **Nested Code Extraction**: Discovers functions within functions, methods within classes, and complex component hierarchies
- **Entity Recognition**: Automatically identifies and categorizes:
  - React Components (functional and class-based)
  - Functions and arrow functions
  - Classes and their methods
  - Interfaces and types
  - Constants and variables
  - Custom hooks

#### Comprehensive Relationship Mapping
- **Import/Export Analysis**: Tracks all module dependencies and exports
- **Component Usage Detection**: Identifies where components are rendered (JSX usage)
- **Method Call Tracking**: Maps function and method invocations across files
- **Inheritance Relationships**: Detects class extensions and interface implementations
- **Circular Dependency Detection**: Identifies and warns about circular imports
- **Prop Drilling Analysis**: Detects excessive prop passing through component hierarchies

#### Intelligent Duplicate Detection
- **Multi-level Similarity Analysis**:
  - Exact duplicates (100% identical code)
  - Near duplicates (95%+ similarity with minor differences)
  - Structural similarity (same logic, different variable names)
  - Pattern-based similarity (similar algorithms or approaches)
- **Smart Deduplication**: Automatically consolidates duplicate entities while preserving all file locations
- **Similarity Scoring**: Uses advanced algorithms including:
  - Hash-based comparison for exact matches
  - Token-based Jaccard similarity
  - AST structure comparison
  - Code length and complexity analysis

### 🤖 Local AI-Powered Intelligence

#### Flexible AI Backend Options
- **Ollama Integration** (Recommended): 100% local AI processing
  - Supports multiple models (Gemma, Llama, CodeLlama, etc.)
  - Automatic model management and downloading
  - No internet required after initial setup
- **OpenAI Integration**: Optional cloud-based processing with your API key
- **LangFlow Workflows**: Visual AI pipeline designer for custom workflows

#### Advanced Vector Similarity System
- **Semantic Code Search**: Find code by meaning, not just keywords
- **FAISS Vector Database**: High-performance similarity search with 768-dimensional embeddings
- **Nomic Embed Text Model**: Specialized embedding model for code understanding
- **Cosine Similarity Scoring**: Precise similarity measurements with configurable thresholds
- **Real-time Vector Generation**: Automatic embedding creation during analysis

#### AI-Generated Documentation
- **Intelligent Descriptions**: Context-aware explanations for components, functions, and methods
- **Prop Documentation**: Automatic description generation for component properties
- **Code Explanation**: Natural language explanations of complex code logic
- **Smart Caching**: Avoids regenerating descriptions for unchanged code

### 📊 Interactive Documentation Interface

#### Multi-View Dashboard
- **Component Explorer**: Browse all components with filtering and search
- **Function Library**: Dedicated view for standalone functions
- **Class Browser**: Object-oriented code exploration
- **Method Inspector**: Deep dive into class and component methods

#### Advanced Visualization Tools
- **Interactive Relationship Graph**: 
  - Force-directed network visualization
  - Zoom, pan, and focus controls
  - Node filtering by type and connections
  - Real-time layout algorithms
- **Code Architecture Overview**:
  - File structure visualization
  - Dependency flow diagrams
  - Component hierarchy trees
  - Import/export relationship maps

#### Comprehensive Search & Discovery
- **Global Search**: Find any code entity across your entire project
- **Semantic Search**: AI-powered search that understands code meaning
- **Advanced Filtering**: Filter by file type, component type, method count, etc.
- **Similarity Explorer**: Discover similar code patterns and potential refactoring opportunities

#### Code Quality Analysis
- **Duplicate Code Reports**: Detailed analysis of code duplication with severity levels
- **Similarity Warnings**: Identify potentially redundant implementations
- **Relationship Analysis**: Understand component coupling and dependencies
- **Architecture Insights**: High-level codebase structure analysis

### 💬 Intelligent Chat Interface

#### Context-Aware AI Assistant
- **Codebase-Aware Conversations**: Chat about your specific code with full context
- **Natural Language Queries**: Ask questions like "How does the Button component work?"
- **Code Explanation**: Get detailed explanations of complex code sections
- **Refactoring Suggestions**: AI-powered recommendations for code improvements

#### Advanced Chat Features
- **Session Memory**: Maintains conversation context across interactions
- **Code References**: Direct links to discussed code sections
- **Multi-model Support**: Choose from different AI models for varied perspectives
- **Export Conversations**: Save important discussions for team sharing

### 🛠️ Powerful CLI Interface

#### Main Commands
- **`generate`**: Complete documentation generation and server startup
- **`serve-ui`**: Start the documentation interface without regeneration
- **`init`**: Initialize configuration files and setup
- **`cleanup`**: Remove temporary files and AI environments
- **`build`**: Build the documentation for deployment
- **`start`**: Display help and available commands

#### Global Options
- **`--cwd <path>`**: Set working directory (work on any project from anywhere)
- **`--help`**: Comprehensive help system
- **`--version`**: Version information

#### Generate Command Options
- **Project Configuration**:
  - `--root <path>`: Specify project root directory
  - `--port <number>`: Set documentation server port (default: 3000)
  - `--output <path>`: Custom output directory for documentation files

- **AI Configuration**:
  - `--ollama-url <url>`: Ollama server URL (default: http://localhost:11434)
  - `--ollama-model <model>`: Chat model selection (default: gemma:3b)
  - `--ollama-embedding-model <model>`: Embedding model (default: nomic-embed-text:latest)
  - `--generate-descriptions`: Enable AI description generation
  - `--no-ai`: Disable all AI features for basic documentation

- **Analysis Options**:
  - `--langflow-config <path>`: Custom LangFlow configuration file
  - `--cleanup-on-exit`: Clean up temporary files when done
  - `--keep-environment`: Preserve Python virtual environment for faster subsequent runs

### 🔧 Advanced Configuration

#### Configuration File Support
- **`codey.config.js`**: Main configuration file with full option support
- **Environment Variables**: Override settings via environment variables
- **LangFlow Configuration**: Visual AI workflow designer integration
- **Custom Embedding Models**: Support for different AI models and providers

#### Flexible Architecture
- **Docker Integration**: Automatic container management for AI services
- **Python Environment Management**: Automatic virtual environment creation and management
- **Service Discovery**: Automatic detection and configuration of AI services
- **Fallback Systems**: Graceful degradation when AI services are unavailable

### 📈 Performance & Scalability

#### Optimized Processing
- **Incremental Analysis**: Only reprocess changed files
- **Parallel Processing**: Multi-threaded analysis for large codebases
- **Smart Caching**: Intelligent caching of analysis results and AI responses
- **Memory Management**: Efficient handling of large projects

#### Scalable Architecture
- **Batch Processing**: Handle thousands of files efficiently
- **Streaming Analysis**: Process large files without memory issues
- **Background Processing**: Non-blocking AI operations
- **Resource Management**: Automatic cleanup and optimization

## 🚀 Quick Start

### Installation & Basic Usage

```bash
# Install globally
npm install -g code-y

# Generate documentation for current directory
npx code-y generate

# Generate with AI descriptions
npx code-y generate --generate-descriptions

# Work on a different project
npx code-y --cwd /path/to/project generate

# Start with custom configuration
npx code-y generate --langflow-config ./my-ai-config.json
```

### Advanced Usage Examples

```bash
# Complete AI-powered analysis
npx code-y generate --generate-descriptions --ollama-model llama3:8b

# Basic documentation without AI
npx code-y generate --no-ai

# Custom output and port
npx code-y generate --output ./my-docs --port 8080

# Clean up after analysis
npx code-y cleanup

# Just serve existing documentation
npx code-y serve-ui --port 3001
```

## 📁 Project Structure

```
your-project/
├── documentation/           # Generated documentation
│   ├── docs-data/          # JSON data files
│   │   ├── component-index.json
│   │   ├── [component-slug].json
│   │   └── config.json
│   └── vector-db/          # Vector embeddings (if AI enabled)
├── codey.config.js         # Configuration file (optional)
├── langflow-config.json    # AI workflow configuration (optional)
└── docs-url.txt           # Quick access URL file
```

## 🔧 Configuration Options

### codey.config.js Example

```javascript
module.exports = {
  root: './src',
  output: './documentation',
  port: 3000,
  generateDescriptions: true,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'gemma:3b',
  ollamaEmbeddingModel: 'nomic-embed-text:latest',
  showCode: true,
  showMethods: true,
  showSimilarity: true,
  theme: 'light',
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**'
  ],
  include: [
    '**/*.tsx',
    '**/*.jsx',
    '**/*.ts',
    '**/*.js'
  ]
}
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code contributions and pull requests
- Bug reports and feature requests
- Documentation improvements
- AI model integrations

## 📄 License

This project is licensed under a custom license. See the `LICENSE` file for details.

## 🔗 Links

- [Documentation](http://localhost:3000) (after running `npx code-y generate`)
- [GitHub Repository](https://github.com/your-username/code-y)
- [Issue Tracker](https://github.com/your-username/code-y/issues)

---

**Code-y: Where AI meets code analysis, all running locally on your machine.**