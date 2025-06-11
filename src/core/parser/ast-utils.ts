/**
 * TypeScript AST utilities for parsing React components.
 * Contains functions for AST traversal and extraction of component information.
 */

import * as ts from "typescript";
import { debug } from "./file-utils";
import { MethodDefinition, ParamDefinition } from "../types";
import { EntityDeclaration } from "../types/index";

/**
 * Extract the source code for a specific component from a file using AST
 * 
 * @param fileContent - The content of the file
 * @param componentName - The name of the component to extract
 * @returns The extracted source code as a string
 */
export function extractComponentSourceCode(
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

    // Find the component node in the AST
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

    // Visit the AST to find the component
    ts.forEachChild(sourceFile, visit);

    // Extract the source code for the component if found
    if (componentNode) {
      const { pos, end } = componentNode;
      const componentSource = fileContent.substring(pos, end);
      debug(`Found component source code for: ${componentName}`);
      
      // Limit large component source code with a warning
      if (componentSource.length > 5000) {
        return componentSource.substring(0, 5000) + "\n// ... truncated ...";
      }
      return componentSource;
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
 * 
 * @param fileContent - The content of the file
 * @param componentName - The name of the component to extract methods from
 * @returns Array of method definitions
 */

/**
 * Extract all top-level functions and classes from a JS/TS file using AST.
 * @param fileContent - The content of the file
 * @returns Array of component information including name, kind, code, and props
 */
export function extractAllTopLevelCodeItems(fileContent: string): Array<{ 
  name: string; 
  kind: 'function' | 'class'; 
  code: string;
  props?: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
  }>;
}> {
  const results: Array<{
    name: string;
    kind: 'function' | 'class';
    code: string;
    props?: Array<{
      name: string;
      type: string;
      required?: boolean;
      defaultValue?: string;
      description?: string;
    }>;
  }> = [];
  
  // Store interfaces and their properties for later use
  const interfaces: Record<string, Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>> = {};
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    // First pass: collect all interfaces
    function collectInterfaces(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const interfaceName = node.name.text;
        const props: Array<{
          name: string;
          type: string;
          required: boolean;
          description?: string;
        }> = [];
        
        // Get JSDoc comment for the property if available
        function getJSDocComment(node: ts.Node): string | undefined {
          const jsDocComments = (node as any).jsDoc;
          if (jsDocComments && jsDocComments.length > 0) {
            return jsDocComments[0].comment;
          }
          return undefined;
        }
        
        // Process each property in the interface
        node.members.forEach(member => {
          if (ts.isPropertySignature(member) && member.name) {
            const propName = member.name.getText(sourceFile);
            const propType = member.type ? member.type.getText(sourceFile) : 'any';
            const required = !member.questionToken;
            const description = getJSDocComment(member);
            
            props.push({
              name: propName,
              type: propType,
              required,
              description
            });
          }
        });
        
        interfaces[interfaceName] = props;
      }
      ts.forEachChild(node, collectInterfaces);
    }
    
    // Collect all interfaces first
    ts.forEachChild(sourceFile, collectInterfaces);
    
    // Second pass: process components and link to their props
    function visit(node: ts.Node) {
      // Top-level function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const code = fileContent.substring(node.pos, node.end);
        const componentResult: {
          name: string;
          kind: 'function';
          code: string;
          props?: Array<{
            name: string;
            type: string;
            required: boolean;
            description?: string;
          }>;
        } = { name, kind: 'function', code };
        
        // Try to find props for this component
        const propsTypeName = findPropsTypeForComponent(node, sourceFile);
        if (propsTypeName && interfaces[propsTypeName]) {
          componentResult.props = interfaces[propsTypeName];
        }
        
        results.push(componentResult);
      }
      // Top-level class declarations
      else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const code = fileContent.substring(node.pos, node.end);
        const componentResult: {
          name: string;
          kind: 'class';
          code: string;
          props?: Array<{
            name: string;
            type: string;
            required: boolean;
            description?: string;
          }>;
        } = { name, kind: 'class', code };
        
        // Try to find props for this component
        const propsTypeName = findPropsTypeForComponent(node, sourceFile);
        if (propsTypeName && interfaces[propsTypeName]) {
          componentResult.props = interfaces[propsTypeName];
        }
        
        results.push(componentResult);
      }
      // Top-level variable statements with function expressions or arrow functions
      else if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            declaration.name &&
            ts.isIdentifier(declaration.name) &&
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
          ) {
            const name = declaration.name.text;
            const code = fileContent.substring(node.pos, node.end);
            const componentResult: {
              name: string;
              kind: 'function';
              code: string;
              props?: Array<{
                name: string;
                type: string;
                required: boolean;
                description?: string;
              }>;
            } = { name, kind: 'function', code };
            
            // Try to find props for this component
            const propsTypeName = findPropsTypeForComponent(declaration.initializer, sourceFile);
            if (propsTypeName && interfaces[propsTypeName]) {
              componentResult.props = interfaces[propsTypeName];
            }
            
            results.push(componentResult);
          }
        }
      }
    }
    
    // Helper function to find props type for a component
    function findPropsTypeForComponent(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
      // For arrow functions or function expressions with destructured parameters
      if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.parameters.length > 0) {
        const firstParam = node.parameters[0];
        if (firstParam.type) {
          return firstParam.type.getText(sourceFile);
        }
      }
      
      // For function declarations with type annotations
      if (ts.isFunctionDeclaration(node) && node.type) {
        const typeText = node.type.getText(sourceFile);
        // Extract component props type from React.FC<PropsType>
        const match = typeText.match(/React\.FC<([^>]+)>/i) || typeText.match(/FC<([^>]+)>/i);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      return undefined;
    }

    // Only visit top-level nodes
    sourceFile.statements.forEach(visit);
    return results;
  } catch (error) {
    debug('Error in extractAllTopLevelCodeItems:', error);
    return results;
  }
}

