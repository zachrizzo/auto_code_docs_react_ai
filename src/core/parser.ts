import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import * as reactDocgen from "react-docgen-typescript";
import { minimatch } from "minimatch";
import { ComponentDefinition, ParserOptions, PropDefinition } from "./types";
import { VectorSimilarityService } from "../ai/vector-similarity";

// Enable debug logging
const DEBUG = true;
function debug(...args: any[]) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

/**
 * Recursively parse React components starting from the root component
 */
export async function parseComponents(
  options: ParserOptions
): Promise<ComponentDefinition[]> {
  const {
    rootDir,
    componentPath,
    excludePatterns = [],
    includePatterns = ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
    maxDepth = Infinity,
    apiKey,
    similarityThreshold,
    useOllama,
    ollamaUrl,
    ollamaModel,
  } = options;

  // Initialize vector similarity service if API key is provided or Ollama is enabled
  let vectorSimilarityService: VectorSimilarityService | null = null;

  if (useOllama) {
    vectorSimilarityService = new VectorSimilarityService({
      useOllama: true,
      ollamaUrl,
      ollamaModel,
      similarityThreshold,
    });
    debug("Vector similarity service initialized with Ollama");
  } else if (apiKey) {
    vectorSimilarityService = new VectorSimilarityService({
      apiKey,
      similarityThreshold,
    });
    debug("Vector similarity service initialized with OpenAI");
  } else {
    debug("No API key or Ollama enabled, skipping vector similarity analysis");
  }

  // Resolve absolute paths
  const absoluteRootDir = path.resolve(rootDir);
  const absoluteComponentPath = path.resolve(rootDir, componentPath);

  debug("Absolute Root Dir:", absoluteRootDir);
  debug("Absolute Component Path:", absoluteComponentPath);
  debug("Include Patterns:", includePatterns);
  debug("Exclude Patterns:", excludePatterns);

  // Set up react-docgen-typescript parser
  const parserOptions = {
    propFilter: (prop: any) => {
      return !prop.parent || !prop.parent.fileName.includes("node_modules");
    },
    shouldExtractLiteralValuesFromEnum: true,
    shouldRemoveUndefinedFromOptional: true,
  };

  // Try to find a suitable tsconfig.json file
  let tsconfigPath = path.join(absoluteRootDir, "tsconfig.json");
  debug("Looking for tsconfig at:", tsconfigPath);

  // Check if the tsconfig exists, if not, try looking for it in parent directories
  if (!fs.existsSync(tsconfigPath)) {
    debug("tsconfig not found, looking in parent directories");
    let currentDir = absoluteRootDir;
    const rootDrive = path.parse(currentDir).root;

    while (currentDir !== rootDrive) {
      const testPath = path.join(currentDir, "tsconfig.json");
      debug("Checking for tsconfig at:", testPath);
      if (fs.existsSync(testPath)) {
        tsconfigPath = testPath;
        debug("Found tsconfig at:", tsconfigPath);
        break;
      }
      currentDir = path.dirname(currentDir);
    }
  }

  // Fall back to the project's main tsconfig if none found
  if (!fs.existsSync(tsconfigPath)) {
    debug(
      "No tsconfig found in parent directories, falling back to project tsconfig"
    );
    const projectRoot = path.resolve(__dirname, "../..");
    tsconfigPath = path.join(projectRoot, "tsconfig.json");
    debug("Using project tsconfig:", tsconfigPath);
  }

  // Initialize the parser with the tsconfig if it exists
  const parser = fs.existsSync(tsconfigPath)
    ? reactDocgen.withCustomConfig(tsconfigPath, parserOptions)
    : reactDocgen.withDefaultConfig(parserOptions);

  debug(
    "Parser initialized",
    fs.existsSync(tsconfigPath) ? "with custom config" : "with default config"
  );

  // Start from root component
  return await parseComponentRecursively(
    parser,
    absoluteComponentPath,
    absoluteRootDir,
    includePatterns,
    excludePatterns,
    0,
    maxDepth,
    new Set(), // Initialize with an empty set for tracking processed paths
    vectorSimilarityService
  );
}

