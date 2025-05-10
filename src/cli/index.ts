#!/usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import { Command } from "commander";
import { parseComponents } from "../core/parser";
import { generateDocUI } from "../index";
import { execSync, spawn } from "child_process";
import { ComponentDefinition } from "../core/types";
import { AiDescriptionGenerator } from "../ai/generator";
import { isPortInUse, findFreePort } from "./utils/cli-helpers";

/**
 * Main CLI program instance for code-y.
 * Handles parsing of all CLI commands and options.
 */
/**
 * Interface for all CLI options accepted by code-y.
 */
import { CodeYOptions } from "./cli.types";

const program = new Command();

// Get the package version
const packageJson = require("../../package.json");

/**
 * Configure CLI name, description, and version.
 */
program
  .name("code-y")
  .description("Generate AI-powered documentation for React components")
  .version(packageJson.version);

// Add default options and actions directly to the main program
program
  .option("-r, --root <path>", "Root directory of the project", process.cwd())
  .option(
    "-c, --component <path>",
    "Path to the root component file (optional, will scan all components if not provided)"
  )
  .option("-o, --output <path>", "Output directory", "documentation")
  .option("-p, --port <number>", "Port for documentation server", "3000")
  .option(
    "-e, --exclude <patterns>",
    "Glob patterns to exclude (comma-separated)",
    "**/node_modules/**,**/dist/**,**/coverage/**,**/build/**"
  )
  .option(
    "-i, --include <patterns>",
    "Glob patterns to include (comma-separated)",
    "**/*.tsx,**/*.jsx,**/*.js,**/*.ts"
  )
  .option("-d, --depth <number>", "Maximum recursion depth", "Infinity")
  .option("--open", "Open documentation in browser when done", true)
  .option("--start-ui", "Start the documentation UI server", true)
  .option("--ai <apiKey>", "OpenAI API key for generating descriptions")
  .option(
    "--similarity-threshold <number>",
    "Threshold for function similarity detection (0.0-1.0)",
    "0.6"
  )
  .option(
    "--theme <theme>",
    "Theme for documentation (light, dark, auto)",
    "light"
  )
  .option(
    "--use-ollama",
    "Use Ollama for local embeddings instead of OpenAI",
    true
  )
  .option("--ollama-url <url>", "URL for Ollama API", "http://localhost:11434")
  .option(
    "--ollama-model <model>",
    "Model to use with Ollama",
    "nomic-embed-text:latest"
  )
  .option(
    "--chat-model <model>",
    "Model to use for chat (if chat enabled)",
    "gemma3:27b"
  )
  .option(
    "--enable-chat <boolean>",
    "Enable AI chat in documentation UI",
    "true"
  )
  .option("--show-code <boolean>", "Show component source code", "true")
  .option("--show-methods <boolean>", "Show component methods", "true")
  .option("--show-similarity <boolean>", "Show method similarities", "true")
  .option(
    "--generate-descriptions",
    "Generate AI descriptions for components and props",
    false
  );

// Add a default action to the main program
/**
 * Default CLI action for code-y.
 * Generates documentation for React components based on provided options.
 * @param options {CodeYOptions} - Parsed CLI options
 */
