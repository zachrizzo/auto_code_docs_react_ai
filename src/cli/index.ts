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
import axios from "axios";
import { DockerManager } from "./utils/docker-manager";
import { LangFlowManager } from "../ai/langflow/langflow-manager";
import {
  generateDocumentationData,
  prepareUiDirectory,
  startAiServices,
  startUiServer,
} from "./gencode";

/**
 * Generate a unique slug for a component based on its file path and name
 * to avoid collisions when multiple components have the same name
 */
function generateUniqueSlug(componentName: string, filePath: string, rootDir: string): string {
  const relativePath = path.relative(rootDir, filePath);
  return `${relativePath.replace(/[\/\\]/g, '_').replace(/\.(tsx?|jsx?)$/, '')}_${componentName}`.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Generate a content-based hash for deduplication
 */
function generateContentHash(name: string, code: string): string {
  // Simple hash based on function name and normalized code content
  const normalizedCode = code.replace(/\s+/g, ' ').trim();
  let hash = 0;
  const content = `${name}:${normalizedCode}`;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Determine if a file path is likely a re-export (index file or contains exports)
 */
function isReExportFile(filePath: string, code: string): boolean {
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Check if it's an index file
  if (fileName === 'index') {
    return true;
  }
  
  // Check if the code contains export statements without implementation
  const exportPattern = /export\s+(?:\{[^}]+\}|[*])\s+from\s+['"][^'"]+['"]/g;
  return exportPattern.test(code);
}

/**
 * Find the most likely source file for a function (not a re-export)
 */
function findSourceFile(items: Array<any>): any {
  // Sort by specificity - prefer files that are not index files and have actual implementation
  return items.sort((a, b) => {
    const aIsReExport = isReExportFile(a.filePath, a.code);
    const bIsReExport = isReExportFile(b.filePath, b.code);
    
    // Prefer non-re-export files
    if (aIsReExport && !bIsReExport) return 1;
    if (!aIsReExport && bIsReExport) return -1;
    
    // Prefer files with longer code (more implementation)
    const aCodeLength = (a.code || '').length;
    const bCodeLength = (b.code || '').length;
    if (aCodeLength !== bCodeLength) {
      return bCodeLength - aCodeLength;
    }
    
    // Prefer files that are deeper in the directory structure (more specific)
    const aDepth = a.filePath.split(path.sep).length;
    const bDepth = b.filePath.split(path.sep).length;
    return bDepth - aDepth;
  })[0];
}

/**
 * Deduplicate code items based on content hash
 */
function deduplicateCodeItems(items: Array<any>): Array<any> {
  const seenHashes = new Map<string, Array<any>>();
  const uniqueItems: Array<any> = [];
  
  // Group items by content hash
  for (const item of items) {
    const hash = generateContentHash(item.name, item.code || '');
    if (!seenHashes.has(hash)) {
      seenHashes.set(hash, []);
    }
    seenHashes.get(hash)!.push(item);
  }
  
  // For each group, select the best representative
  for (const [hash, duplicates] of seenHashes) {
    if (duplicates.length === 1) {
      uniqueItems.push(duplicates[0]);
    } else {
      console.log(`Found ${duplicates.length} duplicates for "${duplicates[0].name}"`);
      const sourceItem = findSourceFile(duplicates);
      
      // Update the source item to include references to all file paths where it's found
      sourceItem.exportedFrom = duplicates.map(d => d.filePath);
      sourceItem.alternativeSlugs = duplicates.map(d => d.slug).filter(s => s !== sourceItem.slug);
      
      uniqueItems.push(sourceItem);
      console.log(`Selected "${sourceItem.filePath}" as canonical source for "${sourceItem.name}"`);
    }
  }
  
  return uniqueItems;
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
        const code = node.getText(sourceFile).trim();
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
        const code = node.getText(sourceFile).trim();
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
            const methodCode = member.getText(sourceFile).trim();
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
            const code = declaration.parent.parent.getText(sourceFile).trim();
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
          const methodCode = child.getText(sourceFile).trim();
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
              const methodCode = decl.parent.parent.getText(sourceFile).trim();
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
export async function parseAllCodeItems(rootDir: string): Promise<any[]> {
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
  
  // Apply deduplication to remove duplicate entries from re-exports
  console.log("Applying deduplication to remove re-export duplicates...");
  const deduplicatedItems = deduplicateCodeItems(allItems);
  console.log(`After deduplication: ${deduplicatedItems.length} unique code items`);
  
  return deduplicatedItems;
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
  .version(packageJson.version)
  .option("--cwd <path>", "Set the current working directory")
  .hook("preAction", (thisCommand, actionCommand) => {
    const cwd = thisCommand.opts().cwd;
    if (cwd) {
      const targetDir = path.resolve(cwd);
      if (fs.existsSync(targetDir)) {
        console.log(`Setting working directory to: ${targetDir}`);
        process.chdir(targetDir);
      } else {
        console.error(`Error: Directory not found - ${targetDir}`);
        process.exit(1);
      }
    }
  });

// Single 'generate' command: generate docs and serve UI
program
  .command("generate")
  .description("Generate documentation for the project and serve the documentation UI with AI-powered chat")
  .option("-r, --root <path>", "Root directory of the project")
  .option("-p, --port <number>", "Port for documentation server")
  .option("--ollama-url <url>", "URL for Ollama API")
  .option("--ollama-model <model>", "Model to use with Ollama for chat")
  .option("--ollama-embedding-model <model>", "Model to use with Ollama for embeddings")
  .option("--generate-descriptions", "Generate AI descriptions for components and props")
  .option("--langflow-config <path>", "Path to LangFlow configuration JSON file")
  .option("--no-ai", "Disable AI features and use legacy chat only")
  .option("--cleanup-on-exit", "Remove Python virtual environment when stopping")
  .option("--keep-environment", "Keep Python virtual environment for faster subsequent runs (default)")
  .action(async (options: { root?: string, port?: string, ollamaUrl?: string, ollamaModel?: string, ollamaEmbeddingModel?: string, generateDescriptions?: boolean, noAi?: boolean, langflowConfig?: string, cleanupOnExit?: boolean, keepEnvironment?: boolean }) => {
    try {
      // Load configuration
      const config = loadConfig();
      
      // Merge options with config (CLI options take precedence)
      const rootDir = path.resolve(options.root || config.targetDir || process.cwd());
      const port = options.port || config.uiPort || "3000";
      const ollamaUrl = options.ollamaUrl || config.ollamaBaseUrl || "http://localhost:11434";
      const ollamaModel = options.ollamaModel || config.ollamaModel || "gemma3:4b";
      const ollamaEmbeddingModel = options.ollamaEmbeddingModel || config.ollamaEmbeddingModel || "nomic-embed-text:latest";
      const generateDescriptions = options.generateDescriptions || config.generateDescriptions || false;
      const outputDir = path.join(process.cwd(), "documentation");
      const docsDataDir = path.join(outputDir, "docs-data");

      // Start AI services
      await startAiServices({
        noAi: options.noAi || false,
        langflowConfig: options.langflowConfig,
        ollamaUrl: ollamaUrl,
        cleanupOnExit: options.cleanupOnExit,
        keepEnvironment: options.keepEnvironment,
      });

      // Set environment variables for the services
      process.env.OLLAMA_URL = ollamaUrl;
      process.env.OLLAMA_MODEL = ollamaModel;
      process.env.OLLAMA_EMBEDDING_MODEL = ollamaEmbeddingModel;
      
      await generateDocumentationData(rootDir, docsDataDir, generateDescriptions, ollamaUrl, ollamaModel);
      
      // Set up UI to serve docs from the current project
      const uiDir = path.join(__dirname, "../../src/ui");
      await prepareUiDirectory(outputDir, uiDir);
      
      // Start Next.js UI
      await startUiServer(port, uiDir);

    } catch (error: unknown) {
      console.error(
        "Error generating documentation:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

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

// Add cleanup command
program
  .command("cleanup")
  .description("Clean up Python virtual environments and temporary files")
  .option("--dry-run", "Show what would be cleaned up without actually doing it")
  .action(async (options: { dryRun?: boolean }) => {
    try {
      console.log('🧹 Cleaning up code-y environments...');
      
      const { LangFlowManager } = require('../ai/langflow/langflow-manager');
      const manager = new LangFlowManager({
        projectRoot: process.cwd()
      });
      
      if (options.dryRun) {
        console.log('🔍 Dry run - showing what would be cleaned:');
        
        const envInfo = await manager.getEnvironmentInfo();
        if (envInfo.service === 'embedded') {
          console.log(`   📁 Virtual environment: ${envInfo.location} (${envInfo.size})`);
          console.log('   📄 Temporary Python scripts');
          console.log('   📁 Temporary directories');
        } else {
          console.log('   ✅ No Python environments found to clean');
        }
        
        console.log('');
        console.log('To actually clean up, run: npx code-y cleanup');
      } else {
        await manager.cleanup();
        console.log('✅ Cleanup completed');
      }
      
    } catch (error) {
      console.error('Error during cleanup:', error);
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

program
  .command("start")
  .description("Starts the documentation server with live updates and AI features.")
  .option("-p, --port <port>", "Port to run the server on", "3001")
  .option("--docs-dir <path>", "Directory containing documentation data", "docs-data")
  .option("--root-dir <path>", "Root directory of the source code to watch", ".")
  .option("--no-ai", "Disable AI-powered description generation")
  .option("--keep-environment", "Do not clean up the generated environment on exit")
  .action(async (options: { port: string, docsDir: string, rootDir: string, ai?: boolean, noAi?: boolean, keepEnvironment?: boolean }) => {
    try {
      console.log("Starting Codey server...");
      
      const config = loadConfig();
      const finalRootDir = path.resolve(options.rootDir || config.rootDir || ".");
      const docsDir = path.resolve(options.docsDir || config.docsDir || "docs-data");
      const noAi = options.noAi === true || config.noAi === true;
      const keepEnvironment = options.keepEnvironment === true;
      
      // LangFlow is now a required service
      let langflowManager: LangFlowManager | undefined;
      
      console.log("Initializing LangFlow service...");
      langflowManager = new LangFlowManager({ 
        projectRoot: finalRootDir,
        langflowConfigPath: config.langflowConfig 
      });
      
      const result = await langflowManager.start();
      
      if (!result.success) {
        console.error("❌ Failed to start LangFlow. The documentation server requires LangFlow to run.");
        console.error("Please check your Docker or Python environment and try again.");
        process.exit(1);
      }
      
      // Set environment variables for the Next.js app
      process.env.USE_LANGFLOW = "true";
      process.env.LANGFLOW_URL = result.url;
      
      const doCleanup = !keepEnvironment;
      
      // Set up shutdown handler
      const shutdownHandler = async () => {
        console.log("\nGracefully shutting down...");
        if (langflowManager) {
          await langflowManager!.stop(doCleanup);
        }
        // The Next.js server child process will be killed by this exit
        process.exit(0);
      };
      
      process.on("SIGINT", shutdownHandler);
      process.on("SIGTERM", shutdownHandler);
      
      console.log("Starting documentation UI server...");
      await startNextJsServer(options.port, docsDir, finalRootDir, noAi, langflowManager);
      
      if (langflowManager) {
        const envInfo = await langflowManager.getEnvironmentInfo();
        const status = await langflowManager.getStatus();
        console.log("\n✅ LangFlow Environment Details:");
        console.log(`   - Service Type: ${envInfo.service}`);
        console.log(`   - Status: ${status.isRunning ? 'Running' : 'Stopped'}`);
        console.log(`   - URL: ${result.url}`); // Use result.url as it's guaranteed to be there
        if (envInfo.service === 'embedded') {
          console.log(`   - Python Env Size: ${envInfo.size}`);
        }
      }

    } catch (error) {
      console.error("Error starting the server:", error);
      process.exit(1);
    }
  });

async function startNextJsServer(port: string, docsDir: string, rootDir: string, noAi: boolean, langflowManager?: LangFlowManager) {
  const nextAppDir = path.join(__dirname, '..', '..', 'src', 'ui');
  
  if (!fs.existsSync(nextAppDir) || !fs.existsSync(path.join(nextAppDir, 'package.json'))) {
    console.error(`Next.js app not found at ${nextAppDir}`);
    console.error("Please ensure the UI has been built correctly.");
    process.exit(1);
  }
  
  // Set environment variables for the Next.js process
  const env = {
    ...process.env,
    PORT: port,
    DOCS_DIR: docsDir,
    ROOT_DIR: rootDir,
    NO_AI: String(noAi),
    USE_LANGFLOW: process.env.USE_LANGFLOW || "false",
    LANGFLOW_URL: process.env.LANGFLOW_URL || ""
  };

  console.log(`Starting Next.js server from: ${nextAppDir}`);
  
  const child = spawn('npm', ['run', 'dev'], {
    cwd: nextAppDir,
    stdio: 'inherit',
    env: env
  });

  child.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log(`Next.js server exited with code ${code}`);
    // If the server exits, we should also shut down the langflow manager
    if (langflowManager) {
        langflowManager.stop(true); // Assuming cleanup should happen
    }
    process.exit(code || 0);
  });
}
