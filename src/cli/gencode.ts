import * as fs from "fs-extra";
import * as path from "path";
import { LangFlowManager } from "../ai/langflow/langflow-manager";
import { parseAllCodeItems } from ".";
import axios from "axios";
import { createVectorSimilarityService } from "./patch-embedding-model";
import { saveVectorDatabase } from "./save-vector-db";
import { generateDocUI } from "..";
import { isPortInUse, findFreePort } from "./utils/cli-helpers";
import { spawn } from "child_process";

export async function startAiServices(options: { noAi: boolean, langflowConfig?: string, ollamaUrl: string, cleanupOnExit?: boolean, keepEnvironment?: boolean }) {
    if (options.noAi) {
        console.log("🤖 AI features disabled - using basic documentation generation only");
        return undefined;
    }

    const langflowManager = new LangFlowManager({
        projectRoot: process.cwd(),
        langflowConfigPath: options.langflowConfig,
        ollamaUrl: options.ollamaUrl,
        port: 6271
    });

    const result = await langflowManager.start();
    if (result.success) {
        console.log(`✅ AI server running (${result.service}): ${result.url}`);
        
        // Set environment variables for UI
        process.env.USE_LANGFLOW = "true";
        process.env.LANGFLOW_URL = result.url;
        
        // Determine cleanup behavior
        const shouldCleanup = options.cleanupOnExit || false;
        const shouldKeep = options.keepEnvironment || true;
        const doCleanup = shouldCleanup && !shouldKeep;

        // Show environment info if embedded server is running
        if (result.service === 'embedded') {
            const envInfo = await langflowManager.getEnvironmentInfo();
            console.log(`   Environment: ${envInfo.location} (${envInfo.size})`);
            if (doCleanup) {
                console.log('   ⚠️  Will cleanup on exit (--cleanup-on-exit)');
            } else {
                console.log('   💾 Will keep environment for faster restart');
            }
        }

        // Handle shutdown gracefully
        const shutdownHandler = async () => {
            console.log('\n🛑 Shutting down AI services...');
            await langflowManager!.stop(doCleanup);
            if (doCleanup) {
                console.log('🧹 Cleaned up Python environment');
            }
            process.exit(0);
        };
        
        process.on('SIGINT', shutdownHandler);
        process.on('SIGTERM', shutdownHandler);

        return langflowManager;
    } else {
        console.warn("⚠️  AI services unavailable - using legacy chat");
        console.log("   Install Python 3.8+ or Docker for enhanced AI features");
        return undefined;
    }
}

