import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import * as reactDocgen from "react-docgen-typescript";
import { minimatch } from "minimatch";
import {
  ComponentDefinition,
  ParserOptions,
  PropDefinition,
  MethodDefinition,
} from "./types";
import { VectorSimilarityService } from "../ai/vector-similarity";
import * as ts from "typescript";

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
    // Always initialize with Ollama as fallback rather than skipping
    vectorSimilarityService = new VectorSimilarityService({
      useOllama: true,
      ollamaUrl: "http://localhost:11434", // Default Ollama URL
      ollamaModel: "nomic-embed-text:latest", // Default Ollama embedding model
      similarityThreshold: similarityThreshold || 0.85,
    });
    debug(
      "Vector similarity service initialized with default Ollama settings (fallback)"
    );
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

  // **Pass 1: Collect all components and methods recursively**
  const allParsedComponents: ComponentDefinition[] = [];
  await collectComponentsRecursively(
    parser,
    absoluteComponentPath,
    absoluteRootDir,
    includePatterns,
    excludePatterns,
    0,
    maxDepth,
    new Set(), // Initialize with an empty set for tracking processed paths
    allParsedComponents // Pass the array to collect components
  );

  debug(
    `Collected ${allParsedComponents.length} components in the first pass.`
  );

  // **Pass 2: Process similarities if service is available**
  if (vectorSimilarityService) {
    debug("Starting similarity processing pass...");

    // 2a: Add all methods to the vector database
    debug("Building vector database...");
    let methodCount = 0;
    for (const component of allParsedComponents) {
      if (component.methods) {
        for (const method of component.methods) {
          // Debug log before the check in Pass 2a
          if (method.name.toLowerCase().includes("zach")) {
            console.log(
              `[DEBUG ZACH PARSER 2A] Checking method ${component.name}.${method.name}`
            );
            console.log(`[DEBUG ZACH PARSER 2A] Code exists: ${!!method.code}`);
            console.log(
              `[DEBUG ZACH PARSER 2A] Code trimmed: "${method.code?.trim()}"`
            );
            console.log(
              `[DEBUG ZACH PARSER 2A] Check passes: ${
                !!method.code && method.code.trim() !== ""
              }`
            );
          }
          // Check if method has code before adding
          if (method.code && method.code.trim() !== "") {
            await vectorSimilarityService.addMethod(
              method,
              component.name,
              component.filePath // Use relative path
            );
            methodCount++;
          }
        }
      }
    }
    debug(`Added ${methodCount} methods to the vector database.`);

    // 2b: Find similar methods for each method
    debug("Finding similar methods...");
    let warningCount = 0;
    for (const component of allParsedComponents) {
      if (component.methods) {
        for (const method of component.methods) {
          // Debug log before the check in Pass 2a
          if (method.name.toLowerCase().includes("zach")) {
            console.log(
              `[DEBUG ZACH PARSER 2A] Checking method ${component.name}.${method.name}`
            );
            console.log(`[DEBUG ZACH PARSER 2A] Code exists: ${!!method.code}`);
            console.log(
              `[DEBUG ZACH PARSER 2A] Code trimmed: "${method.code?.trim()}"`
            );
            console.log(
              `[DEBUG ZACH PARSER 2A] Check passes: ${
                !!method.code && method.code.trim() !== ""
              }`
            );
          }
          // Only find similarities for methods with code
          if (method.code && method.code.trim() !== "") {
            const similarMethods =
              await vectorSimilarityService.findSimilarMethods(
                method,
                component.name,
                component.filePath // Use relative path
              );
            if (similarMethods.length > 0) {
              method.similarityWarnings = similarMethods;
              warningCount += similarMethods.length;
              debug(
                `Found ${similarMethods.length} warnings for ${component.name}.${method.name}`
              );
            }
          }
        }
      }
    }
    debug(`Found a total of ${warningCount} similarity warnings.`);
  } else {
    debug(
      "Vector similarity service not available, skipping similarity analysis."
    );
  }

  return allParsedComponents; // Return the components with warnings populated
}

/**
 * Parses a *single* component file and its direct imports (controlled by maxDepth)
 * but does *not* perform similarity analysis.
 * This is intended to be called repeatedly for each entry file.
 */