/**
 * Parse a component and its children recursively
 */
async function parseComponentRecursively(
  parser: reactDocgen.FileParser,
  componentPath: string,
  rootDir: string,
  includePatterns: string[],
  excludePatterns: string[],
  depth: number,
  maxDepth: number,
  processedPaths: Set<string> = new Set(),
  vectorSimilarityService: VectorSimilarityService | null = null
): Promise<ComponentDefinition[]> {
  debug(`Parsing component at depth ${depth}: ${componentPath}`);

  if (depth > maxDepth) {
    debug(`Max depth (${maxDepth}) reached, skipping: ${componentPath}`);
    return [];
  }

  // Check for circular dependencies
  if (processedPaths.has(componentPath)) {
    debug(
      `Circular dependency detected, skipping already processed: ${componentPath}`
    );
    return [];
  }

  // Mark this path as processed
  processedPaths.add(componentPath);

  try {
    // Check if the component file exists
    if (!fs.existsSync(componentPath)) {
      debug(`Component file not found: ${componentPath}`);
      return [];
    }

    // Parse the component
    debug(`Parsing file: ${componentPath}`);
    const componentInfo = parser.parse(componentPath);
    debug(`Found ${componentInfo.length} component(s) in ${componentPath}`);

    if (componentInfo.length === 0) {
      debug(`No component info found in: ${componentPath}`);
      return [];
    }

    const result: ComponentDefinition[] = [];

    for (const info of componentInfo) {
      debug(
        `Processing component: ${
          info.displayName || path.basename(componentPath)
        }`
      );

      // Extract props
      const props: PropDefinition[] = Object.entries(info.props || {}).map(
        ([name, propInfo]: [string, any]) => ({
          name,
          type: propInfo.type?.name || "any",
          required: propInfo.required || false,
          defaultValue: propInfo.defaultValue?.value,
          description: propInfo.description || "",
        })
      );
      debug(`Found ${props.length} props`);

      // Look for imported components
      debug(`Reading file content to find imports: ${componentPath}`);
      const fileContent = await fs.readFile(componentPath, "utf-8");

      // Extract source code for this component
      // This is a simple approach - for more accurate extraction we would use AST parsing
      let sourceCode = fileContent;
      // Limit source code length if needed
      // if (sourceCode.length > 5000) {
      //   sourceCode =
      //     sourceCode.substring(0, 5000) +
      //     "...\n// (code truncated for brevity)";
      // }

      // Create component definition
      const component: ComponentDefinition = {
        name:
          info.displayName ||
          path.basename(componentPath, path.extname(componentPath)),
        description: info.description || "",
        props,
        filePath: path.relative(rootDir, componentPath),
        sourceCode, // Add the source code
        childComponents: [],
      };

      // Extract methods
      const methods = extractComponentMethods(fileContent, component.name);
      if (methods.length > 0) {
        debug(`Found ${methods.length} methods in ${component.name}`);

        // Process methods for similarity if the similarity service is available
        if (vectorSimilarityService) {
          debug(`Processing methods for similarity in ${component.name}`);
          component.methods =
            await vectorSimilarityService.processComponentMethods(
              component.name,
              methods,
              component.filePath
            );
        } else {
          component.methods = methods;
        }
      }

      const imports = extractImportedComponentPaths(
        fileContent,
        componentPath,
        rootDir
      );
      debug(`Found ${imports.length} imports`);
      if (imports.length > 0) {
        debug("Imported paths:", imports);
      }

      // Also parse the file to find named exports and default exports that might be components
      const defaultExportComponent = extractDefaultExportComponent(
        fileContent,
        component.name
      );
      if (defaultExportComponent && defaultExportComponent !== component.name) {
        debug(`Found default export component: ${defaultExportComponent}`);

        // Create a component definition for the default export
        const defaultComponent: ComponentDefinition = {
          name: defaultExportComponent,
          description: `Default export from ${path.basename(componentPath)}`,
          props: [], // We would need more sophisticated parsing to extract props
          filePath: path.relative(rootDir, componentPath),
          sourceCode: sourceCode,
          childComponents: [],
        };

        result.push(defaultComponent);
      }

      // Recursively parse child components
      if (imports.length > 0) {
        const validPaths = imports.filter((importPath) => {
          const relativePath = path.relative(rootDir, importPath);
          debug(`Checking import: ${importPath}, relative: ${relativePath}`);

          const included = includePatterns.some((pattern) => {
            const matches = minimatch(relativePath, pattern);
            debug(`  Include pattern ${pattern}: ${matches ? "✓" : "✗"}`);
            return matches;
          });

          const excluded = excludePatterns.some((pattern) => {
            const matches = minimatch(relativePath, pattern);
            debug(`  Exclude pattern ${pattern}: ${matches ? "✓" : "✗"}`);
            return matches;
          });

          return included && !excluded;
        });

        debug(`Found ${validPaths.length} valid child component paths`);

        for (const importPath of validPaths) {
          debug(`Recursively parsing child: ${importPath}`);
          // Pass the set of processed paths to avoid circular dependencies
          const childComponents = await parseComponentRecursively(
            parser,
            importPath,
            rootDir,
            includePatterns,
            excludePatterns,
            depth + 1,
            maxDepth,
            processedPaths, // Pass the original set directly
            vectorSimilarityService
          );

          if (childComponents.length > 0) {
            if (!component.childComponents) {
              component.childComponents = [];
            }
            component.childComponents.push(...childComponents);
          }
        }
      }

      result.push(component);
    }

    return result;
  } catch (error) {
    console.error(`Error parsing component at ${componentPath}:`, error);
    return [];
  }
}

