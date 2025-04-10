#!/usr/bin/env node

import * as path from "path";
import * as fs from "fs";
import * as fsExtra from "fs-extra";
import * as http from "http";
import { Command } from "commander";
import * as url from "url";
import chalk from "chalk";
import ora from "ora";
import { program } from "commander";

import {
  generateDocumentation,
  DocumentationOptions,
  parseComponents,
  ComponentDefinition,
} from "../index";
import { AiDescriptionGenerator } from "../ai/generator";
import { DocumentationConfig } from "../core/types";

// Define CLI version and description
program
  .version("0.1.0")
  .description(
    "Generate React component documentation with AI-powered descriptions"
  );

// Main command
program
  .argument("[root]", "Root directory of the React project", ".")
  .option(
    "-c, --component <path>",
    "Path to the root component (relative to the root directory)",
    "src/App.tsx"
  )
  .option(
    "-o, --output <dir>",
    "Output directory for the generated documentation",
    "docs"
  )
  .option("-t, --title <title>", "Documentation title")
  .option("-d, --description <description>", "Documentation description")
  .option(
    "--theme <theme>",
    "Theme for the documentation UI (light, dark, or auto)",
    "light"
  )
  .option("--open", "Open documentation in browser after generation", true)
  .option("--no-ai", "Disable AI-generated descriptions")
  .option("--max-depth <depth>", "Maximum depth for component recursion", "10")
  .option(
    "--exclude <patterns>",
    "Glob patterns to exclude from parsing (comma-separated)"
  )
  .option(
    "--include <patterns>",
    "Glob patterns to include in parsing (comma-separated)"
  )
  .option("--api-key <key>", "OpenAI API key for generating descriptions")
  .option(
    "--similarity-threshold <number>",
    "Threshold for function similarity detection (0.0-1.0)",
    process.env.SIMILARITY_THRESHOLD || "0.6"
  )
  .option(
    "--use-ollama",
    "Use Ollama for local embeddings instead of OpenAI",
    false
  )
  .option(
    "--ollama-url <url>",
    "URL for Ollama API",
    process.env.OLLAMA_URL || "http://localhost:11434"
  )
  .option(
    "--ollama-model <model>",
    "Model to use with Ollama",
    process.env.OLLAMA_MODEL || "nomic-embed-text:latest"
  )
  .option("--enable-chat", "Enable chat functionality", true)
  .option(
    "--chat-model <model>",
    "Model to use for chat",
    process.env.CHAT_MODEL || "gemma3:27b"
  )
  .option(
    "--port <number>",
    "Port to use for the server",
    process.env.PORT || "3000"
  )
  .option("-p, --port <port>", "Port to serve documentation")
  .option("-s, --similarity <threshold>", "Similarity threshold")
  .option("--use-ollama", "Use Ollama for embeddings")
  .option("--ollama-url <url>", "URL for Ollama server")
  .option("--ollama-model <model>", "Model for Ollama")
  .option("--enable-chat", "Enable chat functionality (default: true)")
  .option("--chat-model <model>", "Model for chat functionality")
  .option("--cache-dir <path>", "Path to cache directory for documentation")
  .action(async (rootDir: string, options: any) => {
    try {
      const spinner = ora("Generating documentation...").start();

      // Resolve absolute paths
      const absoluteRootDir = path.resolve(process.cwd(), rootDir);

      // Parse options
      const componentPath = options.component;
      const maxDepth = parseInt(options.maxDepth, 10);
      const includePatterns = options.include
        ? options.include.split(",")
        : undefined;
      const excludePatterns = options.exclude
        ? options.exclude.split(",")
        : undefined;
      const similarityThreshold = parseFloat(options.similarityThreshold);

      // Check if the root directory exists
      if (!fs.existsSync(absoluteRootDir)) {
        spinner.fail(
          `Root directory ${chalk.red(absoluteRootDir)} does not exist`
        );
        process.exit(1);
      }

      // Check if the component file exists
      const absoluteComponentPath = path.resolve(
        absoluteRootDir,
        componentPath
      );
      if (!fs.existsSync(absoluteComponentPath)) {
        spinner.fail(
          `Component file ${chalk.red(absoluteComponentPath)} does not exist`
        );
        process.exit(1);
      }

      spinner.text = "Parsing React components...";

      // Parse components
      const components = await parseComponents({
        rootDir: absoluteRootDir,
        componentPath,
        maxDepth,
        includePatterns,
        excludePatterns,
        apiKey: options.apiKey || undefined,
        similarityThreshold,
      });

      if (components.length === 0) {
        spinner.fail(
          "No components were found. Check your component path and include/exclude patterns."
        );
        process.exit(1);
      }

      spinner.succeed(`Found ${chalk.green(components.length)} components`);

      // Generate AI descriptions if enabled
      if (options.apiKey !== undefined) {
        spinner.start("Generating AI descriptions...");

        const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

        if (!apiKey) {
          spinner.warn(
            "No OpenAI API key provided. Set it using --api-key option or OPENAI_API_KEY environment variable."
          );
          spinner.info("Skipping AI description generation.");
        } else {
          try {
            // Default cache path or user specified
            const cacheDir =
              options.cacheDir || path.join(process.cwd(), ".docs-cache");
            const cachePath = path.join(cacheDir, "docs-cache.json");

            // Ensure cache directory exists
            try {
              await fsExtra.mkdirp(cacheDir);
            } catch (error) {
              // Ignore directory already exists errors
            }

            const aiGenerator = new AiDescriptionGenerator({
              apiKey,
              cachePath,
            });

            const enhancedComponents =
              await aiGenerator.enhanceComponentsWithDescriptions(components);
            spinner.succeed(
              `Generated descriptions for ${enhancedComponents.length} components`
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            spinner.warn(`Error generating AI descriptions: ${errorMessage}`);
            spinner.info("Continuing with basic documentation...");
          }
        }
      }

      // Generate documentation
      spinner.start("Generating documentation files...");

      const config: DocumentationConfig = {
        title: options.title,
        description: options.description,
        theme: options.theme,
        outputDir: options.output,
        openBrowser: options.open,
      };

      const outputPath = await generateDocumentation({
        componentPath,
        rootDir: absoluteRootDir,
        outputDir: options.output,
        excludePatterns: excludePatterns,
        includePatterns: includePatterns,
        maxDepth: maxDepth,
        title: options.title,
        description: options.description,
        theme: (options.theme as "light" | "dark" | "auto") || "light",
        openBrowser: options.open,
        port: options.port ? parseInt(options.port) : 3000,
        apiKey: options.apiKey,
        similarityThreshold: similarityThreshold,
        useOllama: options.useOllama,
        ollamaUrl: options.ollamaUrl,
        ollamaModel: options.ollamaModel,
        enableChat: options.enableChat,
        chatModel: options.chatModel,
      });
      spinner.succeed(`Documentation generated at ${chalk.green(outputPath)}`);

      // Add enableChat option
      options.enableChat =
        options.enableChat !== undefined ? options.enableChat : true;

      // Start server if open is enabled
      if (options.open) {
        spinner.start(`Starting server on port ${options.port || 3000}...`);
        const parsedPort = options.port ? parseInt(options.port, 10) : 3000;

        const server = await startServer(outputPath, parsedPort, components, {
          rootDir: absoluteRootDir,
          componentPath: options.component,
          apiKey: options.apiKey,
          useOllama: options.useOllama,
          ollamaUrl: options.ollamaUrl,
          ollamaModel: options.ollamaModel,
          enableChat: options.enableChat,
          chatModel: options.chatModel,
        });

        spinner.succeed(`Server started at http://localhost:${parsedPort}`);
        await openBrowser(`http://localhost:${parsedPort}`);

        console.log(
          `${chalk.green(
            "✓"
          )} Done! You can view your documentation at ${chalk.cyan(
            `http://localhost:${parsedPort}`
          )}`
        );
        console.log(chalk.yellow("Press Ctrl+C to stop the server"));

        // Add event listener for cleanup
        process.on("SIGINT", () => {
          server.close();
          process.exit(0);
        });
      } else {
        console.log(
          chalk.green("✨"),
          chalk.white(`To view the documentation, run:`),
          chalk.cyan(`npx http-server ${outputPath} -o -p <port>`)
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`\n${chalk.red("Error:")} ${errorMessage}`);
      process.exit(1);
    }
  });

// Parse command-line arguments
program.parse(process.argv);

// Function to dynamically import open
async function openBrowser(url: string) {
  try {
    // Use dynamic import() which works with both CJS and ESM
    const { default: open } = await import("open");
    await open(url);
  } catch (error) {
    console.error(`Failed to open browser at ${url}:`, error);
  }
}

// Get version from package.json
const packageJsonPath = path.join(__dirname, "../../package.json");

// Create and start a server to serve the documentation
async function startServer(
  outputPath: string,
  port: number,
  components: ComponentDefinition[],
  options: DocumentationOptions
): Promise<http.Server> {
  const { apiKey, useOllama, ollamaUrl, ollamaModel, chatModel } = options;

  // Create a chat service if enabled
  let chatService: any = null;
  if (options.enableChat) {
    const { CodebaseChatService } = await import("../ai/chat-service");
    chatService = new CodebaseChatService(components, {
      apiKey,
      useOllama,
      ollamaUrl,
      ollamaModel,
      chatModel,
    });
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname || "";

    // Handle API requests
    if (pathname === "/api/chat" && req.method === "POST" && chatService) {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const { history, query } = JSON.parse(body);

          const result = await chatService.chat(history, query);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("Error handling chat request:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      });

      return;
    }

    // Handle static file requests
    const filePath = path.join(
      outputPath,
      pathname === "/" ? "index.html" : pathname
    );

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // If the file doesn't exist, serve index.html (for SPA routing)
        if (err.code === "ENOENT" && !pathname.includes(".")) {
          fs.readFile(path.join(outputPath, "index.html"), (err, data) => {
            if (err) {
              res.writeHead(404);
              res.end("Not Found");
              return;
            }

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data);
          });
          return;
        }

        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      // Set content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpg",
          ".gif": "image/gif",
        }[ext] || "text/plain";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  server.listen(port);
  console.log(`Server started at http://localhost:${port}`);

  return server;
}
