import { NextRequest, NextResponse } from "next/server";
import { CodebaseChatService } from "../../../../ai/chat/chat-service";
import type { ChatMessage } from "../../../../ai/shared/ai.types";
import path from "path";
import fs from "fs-extra";
import axios from "axios";

// Read components from docs-data directory
async function getComponentDefinitions() {
  try {
    console.log("Loading component definitions for vector search...");
    
    // Try multiple possible locations for docs-data
    const possiblePaths = [
      path.join(process.cwd(), "docs-data"),
      path.join(process.cwd(), "src/ui/docs-data"),
      path.join(process.cwd(), "test-docs-project/documentation/docs-data"),
      path.join(process.cwd(), "../test-docs-project/documentation/docs-data")
    ];
    
    let docsDataDir = "";
    let indexPath = "";
    
    // Find the first path that exists and has a component-index.json file
    for (const possiblePath of possiblePaths) {
      const possibleIndexPath = path.join(possiblePath, "component-index.json");
      if (await fs.exists(possibleIndexPath)) {
        docsDataDir = possiblePath;
        indexPath = possibleIndexPath;
        console.log(`Found component data in: ${docsDataDir}`);
        break;
      }
    }
    
    if (!indexPath) {
      // Try looking for code-index.json as an alternative
      for (const possiblePath of possiblePaths) {
        const possibleIndexPath = path.join(possiblePath, "code-index.json");
        if (await fs.exists(possibleIndexPath)) {
          docsDataDir = possiblePath;
          indexPath = possibleIndexPath;
          console.log(`Found code-index.json in: ${docsDataDir}`);
          break;
        }
      }
    }
    
    if (!indexPath) {
      console.error("Component index file not found in any of the expected locations");
      console.error("This will cause vector search to fail. Make sure docs-data directory exists.");
      return [];
    }

    // Read the index file and determine its type
    const indexData = await fs.readJson(indexPath);
    const isCodeIndex = indexPath.includes('code-index.json');
    const components = [];
    
    if (isCodeIndex) {
      // Handle code-index.json format
      console.log(`Found code index with ${Object.keys(indexData).length} entries`);
      
      // Convert code index format to component format
      for (const [filePath, fileData] of Object.entries(indexData)) {
        if (typeof fileData !== 'object' || !fileData) continue;
        
        const fileComponents = fileData as any;
        if (!Array.isArray(fileComponents.components)) continue;
        
        for (const component of fileComponents.components) {
          if (!component.name) continue;
          
          // Create a component definition with methods
          const componentDef = {
            name: component.name,
            filePath: filePath,
            methods: []
          };
          
          // Add methods if they exist
          if (Array.isArray(component.methods)) {
            componentDef.methods = component.methods.map((method: any) => ({
              name: method.name || 'unknown',
              code: method.code || '',
              description: method.description || '',
              params: method.params || [],
              returnType: method.returnType || 'void'
            }));
          }
          
          if (componentDef.methods.length > 0) {
            console.log(`Component ${componentDef.name} has ${componentDef.methods.length} methods`);
            components.push(componentDef);
          } else {
            console.log(`Component ${componentDef.name} has no methods`);
          }
        }
      }
    } else {
      // Handle component-index.json format
      const componentIndex = indexData;
      console.log(`Found ${componentIndex.length} components in index`);
      
      // Load each component's full data
      for (const component of componentIndex) {
        try {
          const componentPath = path.join(docsDataDir, `${component.slug}.json`);
          if (await fs.exists(componentPath)) {
            const componentData = await fs.readJson(componentPath);
            
            // Ensure the component has methods for vector search
            if (componentData.methods && componentData.methods.length > 0) {
              console.log(`Component ${componentData.name} has ${componentData.methods.length} methods`);
            } else {
              console.log(`Component ${componentData.name} has no methods`);
            }
            
            components.push(componentData);
          } else {
            console.warn(`Component data file not found: ${componentPath}`);
          }
        } catch (componentError) {
          console.error(`Error loading component ${component.slug}:`, componentError);
        }
      }
    }

    console.log(`Successfully loaded ${components.length} components with their methods`);
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
    console.log("=== CREATING NEW CHAT SERVICE INSTANCE ===");
    const components = await getComponentDefinitions();
    if (components.length === 0) {
      console.error("WARNING: No components loaded. Vector search will not work!");
    }
    const config = {
      useOllama: true,
      ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
      ollamaModel: process.env.OLLAMA_MODEL || "nomic-embed-text:latest",
      ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest",
      chatModel: process.env.CHAT_MODEL || "gemma3:4b",
      similarityThreshold: process.env.SIMILARITY_THRESHOLD ? parseFloat(process.env.SIMILARITY_THRESHOLD) : 0.3
    };
    chatService = new CodebaseChatService(components, config);
    console.log("=== CHAT SERVICE INITIALIZATION COMPLETE ===");
  }

  return chatService;
}

export async function POST(request: NextRequest) {
  try {
    const { history, query } = await request.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    console.log(`\n=== PROCESSING CHAT REQUEST: "${query}" ===`);
    const service = await getChatService();
    
    // Extract potential component names from the query (words starting with uppercase)
    const potentialComponentNames = query.match(/\b[A-Z][a-zA-Z]*\b/g) || [];
    console.log(`Potential component names extracted: ${potentialComponentNames.join(', ')}`);
    
    // Always perform vector search for every query
    const searchResults = await service.searchCodebase(query);
    console.log(`Vector search found ${searchResults.length} results`);
    
    // Deduplicate search results by component+method name
    const uniqueResults = [];
    const seenKeys = new Set();
    
    for (const result of searchResults) {
      const key = `${result.componentName}.${result.methodName || ''}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueResults.push(result);
      }
    }
    
    console.log(`After deduplication: ${uniqueResults.length} unique results`);
    
    // Build the prompt for the AI, including search results context
    let prompt = query;
    
    if (uniqueResults.length > 0) {
      prompt += "\n\nRelevant code context from vector search:";
      for (const result of uniqueResults.slice(0, 5)) {
        prompt += `\n- [${result.componentName}.${result.methodName || ''}] ${result.description || ''}`;
        prompt += `\n  Code: ${result.code ? result.code.substring(0, 200) + (result.code.length > 200 ? '...' : '') : 'No code available'}`;
      }
    }
    
    // Get chat response
    const { response } = await service.chat(history || [], prompt);
    return NextResponse.json({ response, searchResults: uniqueResults });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