/**
 * Extract imported component paths from file content
 */
function extractImportedComponentPaths(
  fileContent: string,
  currentFilePath: string,
  rootDir: string
): string[] {
  const importPaths: string[] = [];
  // Track processed paths to avoid circular dependencies
  const processedPaths = new Set<string>();

  try {
    // Create a simpler but more robust regex to match all imports
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(fileContent)) !== null) {
      const importPath = match[1]; // The captured import path
      debug(
        `Found import: "${importPath}" in ${path.basename(currentFilePath)}`
      );

      // Skip node_modules and non-relative imports
      if (importPath.startsWith(".")) {
        // Convert relative path to absolute
        const currentDir = path.dirname(currentFilePath);
        const absoluteImportPath = path.resolve(currentDir, importPath);

        // Skip if we've already processed this path to avoid circular dependencies
        if (processedPaths.has(absoluteImportPath)) {
          debug(`  Skipping already processed import: ${absoluteImportPath}`);
          continue;
        }

        processedPaths.add(absoluteImportPath);
        debug(`  Resolving import: ${importPath} -> ${absoluteImportPath}`);

        // Try to resolve the file with different extensions
        const extensions = [".tsx", ".jsx", ".ts", ".js"];
        let resolvedPath = "";

        for (const ext of extensions) {
          const filePath = absoluteImportPath.endsWith(ext)
            ? absoluteImportPath
            : `${absoluteImportPath}${ext}`;

          debug(`  Checking for file: ${filePath}`);
          if (fs.existsSync(filePath)) {
            resolvedPath = filePath;
            debug(`  Found file with extension: ${ext}`);
            break;
          }

          // Check for index files
          const indexPath = path.join(absoluteImportPath, `index${ext}`);
          debug(`  Checking for index file: ${indexPath}`);
          if (fs.existsSync(indexPath)) {
            resolvedPath = indexPath;
            debug(`  Found index file with extension: ${ext}`);
            break;
          }
        }

        if (resolvedPath) {
          debug(`  Resolved import path: ${resolvedPath}`);
          importPaths.push(resolvedPath);
        } else {
          debug(`  Could not resolve import path: ${importPath}`);
        }
      } else {
        debug(`  Skipping non-relative import: ${importPath}`);
      }
    }
  } catch (error) {
    console.error("Error extracting imports:", error);
  }

  return importPaths;
}

