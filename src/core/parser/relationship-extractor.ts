/**
 * Relationship extraction utilities for the parser module.
 * Contains functions for extracting relationships between components.
 */

import * as ts from "typescript";
import * as path from "path";

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
          
          // Skip node_modules imports and style files
          if (!importPath.includes('node_modules') && 
              !importPath.endsWith('.css') && 
              !importPath.endsWith('.scss') && 
              !importPath.endsWith('.less') &&
              !importPath.endsWith('.svg') &&
              !importPath.endsWith('.png') &&
              !importPath.endsWith('.jpg') &&
              !importPath.endsWith('.jpeg')) {
            
            // Handle different import patterns
            if (node.importClause) {
              // Named imports: import { Component } from './Component'
              if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach(element => {
                  const importName = element.name.text;
                  if (!imports.includes(importName) && /^[A-Z]/.test(importName)) {
                    imports.push(importName);
                  }
                });
              }
              // Default import: import Component from './Component'
              else if (node.importClause.name) {
                const importName = node.importClause.name.text;
                if (!imports.includes(importName) && /^[A-Z]/.test(importName)) {
                  imports.push(importName);
                }
              }
            }
            
            // Also extract from the path if it's a relative import
            if (importPath.startsWith('.')) {
              const componentName = path.basename(importPath, path.extname(importPath));
              
              // Add the component name if it looks like a component (PascalCase)
              if (!imports.includes(componentName) && 
                  componentName !== 'index' && 
                  componentName.length > 0 &&
                  /^[A-Z]/.test(componentName)) {
                imports.push(componentName);
              }
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
  const seenComponents = new Set<string>();
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Check for JSX elements (both opening and self-closing)
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        let tagName = '';
        
        // Handle different tag name types
        if (ts.isIdentifier(node.tagName)) {
          tagName = node.tagName.text;
        } else if (ts.isPropertyAccessExpression(node.tagName)) {
          // Handle namespaced components like React.Fragment
          tagName = node.tagName.name.text;
        }
        
        // Only include PascalCase component names (React convention)
        if (tagName && 
            /^[A-Z][A-Za-z0-9]*$/.test(tagName) && 
            !seenComponents.has(tagName) &&
            !['Fragment', 'React', 'Component', 'PureComponent'].includes(tagName)) {
          seenComponents.add(tagName);
          references.push(tagName);
        }
      }
      
      // Also check for components passed as props or used in expressions
      if (ts.isIdentifier(node) && /^[A-Z][A-Za-z0-9]*$/.test(node.text)) {
        const parent = node.parent;
        
        // Check if this is a component being passed as a prop
        if (parent && (
          ts.isPropertyAssignment(parent) ||
          ts.isJsxAttribute(parent) ||
          ts.isCallExpression(parent) ||
          ts.isArrayLiteralExpression(parent)
        )) {
          const componentName = node.text;
          if (!seenComponents.has(componentName) &&
              !['Fragment', 'React', 'Component', 'PureComponent', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Error', 'Promise'].includes(componentName)) {
            seenComponents.add(componentName);
            references.push(componentName);
          }
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
 * @param filePath - Path to the source file
 * @param callingEntitySlug - Slug of the calling entity
 * @param availableEntities - Set of available entity slugs to validate against
 * @returns Array of called method names
 */
export function extractMethodCalls(
  fileContent: string, 
  filePath: string, 
  callingEntitySlug: string,
  availableEntities?: Set<string>
): MethodCallInfo[] {
  const methodCalls: MethodCallInfo[] = [];
  const seenCalls = new Set<string>(); // Prevent duplicates
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    // Built-in objects and functions to ignore
    const builtInObjects = new Set([
      'console', 'document', 'window', 'Array', 'Object', 'String', 'Math', 
      'React', 'this', 'super', 'process', 'Buffer', 'global', 'Date', 
      'Error', 'Promise', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Symbol',
      'JSON', 'Number', 'Boolean', 'RegExp', 'Infinity', 'NaN', 'undefined'
    ]);
    
    const builtInFunctions = new Set([
      'parseInt', 'parseFloat', 'setTimeout', 'setInterval', 'clearTimeout', 
      'clearInterval', 'require', 'import', 'eval', 'isNaN', 'isFinite',
      'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
      'alert', 'confirm', 'prompt', 'toString', 'valueOf', 'hasOwnProperty',
      'propertyIsEnumerable', 'isPrototypeOf', 'toLocaleString'
    ]);

    function visit(node: ts.Node) {
      // Look for call expressions
      if (ts.isCallExpression(node)) {
        let targetEntitySlug: string | undefined;
        let targetMethodName: string | undefined;
        
        // Handle property access expressions (e.g., object.method())
        if (ts.isPropertyAccessExpression(node.expression)) {
          const objectName = node.expression.expression.getText(sourceFile).trim();
          targetMethodName = node.expression.name.getText(sourceFile).trim();
          
          // Skip built-in methods, local variables, and common patterns
          if (!builtInObjects.has(objectName) && 
              !objectName.startsWith('_') && // Skip private variables
              !/^[a-z]/.test(objectName) && // Skip camelCase variables (likely local)
              objectName.length > 1) {
            
            // Convert PascalCase component names to slug format
            targetEntitySlug = objectName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
          }
        }
        // Handle direct function calls (e.g., functionName())
        else if (ts.isIdentifier(node.expression)) {
          const functionName = node.expression.getText(sourceFile).trim();
          
          // Only consider PascalCase function names (likely components/classes)
          if (!builtInFunctions.has(functionName) && 
              /^[A-Z][A-Za-z0-9]*$/.test(functionName) && 
              functionName.length > 1) {
            
            targetEntitySlug = functionName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
            targetMethodName = functionName;
          }
        }
        
        // Validate the relationship
        if (targetEntitySlug && 
            targetEntitySlug !== callingEntitySlug &&
            (!availableEntities || availableEntities.has(targetEntitySlug))) {
          
          const callKey = `${callingEntitySlug}->${targetEntitySlug}:${targetMethodName}`;
          if (!seenCalls.has(callKey)) {
            seenCalls.add(callKey);
            
            const callInfo: MethodCallInfo = {
              callingEntitySlug: callingEntitySlug,
              targetEntitySlug: targetEntitySlug,
              targetMethodName: targetMethodName,
              sourceFile: filePath,
              sourceLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
            };
            methodCalls.push(callInfo);
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
      // Check class declarations
      if (ts.isClassDeclaration(node)) {
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              for (const type of clause.types) {
                const extendedClass = type.expression.getText(sourceFile);
                // Clean up the name (remove generics, namespaces)
                const cleanName = extendedClass.split('<')[0].split('.').pop() || extendedClass;
                if (!inheritance.extends.includes(cleanName)) {
                  inheritance.extends.push(cleanName);
                }
              }
            } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
              for (const type of clause.types) {
                const implementedInterface = type.expression.getText(sourceFile);
                const cleanName = implementedInterface.split('<')[0].split('.').pop() || implementedInterface;
                if (!inheritance.implements.includes(cleanName)) {
                  inheritance.implements.push(cleanName);
                }
              }
            }
          }
        }
      }
      
      // Check interface declarations that extend other interfaces
      if (ts.isInterfaceDeclaration(node)) {
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              for (const type of clause.types) {
                const extendedInterface = type.expression.getText(sourceFile);
                const cleanName = extendedInterface.split('<')[0].split('.').pop() || extendedInterface;
                if (!inheritance.extends.includes(cleanName)) {
                  inheritance.extends.push(cleanName);
                }
              }
            }
          }
        }
      }
      
      // Check type aliases that extend/intersect with other types
      if (ts.isTypeAliasDeclaration(node) && node.type) {
        if (ts.isIntersectionTypeNode(node.type)) {
          node.type.types.forEach(type => {
            if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
              const typeName = type.typeName.text;
              if (/^[A-Z]/.test(typeName) && !inheritance.extends.includes(typeName)) {
                inheritance.extends.push(typeName);
              }
            }
          });
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
 * Extract prop drilling patterns (when props are passed through multiple components)
 */
export function extractPropDrilling(
  fileContent: string,
  filePath: string,
  currentEntitySlug: string
): PropDrillingInfo[] {
  const propDrilling: PropDrillingInfo[] = [];
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Look for prop destructuring patterns
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isObjectBindingPattern(node.name)) {
          // const { prop1, prop2 } = props
          const destructuredProps = node.name.elements
            .filter(ts.isBindingElement)
            .map(el => el.name.getText(sourceFile))
            .filter(name => name !== 'children');
          
          if (destructuredProps.length > 3) { // Threshold for too many props
            propDrilling.push({
              entitySlug: currentEntitySlug,
              filePath,
              propsCount: destructuredProps.length,
              propNames: destructuredProps,
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
              severity: destructuredProps.length > 6 ? 'high' : 'medium'
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return propDrilling;
  } catch (error) {
    console.error('Error extracting prop drilling:', error);
    return [];
  }
}

/**
 * Extract circular dependency patterns
 */
export function detectCircularDependencies(
  entities: { slug: string; imports: string[]; filePath: string }[]
): CircularDependency[] {
  const dependencies = new Map<string, Set<string>>();
  const circularDeps: CircularDependency[] = [];
  
  // Build dependency graph
  entities.forEach(entity => {
    dependencies.set(entity.slug, new Set(entity.imports.map(imp => 
      imp.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')
    )));
  });
  
  // Detect cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCycle(entitySlug: string, path: string[]): boolean {
    visited.add(entitySlug);
    recursionStack.add(entitySlug);
    
    const deps = dependencies.get(entitySlug) || new Set();
    
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep, [...path, dep])) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found cycle
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        
        circularDeps.push({
          cycle: [...cycle, dep],
          severity: cycle.length > 3 ? 'high' : 'medium',
          description: `Circular dependency detected: ${cycle.join(' → ')} → ${dep}`
        });
        
        return true;
      }
    }
    
    recursionStack.delete(entitySlug);
    return false;
  }
  
  entities.forEach(entity => {
    if (!visited.has(entity.slug)) {
      hasCycle(entity.slug, [entity.slug]);
    }
  });
  
  return circularDeps;
}