program.action(async (options: CodeYOptions) => {
  console.log("📚 Generating documentation...");

  // Process options
  const rootDir = path.resolve(options.root);
  console.log(`Using root directory: ${rootDir}`);

  const excludePatterns = options.exclude.split(",");
  const includePatterns = options.include.split(",");
  const maxDepth =
    options.depth === "Infinity" ? Infinity : parseInt(options.depth);

  // Standardize boolean parsing from commander (it should provide booleans)
  const useOllama =
    options.useOllama === true ||
    String(options.useOllama).toLowerCase() === "true";
  const enableChat =
    options.enableChat === true ||
    String(options.enableChat).toLowerCase() === "true";
  const showCode =
    options.showCode === true ||
    String(options.showCode).toLowerCase() === "true";
  const showMethods =
    options.showMethods === true ||
    String(options.showMethods).toLowerCase() === "true";
  const showSimilarity =
    options.showSimilarity === true ||
    String(options.showSimilarity).toLowerCase() === "true";
  const generateDescriptions =
    options.generateDescriptions === true ||
    String(options.generateDescriptions).toLowerCase() === "true";
  const startUi =
    options.startUi === true ||
    String(options.startUi).toLowerCase() === "true";

  try {
    let allComponents: ComponentDefinition[] = [];

    // Refined API Key logic for Ollama
    let apiKey = options.ai || process.env.OPENAI_API_KEY;
    const mockApiKey = "sk-mock-api-key-for-demo-purposes-only";
    if (useOllama) {
      apiKey = mockApiKey; // Always use mock key if Ollama is enabled
      console.log("Using mock API key for Ollama integration");
    } else if (!apiKey) {
      console.error("API key is required when using OpenAI");
      process.exit(1);
    }

    // If a specific component is provided, start parsing from there
    if (options.component) {
      const componentPath = path.resolve(rootDir, options.component);
      console.log(`Parsing from root component: ${componentPath}`);

      allComponents = await parseComponents({
        rootDir,
        componentPath,
        excludePatterns,
        includePatterns,
        maxDepth,
        apiKey: apiKey, // Pass potentially overridden API key
        similarityThreshold: parseFloat(options.similarityThreshold),
        useOllama: useOllama,
        ollamaUrl: options.ollamaUrl,
        ollamaModel: options.ollamaModel,
      });
    } else {
      // If no component is specified, use the glob approach to find all components
      console.log(
        "No root component specified. Scanning entire project for components..."
      );

      // Use the glob-based approach similar to generate-and-run-docs.sh
      const glob = require("glob");
      const reactDocgen = require("react-docgen-typescript");
      const {
        parseSingleComponentFile,
        processComponentListSimilarities,
      } = require("../core/parser");
      const { VectorSimilarityService } = require("../ai/vector-similarity");

      // Find all component files in the project
      const componentFiles = glob.sync(
        includePatterns.map((pattern: string) => path.join(rootDir, pattern)),
        {
          ignore: excludePatterns,
        }
      );

      console.log(`Found ${componentFiles.length} component files to process`);

      // Initialize parser
      const parserOptions = {
        propFilter: (prop: any) =>
          !prop.parent || !prop.parent.fileName.includes("node_modules"),
        shouldExtractLiteralValuesFromEnum: true,
        shouldRemoveUndefinedFromOptional: true,
      };

      let tsconfigPath = path.join(rootDir, "tsconfig.json");
      if (!fs.existsSync(tsconfigPath)) {
        tsconfigPath = path.join(process.cwd(), "tsconfig.json");
      }

      const parser = fs.existsSync(tsconfigPath)
        ? reactDocgen.withCustomConfig(tsconfigPath, parserOptions)
        : reactDocgen.withDefaultConfig(parserOptions);

      console.log("Parser initialized");

      // Initialize similarity service if needed
      const similarityService = new VectorSimilarityService({
        useOllama: useOllama,
        ollamaUrl: options.ollamaUrl,
        ollamaModel: options.ollamaModel,
        similarityThreshold: parseFloat(options.similarityThreshold),
        apiKey: apiKey, // Pass potentially overridden API key
      });

      console.log("Similarity service options:", {
        useOllama: useOllama,
        ollamaUrl: options.ollamaUrl,
        ollamaModel: options.ollamaModel,
        similarityThreshold: parseFloat(options.similarityThreshold),
        hasApiKey: !!apiKey, // Check the final apiKey value
      });

      // Process each file
      console.log("--- Starting component collection ---");
      for (const file of componentFiles) {
        console.log(`Collecting components from: ${file}`);
        try {
          const componentsFromFile = await parseSingleComponentFile(
            {
              rootDir,
              componentPath: file,
              excludePatterns,
              includePatterns,
              maxDepth,
            },
            parser
          );

          if (componentsFromFile && componentsFromFile.length > 0) {
            allComponents = [...allComponents, ...componentsFromFile];
            console.log(
              `Collected ${componentsFromFile.length} component(s) from ${file}`
            );
          }
        } catch (error: unknown) {
          console.error(
            `Error parsing ${file}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Process similarities
      if (allComponents.length > 0) {
        console.log("--- Processing component similarities ---");
        await processComponentListSimilarities(
          allComponents,
          similarityService
        );
      }
    }

    console.log(`Found ${allComponents.length} total components`);

    // Generate AI descriptions if explicitly requested
    if (generateDescriptions) {
      // Use parsed boolean
      console.log("Generating AI descriptions for components...");
      const aiGenerator = new AiDescriptionGenerator({
        useOllama: useOllama,
        ollamaUrl: options.ollamaUrl,
        ollamaModel: options.chatModel, // Use chatModel for generation
        apiKey: apiKey, // Pass potentially overridden API key
      });

      allComponents = await aiGenerator.enhanceComponentsWithDescriptions(
        allComponents
      );
      console.log("AI descriptions generation completed");
    } else {
      console.log(
        "Skipping AI description generation (use --generate-descriptions to enable)"
      );
    }

    // Save components to JSON for reference
    const componentsJsonPath = path.join(process.cwd(), "docs-components.json");
    fs.writeJsonSync(componentsJsonPath, allComponents, { spaces: 2 });

    // Generate the documentation UI
    const outputDir = path.resolve(rootDir, options.output);
    const docsDataDir = path.join(outputDir, "docs-data");

    await generateDocUI(allComponents, {
      title: "React Component Documentation",
      description: "Auto-generated documentation for React components",
      theme: options.theme,
      outputDir: docsDataDir,
      showCode: showCode, // Use parsed boolean
      showMethods: showMethods, // Use parsed boolean
      showSimilarity: showSimilarity, // Use parsed boolean
    });

    console.log(`✅ Documentation generated at: ${outputDir}`);

    // Create a docs URL file
    const docsUrl = `http://localhost:${options.port}/docs`;
    fs.writeFileSync(path.join(process.cwd(), "docs-url.txt"), docsUrl);

    // Start the server if requested (default to true)
    if (startUi) {
      // Use parsed boolean
      console.log(
        `🚀 Starting documentation server on port ${options.port}...`
      );

      // Find a free port if the specified one is in use
      const port = await findFreePort(parseInt(options.port));
      if (port !== parseInt(options.port)) {
        console.log(
          `Port ${options.port} was busy, using port ${port} instead`
        );
        options.port = port.toString();
      }

      console.log(
        `🚀 Starting documentation server on port ${options.port}...`
      );

      try {
        // Instead of just creating an env file, we need to copy the UI files
        const outputDocsUiDir = path.join(outputDir, "ui");
        const packageUiDir = path.join(__dirname, "../../dist/ui");

        // Remove any existing UI directory to clean stale artifacts
        if (fs.existsSync(outputDocsUiDir)) {
          fs.removeSync(outputDocsUiDir);
        }

        // Copy the UI files from the package to the output directory (filter out compiled artifacts)
        console.log(`Copying UI files from package to ${outputDocsUiDir}...`);
        fs.copySync(packageUiDir, outputDocsUiDir, {
          overwrite: true,
          filter: (src) => {
            const ext = path.extname(src);
            const base = path.basename(src);
            // Exclude all .js except essential config files
            if (ext === ".js") {
              if (base === "postcss.config.js" || base === "tailwind.config.js") {
                return true;
              }
              return false;
            }
            if (ext === ".js.map" || ext === ".d.ts") return false;
            if (base === "postcss.config.mjs") return false;
            return true;
          },
        });

        // Create .env.local file in the UI directory
        const envFilePath = path.join(outputDocsUiDir, ".env.local");
        fs.writeFileSync(
          envFilePath,
          `
PORT=${options.port}
NEXT_PUBLIC_ENABLE_CHAT=${enableChat}
NEXT_PUBLIC_USE_OLLAMA=${useOllama}
NEXT_PUBLIC_OLLAMA_URL=${options.ollamaUrl}
NEXT_PUBLIC_OLLAMA_MODEL=${options.ollamaModel}
NEXT_PUBLIC_CHAT_MODEL=${options.chatModel}
NEXT_PUBLIC_SHOW_CODE=${showCode}
NEXT_PUBLIC_SHOW_METHODS=${showMethods}
NEXT_PUBLIC_SHOW_SIMILARITY=${showSimilarity}
            `
        );

        // Create a docs-config.js file
        const configFilePath = path.join(outputDir, "docs-config.js");
        fs.writeFileSync(
          configFilePath,
          `module.exports = {
  port: ${options.port},
  enableChat: ${enableChat},
  useOllama: ${useOllama},
  ollamaUrl: "${options.ollamaUrl}",
  ollamaModel: "${options.ollamaModel}",
  chatModel: "${options.chatModel}",
  showCode: ${showCode},
  showMethods: ${showMethods},
  showSimilarity: ${showSimilarity}
};
            `
        );

        console.log(`Configuration saved to ${outputDir}`);

        // Open the browser with dynamic import
        (async () => {
          try {
            const open = await import("open");
            await open.default(docsUrl);
            console.log(`✓ Browser opened to ${docsUrl}`);
          } catch (err: unknown) {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            console.error("Error opening browser:", errorMessage);
            console.log(
              `To view documentation, open your browser to: ${docsUrl}`
            );
          }
        })();

        // Start the Next.js server from the UI directory
        console.log(`Starting Next.js server from ${outputDocsUiDir}...`);

        try {
          // Change to the UI directory to run Next.js
          process.chdir(outputDocsUiDir);

          // First install dependencies
          console.log("Installing UI dependencies...");
          try {
            execSync("npm install --legacy-peer-deps", {
              stdio: "inherit",
              cwd: outputDocsUiDir,
            });
            console.log("Dependencies installed successfully");
          } catch (npmError) {
            console.warn("Warning: Could not install dependencies:", npmError);
            console.log(
              "Continuing anyway, but the server might fail to start..."
            );
          }

          // Start the Next.js server
          const nextProcess = spawn(
            "npx",
            ["next", "dev", "-p", options.port.toString()],
            {
              stdio: "inherit",
              shell: true,
            }
          );

          // Handle server process
          nextProcess.on("error", (err) => {
            console.error("Failed to start Next.js server:", err);
            console.log(`Falling back to serving static files...`);

            // Fall back to serving with 'serve' if Next.js fails
            const serveProcess = spawn(
              "npx",
              ["serve", outputDir, "-p", options.port.toString()],
              {
                stdio: "inherit",
                shell: true,
              }
            );
          });

          // Keep the process running
          process.stdin.resume();
        } catch (error) {
          console.error("Error starting Next.js server:", error);
          console.log(`Falling back to serving static files...`);

          // Fall back to serving with 'serve'
          try {
            const serveProcess = spawn(
              "npx",
              ["serve", outputDir, "-p", options.port.toString()],
              {
                stdio: "inherit",
                shell: true,
              }
            );
          } catch (serveError) {
            console.error("Error starting serve:", serveError);
            console.log(`To view documentation, run:
1. cd ${outputDocsUiDir}
2. npm run dev -- -p ${options.port}
Or: npx serve ${outputDir} -p ${options.port}`);
          }
        }
      } catch (error) {
        console.error("Error starting UI server:", error);
        console.log(`To view documentation, run:
1. cd to your Next.js UI directory
2. npm run dev -- -p ${options.port}`);
      }
    } else {
      console.log(`To view documentation, run:
1. cd to your Next.js UI directory
2. npm run dev -- -p ${options.port}`);
      console.log(`Or view the docs at: ${docsUrl} after starting your server`);
    }
  } catch (error: unknown) {
    console.error(
      "Error generating documentation:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
});

// Keep the existing generate command for backward compatibility
/**
 * Generate command for explicit documentation generation.
 * Accepts the same options as the default action.
 */
program
  .command("generate")
  .description("Generate component documentation")
  .option("-r, --root <path>", "Root directory of the project", process.cwd())
  .option(
    "-c, --component <path>",
    "Path to the root component file (optional, will scan all components if not provided)"
  )
  .option("-o, --output <path>", "Output directory", "documentation")
  .option("-p, --port <number>", "Port for documentation server", "3000")
  .option(
    "-e, --exclude <patterns>",
    "Glob patterns to exclude (comma-separated)",
    "**/node_modules/**,**/dist/**,**/coverage/**,**/build/**"
  )
  .option(
    "-i, --include <patterns>",
    "Glob patterns to include (comma-separated)",
    "**/*.tsx,**/*.jsx,**/*.js,**/*.ts"
  )
  .option("-d, --depth <number>", "Maximum recursion depth", "Infinity")
  .option("--open", "Open documentation in browser when done", true)
  .option("--start-ui", "Start the documentation UI server", true)
  .option("--ai <apiKey>", "OpenAI API key for generating descriptions")
  .option(
    "--similarity-threshold <number>",
    "Threshold for function similarity detection (0.0-1.0)",
    "0.6"
  )
  .option(
    "--theme <theme>",
    "Theme for documentation (light, dark, auto)",
    "light"
  )
  .option(
    "--use-ollama",
    "Use Ollama for local embeddings instead of OpenAI",
    true
  )
  .option("--ollama-url <url>", "URL for Ollama API", "http://localhost:11434")
  .option(
    "--ollama-model <model>",
    "Model to use with Ollama",
    "nomic-embed-text:latest"
  )
  .option(
    "--chat-model <model>",
    "Model to use for chat (if chat enabled)",
    "gemma3:27b"
  )
  .option(
    "--enable-chat <boolean>",
    "Enable AI chat in documentation UI",
    "true"
  )
  .option("--show-code <boolean>", "Show component source code", "true")
  .option("--show-methods <boolean>", "Show component methods", "true")
  .option("--show-similarity <boolean>", "Show method similarities", "true")
  .option(
    "--generate-descriptions",
    "Generate AI descriptions for components and props",
    false
  )
  /**
   * Action handler for the generate command.
   * @param options {CodeYOptions} - Parsed CLI options
   */
  .action(async (options: CodeYOptions) => {
    console.log("📚 Generating documentation...");

    // Process options
    const rootDir = path.resolve(options.root);
    console.log(`Using root directory: ${rootDir}`);

    const excludePatterns = options.exclude.split(",");
    const includePatterns = options.include.split(",");
    const maxDepth =
      options.depth === "Infinity" ? Infinity : parseInt(options.depth);

    // Standardize boolean parsing from commander (it should provide booleans)
    const useOllama =
      options.useOllama === true ||
      String(options.useOllama).toLowerCase() === "true";
    const enableChat =
      options.enableChat === true ||
      String(options.enableChat).toLowerCase() === "true";
    const showCode =
      options.showCode === true ||
      String(options.showCode).toLowerCase() === "true";
    const showMethods =
      options.showMethods === true ||
      String(options.showMethods).toLowerCase() === "true";
    const showSimilarity =
      options.showSimilarity === true ||
      String(options.showSimilarity).toLowerCase() === "true";
    const generateDescriptions =
      options.generateDescriptions === true ||
      String(options.generateDescriptions).toLowerCase() === "true";
    const startUi =
      options.startUi === true ||
      String(options.startUi).toLowerCase() === "true";

    try {
      let allComponents: ComponentDefinition[] = [];

      // Refined API Key logic for Ollama
      let apiKey = options.ai || process.env.OPENAI_API_KEY;
      const mockApiKey = "sk-mock-api-key-for-demo-purposes-only";
      if (useOllama) {
        apiKey = mockApiKey; // Always use mock key if Ollama is enabled
        console.log("Using mock API key for Ollama integration");
      } else if (!apiKey) {
        console.error("API key is required when using OpenAI");
        process.exit(1);
      }

      // If a specific component is provided, start parsing from there
      if (options.component) {
        const componentPath = path.resolve(rootDir, options.component);
        console.log(`Parsing from root component: ${componentPath}`);

        allComponents = await parseComponents({
          rootDir,
          componentPath,
          excludePatterns,
          includePatterns,
          maxDepth,
          apiKey: apiKey, // Pass potentially overridden API key
          similarityThreshold: parseFloat(options.similarityThreshold),
          useOllama: useOllama,
          ollamaUrl: options.ollamaUrl,
          ollamaModel: options.ollamaModel,
        });
      } else {
        // If no component is specified, use the glob approach to find all components
        console.log(
          "No root component specified. Scanning entire project for components..."
        );

        // Use the glob-based approach similar to generate-and-run-docs.sh
        const glob = require("glob");
        const reactDocgen = require("react-docgen-typescript");
        const {
          parseSingleComponentFile,
          processComponentListSimilarities,
        } = require("../core/parser");
        const { VectorSimilarityService } = require("../ai/vector-similarity");

        // Find all component files in the project
        const componentFiles = glob.sync(
          includePatterns.map((pattern: string) => path.join(rootDir, pattern)),
          {
            ignore: excludePatterns,
          }
        );

        console.log(
          `Found ${componentFiles.length} component files to process`
        );

        // Initialize parser
        const parserOptions = {
          propFilter: (prop: any) =>
            !prop.parent || !prop.parent.fileName.includes("node_modules"),
          shouldExtractLiteralValuesFromEnum: true,
          shouldRemoveUndefinedFromOptional: true,
        };

        let tsconfigPath = path.join(rootDir, "tsconfig.json");
        if (!fs.existsSync(tsconfigPath)) {
          tsconfigPath = path.join(process.cwd(), "tsconfig.json");
        }

        const parser = fs.existsSync(tsconfigPath)
          ? reactDocgen.withCustomConfig(tsconfigPath, parserOptions)
          : reactDocgen.withDefaultConfig(parserOptions);

        console.log("Parser initialized");

        // Initialize similarity service if needed
        const similarityService = new VectorSimilarityService({
          useOllama: useOllama,
          ollamaUrl: options.ollamaUrl,
          ollamaModel: options.ollamaModel,
          similarityThreshold: parseFloat(options.similarityThreshold),
          apiKey: apiKey, // Pass potentially overridden API key
        });

        console.log("Similarity service options:", {
          useOllama: useOllama,
          ollamaUrl: options.ollamaUrl,
          ollamaModel: options.ollamaModel,
          similarityThreshold: parseFloat(options.similarityThreshold),
          hasApiKey: !!apiKey, // Check the final apiKey value
        });

        // Process each file
        console.log("--- Starting component collection ---");
        for (const file of componentFiles) {
          console.log(`Collecting components from: ${file}`);
          try {
            const componentsFromFile = await parseSingleComponentFile(
              {
                rootDir,
                componentPath: file,
                excludePatterns,
                includePatterns,
                maxDepth,
              },
              parser
            );

            if (componentsFromFile && componentsFromFile.length > 0) {
              allComponents = [...allComponents, ...componentsFromFile];
              console.log(
                `Collected ${componentsFromFile.length} component(s) from ${file}`
              );
            }
          } catch (error: unknown) {
            console.error(
              `Error parsing ${file}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        // Process similarities
        if (allComponents.length > 0) {
          console.log("--- Processing component similarities ---");
          await processComponentListSimilarities(
            allComponents,
            similarityService
          );
        }
      }

      console.log(`Found ${allComponents.length} total components`);

      // Generate AI descriptions if explicitly requested
      if (generateDescriptions) {
        // Use parsed boolean
        console.log("Generating AI descriptions for components...");
        const aiGenerator = new AiDescriptionGenerator({
          useOllama: useOllama,
          ollamaUrl: options.ollamaUrl,
          ollamaModel: options.chatModel, // Use chatModel for generation
          apiKey: apiKey, // Pass potentially overridden API key
        });

        allComponents = await aiGenerator.enhanceComponentsWithDescriptions(
          allComponents
        );
        console.log("AI descriptions generation completed");
      } else {
        console.log(
          "Skipping AI description generation (use --generate-descriptions to enable)"
        );
      }

      // Save components to JSON for reference
      const componentsJsonPath = path.join(
        process.cwd(),
        "docs-components.json"
      );
      fs.writeJsonSync(componentsJsonPath, allComponents, { spaces: 2 });

      // Generate the documentation UI
      const outputDir = path.resolve(rootDir, options.output);
      const docsDataDir = path.join(outputDir, "docs-data");

      await generateDocUI(allComponents, {
        title: "React Component Documentation",
        description: "Auto-generated documentation for React components",
        theme: options.theme,
        outputDir: docsDataDir,
        showCode: showCode, // Use parsed boolean
        showMethods: showMethods, // Use parsed boolean
        showSimilarity: showSimilarity, // Use parsed boolean
      });

      console.log(`✅ Documentation generated at: ${outputDir}`);

      // Create a docs URL file
      const docsUrl = `http://localhost:${options.port}/docs`;
      fs.writeFileSync(path.join(process.cwd(), "docs-url.txt"), docsUrl);

      // Start the server if requested (default to true)
      if (startUi) {
        // Use parsed boolean
        console.log(
          `🚀 Starting documentation server on port ${options.port}...`
        );

        // Find a free port if the specified one is in use
        const port = await findFreePort(parseInt(options.port));
        if (port !== parseInt(options.port)) {
          console.log(
            `Port ${options.port} was busy, using port ${port} instead`
          );
          options.port = port.toString();
        }

        console.log(
          `🚀 Starting documentation server on port ${options.port}...`
        );

        try {
          // Instead of just creating an env file, we need to copy the UI files
          const outputDocsUiDir = path.join(outputDir, "ui");
          const packageUiDir = path.join(__dirname, "../../dist/ui");

          // Remove any existing UI directory to clean stale artifacts
          if (fs.existsSync(outputDocsUiDir)) {
            fs.removeSync(outputDocsUiDir);
          }

          // Copy the UI files from the package to the output directory (filter out compiled artifacts)
          console.log(`Copying UI files from package to ${outputDocsUiDir}...`);
          fs.copySync(packageUiDir, outputDocsUiDir, {
            overwrite: true,
            filter: (src) => {
              const ext = path.extname(src);
              const base = path.basename(src);
              // Exclude all .js except essential config files
              if (ext === ".js") {
                if (base === "postcss.config.js" || base === "tailwind.config.js") {
                  return true;
                }
                return false;
              }
              if (ext === ".js.map" || ext === ".d.ts") return false;
              if (base === "postcss.config.mjs") return false;
              return true;
            },
          });

          // Create .env.local file in the UI directory
          const envFilePath = path.join(outputDocsUiDir, ".env.local");
          fs.writeFileSync(
            envFilePath,
            `
PORT=${options.port}
NEXT_PUBLIC_ENABLE_CHAT=${enableChat}
NEXT_PUBLIC_USE_OLLAMA=${useOllama}
NEXT_PUBLIC_OLLAMA_URL=${options.ollamaUrl}
NEXT_PUBLIC_OLLAMA_MODEL=${options.ollamaModel}
NEXT_PUBLIC_CHAT_MODEL=${options.chatModel}
NEXT_PUBLIC_SHOW_CODE=${showCode}
NEXT_PUBLIC_SHOW_METHODS=${showMethods}
NEXT_PUBLIC_SHOW_SIMILARITY=${showSimilarity}
            `
          );

          // Create a docs-config.js file
          const configFilePath = path.join(outputDir, "docs-config.js");
          fs.writeFileSync(
            configFilePath,
            `module.exports = {
  port: ${options.port},
  enableChat: ${enableChat},
  useOllama: ${useOllama},
  ollamaUrl: "${options.ollamaUrl}",
  ollamaModel: "${options.ollamaModel}",
  chatModel: "${options.chatModel}",
  showCode: ${showCode},
  showMethods: ${showMethods},
  showSimilarity: ${showSimilarity}
};
            `
          );

          console.log(`Configuration saved to ${outputDir}`);

          // Open the browser with dynamic import
          (async () => {
            try {
              const open = await import("open");
              await open.default(docsUrl);
              console.log(`✓ Browser opened to ${docsUrl}`);
            } catch (err: unknown) {
              const errorMessage =
                err instanceof Error ? err.message : String(err);
              console.error("Error opening browser:", errorMessage);
              console.log(
                `To view documentation, open your browser to: ${docsUrl}`
              );
            }
          })();

          // Start the Next.js server from the UI directory
          console.log(`Starting Next.js server from ${outputDocsUiDir}...`);

          try {
            // Change to the UI directory to run Next.js
            process.chdir(outputDocsUiDir);

            // First install dependencies
            console.log("Installing UI dependencies...");
            try {
              execSync("npm install --legacy-peer-deps", {
                stdio: "inherit",
                cwd: outputDocsUiDir,
              });
              console.log("Dependencies installed successfully");
            } catch (npmError) {
              console.warn("Warning: Could not install dependencies:", npmError);
              console.log(
                "Continuing anyway, but the server might fail to start..."
              );
            }

            // Start the Next.js server
            const nextProcess = spawn(
              "npx",
              ["next", "dev", "-p", options.port.toString()],
              {
                stdio: "inherit",
                shell: true,
              }
            );

            // Handle server process
            nextProcess.on("error", (err) => {
              console.error("Failed to start Next.js server:", err);
              console.log(`Falling back to serving static files...`);

              // Fall back to serving with 'serve' if Next.js fails
              const serveProcess = spawn(
                "npx",
                ["serve", outputDir, "-p", options.port.toString()],
                {
                  stdio: "inherit",
                  shell: true,
                }
              );
            });

            // Keep the process running
            process.stdin.resume();
          } catch (error) {
            console.error("Error starting Next.js server:", error);
            console.log(`Falling back to serving static files...`);

            // Fall back to serving with 'serve'
            try {
              const serveProcess = spawn(
                "npx",
                ["serve", outputDir, "-p", options.port.toString()],
                {
                  stdio: "inherit",
                  shell: true,
                }
              );
            } catch (serveError) {
              console.error("Error starting serve:", serveError);
              console.log(`To view documentation, run:
1. cd ${outputDocsUiDir}
2. npm run dev -- -p ${options.port}
Or: npx serve ${outputDir} -p ${options.port}`);
            }
          }
        } catch (error) {
          console.error("Error starting UI server:", error);
          console.log(`To view documentation, run:
1. cd to your Next.js UI directory
2. npm run dev -- -p ${options.port}`);
        }
      } else {
        console.log(
          `To view documentation, run: cd src/ui && npm run dev -- -p ${options.port}`
        );
        console.log(
          `Or view the docs at: ${docsUrl} after starting your server`
        );
      }
    } catch (error: unknown) {
      console.error(
        "Error generating documentation:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

/**
 * Run the CLI program asynchronously.
 * Parses process.argv and executes the appropriate command/action.
 */
export async function run(): Promise<void> {
  await program.parseAsync(process.argv);
}

// Run the CLI if this file is executed directly
/**
 * If this file is run directly, execute the CLI.
 */
if (require.main === module) {
  run().catch((error: unknown) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

