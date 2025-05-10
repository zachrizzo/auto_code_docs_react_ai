# Generator Feature Module

This folder contains all code for the code generation assistant.

- `generator-service.ts`: Main service for code generation (OpenAI/Ollama support)
- `generator.types.ts`: Types/interfaces specific to code generation
- `utils/generator-utils.ts`: Utility functions for code generation
- `README.md`: Usage and structure docs

## Usage Example

```ts
import { CodebaseGeneratorService } from '../ai/generator';
import type { GeneratorServiceOptions } from '../ai/generator';

const generator = new CodebaseGeneratorService({ apiKey: 'sk-...' });
const code = await generator.generateComponent('Create a React button');
```

## Structure
- All types for generator are in `generator.types.ts`
- Utilities for generator are in `utils/`
- For shared types/utilities, use `../shared/`