/**
 * Extract all entity usages from a file
 * 
 * @param fileContent - The content of the file
 * @param filePath - Path to the file
 * @param currentEntitySlug - Slug of the current entity being analyzed
 * @param availableEntities - Set of available entity slugs
 * @returns Array of entity usages
 */
export function extractEntityUsages(
  fileContent: string,
  filePath: string,
  currentEntitySlug: string,
  availableEntities?: Set<string>
): EntityUsage[] {
  const usages: EntityUsage[] = [];
  const seenUsages = new Set<string>();
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    // Extract imports as usages
    const imports = extractImports(fileContent);
    imports.forEach(importName => {
      const slug = importName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
      if (!availableEntities || availableEntities.has(slug)) {
        const key = `import:${slug}`;
        if (!seenUsages.has(key)) {
          seenUsages.add(key);
          usages.push({
            entitySlug: slug,
            usedInFile: filePath,
            usedByEntity: currentEntitySlug,
            usageType: 'import',
            usageLine: 1 // TODO: Get actual import line
          });
        }
      }
    });

    // Extract component references (JSX usage) as usages
    const references = extractComponentReferences(fileContent);
    references.forEach(refName => {
      const slug = refName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
      if (!availableEntities || availableEntities.has(slug)) {
        const key = `render:${slug}`;
        if (!seenUsages.has(key)) {
          seenUsages.add(key);
          usages.push({
            entitySlug: slug,
            usedInFile: filePath,
            usedByEntity: currentEntitySlug,
            usageType: 'render',
            usageLine: 1 // TODO: Get actual usage line
          });
        }
      }
    });

    // Extract method calls as usages
    const methodCalls = extractMethodCalls(fileContent, filePath, currentEntitySlug, availableEntities);
    methodCalls.forEach(call => {
      const key = `call:${call.targetEntitySlug}:${call.sourceLine}`;
      if (!seenUsages.has(key)) {
        seenUsages.add(key);
        usages.push({
          entitySlug: call.targetEntitySlug,
          usedInFile: filePath,
          usedByEntity: currentEntitySlug,
          usageType: 'call',
          usageLine: call.sourceLine
        });
      }
    });

    // Extract inheritance as usages
    const inheritance = extractInheritance(fileContent);
    inheritance.extends.forEach(extendedClass => {
      const slug = extendedClass.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
      if (!availableEntities || availableEntities.has(slug)) {
        const key = `extends:${slug}`;
        if (!seenUsages.has(key)) {
          seenUsages.add(key);
          usages.push({
            entitySlug: slug,
            usedInFile: filePath,
            usedByEntity: currentEntitySlug,
            usageType: 'extends',
            usageLine: 1 // TODO: Get actual extends line
          });
        }
      }
    });

    inheritance.implements.forEach(implementedInterface => {
      const slug = implementedInterface.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
      if (!availableEntities || availableEntities.has(slug)) {
        const key = `implements:${slug}`;
        if (!seenUsages.has(key)) {
          seenUsages.add(key);
          usages.push({
            entitySlug: slug,
            usedInFile: filePath,
            usedByEntity: currentEntitySlug,
            usageType: 'implements',
            usageLine: 1 // TODO: Get actual implements line
          });
        }
      }
    });

    return usages;
  } catch (error) {
    console.error('Error extracting entity usages:', error);
    return [];
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
import { MethodCallInfo, EntityUsage } from '../types';
import { Relationship, CallRelationship, RelationshipType } from '../../ui/types/code-entities';

export interface PropDrillingInfo {
  entitySlug: string;
  filePath: string;
  propsCount: number;
  propNames: string[];
  line: number;
  severity: 'low' | 'medium' | 'high';
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface DeepNestingInfo {
  entitySlug: string;
  filePath: string;
  maxDepth: number;
  line: number;
  severity: 'low' | 'medium' | 'high';
}

export function generateRelationships(
  componentSlug: string,
  imports: string[],
  references: string[],
  inheritance: { extends: string[], implements: string[] },
  methodCalls: MethodCallInfo[],
  availableEntities?: Set<string>
): Relationship[] {
  const relationships: Relationship[] = [];
  const seenRelationships = new Set<string>();
  
  function toSlug(name: string): string {
    return name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '').replace(/\s+/g, "-");
  }
  
  function addRelationship(source: string, target: string, type: RelationshipType, weight = 1, context?: string, extra?: Partial<CallRelationship>) {
    const targetSlug = toSlug(target);
    
    if (source === targetSlug || (availableEntities && !availableEntities.has(targetSlug))) {
      return;
    }
    
    const relationshipKey = `${source}->${targetSlug}:${type}`;
    if (!seenRelationships.has(relationshipKey)) {
      seenRelationships.add(relationshipKey);
      
      if (type === "uses" && extra) {
        const callRelationship: CallRelationship = {
          source,
          target: targetSlug,
          type: "uses",
          weight,
          context,
          sourceFile: extra.sourceFile!,
          sourceLine: extra.sourceLine!,
          targetFunction: extra.targetFunction,
        };
        relationships.push(callRelationship);
      } else {
        relationships.push({
          source,
          target: targetSlug,
          type,
          weight,
          context
        });
      }
    }
  }
  
  // Combine imports and references into "depends-on" relationships
  const allDependencies = new Set([...imports, ...references]);
  allDependencies.forEach(depName => {
    const isImported = imports.includes(depName);
    const isRendered = references.includes(depName);
    
    let weight = 1;
    let context = '';
    
    if (isImported && isRendered) {
      weight = 3;
      context = 'imports and renders';
    } else if (isImported) {
      weight = 2;
      context = 'imports only';
    } else if (isRendered) {
      weight = 2;
      context = 'renders only';
    }
    
    addRelationship(componentSlug, depName, "uses", weight, context);
  });
  
  // Add inheritance relationships
  inheritance.extends.forEach(extendedClass => {
    addRelationship(componentSlug, extendedClass, "inherits", 2, 'class inheritance');
  });
  
  // Add method call relationships
  methodCalls.forEach(callInfo => {
    if (callInfo.targetEntitySlug && callInfo.callingEntitySlug !== callInfo.targetEntitySlug) {
      addRelationship(
        callInfo.callingEntitySlug,
        callInfo.targetEntitySlug,
        "uses",
        2,
        `calls ${callInfo.targetMethodName || 'method'}`,
        {
          sourceFile: callInfo.sourceFile,
          sourceLine: callInfo.sourceLine,
          targetFunction: callInfo.targetMethodName
        }
      );
    }
  });
  
  return relationships;
}
