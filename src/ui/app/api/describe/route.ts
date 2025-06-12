import { NextResponse } from "next/server";
import * as fs from "fs-extra";
import * as path from "path";

export async function POST(request: Request) {
  try {
    console.log("=== PROCESSING COMPONENT DESCRIPTION REQUEST ===");
    
    // Parse request body
    const body = await request.json();
    const { componentName, code, filePath, slug } = body;

    console.log(`Generating description for component: ${componentName}`);
    console.log(`File path: ${filePath || 'Not provided'}`);
    console.log(`Slug: ${slug || 'Not provided'}`);
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
          stream: false,
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

      // Save the description to the component's JSON file if slug is provided
      if (slug) {
        try {
          const docsDataPath = path.join(process.cwd(), "public", "docs-data");
          const componentFilePath = path.join(docsDataPath, `${slug}.json`);
          
          console.log(`Attempting to update component file: ${componentFilePath}`);
          
          // Check if the component file exists
          if (await fs.pathExists(componentFilePath)) {
            // Read the existing component data
            const componentData = await fs.readJson(componentFilePath);
            
            // Update the description
            componentData.description = description;
            componentData.lastUpdated = new Date().toISOString();
            
            // Write the updated data back to the file
            await fs.writeJson(componentFilePath, componentData, { spaces: 2 });
            
            console.log(`Successfully updated description for component: ${componentName}`);
          } else {
            console.warn(`Component file not found: ${componentFilePath}`);
          }
        } catch (saveError) {
          console.error("Error saving description to component file:", saveError);
          // Don't fail the request if saving fails, just log the error
        }
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
