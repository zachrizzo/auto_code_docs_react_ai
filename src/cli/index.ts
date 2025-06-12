#!/usr/bin/env node
import * as fs from "fs-extra";
import * as path from "path";
import { Command } from "commander";
import { generateDocUI } from "../index";
import { execSync, spawn } from "child_process";
import { ComponentDefinition } from "../core/types";
import { AiDescriptionGenerator } from "../ai/generator";
import { isPortInUse, findFreePort } from "./utils/cli-helpers";
import { createVectorSimilarityService } from "./patch-embedding-model";
import { saveVectorDatabase } from "./save-vector-db";
import { glob } from "glob";
import * as ts from "typescript";
import ignore from "ignore"; // NEW: for .gitignore parsing

/**
 * Generate a unique slug for a component based on its file path and name
 * to avoid collisions when multiple components have the same name
 */
function generateUniqueSlug(componentName: string, filePath: string, rootDir: string): string {
  const relativePath = path.relative(rootDir, filePath);
  return `${relativePath.replace(/[\/\\]/g, '_').replace(/\.(tsx?|jsx?)$/, '')}_${componentName}`.toLowerCase().replace(/\s+/g, "-");
}

// Simple utility to extract methods from code for similarity analysis
function extractMethodsFromCode(code: string, componentName: string): Array<any> {
  const methods: Array<any> = [];
  
  try {
    // Create a source file from the code
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      code,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Function to visit nodes and extract methods
    function visit(node: ts.Node) {
      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const methodCode = code.substring(node.pos, node.end);
        methods.push({
          name,
          code: methodCode,
          returnType: node.type ? node.type.getText(sourceFile) : 'void',
          params: node.parameters.map(p => ({
            name: p.name.getText(sourceFile),
            type: p.type ? p.type.getText(sourceFile) : 'any',
            description: '',
            optional: false
          }))
        });
      }
      // Method declarations in classes
      else if (ts.isMethodDeclaration(node) && node.name) {
        const name = node.name.getText(sourceFile);
        const methodCode = code.substring(node.pos, node.end);
        methods.push({
          name,
          code: methodCode,
          returnType: node.type ? node.type.getText(sourceFile) : 'void',
          params: node.parameters.map(p => ({
            name: p.name.getText(sourceFile),
            type: p.type ? p.type.getText(sourceFile) : 'any',
            description: '',
            optional: false
          }))
        });
      }
      // Arrow functions in variable declarations
      else if (ts.isVariableDeclaration(node) && 
               node.name && 
               ts.isIdentifier(node.name) &&
               node.initializer && 
               ts.isArrowFunction(node.initializer)) {
        const name = node.name.text;
        const methodCode = code.substring(node.initializer.pos, node.initializer.end);
        methods.push({
          name,
          code: methodCode,
          returnType: node.initializer.type ? node.initializer.type.getText(sourceFile) : 'void',
          params: node.initializer.parameters.map(p => ({
            name: p.name.getText(sourceFile),
            type: p.type ? p.type.getText(sourceFile) : 'any'
          }))
        });
      }
      
      // Continue visiting child nodes
      ts.forEachChild(node, visit);
    }
    
    // Start visiting from the root
    ts.forEachChild(sourceFile, visit);
    
    return methods;
  } catch (error) {
    console.error(`Error extracting methods from ${componentName}:`, error);
    return [];
  }
}

