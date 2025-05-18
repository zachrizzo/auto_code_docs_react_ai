import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log("=== PROCESSING COMPONENT DESCRIPTION REQUEST ===");
    
    // Parse request body
    const body = await request.json();
    const { componentName, code, filePath } = body;

    console.log(`Generating description for component: ${componentName}`);
    console.log(`File path: ${filePath || 'Not provided'}`);
    console.log(`Code length: ${code?.length || 0} characters`);

    if (!componentName || !code) {
      console.error("Missing required fields: componentName and code");
      return NextResponse.json(
        { error: "Missing required fields: componentName and code" },
        { status: 400 }
      );
    }

    // Get Ollama configuration
    const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";
    const chatModel = process.env.NEXT_PUBLIC_CHAT_MODEL || "gemma3:4b";
    
    console.log(`Using Ollama at: ${ollamaUrl}`);
    console.log(`Using chat model: ${chatModel}`);

    // Create the prompt for description generation
    const prompt = `
      You are an expert React developer documenting a component library.
      Please provide a clear, concise description of the "${componentName}" component below.
      Focus on:
      - What the component does
      - Key features and functionality
      - Typical use cases

      Keep the description between 2-3 sentences. Be precise and informative.

      Component code:
      ${code}
      ${filePath ? `File path: ${filePath}` : ""}
    `;

    try {
      console.log("Sending request to Ollama API...");
      
      // Make API call to Ollama
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chatModel,
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant specializing in React component documentation.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      // Handle response
      if (!response.ok) {
        console.error(`Ollama API error: ${response.status} ${response.statusText}`);
        // Fallback description if API call fails
        return NextResponse.json({
          description: `The ${componentName} component is a UI element that provides functionality based on its props and implementation. It serves as a reusable building block in the application.`,
          error: `Failed to connect to Ollama: ${response.status} ${response.statusText}`
        });
      }

      const data = await response.json();
      console.log("Received response from Ollama API");
      
      let description;

      if (data.message?.content) {
        description = data.message.content;
        console.log("Successfully extracted description from Ollama response");
      } else {
        console.warn("Unexpected response format from Ollama:", JSON.stringify(data));
        description = `The ${componentName} component is a UI element that provides functionality based on its props and implementation. It serves as a reusable building block in the application.`;
      }

      return NextResponse.json({ 
        description,
        model: chatModel,
        success: true
      });
    } catch (error) {
      console.error("Error generating description with Ollama:", error);
      // Provide a generic description as fallback
      return NextResponse.json({
        description: `The ${componentName} component is a UI element that provides functionality based on its props and implementation. It serves as a reusable building block in the application.`,
        error: `Error connecting to Ollama: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