/**
 * Extract entity declarations from a file
 * 
 * @param fileContent - The content of the file
 * @param filePath - Path to the file
 * @returns Array of entity declarations
 */
export function extractEntityDeclarations(
  fileContent: string,
  filePath: string
): EntityDeclaration[] {
  const declarations: EntityDeclaration[] = [];
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        
        declarations.push({
          entitySlug: name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, ''),
          entityName: name,
          entityType: 'function',
          declarationFile: filePath,
          declarationLine: line,
          exportType: hasExportModifier(node) ? 'named' : 'none'
        });
      }
      // Class declarations
      else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        
        declarations.push({
          entitySlug: name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, ''),
          entityName: name,
          entityType: 'class',
          declarationFile: filePath,
          declarationLine: line,
          exportType: hasExportModifier(node) ? 'named' : 'none'
        });
      }
      // Variable declarations (arrow functions, const components)
      else if (ts.isVariableStatement(node)) {
        const isExported = hasExportModifier(node);
        
        for (const declaration of node.declarationList.declarations) {
          if (declaration.name && ts.isIdentifier(declaration.name) &&
              declaration.initializer &&
              (ts.isArrowFunction(declaration.initializer) || 
               ts.isFunctionExpression(declaration.initializer))) {
            
            const name = declaration.name.text;
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            
            // Check if it's a React component (PascalCase and returns JSX)
            const entityType = /^[A-Z]/.test(name) ? 'component' : 'function';
            
            declarations.push({
              entitySlug: name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, ''),
              entityName: name,
              entityType,
              declarationFile: filePath,
              declarationLine: line,
              exportType: isExported ? 'named' : 'none'
            });
          }
        }
      }
      // Export default statements
      else if (ts.isExportAssignment(node) && !node.isExportEquals) {
        // Handle: export default ComponentName
        if (ts.isIdentifier(node.expression)) {
          const name = node.expression.text;
          // Find the original declaration
          const decl = declarations.find(d => d.entityName === name);
          if (decl) {
            decl.exportType = 'default';
          }
        }
      }
      
      ts.forEachChild(node, visit);
    }
    
    function hasExportModifier(node: ts.Node): boolean {
      if (!ts.canHaveModifiers(node)) return false;
      const modifiers = ts.getModifiers(node);
      return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
    }

    ts.forEachChild(sourceFile, visit);
    return declarations;
  } catch (error) {
    console.error('Error extracting entity declarations:', error);
    return [];
  }
}

/**
 * Extract all entity names (functions, classes, components) from a codebase
 * 
 * @param rootDir - Root directory to scan
 * @param includePatterns - Array of glob patterns to include
 * @param excludePatterns - Array of glob patterns to exclude
 * @returns Set of entity slugs
 */
