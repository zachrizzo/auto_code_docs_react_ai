/**
 * Relationship extraction utilities for the parser module.
 * Contains functions for extracting relationships between components.
 */

import * as ts from "typescript";
import * as path from "path";
import { Relationship } from "../../ui/types/code-entities";

/**
 * Extract imports from a file using TypeScript AST
 * 
 * @param fileContent - The content of the file
 * @returns Array of imported module names
 */
export function extractImports(fileContent: string): string[] {
  const imports: string[] = [];
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        // Get the module specifier (the string after 'from')
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          
          // Skip node_modules imports and relative paths with file extensions
          if (!importPath.includes('node_modules') && 
              importPath.startsWith('.') && 
              !importPath.endsWith('.css') && 
              !importPath.endsWith('.scss') && 
              !importPath.endsWith('.less')) {
            
            // Extract component name from the import path
            const componentName = path.basename(importPath, path.extname(importPath));
            
            // Add the component name to imports if it's not already there
            if (!imports.includes(componentName) && 
                componentName !== 'index' && 
                componentName.length > 0) {
              imports.push(componentName);
            }
          }
        }
      }
      
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return imports;
  } catch (error) {
    console.error("Error extracting imports:", error);
    return [];
  }
}

/**
 * Extract component references from JSX elements in a file
 * 
 * @param fileContent - The content of the file
 * @returns Array of referenced component names
 */
export function extractComponentReferences(fileContent: string): string[] {
  const references: string[] = [];
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Check for JSX elements with PascalCase tag names (likely components)
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        
        // Only include PascalCase component names (React convention)
        if (/^[A-Z][A-Za-z0-9]*$/.test(tagName) && 
            !references.includes(tagName) && 
            !['Fragment', 'React'].includes(tagName)) {
          references.push(tagName);
        }
      }
      
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return references;
  } catch (error) {
    console.error("Error extracting component references:", error);
    return [];
  }
}

/**
 * Extract method calls from a file
 * 
 * @param fileContent - The content of the file
 * @returns Array of called method names
 */
export function extractMethodCalls(fileContent: string): string[] {
  const methodCalls: string[] = [];
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Look for property access expressions that might be method calls
      if (ts.isCallExpression(node) && 
          ts.isPropertyAccessExpression(node.expression)) {
        
        const objectName = node.expression.expression.getText(sourceFile);
        const methodName = node.expression.name.getText(sourceFile);
        
        // Skip built-in methods and common utility methods
        if (!['console', 'document', 'window', 'Array', 'Object', 'String', 'Math'].includes(objectName)) {
          const methodCall = `${objectName}.${methodName}`;
          if (!methodCalls.includes(methodCall)) {
            methodCalls.push(methodCall);
          }
        }
      }
      
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return methodCalls;
  } catch (error) {
    console.error("Error extracting method calls:", error);
    return [];
  }
}

/**
 * Extract class inheritance relationships
 * 
 * @param fileContent - The content of the file
 * @returns Object with extends and implements arrays
 */
export function extractInheritance(fileContent: string): { extends: string[], implements: string[] } {
  const inheritance = {
    extends: [] as string[],
    implements: [] as string[]
  };
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      if (ts.isClassDeclaration(node)) {
        // Check for class extension
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              for (const type of clause.types) {
                const extendedClass = type.expression.getText(sourceFile);
                if (!inheritance.extends.includes(extendedClass)) {
                  inheritance.extends.push(extendedClass);
                }
              }
            } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
              for (const type of clause.types) {
                const implementedInterface = type.expression.getText(sourceFile);
                if (!inheritance.implements.includes(implementedInterface)) {
                  inheritance.implements.push(implementedInterface);
                }
              }
            }
          }
        }
      }
      
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return inheritance;
  } catch (error) {
    console.error("Error extracting inheritance:", error);
    return { extends: [], implements: [] };
  }
}

/**
 * Generate relationships between components based on imports, references, and inheritance
 * 
 * @param componentName - The name of the component
 * @param imports - Array of imported component names
 * @param references - Array of referenced component names
 * @param inheritance - Object with extends and implements arrays
 * @returns Array of relationships
 */
export function generateRelationships(
  componentSlug: string,
  imports: string[],
  references: string[],
  inheritance: { extends: string[], implements: string[] },
  methodCalls: string[]
): Relationship[] {
  const relationships: Relationship[] = [];
  
  // Add import relationships
  imports.forEach(importName => {
    relationships.push({
      source: componentSlug,
      target: importName.toLowerCase().replace(/\s+/g, "-"), // Convert to slug format
      type: "imports"
    });
  });
  
  // Add render relationships (from JSX references)
  references.forEach(refName => {
    // Skip if the component is already in imports to avoid duplicates
    if (!imports.includes(refName)) {
      relationships.push({
        source: componentSlug,
        target: refName.toLowerCase().replace(/\s+/g, "-"), // Convert to slug format
        type: "renders"
      });
    }
  });
  
  // Add inheritance relationships
  inheritance.extends.forEach(extendedClass => {
    relationships.push({
      source: componentSlug,
      target: extendedClass.toLowerCase().replace(/\s+/g, "-"), // Convert to slug format
      type: "extends"
    });
  });
  
  inheritance.implements.forEach(implementedInterface => {
    relationships.push({
      source: componentSlug,
      target: implementedInterface.toLowerCase().replace(/\s+/g, "-"), // Convert to slug format
      type: "implements"
    });
  });
  
  // Add method call relationships
  methodCalls.forEach(methodCall => {
    const [targetComponent] = methodCall.split('.');
    if (targetComponent && targetComponent !== componentSlug) {
      relationships.push({
        source: componentSlug,
        target: targetComponent.toLowerCase().replace(/\s+/g, "-"), // Convert to slug format
        type: "calls"
      });
    }
  });
  
  return relationships;
}
