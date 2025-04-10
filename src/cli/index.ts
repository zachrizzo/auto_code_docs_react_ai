#!/usr/bin/env node

import * as path from "path";
import * as fs from "fs";
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
    "0.8"
  )
  .option(
    "--use-ollama",
    "Use Ollama for local embeddings instead of OpenAI",
    false
  )
  .option(
    "--ollama-url <url>",
    "URL for Ollama API (default: http://localhost:11434)"
  )
  .option(
    "--ollama-model <model>",
    "Model to use with Ollama (default: gemma3:27b)"
  )
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
            const aiGenerator = new AiDescriptionGenerator({
              apiKey,
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
        port: options.port ? parseInt(options.port) : 8080,
        apiKey: options.apiKey,
        similarityThreshold: similarityThreshold,
        useOllama: options.useOllama,
        ollamaUrl: options.ollamaUrl,
        ollamaModel: options.ollamaModel,
      });
      spinner.succeed(`Documentation generated at ${chalk.green(outputPath)}`);

      // // Open browser if enabled
      // if (options.open) {
      //   const port = parseInt(options.port, 10) || 3000;
      //   spinner.start(`Starting server on port ${port}`);
      //
      //   const server = http.createServer((req, res) => {
      //     // Handle URL parameters
      //     const url = req.url?.split("?")[0] || "";
      //     const filePath = path.join(outputPath, url || "index.html");
      //
      //     fs.readFile(filePath, (err, data) => {
      //       if (err) {
      //         res.writeHead(404);
      //         res.end("File not found");
      //         return;
      //       }
      //
      //       // Set content type based on file extension
      //       const ext = path.extname(filePath).toLowerCase();
      //       const contentType =
      //         {
      //           ".html": "text/html",
      //           ".js": "text/javascript",
      //           ".css": "text/css",
      //           ".json": "application/json",
      //           ".png": "image/png",
      //           ".jpg": "image/jpg",
      //           ".gif": "image/gif",
      //         }[ext] || "text/plain";
      //
      //       res.writeHead(200, { "Content-Type": contentType });
      //       res.end(data);
      //     });
      //   });
      //
      //   server.listen(port);
      //   spinner.succeed(`Server started at http://localhost:${port}`);
      //   await openBrowser(`http://localhost:${port}`);
      //   console.log(
      //     `${chalk.green(
      //       "✓"
      //     )} Done! You can view your documentation at ${chalk.cyan(outputPath)}`
      //   );
      //   console.log(chalk.yellow("Press Ctrl+C to stop the server"));
      // } else {
      // Always log the command to view, as the shell script handles serving/opening
      console.log(
        chalk.green("✨"),
        chalk.white(`To view the documentation, run:`),
        chalk.cyan(`npx http-server ${outputPath} -o -p <port>`)
      );
      // }
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
