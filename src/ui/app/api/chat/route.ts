import { NextRequest, NextResponse } from "next/server";
import { CodebaseChatService } from "../../../../ai/chat/chat-service";
import type { ChatMessage } from "../../../../ai/shared/ai.types";
import path from "path";
import fs from "fs-extra";

// Read components from docs-data directory
async function getComponentDefinitions() {
  try {
    // Find the closest docs-data directory to read component data from
    const docsDataDir = path.join(process.cwd(), "docs-data");

    // Read the component index file
    const indexPath = path.join(docsDataDir, "component-index.json");
    if (!(await fs.exists(indexPath))) {
      console.error(`Component index file not found at ${indexPath}`);
      return [];
    }

    const componentIndex = await fs.readJson(indexPath);
    const components = [];

    // Load each component's full data
    for (const component of componentIndex) {
      const componentPath = path.join(docsDataDir, `${component.slug}.json`);
      if (await fs.exists(componentPath)) {
        const componentData = await fs.readJson(componentPath);
        components.push(componentData);
      }
    }

    return components;
  } catch (error) {
    console.error("Error loading component definitions:", error);
    return [];
  }
}

// Initialize the chat service (lazy loading)
let chatService: CodebaseChatService | null = null;

async function getChatService() {
  if (!chatService) {
    const components = await getComponentDefinitions();

    // Initialize with Ollama by default
    chatService = new CodebaseChatService(components, {
      useOllama: true,
      ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
      ollamaModel: process.env.OLLAMA_MODEL || "nomic-embed-text:latest",
      chatModel: process.env.CHAT_MODEL || "gemma:3b",
    });
  }

  return chatService;
}

export async function POST(request: NextRequest) {
  try {
    const { history, query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get chat service
    const service = await getChatService();

    // Process the messages
    const formattedHistory: ChatMessage[] = history || [];

    // Add formatting instructions to the system message
    const formattedQuery = `${query}

FORMATTING INSTRUCTIONS:
- Always use proper Markdown formatting for your responses
- For code blocks:
  - Always specify the language after the opening backticks (e.g., \`\`\`javascript or \`\`\`tsx)
  - Ensure proper indentation in code examples
  - Add comments to explain complex code sections
- For inline code references, use single backticks (e.g., \`useState\`)
- When referring to components, use consistent formatting: \`ComponentName\` and link them with [ComponentName](/components/component-name)
- Break your response into sections with clear headings (## Heading)
- Use bullet points and numbered lists for clarity
- Include relevant examples that demonstrate the concept
- Keep explanations concise and focused on answering the question

Remember to format your code with proper syntax highlighting and ensure all code examples are complete and executable when possible.
`;

    // Get chat response
    const { response, searchResults } = await service.chat(
      formattedHistory,
      formattedQuery
    );

    return NextResponse.json({ response, searchResults });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