export async function generateDocumentationData(
    rootDir: string,
    docsDataDir: string,
    generateDescriptions: boolean,
    ollamaUrl: string,
    ollamaModel: string
) {
    const codeItems = await parseAllCodeItems(rootDir);

    // Save code items to JSON files first
    await fs.ensureDir(docsDataDir);
    await fs.writeJson(path.join(docsDataDir, "code-index.json"), codeItems, { spaces: 2 });

    for (const item of codeItems) {
        const slug = item.slug;
        item.slug = slug; // Ensure slug is set
        if (!item.relationships) item.relationships = [];
        if (!item.imports) item.imports = [];
        await fs.writeJson(path.join(docsDataDir, `${slug}.json`), item, { spaces: 2 });
    }

    // Generate AI descriptions if enabled, using the same logic as the UI
    if (generateDescriptions) {
        console.log("Generating AI descriptions for code items...");

        // Function to generate description using Ollama (same as /api/describe endpoint)
        const generateDescriptionWithOllama = async (componentName: string, code: string, filePath: string) => {
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
                console.log(`Sending request to Ollama API for ${componentName}...`);

                const response = await axios.post(`${ollamaUrl}/api/chat`, {
                    model: ollamaModel,
                    messages: [
                        {
                            role: "system",
                            content: "You are an AI assistant specializing in React component documentation.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    stream: false,
                });

                const data = response.data;

                if (data.message?.content) {
                    return data.message.content;
                } else {
                    console.warn("Unexpected response format from Ollama:", JSON.stringify(data));
                    return `The ${componentName} component is a UI element that provides functionality based on its props and implementation.`;
                }
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    console.error(`Ollama API error: ${error.response?.status} ${error.response?.statusText}`);
                } else {
                    console.error("Error generating description with Ollama:", error);
                }
                return `The ${componentName} component is a UI element that provides functionality based on its props and implementation.`;
            }
        };

        for (const item of codeItems) {
            const itemPath = path.join(docsDataDir, `${item.slug}.json`);
            try {
                const currentItem = await fs.readJson(itemPath);

                if (!currentItem.description || currentItem.description.trim() === "") {
                    console.log(`Generating description for ${currentItem.name}...`);

                    const description = await generateDescriptionWithOllama(
                        currentItem.name,
                        currentItem.code || `function ${currentItem.name}() { /* Code not available */ }`,
                        currentItem.filePath
                    );

                    if (description) {
                        currentItem.description = description;
                        currentItem.lastUpdated = new Date().toISOString();
                        await fs.writeJson(itemPath, currentItem, { spaces: 2 });
                        console.log(`Generated and saved description for ${currentItem.name}`);
                    }
                }

                // Also generate descriptions for methods if they exist
                if (currentItem.methods && Array.isArray(currentItem.methods)) {
                    for (const method of currentItem.methods) {
                        if (method && (!method.description || method.description.trim() === '')) {
                            console.log(`Generating description for method ${method.name} in ${currentItem.name}...`);

                            const methodDescription = await generateDescriptionWithOllama(
                                `${currentItem.name}.${method.name}`,
                                method.code || `function ${method.name}() { /* Code not available */ }`,
                                currentItem.filePath
                            );

                            if (methodDescription) {
                                method.description = methodDescription;
                            }
                        }
                    }

                    // Save updated methods
                    await fs.writeJson(itemPath, currentItem, { spaces: 2 });
                    console.log(`Updated descriptions for methods in ${currentItem.name}`);
                }
            } catch (error) {
                console.error(`Error processing descriptions for ${item.name}:`, error);
            }
        }
    }

    // Process each code item to extract methods and generate vectors
    console.log("Processing methods for similarity analysis...");
    const similarityService = createVectorSimilarityService();
    for (const item of codeItems) {
        if (item.methods && item.methods.length > 0) {
            console.log(`Processing ${item.methods.length} methods in ${item.name}`);
            // Process methods for similarity
            await similarityService.processComponentMethods(item.name, item.methods, item.filePath);
        }
    }
    console.log("Finished processing methods for similarity analysis.");

    const outputDir = path.dirname(docsDataDir);

    // Save the vector database to a file in the documentation directory
    saveVectorDatabase(similarityService, outputDir);

    // Create a more detailed component index for the UI
    const componentIndex = codeItems.map(item => ({
        name: item.name,
        slug: item.slug,
        type: item.kind || 'component',
        filePath: item.filePath
    }));
    await fs.writeJson(path.join(docsDataDir, "component-index.json"), componentIndex, { spaces: 2 });
    await generateDocUI(codeItems, { outputDir });
    console.log(`Documentation generated for code in: ${rootDir}`);
}

export async function prepareUiDirectory(outputDir: string, uiDir: string) {
    const uiPublicDir = path.join(uiDir, "public");
    const uiDocsDataDir = path.join(uiPublicDir, "docs-data");

    // Remove any existing docs-data symlink or directory
    try {
        await fs.remove(uiDocsDataDir);
    } catch (error) {
        console.error(`Error removing existing docs-data: ${error}`);
    }

    // Create symlink from project's documentation to UI's public/docs-data
    try {
        // On Windows, we need to use junction instead of symlink
        if (process.platform === "win32") {
            await fs.symlink(outputDir, uiDocsDataDir, "junction");
        } else {
            await fs.symlink(outputDir, uiDocsDataDir);
        }
        console.log(`Linked documentation from ${outputDir} to UI server`);
    } catch (error) {
        console.error(`Error creating symlink: ${error}`);
        // Fallback: copy the files if symlink fails
        try {
            await fs.copy(outputDir, uiDocsDataDir);
            console.log(`Copied documentation from ${outputDir} to UI server`);
        } catch (copyError) {
            console.error(`Error copying documentation: ${copyError}`);
        }
    }
}

export async function startUiServer(port: string, uiDir: string) {
    let requestedPort = parseInt(port, 10);
    let actualPort = requestedPort;
    if (await isPortInUse(requestedPort)) {
        actualPort = await findFreePort(requestedPort + 1);
        console.log(`Port ${requestedPort} is in use. Using available port ${actualPort} instead.`);
    }
    console.log(`Starting Next.js UI from ${uiDir} on port ${actualPort}...`);
    const child = spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["next", "dev", "-p", String(actualPort)],
        {
            cwd: uiDir,
            stdio: "inherit",
            shell: false,
            env: {
                ...process.env,
                USE_LANGFLOW: process.env.USE_LANGFLOW || "false",
                LANGFLOW_URL: process.env.LANGFLOW_URL || "http://localhost:6271"
            }
        }
    );
    child.on("exit", (code) => {
        process.exit(code ?? 0);
    });
} 