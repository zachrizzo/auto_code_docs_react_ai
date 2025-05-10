# Chat Feature Module

This folder contains all code for the codebase-aware chat assistant.

- `chat-service.ts`: Main service for chat with code context (OpenAI/Ollama support)
- `chat.types.ts`: Types/interfaces specific to chat
- `utils/chat-utils.ts`: Utility functions for chat logic
- `index.ts`: Barrel export for all chat features

## Usage Example

```ts
import { CodebaseChatService } from '../ai/chat';
import type { ChatMessage } from '../ai/chat';

const chatService = new CodebaseChatService(components, { apiKey: 'sk-...', useOllama: false });
const { response, searchResults } = await chatService.chat([
  { role: 'user', content: 'How does Button work?' }
], 'How does Button work?');
```

## Structure
- All types for chat are in `chat.types.ts`
- Utilities for chat are in `utils/`
- For shared types/utilities, use `../shared/`
