"use client";

/**
 * Component Documentation Generator
 * Main export file that orchestrates the documentation generation process
 */

import path from "path";
import fs from "fs-extra";
import type {
  ComponentDefinition,
  DocumentationConfig,
} from "../../core/types";
import { deduplicateComponents } from "./utilities";
import { generateDataFile } from "./data";
import { generateConfigFile } from "./config";
import { generateIndexHtml } from "./html";
import { generateStyles } from "./styles";
import { generateMainJs } from "./script";

/**
 * Generate documentation for a set of React components
 * @param components List of components to document
 * @param config Documentation configuration
 * @returns Path to the generated documentation
 */
export async function generateDocumentation(
  components: ComponentDefinition[],
  config: DocumentationConfig = {}
): Promise<string> {
  try {
    const {
      title = "React Component Documentation",
      description = "Auto-generated documentation for React components",
      theme = "light",
      outputDir = "docs",
      showCode = true,
      showMethods = true,
      showSimilarity = true,
    } = config;

    // Log configuration options
    console.log(`Generating documentation with options:
    - Title: ${title}
    - Output: ${outputDir}
    - Theme: ${theme}
    - Show Code: ${showCode}
    - Show Methods: ${showMethods}
    - Show Similarity: ${showSimilarity}
    `);

    // Add configuration to global window object
    const docsConfig = {
      showCode,
      showMethods,
      showSimilarity,
    };

    // Deduplicate components before generating UI
    const uniqueComponents = deduplicateComponents(components);

    // Create output directory
    const outputPath = path.resolve(process.cwd(), outputDir);
    await fs.ensureDir(outputPath);

    // Generate data.js file with component data
    await generateDataFile(uniqueComponents, outputPath);

    // Generate config.js file with docs configuration
    await generateConfigFile(docsConfig, outputPath);

    // Generate index.html
    const indexHtmlPath = path.join(outputPath, "index.html");
    await generateIndexHtml(indexHtmlPath, title, description, theme);

    // Generate styles.css
    const stylesPath = path.join(outputPath, "styles.css");
    await generateStyles(stylesPath, theme);

    // Generate main.js
    const mainJsPath = path.join(outputPath, "main.js");
    await generateMainJs(mainJsPath);

    console.log(`Documentation generated successfully at ${outputPath}`);

    // Return the path to the generated documentation
    return outputPath;
  } catch (error) {
    console.error("Error generating documentation:", error);
    throw new Error(
      `Failed to generate documentation: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
