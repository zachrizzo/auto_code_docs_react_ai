/**
 * Duplicate code detection utilities
 * Detects similar and potentially duplicated code blocks
 */

import * as ts from "typescript";
import { ComponentDefinition, MethodDefinition } from "../types";

export interface DuplicateCodeMatch {
  sourceEntity: string;
  targetEntity: string;
  sourceMethod?: string;
  targetMethod?: string;
  similarity: number;
  reason: string;
  sourceCode: string;
  targetCode: string;
  sourceFile: string;
  targetFile: string;
  sourceLine?: number;
  targetLine?: number;
}

export interface CodeBlock {
  entitySlug: string;
  entityName: string;
  methodName?: string;
  code: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  hash: string;
  tokens: string[];
  structure: string;
}

/**
 * Extract code blocks from component definitions for duplicate detection
 */
export function extractCodeBlocks(components: ComponentDefinition[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  for (const component of components) {
    // Add the main component code block
    if (component.sourceCode) {
      const tokens = tokenizeCode(component.sourceCode);
      const structure = extractCodeStructure(component.sourceCode);
      
      blocks.push({
        entitySlug: component.slug || component.name.toLowerCase(),
        entityName: component.name,
        code: component.sourceCode,
        filePath: component.filePath,
        startLine: component.declarationLineStart,
        endLine: component.declarationLineEnd,
        hash: simpleHash(component.sourceCode),
        tokens,
        structure
      });
    }

    // Add method code blocks
    if (component.methods) {
      for (const method of component.methods) {
        if (method.code) {
          const tokens = tokenizeCode(method.code);
          const structure = extractCodeStructure(method.code);
          
          blocks.push({
            entitySlug: component.slug || component.name.toLowerCase(),
            entityName: component.name,
            methodName: method.name,
            code: method.code,
            filePath: component.filePath,
            startLine: method.declarationLineStart,
            endLine: method.declarationLineEnd,
            hash: simpleHash(method.code),
            tokens,
            structure
          });
        }
      }
    }
  }

  return blocks;
}

/**
 * Detect duplicate and similar code blocks
 */
export function detectDuplicates(
  codeBlocks: CodeBlock[],
  similarityThreshold = 0.8,
  exactDuplicateThreshold = 0.95
): DuplicateCodeMatch[] {
  const matches: DuplicateCodeMatch[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < codeBlocks.length; i++) {
    for (let j = i + 1; j < codeBlocks.length; j++) {
      const blockA = codeBlocks[i];
      const blockB = codeBlocks[j];

      // Skip same entity comparisons
      if (blockA.entitySlug === blockB.entitySlug && blockA.methodName === blockB.methodName) {
        continue;
      }

      // Create unique match identifier to avoid duplicates
      const matchId = `${blockA.entitySlug}-${blockA.methodName || 'main'}-${blockB.entitySlug}-${blockB.methodName || 'main'}`;
      const reverseMatchId = `${blockB.entitySlug}-${blockB.methodName || 'main'}-${blockA.entitySlug}-${blockA.methodName || 'main'}`;
      
      if (seen.has(matchId) || seen.has(reverseMatchId)) {
        continue;
      }

      const similarity = calculateSimilarity(blockA, blockB);
      
      if (similarity >= similarityThreshold) {
        seen.add(matchId);
        
        let reason = '';
        if (similarity >= exactDuplicateThreshold) {
          reason = 'Exact or near-exact duplicate code detected';
        } else if (blockA.structure === blockB.structure) {
          reason = 'Similar code structure with different variable names';
        } else if (blockA.hash === blockB.hash) {
          reason = 'Identical code hash - potential exact duplicate';
        } else {
          reason = 'Similar code logic and patterns detected';
        }

        matches.push({
          sourceEntity: blockA.entitySlug,
          targetEntity: blockB.entitySlug,
          sourceMethod: blockA.methodName,
          targetMethod: blockB.methodName,
          similarity,
          reason,
          sourceCode: blockA.code,
          targetCode: blockB.code,
          sourceFile: blockA.filePath,
          targetFile: blockB.filePath,
          sourceLine: blockA.startLine,
          targetLine: blockB.startLine
        });
      }
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate similarity between two code blocks
 */
function calculateSimilarity(blockA: CodeBlock, blockB: CodeBlock): number {
  // Exact hash match
  if (blockA.hash === blockB.hash) {
    return 1.0;
  }

  // Structure similarity
  const structureSimilarity = blockA.structure === blockB.structure ? 0.4 : 0;

  // Token-based similarity (Jaccard similarity)
  const tokenSimilarity = calculateJaccardSimilarity(blockA.tokens, blockB.tokens) * 0.4;

  // Length similarity
  const lengthSimilarity = calculateLengthSimilarity(blockA.code.length, blockB.code.length) * 0.2;

  return structureSimilarity + tokenSimilarity + lengthSimilarity;
}

/**
 * Calculate Jaccard similarity between two sets of tokens
 */
function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  
  const intersection = new Set([...setA].filter(token => setB.has(token)));
  const union = new Set([...setA, ...setB]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Calculate length similarity between two numbers
 */
function calculateLengthSimilarity(lengthA: number, lengthB: number): number {
  const maxLength = Math.max(lengthA, lengthB);
  const minLength = Math.min(lengthA, lengthB);
  
  return maxLength === 0 ? 1 : minLength / maxLength;
}

/**
 * Tokenize code into meaningful tokens
 */
function tokenizeCode(code: string): string[] {
  const tokens: string[] = [];
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      code,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Extract different types of tokens
      if (ts.isIdentifier(node)) {
        tokens.push(`ID:${node.text}`);
      } else if (ts.isStringLiteral(node)) {
        tokens.push('STRING_LITERAL');
      } else if (ts.isNumericLiteral(node)) {
        tokens.push('NUMERIC_LITERAL');
      } else if (ts.isToken(node)) {
        tokens.push(`TOKEN:${ts.SyntaxKind[node.kind]}`);
      }
      
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
  } catch (error) {
    // Fallback to simple regex-based tokenization
    const simpleTokens = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .match(/\b\w+\b/g) || [];
    
    tokens.push(...simpleTokens.filter(token => token.length > 1));
  }

  return tokens;
}

/**
 * Extract structural pattern from code (control flow, function calls, etc.)
 */
function extractCodeStructure(code: string): string {
  const structure: string[] = [];
  
  try {
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      code,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Extract structural elements
      if (ts.isIfStatement(node)) {
        structure.push('IF');
      } else if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
        structure.push('FOR');
      } else if (ts.isWhileStatement(node) || ts.isDoStatement(node)) {
        structure.push('WHILE');
      } else if (ts.isSwitchStatement(node)) {
        structure.push('SWITCH');
      } else if (ts.isTryStatement(node)) {
        structure.push('TRY');
      } else if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        structure.push('FUNCTION');
      } else if (ts.isCallExpression(node)) {
        structure.push('CALL');
      } else if (ts.isReturnStatement(node)) {
        structure.push('RETURN');
      } else if (ts.isVariableDeclaration(node)) {
        structure.push('VAR');
      }
      
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
  } catch (error) {
    // Fallback to regex patterns
    if (code.includes('if') || code.includes('else')) structure.push('IF');
    if (code.includes('for') || code.includes('while')) structure.push('LOOP');
    if (code.includes('function') || code.includes('=>')) structure.push('FUNCTION');
    if (code.includes('return')) structure.push('RETURN');
  }

  return structure.join('-');
}

/**
 * Simple hash function for code comparison
 */
function simpleHash(code: string): string {
  // Normalize code for hashing (remove whitespace, comments)
  const normalized = code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
    
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(16);
}

/**
 * Group duplicate matches by similarity level
 */
export function groupDuplicatesBySeverity(matches: DuplicateCodeMatch[]): {
  exactDuplicates: DuplicateCodeMatch[];
  nearDuplicates: DuplicateCodeMatch[];
  similarCode: DuplicateCodeMatch[];
} {
  return {
    exactDuplicates: matches.filter(m => m.similarity >= 0.95),
    nearDuplicates: matches.filter(m => m.similarity >= 0.85 && m.similarity < 0.95),
    similarCode: matches.filter(m => m.similarity >= 0.7 && m.similarity < 0.85)
  };
}