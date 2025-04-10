# Recursive React Docs AI

Automatically generate AI-powered documentation for React components with recursive component discovery and function similarity detection.

## Features

- **Recursive Component Analysis**: Automatically analyzes your React component structure recursively.
- **AI-Powered Descriptions**: Uses OpenAI to generate human-readable descriptions for components, props, and methods.
- **Function Similarity Detection**: Identifies methods with similar functionality to prevent duplicated code.
- **Interactive UI**: Explore components, visualize component relationships, and understand function similarities.
- **Modern Design**: Clean, responsive documentation with light/dark mode support.

## Installation

```bash
npm install recursive-react-docs-ai
```

## Quick Start

Generate documentation for your React project:

```bash
npx docs-by-zach generate -r ./your-project -c src/App.jsx --ai YOUR_OPENAI_API_KEY
```

## Command Options

| Option                            | Description                                                         |
| --------------------------------- | ------------------------------------------------------------------- |
| `-r, --root <path>`               | Root directory of the project                                       |
| `-c, --component <path>`          | Path to the root component, relative to root                        |
| `-o, --output <path>`             | Output directory (default: "docs")                                  |
| `-p, --port <number>`             | Port to serve documentation (default: 3000)                         |
| `-e, --exclude <patterns>`        | Glob patterns to exclude (comma-separated)                          |
| `-i, --include <patterns>`        | Glob patterns to include (comma-separated)                          |
| `-d, --depth <number>`            | Maximum recursion depth (default: Infinity)                         |
| `--open`                          | Open documentation in browser when done                             |
| `--ai <apiKey>`                   | OpenAI API key for generating descriptions                          |
| `--similarity-threshold <number>` | Threshold for function similarity detection (0.0-1.0, default: 0.8) |
| `--theme <theme>`                 | Theme for documentation (light, dark, auto)                         |

## Function Similarity Detection

This tool helps identify potentially duplicated or similar functions across your codebase. It works by:

1. Extracting function code and metadata from your components
2. Using OpenAI's embedding models to vectorize function characteristics
3. Computing similarity scores between functions
4. Visualizing relationships between similar functions

Benefits:

- Identify code duplication opportunities
- Understand function relationships
- Refactor similar functions into shared utilities
- Improve code maintainability

The similarity visualization tab shows connections between functions that are functionally similar, even if they have different names or implementations.

### How to Use Similarity Detection

1. Provide your OpenAI API key when generating documentation:

   ```bash
   npx docs-by-zach generate -r ./your-project -c src/App.jsx --ai YOUR_OPENAI_API_KEY
   ```

2. Adjust the similarity threshold if needed (default is 0.8 or 80%):

   ```bash
   npx docs-by-zach generate -r ./your-project -c src/App.jsx --ai YOUR_OPENAI_API_KEY --similarity-threshold 0.7
   ```

3. Open the generated documentation and navigate to the "Function Similarities" tab to view the visualization.

## API Usage

You can also use the library programmatically:

```javascript
import {
  parseComponents,
  generateDocumentation,
} from "recursive-react-docs-ai";

// Parse components with similarity detection
const components = await parseComponents({
  rootDir: "./your-project",
  componentPath: "src/App.jsx",
  apiKey: "YOUR_OPENAI_API_KEY",
  similarityThreshold: 0.8,
});

// Generate documentation
const outputPath = await generateDocumentation(components, {
  outputDir: "docs",
  theme: "light",
});

console.log(`Documentation generated at ${outputPath}`);
```

## License

MIT
# auto_code_docs_react_ai
