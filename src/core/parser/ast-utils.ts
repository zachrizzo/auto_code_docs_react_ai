/**
 * TypeScript AST utilities for parsing React components.
 * Contains functions for AST traversal and extraction of component information.
 */

import * as ts from "typescript";
import { debug } from "./file-utils";
import { MethodDefinition, ParamDefinition } from "../types";

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
