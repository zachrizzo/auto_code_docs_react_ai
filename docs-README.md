# React Component Documentation Generator

This tool generates detailed documentation for React components and displays them in a beautiful UI.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Usage

The easiest way to generate and view documentation is to use the provided script:

```bash
# Make the script executable
chmod +x generate-and-run-docs.sh

# Run the script (default)
./generate-and-run-docs.sh

# Run with custom options
./generate-and-run-docs.sh --port 3001 --show-similarity true
```

### Script Options

- `--use-ollama`: Use Ollama for embeddings (default: false)
- `--ollama-url`: URL for Ollama server (default: http://localhost:11434)
- `--ollama-model`: Embedding model for Ollama (default: nomic-embed-text:latest)
- `--similarity-threshold`: Threshold for similarity detection (default: 0.6)
- `--port`: Port to run the documentation server on (default: 3000)
- `--enable-chat`: Enable AI chat functionality (default: true)
- `--chat-model`: Model to use for chat (default: gemma3:27b)
- `--show-code`: Show source code in documentation (default: true)
- `--show-methods`: Show methods in documentation (default: true)
- `--show-similarity`: Show method similarity analysis (default: true)
- `--api-key`: OpenAI API key (for embeddings if not using Ollama)

### Viewing Documentation

Once the script is running, the documentation will be available at:

```
http://localhost:3000/docs
```

The URL will also be written to a `docs-url.txt` file in your project root.

## Features

- **Component Overview**: See all components at a glance
- **Props Documentation**: Detailed information about component props
- **Methods Analysis**: View methods with code snippets
- **Source Code Viewing**: Examine the full source code
- **Similarity Analysis**: Find similar methods across components

## Customizing

To customize the documentation generator:

1. Edit `src/ui/app/docs/page.tsx` to change the main documentation page
2. Edit `src/ui/app/docs/[slug]/page.tsx` to change component detail pages
3. Update styles in the appropriate CSS files

## Troubleshooting

If you encounter any issues:

- Make sure you have the correct Node.js version installed
- Check that all dependencies are installed
- Verify the paths in the script point to valid examples
- Check browser console for any errors

## License

This project is licensed under the MIT License - see the LICENSE file for details.