/**
 * Extract component methods using regex
 */
function extractComponentMethods(fileContent: string, componentName: string) {
  const methods = [];

  // Regular expression to find methods in a React functional or class component
  // This is a simplified approach and may need refinement for complex code
  const methodRegex =
    /(?:(?:function|const)\s+(\w+)\s*=\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*=>|(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?|(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*{)/g;

  let match;
  while ((match = methodRegex.exec(fileContent)) !== null) {
    const [
      fullMatch,
      arrowName,
      arrowParams,
      arrowReturn,
      funcName,
      funcParams,
      funcReturn,
      methodName,
      methodParams,
      methodReturn,
    ] = match;

    // Determine the actual method name, parameters and return type
    const name = arrowName || funcName || methodName;
    const paramsString = arrowParams || funcParams || methodParams || "";
    const returnType = (arrowReturn || funcReturn || methodReturn || "").trim();

    // Skip if we didn't get a method name or if it's the component itself
    if (!name || name === componentName) continue;

    // Extract code for the method by finding the matching closing brace
    let code = "";
    let startPos = match.index;
    let endPos = startPos + fullMatch.length;

    // If the method is an arrow function or regular function with a block body
    if (
      fileContent[endPos - 1] === "{" ||
      fileContent.substring(endPos).trim().startsWith("{")
    ) {
      // Find the position of the opening brace if it wasn't in the regex match
      if (fileContent[endPos - 1] !== "{") {
        const bracePos = fileContent.indexOf("{", endPos);
        if (bracePos !== -1) {
          endPos = bracePos + 1;
        }
      }

      // Find the matching closing brace
      let braceCount = 1;
      let i = endPos;

      while (i < fileContent.length && braceCount > 0) {
        if (fileContent[i] === "{") braceCount++;
        else if (fileContent[i] === "}") braceCount--;
        i++;
      }

      if (braceCount === 0) {
        // Successfully found the end of the method
        code = fileContent.substring(startPos, i);
      }
    } else {
      // For arrow functions with expression bodies, just take the line
      const lineEnd = fileContent.indexOf("\n", endPos);
      if (lineEnd !== -1) {
        code = fileContent.substring(startPos, lineEnd);
      } else {
        code = fileContent.substring(startPos);
      }
    }

    // Parse parameters
    const params = paramsString
      .split(",")
      .filter((param) => param.trim())
      .map((param) => {
        const [name, type] = param.split(":").map((p) => p.trim());
        return {
          name: name.replace(/^const\s+/, ""),
          type: type || "any",
        };
      });

    methods.push({
      name,
      params,
      returnType: returnType || "void",
      code,
    });
  }

  return methods;
}

/**
 * Extract default export component name from file content
 */
function extractDefaultExportComponent(
  fileContent: string,
  currentComponentName: string
): string | null {
  // Regex to find default export
  const defaultExportRegex = /export\s+default\s+([A-Za-z0-9_]+)/;
  const match = fileContent.match(defaultExportRegex);

  if (match && match[1] && match[1] !== currentComponentName) {
    return match[1];
  }

  // Try another pattern for const Component = () => {} export default Component;
  const constDefaultExportRegex =
    /const\s+([A-Za-z0-9_]+)(?:\s*:\s*React\.FC[^=]*)?(?:\s*=\s*[^{;]+)[\s\S]*export\s+default\s+\1/;
  const constMatch = fileContent.match(constDefaultExportRegex);

  if (constMatch && constMatch[1] && constMatch[1] !== currentComponentName) {
    return constMatch[1];
  }

  return null;
}