// Enhanced utility to extract all code items including nested functions and classes
function extractAllCodeItems(fileContent: string, filePath: string, rootDir: string): Array<{ 
  name: string; 
  kind: 'function' | 'class' | 'method' | 'component'; 
  code: string;
  methods?: any[];
  imports?: string[];
  references?: string[];
  relationships?: any[];
  filePath: string;
  slug?: string;
}> {
  const results: Array<any> = [];
  const { extractImports, extractComponentReferences, extractInheritance, extractMethodCalls, generateRelationships } = require("../core/parser/relationship-extractor");
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    // Extract relationships data for the entire file
    const imports = extractImports(fileContent);
    const references = extractComponentReferences(fileContent);
    const inheritance = extractInheritance(fileContent);
    const methodCalls = extractMethodCalls(fileContent);

    function visit(node: ts.Node, parent?: ts.Node, depth: number = 0) {
      // Function declarations at any level
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const code = fileContent.substring(node.pos, node.end).trim();
        const slug = generateUniqueSlug(name, filePath, rootDir);
        
        // Check if this is a React component (starts with capital letter and returns JSX)
        const isComponent = /^[A-Z]/.test(name) && code.includes('return') && (code.includes('<') || code.includes('React.'));
        
        const item: any = { 
          name, 
          kind: isComponent ? 'component' : 'function' as any,
          code,
          filePath,
          slug,
          imports: depth === 0 ? imports : [],
          references: depth === 0 ? references : [],
          relationships: depth === 0 ? generateRelationships(slug, imports, references, inheritance, methodCalls) : [],
          methods: []
        };
        
        // Extract nested functions as methods
        extractNestedFunctions(node, item.methods, fileContent);
        
        results.push(item);
      }
      // Class declarations at any level
      else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const code = fileContent.substring(node.pos, node.end).trim();
        const slug = generateUniqueSlug(name, filePath, rootDir);
        
        const item: any = { 
          name, 
          kind: 'class' as any,
          code,
          filePath,
          slug,
          imports: depth === 0 ? imports : [],
          references: depth === 0 ? references : [],
          relationships: depth === 0 ? generateRelationships(slug, imports, references, inheritance, methodCalls) : [],
          methods: []
        };
        
        // Extract class methods
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const methodName = member.name.text;
            const methodCode = fileContent.substring(member.pos, member.end).trim();
            item.methods.push({
              name: methodName,
              code: methodCode,
              returnType: member.type ? member.type.getText(sourceFile) : 'void',
              params: member.parameters.map(p => ({
                name: p.name.getText(sourceFile),
                type: p.type ? p.type.getText(sourceFile) : 'any',
                description: '',
                optional: false
              }))
            });
          }
        });
        
        results.push(item);
      }
      // Variable statements with function expressions or arrow functions
      else if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            declaration.name &&
            ts.isIdentifier(declaration.name) &&
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
          ) {
            const name = declaration.name.text;
            const code = fileContent.substring(node.pos, node.end).trim();
            const slug = generateUniqueSlug(name, filePath, rootDir);
            
            // Check if this is a React component
            const isComponent = /^[A-Z]/.test(name) && code.includes('return') && (code.includes('<') || code.includes('React.'));
            
            const item = { 
              name, 
              kind: isComponent ? 'component' : 'function' as any,
              code,
              filePath,
              slug,
              imports: depth === 0 ? imports : [],
              references: depth === 0 ? references : [],
              relationships: depth === 0 ? generateRelationships(slug, imports, references, inheritance, methodCalls) : [],
              methods: []
            };
            
            // Extract nested functions from arrow function body
            if (declaration.initializer.body) {
              extractNestedFunctions(declaration.initializer.body, item.methods, fileContent);
            }
            
            results.push(item);
          }
        }
      }
      
      // Recursively visit child nodes
      ts.forEachChild(node, child => visit(child, node, depth + 1));
    }

    // Helper function to extract nested functions
    function extractNestedFunctions(node: ts.Node, methods: any[], fileContent: string) {
      ts.forEachChild(node, child => {
        if ((ts.isFunctionDeclaration(child) || ts.isFunctionExpression(child)) && child.name) {
          const methodName = child.name.text;
          const methodCode = fileContent.substring(child.pos, child.end).trim();
          methods.push({
            name: methodName,
            code: methodCode,
            returnType: child.type ? child.type.getText(sourceFile) : 'void',
            params: child.parameters.map(p => ({
              name: p.name.getText(sourceFile),
              type: p.type ? p.type.getText(sourceFile) : 'any'
            }))
          });
        } else if (ts.isVariableStatement(child)) {
          child.declarationList.declarations.forEach(decl => {
            if (decl.name && ts.isIdentifier(decl.name) && decl.initializer && 
                (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
              const methodName = decl.name.text;
              const methodCode = fileContent.substring(child.pos, child.end).trim();
              methods.push({
                name: methodName,
                code: methodCode,
                returnType: decl.initializer.type ? decl.initializer.type.getText(sourceFile) : 'void',
                params: decl.initializer.parameters.map(p => ({
                  name: p.name.getText(sourceFile),
                  type: p.type ? p.type.getText(sourceFile) : 'any'
                }))
              });
            }
          });
        }
        
        // Recursively extract from nested blocks
        if (ts.isBlock(child)) {
          extractNestedFunctions(child, methods, fileContent);
        }
      });
    }

    // Start visiting from the root
    sourceFile.statements.forEach(node => visit(node, undefined, 0));
    return results;
  } catch (error) {
    console.error('Error in extractAllCodeItems:', error);
    return results;
  }
}