export async function parseSingleComponentFile(
  options: Omit<
    ParserOptions,
    "apiKey" | "similarityThreshold" | "useOllama" | "ollamaUrl" | "ollamaModel"
  >,
  parserInstance: reactDocgen.FileParser // Pass pre-configured parser
): Promise<ComponentDefinition[]> {
  const {
    rootDir,
    componentPath,
    excludePatterns = [],
    includePatterns = ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
    maxDepth = Infinity, // Keep maxDepth for potential use within collection
  } = options;

  // Resolve absolute paths
  const absoluteRootDir = path.resolve(rootDir);
  const absoluteComponentPath = path.resolve(rootDir, componentPath);

  debug("Absolute Root Dir:", absoluteRootDir);
  debug("Absolute Component Path:", absoluteComponentPath);

  const collectedComponents: ComponentDefinition[] = [];
  await collectComponentsRecursively(
    parserInstance, // Use the passed parser
    absoluteComponentPath,
    absoluteRootDir,
    includePatterns,
    excludePatterns,
    0, // Start depth at 0
    maxDepth,
    new Set(), // New set for each file parse to handle its own recursion tracking
    collectedComponents
  );

  debug(
    `Collected ${collectedComponents.length} component definitions from ${componentPath}.`
  );
  return collectedComponents;
}

/**
 * Takes a list of all parsed components and processes similarities using a provided service.
 * Modifies the component definitions in place by adding similarityWarnings.
 */
export async function processComponentListSimilarities(
  allParsedComponents: ComponentDefinition[],
  vectorSimilarityService: VectorSimilarityService
): Promise<void> {
  debug("Starting similarity processing pass for all components...");

  // 2a: Add all methods to the vector database
  debug("Building vector database...");
  let methodCount = 0;
  for (const component of allParsedComponents) {
    if (component.methods) {
      for (const method of component.methods) {
        // Debug log before the check in Pass 2a
        if (method.name.toLowerCase().includes("zach")) {
          console.log(
            `[DEBUG ZACH PARSER 2A] Checking method ${component.name}.${method.name}`
          );
          console.log(`[DEBUG ZACH PARSER 2A] Code exists: ${!!method.code}`);
          console.log(
            `[DEBUG ZACH PARSER 2A] Code trimmed: "${method.code?.trim()}"`
          );
          console.log(
            `[DEBUG ZACH PARSER 2A] Check passes: ${
              !!method.code && method.code.trim() !== ""
            }`
          );
        }
        // Check if method has code before adding
        if (method.code && method.code.trim() !== "") {
          await vectorSimilarityService.addMethod(
            method,
            component.name,
            component.filePath // Use relative path
          );
          methodCount++;
        }
      }
    }
  }
  debug(`Added ${methodCount} methods to the vector database.`);

  // 2b: Find similar methods for each method
  debug("Finding similar methods...");
  let warningCount = 0;
  for (const component of allParsedComponents) {
    if (component.methods) {
      for (const method of component.methods) {
        // Debug log before the check in Pass 2a - DUPLICATE LOG REMOVED
        // Only find similarities for methods with code
        if (method.code && method.code.trim() !== "") {
          const similarMethods =
            await vectorSimilarityService.findSimilarMethods(
              method,
              component.name,
              component.filePath // Use relative path
            );
          if (similarMethods.length > 0) {
            // IMPORTANT: Modify the original object in the list
            method.similarityWarnings = similarMethods;
            warningCount += similarMethods.length;
            debug(
              `Found ${similarMethods.length} warnings for ${component.name}.${method.name}`
            );
          }
        }
      }
    }
  }
  debug(`Found a total of ${warningCount} similarity warnings.`);
}

/**
 * Recursively collect component definitions without processing similarities yet.
 */
