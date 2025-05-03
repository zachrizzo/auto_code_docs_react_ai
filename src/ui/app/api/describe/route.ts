import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { componentName, code, filePath } = body;

    if (!componentName || !code) {
      return NextResponse.json(
        { error: "Missing required fields: componentName and code" },
        { status: 400 }
      );
    }

    // Get Ollama configuration
    const ollamaUrl =
      process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";
    const chatModel = process.env.NEXT_PUBLIC_CHAT_MODEL || "gemma:3b";

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
        // Fallback description if API call fails
        return NextResponse.json({
          description: `The ${componentName} component is a UI element that provides functionality based on its props and implementation. It serves as a reusable building block in the application.`,
        });
      }

      const data = await response.json();
      let description;

      if (data.message?.content) {
        description = data.message.content;
      } else {
        description = `The ${componentName} component is a UI element that provides functionality based on its props and implementation. It serves as a reusable building block in the application.`;
      }

      return NextResponse.json({ description });
    } catch (error) {
      console.error("Error generating description:", error);
      // Provide a generic description as fallback
      return NextResponse.json({
        description: `The ${componentName} component is a UI element that provides functionality based on its props and implementation. It serves as a reusable building block in the application.`,
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
