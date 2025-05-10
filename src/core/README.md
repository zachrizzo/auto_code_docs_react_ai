# Core Module

The Core module contains the essential functionality for parsing React components and generating documentation.

## Structure

- **`/types/`**: Contains all type definitions for the application
  - `index.ts` - Main entry point with all type definitions

- **`/parser/`**: Modularized parser implementation
  - `index.ts` - Main entry point and API for the parser
  - `ast-utils.ts` - TypeScript AST utilities
  - `component-parser.ts` - Component parsing logic
  - `file-utils.ts` - File system and path utilities
  - `similarity.ts` - Similarity analysis utilities

- **`index.ts`**: Main entry point for the core module
- **`parser.ts`**: Deprecated file that re-exports from the new modular parser
- **`types.ts`**: Deprecated file that re-exports from the new types directory

## Usage

```typescript
// Import from the main entry point
import { parseComponents, ComponentDefinition } from '../core';

// Or import from specific modules
import { parseComponents } from '../core/parser';
import { ComponentDefinition } from '../core/types';
```

## Type Definitions

The core types are:

- `ComponentDefinition` - Represents a parsed React component
- `PropDefinition` - Represents a component prop
- `MethodDefinition` - Represents a component method
- `ParserOptions` - Options for the parser
- `DocumentationConfig` - Configuration for documentation generation

## Parser

The parser module is responsible for:

1. Finding and parsing React component files
2. Extracting props, methods and their documentation
3. Building the component hierarchy
4. Analyzing code similarity between components

