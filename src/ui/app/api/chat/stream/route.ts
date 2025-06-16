import { NextRequest } from "next/server";
import path from "path";
import fs from "fs-extra";
import { getLangFlowClient } from "../../../../lib/langflow-client";

// Read components from docs-data directory
async function getComponentDefinitions() {
  try {
    console.log("Loading component definitions for vector search...");
    
    // Try multiple possible locations for docs-data
    const possiblePaths = [
      path.join(process.cwd(), "public/docs-data/docs-data"),  // Symlinked path
      path.join(process.cwd(), "public/docs-data"),
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
    const components: any[] = [];
    
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

// Check if LangFlow is enabled and available
async function isLangFlowAvailable(): Promise<boolean> {
  // LangFlow is now required, so we just check if it's running
  if (process.env.USE_LANGFLOW !== 'true') {
    console.error("LangFlow is not enabled. Set USE_LANGFLOW=true environment variable.");
    return false;
  }
  
  try {
    const client = getLangFlowClient(process.env.LANGFLOW_URL);
    const isHealthy = await client.healthCheck();
    if (!isHealthy) {
        console.error("LangFlow health check failed.");
    }
    return isHealthy;
  } catch (error) {
    console.error("Error connecting to LangFlow:", error);
    return false;
  }
}

// Initialize LangFlow with documentation data
async function initializeLangFlowWithDocs() {
  const client = getLangFlowClient(process.env.LANGFLOW_URL);
  const components = await getComponentDefinitions();
  
  console.log(`Initializing LangFlow with ${components.length} components...`);
  
  // Add all components to LangFlow vector database
  const documents: any[] = [];
  for (const component of components) {
    // Add component itself
    documents.push({
      docId: `component_${component.slug || component.name}`,
      content: `Component: ${component.name}\nFile: ${component.filePath}\nCode: ${component.code || ''}\nDescription: ${component.description || ''}`,
      metadata: {
        type: 'component',
        name: component.name,
        slug: component.slug || component.name.toLowerCase().replace(/\s+/g, '-'),
        filePath: component.filePath
      }
    });
    
    // Add each method
    if (component.methods && Array.isArray(component.methods)) {
      for (const method of component.methods) {
        documents.push({
          docId: `method_${component.slug || component.name}_${method.name}`,
          content: `Method: ${method.name} in ${component.name}\nCode: ${method.code || ''}\nDescription: ${method.description || ''}\nParameters: ${JSON.stringify(method.params || [])}\nReturn Type: ${method.returnType || 'void'}`,
          metadata: {
            type: 'method',
            componentName: component.name,
            componentSlug: component.slug || component.name.toLowerCase().replace(/\s+/g, '-'),
            methodName: method.name,
            filePath: component.filePath
          }
        });
      }
    }
  }
  
  // Add documents in batches
  if (documents.length > 0) {
    await client.addDocumentsBatch(documents);
    console.log(`Added ${documents.length} documents to LangFlow vector database`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { history, query, sessionId, model } = await request.json();
    if (!query) {
      const encoder = new TextEncoder();
      return new Response(encoder.encode("data: " + JSON.stringify({ error: "Query is required" }) + "\n\n"), {
        status: 400,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }
    
    console.log(`\n=== PROCESSING STREAMING CHAT REQUEST VIA LANGFLOW ===`);
    console.log(`User query: "${query}"`);
    console.log(`Selected model: ${model || 'default'}`);
    console.log(`History length: ${history?.length || 0}`);
    
    // Check if LangFlow is available
    const langFlowAvailable = await isLangFlowAvailable();
    if (!langFlowAvailable) {
      const encoder = new TextEncoder();
      return new Response(encoder.encode("data: " + JSON.stringify({ error: "Chat service is unavailable. LangFlow is not running or not configured correctly." }) + "\n\n"), {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }
    
    console.log("Using LangFlow for streaming AI chat...");
      
    try {
      const client = getLangFlowClient(process.env.LANGFLOW_URL);
      
      // Initialize LangFlow with docs if this is the first request
      let initialized = (global as any).langflowInitialized || false;
      if (!initialized) {
        await initializeLangFlowWithDocs();
        (global as any).langflowInitialized = true;
      }
      
      // Convert history to chat context
      const context = {
        history: history || [],
        timestamp: new Date().toISOString()
      };
      
      // Use provided session ID or generate a persistent one based on browser session
      const persistentSessionId = sessionId || `session_${Buffer.from(JSON.stringify(context.history.slice(-3))).toString('base64').slice(0, 12)}`;
      
      // Create a ReadableStream for streaming response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            // Use the streaming method from LangFlow client
            const streamGenerator = client.chatStream({
              message: query,
              context,
              sessionId: persistentSessionId,
              model: model,
            });
            
            for await (const chunk of streamGenerator) {
              // Send each chunk as Server-Sent Event
              const data = encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`);
              controller.enqueue(data);
            }
            
            // Send completion signal
            const endData = encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`);
            controller.enqueue(endData);
            
          } catch (error) {
            console.error("Streaming error:", error);
            const errorData = encoder.encode(`data: ${JSON.stringify({ error: "Streaming failed", details: (error as Error).message })}\n\n`);
            controller.enqueue(errorData);
          } finally {
            controller.close();
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
      
    } catch (langFlowError) {
      console.error("An error occurred during LangFlow streaming communication:", langFlowError);
      const encoder = new TextEncoder();
      const errorData = encoder.encode(`data: ${JSON.stringify({ error: "Failed to get response from chat service.", details: (langFlowError as Error).message })}\n\n`);
      return new Response(errorData, {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      });
    }
  } catch (error: any) {
    console.error("Error processing streaming chat request:", error.message || error);
    console.error("Stack trace:", error.stack);
    
    const encoder = new TextEncoder();
    const errorData = encoder.encode(`data: ${JSON.stringify({ error: "Failed to process request", details: error.message || "Unknown error" })}\n\n`);
    return new Response(errorData, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  }
}