// Parse all code items including nested functions and classes in all JS/TS files in a directory tree
async function parseAllCodeItems(rootDir: string): Promise<any[]> {
  const patterns = ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"];
  const ignorePatterns = ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**", "**/.git/**"];
  const files = await glob(patterns, {
    cwd: rootDir,
    ignore: ignorePatterns,
    absolute: true,
  });
  const allItems: any[] = [];
  console.log(`Found ${files.length} files to parse in ${rootDir}`);
  
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const items = extractAllCodeItems(content, filePath, rootDir);
      if (items.length > 0) {
        console.log(`Extracted ${items.length} code items from ${path.relative(rootDir, filePath)}`);
        allItems.push(...items);
      }
    } catch (err) {
      console.error(`Failed to parse file: ${filePath}`, err);
    }
  }
  
  console.log(`Total code items extracted: ${allItems.length}`);
  return allItems;
}

/**
 * Main CLI program instance for code-y.
 * Handles parsing of all CLI commands and options.
 */
/**
 * Interface for all CLI options accepted by code-y.
 */
import { CodeYOptions } from "./cli.types";

/**
 * Load configuration from codey.config.js if it exists
 */
function loadConfig(): any {
  try {
    const configPath = path.join(process.cwd(), "codey.config.js");
    if (fs.existsSync(configPath)) {
      console.log("📋 Loading configuration from codey.config.js");
      delete require.cache[configPath]; // Clear cache to get fresh config
      return require(configPath);
    }
  } catch (error) {
    console.warn("⚠️  Failed to load codey.config.js:", error);
  }
  return {};
}

const program = new Command();
const packageJson = require("../../package.json");

program
  .name("code-y")
  .description("Generate documentation for React components")
  .version(packageJson.version);

// Single 'generate' command: generate docs and serve UI
program
  .command("generate")
  .description("Generate documentation for the project and serve the documentation UI (Next.js)")
  .option("-r, --root <path>", "Root directory of the project")
  .option("-p, --port <number>", "Port for documentation server")
  .option("--ollama-url <url>", "URL for Ollama API")
  .option("--ollama-model <model>", "Model to use with Ollama for chat")
  .option("--ollama-embedding-model <model>", "Model to use with Ollama for embeddings")
  .option("--generate-descriptions", "Generate AI descriptions for components and props")
  .action(async (options: { root?: string, port?: string, ollamaUrl?: string, ollamaModel?: string, ollamaEmbeddingModel?: string, generateDescriptions?: boolean }) => {
    try {
      // Load configuration
      const config = loadConfig();
      
      // Merge options with config (CLI options take precedence)
      const rootDir = path.resolve(options.root || config.targetDir || process.cwd());
      const port = options.port || config.uiPort || "3000";
      const ollamaUrl = options.ollamaUrl || config.ollamaBaseUrl || "http://localhost:11434";
      const ollamaModel = options.ollamaModel || config.ollamaModel || "gemma3:4b";
      const ollamaEmbeddingModel = options.ollamaEmbeddingModel || config.ollamaEmbeddingModel || "nomic-embed-text:latest";
      
      // Set environment variables for the services
      process.env.OLLAMA_URL = ollamaUrl;
      process.env.OLLAMA_MODEL = ollamaModel;
      process.env.OLLAMA_EMBEDDING_MODEL = ollamaEmbeddingModel;
      
      // Initialize vector similarity service with Ollama as default
      const similarityService = createVectorSimilarityService();
      
      console.log(`Using Ollama for embeddings: ${process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest"} at ${process.env.OLLAMA_URL || "http://localhost:11434"}`);
      
      const codeItems = await parseAllCodeItems(rootDir);
      
      // Generate AI descriptions if configured or passed as a flag
      const generateDescriptions = options.generateDescriptions || config.generateDescriptions || false;
      if (generateDescriptions) {
        console.log("Generating AI descriptions for code items...");
        const { AiDescriptionGenerator } = require("../ai/generator");
        const aiGenerator = new AiDescriptionGenerator({
          useOllama: true,
          ollamaUrl,
          ollamaModel,
          apiKey: "sk-mock-api-key-for-ollama"
        });
        
        // Generate descriptions for each code item
        for (const item of codeItems) {
          if (!item.description || item.description.trim() === "") {
            try {
              // Create a mock component structure for the AI generator
              const mockComponent = {
                name: item.name,
                filePath: item.filePath,
                type: item.kind,
                props: [],
                methods: item.methods || [],
                sourceCode: item.code
              };
              
              const enhanced = await aiGenerator.enhanceComponentsWithDescriptions([mockComponent]);
              if (enhanced && enhanced.length > 0) {
                item.description = enhanced[0].description;
                console.log(`Generated description for ${item.name}`);
              }
            } catch (error) {
              console.error(`Error generating description for ${item.name}:`, error);
            }
          }
        }
      }
      
      // Process each code item to extract methods and generate vectors
      console.log("Processing methods for similarity analysis...");
      for (const item of codeItems) {
        if (item.methods && item.methods.length > 0) {
          console.log(`Processing ${item.methods.length} methods in ${item.name}`);
          // Process methods for similarity
          await similarityService.processComponentMethods(item.name, item.methods, item.filePath);
        }
      }
      console.log("Finished processing methods for similarity analysis.");
      const outputDir = path.join(process.cwd(), "documentation");
      
      // Save the vector database to a file in the documentation directory
      saveVectorDatabase(similarityService, outputDir);
      // Save code items as code-index.json
      await fs.ensureDir(outputDir);
      const docsDataDir = path.join(outputDir, "docs-data");
      await fs.ensureDir(docsDataDir);
      await fs.writeJson(path.join(docsDataDir, "code-index.json"), codeItems, { spaces: 2 });
      
      // Also generate a [slug].json file for each code item in the docs-data directory
      for (const item of codeItems) {
        const slug = item.slug || generateUniqueSlug(item.name, item.filePath, rootDir);
        item.slug = slug; // Ensure slug is set
        
        // Add empty relationships array if not present
        if (!item.relationships) {
          item.relationships = [];
        }
        
        // Add empty imports array if not present
        if (!item.imports) {
          item.imports = [];
        }
        
        await fs.writeJson(path.join(docsDataDir, `${slug}.json`), item, { spaces: 2 });
      }
      
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
      
      // Set up UI to serve docs from the current project
      const uiDir = path.join(__dirname, "../../src/ui");
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
      
      // Start Next.js UI
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
        }
      );
      child.on("exit", (code) => {
        process.exit(code ?? 0);
      });
    } catch (error: unknown) {
      console.error(
        "Error serving documentation UI:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Add a default action to the main program
/**
 * Default CLI action for code-y.
 * Generates documentation for React components based on provided options.
 * @param options {CodeYOptions} - Parsed CLI options
 */
program.action(async (options: CodeYOptions) => {
  console.log("📚 Generating documentation...");

  // Process options
  const rootDir = path.resolve(options.root || process.cwd());
  console.log(`Using root directory: ${rootDir}`);

  const excludePatterns = options.exclude.split(",");
  const includePatterns = options.include.split(",");
  const maxDepth =
    options.depth === "Infinity" ? Infinity : parseInt(options.depth);

  // Standardize boolean parsing from commander (it should provide booleans)
  const useOllama =
    options.useOllama === true ||
    String(options.useOllama).toLowerCase() === "true";
  // Chat is always enabled
  const enableChat = true;
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
      const { VectorSimilarityService } = require("../ai/vector-similarity/vector-similarity");

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

      // Initialize similarity service using our helper to ensure Ollama is used for embeddings by default
      const similarityService = createVectorSimilarityService();

      console.log("Similarity service options:", {
        ollamaUrl: options.ollamaUrl,
        ollamaEmbeddingModel: options.ollamaEmbeddingModel,
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
        
        // Save the vector database to a file in the documentation directory
        const outputDir = path.resolve(rootDir, options.output);
        saveVectorDatabase(similarityService, outputDir);
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
      
      // Update the docs URL with the selected port
      const docsUrl = `http://localhost:${options.port}/docs`;

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
          `PORT=${options.port}
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_USE_OLLAMA=${useOllama}
NEXT_PUBLIC_OLLAMA_URL=${options.ollamaUrl}
NEXT_PUBLIC_OLLAMA_MODEL=${options.ollamaModel}
NEXT_PUBLIC_CHAT_MODEL=${options.chatModel}
NEXT_PUBLIC_SHOW_CODE=${showCode}
NEXT_PUBLIC_SHOW_METHODS=${showMethods}
NEXT_PUBLIC_SHOW_SIMILARITY=${showSimilarity}
            `,
          "utf8"
        );

        // Create a docs-config.js file
        fs.writeFileSync(
          path.join(outputDocsUiDir, "docs-config.js"),
          `module.exports = {
  port: ${options.port},
  enableChat: true,
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
  } catch (error) {
    console.error("Error generating documentation:", error instanceof Error ? error.message : String(error));
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

// Serve the Next.js UI directly from src/ui
program
  .command("serve-ui")
  .description("Serve the documentation UI (Next.js) from the package's src/ui directory on the given port.")
  .option("-r, --root <path>", "Root directory of the project", process.cwd())
  .option("-p, --port <number>", "Port for documentation server", "3000")
  .action(async (options: { root: string, port: string }) => {
    // Start Next.js UI directly
    const uiDir = path.join(__dirname, "../../src/ui");
    const port = options.port || "3000";
    console.log(`Starting Next.js UI from ${uiDir} on port ${port}...`);
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["next", "dev", "-p", port],
      {
        cwd: uiDir,
        stdio: "inherit",
        shell: false,
      }
    );
    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  });

// Add init command
program
  .command("init")
  .description("Initialize code-y configuration in your project")
  .action(async () => {
    try {
      console.log("🔧 Initializing code-y configuration...");
      
      const configPath = path.join(process.cwd(), "codey.config.js");
      
      // Check if config already exists
      if (await fs.pathExists(configPath)) {
        console.log("⚠️  Configuration file already exists at codey.config.js");
        return;
      }
      
      // Create default configuration
      const defaultConfig = `module.exports = {
  // AI Provider: 'openai' or 'ollama'
  aiProvider: 'ollama',
  
  // OpenAI API Key (if using OpenAI)
  openaiApiKey: process.env.OPENAI_API_KEY,
  
  // Ollama configuration (if using Ollama)
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'gemma3:4b',
  ollamaEmbeddingModel: 'nomic-embed-text:latest',
  
  // Target directory for scanning
  targetDir: '.',
  
  // Patterns to exclude from scanning
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**'
  ],
  
  // Patterns to include in scanning
  includePatterns: [
    '**/*.tsx',
    '**/*.jsx',
    '**/*.ts',
    '**/*.js'
  ],
  
  // Output directory for documentation
  outputDir: 'documentation',
  
  // Port for documentation UI server
  uiPort: 3000,
  
  // Theme for documentation
  theme: 'light',
  
  // Feature flags
  showCode: true,
  showMethods: true,
  showSimilarity: true,
  generateDescriptions: false
};
`;
      
      await fs.writeFile(configPath, defaultConfig);
      console.log("✅ Created codey.config.js");
      
      // Add to .gitignore if it exists
      const gitignorePath = path.join(process.cwd(), ".gitignore");
      if (await fs.pathExists(gitignorePath)) {
        let gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
        if (!gitignoreContent.includes("documentation/")) {
          gitignoreContent += "\n# Code-y documentation\ndocumentation/\n";
          await fs.writeFile(gitignorePath, gitignoreContent);
          console.log("✅ Added documentation/ to .gitignore");
        }
      }
      
      console.log("\n📝 Next steps:");
      console.log("1. Edit codey.config.js to customize your settings");
      console.log("2. Run 'npx code-y generate' to generate documentation and start the server");
      
    } catch (error) {
      console.error("Error initializing configuration:", error);
      process.exit(1);
    }
  });

// Add build command
program
  .command("build")
  .description("Build static documentation files")
  .option("-r, --root <path>", "Root directory of the project", process.cwd())
  .option("-o, --output <path>", "Output directory", "documentation")
  .action(async (options: { root: string, output: string }) => {
    try {
      console.log("🏗️  Building static documentation...");
      
      const rootDir = path.resolve(options.root || process.cwd());
      const outputDir = path.resolve(rootDir, options.output);
      
      // Check if documentation has been generated
      const docsDataDir = path.join(outputDir, "docs-data");
      if (!await fs.pathExists(docsDataDir)) {
        console.error("❌ No documentation found. Please run 'code-y generate' first.");
        process.exit(1);
      }
      
      // Copy UI files to output directory
      const uiOutputDir = path.join(outputDir, "ui-build");
      const packageUiDir = path.join(__dirname, "../../src/ui");
      
      console.log("📁 Copying UI files...");
      await fs.copy(packageUiDir, uiOutputDir, {
        filter: (src) => {
          // Skip node_modules and .next
          if (src.includes("node_modules") || src.includes(".next")) {
            return false;
          }
          return true;
        }
      });
      
      // Create production build configuration
      const envFile = path.join(uiOutputDir, ".env.production");
      await fs.writeFile(envFile, `
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_USE_OLLAMA=true
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
NEXT_PUBLIC_OLLAMA_MODEL=gemma3:4b
NEXT_PUBLIC_SHOW_CODE=true
NEXT_PUBLIC_SHOW_METHODS=true
NEXT_PUBLIC_SHOW_SIMILARITY=true
`);
      
      // Copy docs-data to UI public directory
      const uiPublicDocsData = path.join(uiOutputDir, "public", "docs-data");
      await fs.copy(docsDataDir, uiPublicDocsData);
      
      console.log("📦 Installing dependencies...");
      execSync("npm install --legacy-peer-deps", {
        cwd: uiOutputDir,
        stdio: "inherit"
      });
      
      console.log("🔨 Building Next.js application...");
      execSync("npm run build", {
        cwd: uiOutputDir,
        stdio: "inherit"
      });
      
      console.log("✅ Static documentation built successfully!");
      console.log(`📁 Output directory: ${uiOutputDir}`);
      console.log("\nTo serve the static files:");
      console.log(`1. cd ${uiOutputDir}`);
      console.log("2. npm run start");
      
    } catch (error) {
      console.error("Error building documentation:", error);
      process.exit(1);
    }
  });

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