async function collectComponentsRecursively(
  parser: reactDocgen.FileParser,
  componentPath: string,
  rootDir: string,
  includePatterns: string[],
  excludePatterns: string[],
  depth: number,
  maxDepth: number,
  processedPaths: Set<string>, // Pass directly, no default needed here
  collectedComponents: ComponentDefinition[] // Array to store results
): Promise<void> {
  // Returns void as results are added to the collectedComponents array
  debug(`Collecting component at depth ${depth}: ${componentPath}`);

  if (depth > maxDepth) {
    debug(`Max depth (${maxDepth}) reached, skipping: ${componentPath}`);
    return;
  }

  // Check for circular dependencies
  if (processedPaths.has(componentPath)) {
    debug(
      `Circular dependency detected, skipping already processed: ${componentPath}`
    );
    return;
  }

  // Mark this path as processed for this branch of recursion
  processedPaths.add(componentPath);

  try {
    // Check if the component file exists
    if (!fs.existsSync(componentPath)) {
      debug(`Component file not found: ${componentPath}`);
      // Unmark path if not found, maybe it's resolved differently elsewhere?
      // processedPaths.delete(componentPath); // Let's not delete, keeps logic simple
      return;
    }

    // Parse the component
    debug(`Parsing file: ${componentPath}`);
    const componentInfo = parser.parse(componentPath);
    debug(`Found ${componentInfo.length} component(s) in ${componentPath}`);

    if (componentInfo.length === 0) {
      debug(`No component info found in: ${componentPath}`);
      // Unmark path if no components found
      // processedPaths.delete(componentPath); // Let's not delete
      return;
    }

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
      let sourceCode = extractComponentSourceCode(
        fileContent,
        info.displayName || path.basename(componentPath)
      );

      // Create component definition
      const component: ComponentDefinition = {
        name:
          info.displayName ||
          path.basename(componentPath, path.extname(componentPath)),
        description: info.description || "",
        props,
        filePath: path.relative(rootDir, componentPath), // Store relative path
        sourceCode,
        childComponents: [], // Child components will be processed separately
        methods: [], // Initialize methods array
      };

      // Extract methods - but DO NOT process for similarity here
      const methods = extractComponentMethods(fileContent, component.name);
      if (methods.length > 0) {
        debug(`Extracted ${methods.length} methods in ${component.name}`);
        component.methods = methods; // Just assign the extracted methods
      }

      // Add the parsed component to our collection
      collectedComponents.push(component);

      const imports = extractImportedComponentPaths(
        fileContent,
        componentPath,
        rootDir
      );
      debug(`Found ${imports.length} imports`);
      if (imports.length > 0) {
        debug("Imported paths:", imports);
      }

      // Recursively collect child components
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
          debug(`Recursively collecting children for: ${importPath}`);
          // Pass the set of processed paths to avoid circular dependencies
          // Note: We pass the original processedPaths set, modifications within recursion affect the shared set
          await collectComponentsRecursively(
            parser,
            importPath,
            rootDir,
            includePatterns,
            excludePatterns,
            depth + 1,
            maxDepth,
            processedPaths,
            collectedComponents // Pass the same collection array down
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing component at ${componentPath}:`, error);
    // Ensure path is removed from processed set on error? Might hide issues.
    // processedPaths.delete(componentPath);
  }
  // Function returns void
}

/**
 * Extract the source code for a specific component from a file using AST
 */
function extractComponentSourceCode(
  fileContent: string,
  componentName: string
): string {
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx", // Temporary file name
      fileContent,
      ts.ScriptTarget.Latest,
      true // Set parent pointers
    );

    let componentNode: ts.Node | undefined;

    function visit(node: ts.Node) {
      if (componentNode) return; // Stop searching once found

      // Check for class declarations
      if (
        ts.isClassDeclaration(node) &&
        node.name &&
        node.name.text === componentName
      ) {
        componentNode = node;
        return;
      }

      // Check for function declarations
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.name.text === componentName
      ) {
        componentNode = node;
        return;
      }

      // Check for variable statements (for const/let/var components)
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            declaration.name &&
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === componentName
          ) {
            // Check if it's an arrow function or function expression
            if (
              declaration.initializer &&
              (ts.isArrowFunction(declaration.initializer) ||
                ts.isFunctionExpression(declaration.initializer))
            ) {
              // Use the entire variable statement node for source code extraction
              componentNode = node;
              return;
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (componentNode) {
      // Extract the source text directly from the node
      const start = componentNode.getStart(sourceFile, true);
      const end = componentNode.getEnd();
      let sourceText = fileContent.substring(start, end);

      // Optional: Basic formatting cleanup (trim whitespace)
      sourceText = sourceText.trim();

      return sourceText;
    } else {
      debug(`Component source code not found via AST for: ${componentName}`);
      // Fallback if specific component node isn't found
      return fileContent.length > 5000
        ? fileContent.substring(0, 5000) + "\n// ... truncated ..."
        : fileContent;
    }
  } catch (error) {
    console.error(
      `Error extracting source code for component ${componentName} using AST:`,
      error
    );
    // Return a portion of the file as fallback in case of AST errors
    return fileContent.length > 5000
      ? fileContent.substring(0, 5000) + "\n// ... truncated ..."
      : fileContent;
  }
}

/**
 * Extract methods from a component using TypeScript AST parsing
 */
function extractComponentMethods(
  fileContent: string,
  componentName: string
): MethodDefinition[] {
  const methods: MethodDefinition[] = [];
  const methodNames = new Set<string>(); // Track methods to avoid duplicates

  try {
    // Create a TS source file
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    debug(`Extracting methods for component: ${componentName}`);

    // Find the component node first
    let componentNode: ts.Node | undefined;
    let isFoundComponent = false;

    // First pass - find the component declaration
    function findComponentNode(node: ts.Node) {
      if (isFoundComponent) return;

      // Class component
      if (
        ts.isClassDeclaration(node) &&
        node.name &&
        node.name.text === componentName
      ) {
        componentNode = node;
        isFoundComponent = true;
        return;
      }

      // Function component (function declaration)
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.name.text === componentName
      ) {
        componentNode = node;
        isFoundComponent = true;
        return;
      }

      // Function component (variable declaration with function expression or arrow function)
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            declaration.name &&
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === componentName
          ) {
            componentNode = node;
            isFoundComponent = true;
            return;
          }
        }
      }

      // Continue searching
      ts.forEachChild(node, findComponentNode);
    }

    // Start searching for component
    findComponentNode(sourceFile);

    // Now extract methods based on the component type
    if (componentNode) {
      debug(`Found component node for: ${componentName}`);

      // Class components - extract class methods
      if (ts.isClassDeclaration(componentNode)) {
        debug(`Processing class component: ${componentName}`);
        componentNode.members.forEach((member) => {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodName = member.name.getText(sourceFile);

            // Skip React lifecycle methods and render
            if (
              methodName === "render" ||
              methodName.startsWith("component") ||
              [
                "componentDidMount",
                "componentDidUpdate",
                "componentWillUnmount",
              ].includes(methodName)
            ) {
              return;
            }

            extractMethod(member, methodName, methods, sourceFile, fileContent);
          }
        });
      }
      // Function components - find methods inside the component body
      else if (ts.isFunctionDeclaration(componentNode) && componentNode.body) {
        debug(`Processing function component (declaration): ${componentName}`);
        processNodeForMethods(
          componentNode.body,
          methods,
          sourceFile,
          fileContent
        );
      }
      // Variable declaration components
      else if (ts.isVariableStatement(componentNode)) {
        debug(`Processing variable component: ${componentName}`);
        for (const declaration of componentNode.declarationList.declarations) {
          if (
            declaration.name &&
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === componentName &&
            declaration.initializer
          ) {
            if (
              ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer)
            ) {
              // Process the function body if it exists
              if (declaration.initializer.body) {
                processNodeForMethods(
                  declaration.initializer.body,
                  methods,
                  sourceFile,
                  fileContent
                );
              }
            }
          }
        }
      }
    } else {
      // If component node not found, try to find all functions in the file
      // This is a fallback for when the component is exported directly or has a different pattern
      debug(
        `Component node not found, extracting all functions in file for: ${componentName}`
      );
      extractAllFunctions(sourceFile, methods, sourceFile, fileContent);
    }

    debug(
      `Extracted ${methods.length} methods for component: ${componentName}`
    );
    return methods;
  } catch (error) {
    console.error(
      `Error extracting methods from component ${componentName}:`,
      error
    );
    return [];
  }

  // Helper function to process a node for method declarations
  function processNodeForMethods(
    node: ts.Node,
    methods: MethodDefinition[],
    sourceFile: ts.SourceFile,
    fileContent: string
  ) {
    // Process block statements (function bodies)
    if (ts.isBlock(node)) {
      // Extract functions from statements in the block
      for (const statement of node.statements) {
        // Function declarations
        if (ts.isFunctionDeclaration(statement) && statement.name) {
          const methodName = statement.name.getText(sourceFile);
          extractMethod(
            statement,
            methodName,
            methods,
            sourceFile,
            fileContent
          );
        }
        // Variable declarations that might be functions
        else if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (declaration.name && declaration.initializer) {
              const methodName = declaration.name.getText(sourceFile);

              // Arrow functions or function expressions
              if (
                ts.isArrowFunction(declaration.initializer) ||
                ts.isFunctionExpression(declaration.initializer)
              ) {
                extractMethod(
                  declaration,
                  methodName,
                  methods,
                  sourceFile,
                  fileContent
                );
              }

              // Handle function calls that might be React hooks
              if (ts.isCallExpression(declaration.initializer)) {
                const callName =
                  declaration.initializer.expression.getText(sourceFile);
                // Capture common React hooks and custom hooks
                if (
                  callName.startsWith("use") ||
                  [
                    "useState",
                    "useEffect",
                    "useCallback",
                    "useMemo",
                    "useRef",
                  ].includes(callName)
                ) {
                  // For callbacks in hooks like useEffect and useCallback
                  for (const arg of declaration.initializer.arguments) {
                    if (
                      ts.isArrowFunction(arg) ||
                      ts.isFunctionExpression(arg)
                    ) {
                      const hookMethodName = `${methodName}_${callName}`;
                      extractMethod(
                        arg,
                        hookMethodName,
                        methods,
                        sourceFile,
                        fileContent
                      );
                    }
                  }
                }
              }
            }
          }
        }
        // Handle expressions that might contain callbacks
        else if (ts.isExpressionStatement(statement)) {
          extractFunctionsFromExpression(
            statement.expression,
            methods,
            sourceFile,
            fileContent
          );
        }
        // Continue processing nested blocks
        else if (ts.isBlock(statement)) {
          processNodeForMethods(statement, methods, sourceFile, fileContent);
        }
        // Handle if statements, loops, etc.
        else if (
          ts.isIfStatement(statement) ||
          ts.isForStatement(statement) ||
          ts.isWhileStatement(statement) ||
          ts.isForInStatement(statement) ||
          ts.isForOfStatement(statement)
        ) {
          // Process the statement body
          if (ts.isIfStatement(statement)) {
            processNodeForMethods(
              statement.thenStatement,
              methods,
              sourceFile,
              fileContent
            );
            // Process else clause if present
            if (statement.elseStatement) {
              processNodeForMethods(
                statement.elseStatement,
                methods,
                sourceFile,
                fileContent
              );
            }
          } else if (
            ts.isWhileStatement(statement) ||
            ts.isForStatement(statement) ||
            ts.isForInStatement(statement) ||
            ts.isForOfStatement(statement)
          ) {
            if (statement.statement) {
              processNodeForMethods(
                statement.statement,
                methods,
                sourceFile,
                fileContent
              );
            }
          }
        }
      }
    }
    // For non-block expressions like arrow functions with expression bodies
    else if (ts.isExpression(node)) {
      extractFunctionsFromExpression(node, methods, sourceFile, fileContent);
    }
  }

  // Helper function to extract functions from expressions
  function extractFunctionsFromExpression(
    expression: ts.Expression,
    methods: MethodDefinition[],
    sourceFile: ts.SourceFile,
    fileContent: string
  ) {
    // Handle JSX expressions which might have event handlers
    if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) {
      const attributes = ts.isJsxElement(expression)
        ? expression.openingElement.attributes.properties
        : expression.attributes.properties;

      for (const attr of attributes) {
        if (
          ts.isJsxAttribute(attr) &&
          attr.initializer &&
          ts.isJsxExpression(attr.initializer)
        ) {
          if (attr.initializer.expression) {
            // Event handlers with arrow functions
            if (
              ts.isArrowFunction(attr.initializer.expression) ||
              ts.isFunctionExpression(attr.initializer.expression)
            ) {
              const attrName = attr.name.getText(sourceFile);
              if (attrName.startsWith("on")) {
                // Event handler
                const methodName = `handle${attrName.substring(2)}`;
                extractMethod(
                  attr.initializer.expression,
                  methodName,
                  methods,
                  sourceFile,
                  fileContent
                );
              }
            }
          }
        }
      }

      // Process children for JSX elements
      if (ts.isJsxElement(expression)) {
        for (const child of expression.children) {
          if (ts.isJsxExpression(child) && child.expression) {
            extractFunctionsFromExpression(
              child.expression,
              methods,
              sourceFile,
              fileContent
            );
          }
        }
      }
    }
    // Handle call expressions that might have callbacks
    else if (ts.isCallExpression(expression)) {
      for (const arg of expression.arguments) {
        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
          const callName = expression.expression.getText(sourceFile);
          const methodName = `callback_${callName}`;
          extractMethod(arg, methodName, methods, sourceFile, fileContent);
        } else if (ts.isExpression(arg)) {
          extractFunctionsFromExpression(arg, methods, sourceFile, fileContent);
        }
      }
    }
    // Handle binary expressions (like x && <Component />)
    else if (ts.isBinaryExpression(expression)) {
      extractFunctionsFromExpression(
        expression.left,
        methods,
        sourceFile,
        fileContent
      );
      extractFunctionsFromExpression(
        expression.right,
        methods,
        sourceFile,
        fileContent
      );
    }
    // Handle conditional expressions (ternary)
    else if (ts.isConditionalExpression(expression)) {
      extractFunctionsFromExpression(
        expression.whenTrue,
        methods,
        sourceFile,
        fileContent
      );
      extractFunctionsFromExpression(
        expression.whenFalse,
        methods,
        sourceFile,
        fileContent
      );
    }
  }

  // Extract all functions in the file (fallback when component not found)
  function extractAllFunctions(
    node: ts.Node,
    methods: MethodDefinition[],
    sourceFile: ts.SourceFile,
    fileContent: string
  ) {
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const methodName = node.name.getText(sourceFile);
      // Skip if it's the component itself
      if (methodName !== componentName) {
        extractMethod(node, methodName, methods, sourceFile, fileContent);
      }
    }
    // Variable declarations with functions
    else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          declaration.name &&
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer))
        ) {
          const methodName = declaration.name.getText(sourceFile);
          // Skip if it's the component itself
          if (methodName !== componentName) {
            extractMethod(
              declaration,
              methodName,
              methods,
              sourceFile,
              fileContent
            );
          }
        }
      }
    }
    // Continue searching in children
    ts.forEachChild(node, (child) =>
      extractAllFunctions(child, methods, sourceFile, fileContent)
    );
  }

  // Helper to extract a method from a node
  function extractMethod(
    node: ts.Node,
    methodName: string,
    methods: MethodDefinition[],
    sourceFile: ts.SourceFile,
    fileContent: string
  ) {
    // Skip if we've already added this method
    if (methodNames.has(methodName)) {
      return;
    }

    let params: any[] = [];
    let returnType = "void";

    // Extract parameters based on node type
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      if ("parameters" in node) {
        params = node.parameters.map((param) => {
          const paramName = param.name.getText(sourceFile);
          let paramType = "any";
          if (param.type) {
            paramType = param.type.getText(sourceFile);
          }

          return {
            name: paramName,
            type: paramType,
            description: "",
          };
        });
      }

      if ("type" in node && node.type) {
        returnType = node.type.getText(sourceFile);
      }
    }

    // Extract method code
    const start = node.pos;
    const end = node.end;
    const code = fileContent.substring(start, end);

    methods.push({
      name: methodName,
      description: "",
      params,
      returnType,
      code,
    });

    // Mark as processed
    methodNames.add(methodName);

    // Debug log for extracted code
    if (methodName.toLowerCase().includes("zach")) {
      console.log(`[DEBUG ZACH EXTRACT] Extracted method: ${methodName}`);
      console.log(`[DEBUG ZACH EXTRACT] Extracted code:\n---\n${code}\n---`);
    }

    debug(`Extracted method: ${methodName}`);
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
          debug(`  Adding resolved path: ${resolvedPath}`);
          importPaths.push(resolvedPath);
        } else {
          debug(`  Could not resolve import path: ${importPath}`);
        }
      } else {
        debug(`  Skipping non-relative import: ${importPath}`);
      }
    }

    return importPaths;
  } catch (error) {
    console.error(
      `Error extracting import paths from ${currentFilePath}:`,
      error
    );
    return [];
  }
}