export async function extractAllEntities(
  rootDir: string,
  includePatterns: string[] = ["**/*.tsx", "**/*.jsx", "**/*.js", "**/*.ts"],
  excludePatterns: string[] = ["node_modules/**", "**/node_modules/**"]
): Promise<Set<string>> {
  const entities = new Set<string>();
  
  try {
    const { glob } = await import('glob');
    const fs = await import('fs-extra');
    
    // Find all matching files
    const files = await glob(includePatterns, {
      cwd: rootDir,
      ignore: excludePatterns,
      absolute: true
    });
    
    // Process each file
    for (const filePath of files) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const declarations = extractEntityDeclarations(fileContent, filePath);
        
        // Add each entity slug
        declarations.forEach(decl => {
          entities.add(decl.entitySlug);
        });
      } catch (error) {
        debug(`Error processing file ${filePath}:`, error);
      }
    }
    
    debug(`Extracted ${entities.size} entities from ${files.length} files`);
    return entities;
  } catch (error) {
    console.error('Error extracting entities:', error);
    return entities;
  }
}

export function extractComponentMethods(
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

    // Second pass - extract methods from the component
    function processNodeForMethods(node: ts.Node) {
      // Class methods
      if (ts.isMethodDeclaration(node) && node.name) {
        const methodName = node.name.getText(sourceFile);
        extractMethod(node, methodName, methods, sourceFile, fileContent);
      }
      // Property assignments with arrow functions
      else if (
        ts.isPropertyAssignment(node) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer))
      ) {
        const methodName = node.name.getText(sourceFile);
        extractMethod(node, methodName, methods, sourceFile, fileContent);
      }
      // Continue recursively
      ts.forEachChild(node, processNodeForMethods);
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
            ts.isIdentifier(declaration.name) &&
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

      let params: ParamDefinition[] = [];
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
            const name = param.name.getText(sourceFile);
            let type = "any";

            if (param.type) {
              type = param.type.getText(sourceFile);
            }

            return {
              name,
              type,
              description: "",
              optional: param.questionToken !== undefined || param.initializer !== undefined,
            };
          });
        }

        // Extract return type if present
        if ("type" in node && node.type) {
          returnType = node.type.getText(sourceFile);
        }
      }

      // Extract method code
      const start = node.pos;
      const end = node.end;
      const code = fileContent.substring(start, end);

      const declarationLineStart = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const declarationLineEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

      methods.push({
        name: methodName,
        description: "",
        params,
        returnType,
        code,
        declarationLineStart,
        declarationLineEnd,
      });

      methodNames.add(methodName);

      // Debug log for extracted code
      if (methodName.toLowerCase().includes("zach")) {
        console.log(`[DEBUG ZACH EXTRACT] Extracted method: ${methodName}`);
        console.log(`[DEBUG ZACH EXTRACT] Extracted code:\n---\n${code}\n---`);
      }

      debug(`Extracted method: ${methodName}`);
    }

    // Run the component search
    ts.forEachChild(sourceFile, findComponentNode);

    // Process the component node if found
    if (componentNode && isFoundComponent) {
      debug(`Component node found, extracting methods for: ${componentName}`);
      
      // For class components, process all methods in the class
      if (ts.isClassDeclaration(componentNode)) {
        ts.forEachChild(componentNode, processNodeForMethods);
      } 
      // For function components, we extract any functions defined inside them
      else {
        extractAllFunctions(sourceFile, methods, sourceFile, fileContent);
        // --- PATCH: Always add main function component as a method if none found ---
        if (methods.length === 0) {
          // Find the main function node and add it as a method
          let fnNode: ts.FunctionDeclaration | ts.VariableDeclaration | undefined = undefined;
          if (ts.isFunctionDeclaration(componentNode)) {
            fnNode = componentNode;
          } else if (ts.isVariableStatement(componentNode)) {
            for (const declaration of componentNode.declarationList.declarations) {
              if (
                declaration.name &&
                ts.isIdentifier(declaration.name) &&
                declaration.name.text === componentName &&
                declaration.initializer &&
                (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
              ) {
                fnNode = declaration;
                break;
              }
            }
          }
          if (fnNode) {
            extractMethod(
              fnNode,
              componentName,
              methods,
              sourceFile,
              fileContent
            );
          }
        }
        // --- END PATCH ---
      }
    } else {
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
}
