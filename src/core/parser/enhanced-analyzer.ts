/**
 * Enhanced code analysis that combines relationship extraction with duplicate detection
 * and other code quality analysis features
 */

import { ComponentDefinition, DuplicateCodeMatch, PropDrillingInfo } from "../types";
import { extractCodeBlocks, detectDuplicates, groupDuplicatesBySeverity } from "./duplicate-detector";
import { detectCircularDependencies, CircularDependency } from "./relationship-extractor";

export interface CodeAnalysisResult {
  components: ComponentDefinition[];
  duplicates: DuplicateCodeMatch[];
  circularDependencies: CircularDependency[];
  qualityMetrics: CodeQualityMetrics;
  recommendations: CodeRecommendation[];
}

export interface CodeQualityMetrics {
  totalComponents: number;
  totalRelationships: number;
  averageComplexity: number;
  duplicateCodePercentage: number;
  circularDependencyCount: number;
  propDrillingIssues: number;
  maintainabilityScore: number; // 0-100
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CodeRecommendation {
  type: 'duplicate' | 'complexity' | 'coupling' | 'prop-drilling' | 'circular-dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedComponents: string[];
  suggestedActions: string[];
}

/**
 * Perform comprehensive code analysis
 */
export function analyzeCodebase(components: ComponentDefinition[]): CodeAnalysisResult {
  // Extract code blocks for duplicate detection
  const codeBlocks = extractCodeBlocks(components);
  
  // Detect duplicates
  const duplicates = detectDuplicates(codeBlocks, 0.7, 0.95);
  
  // Detect circular dependencies
  const entitiesForCircularCheck = components.map(comp => ({
    slug: comp.slug || comp.name.toLowerCase(),
    imports: comp.imports || [],
    filePath: comp.filePath
  }));
  const circularDependencies = detectCircularDependencies(entitiesForCircularCheck);
  
  // Calculate quality metrics
  const qualityMetrics = calculateQualityMetrics(components, duplicates, circularDependencies);
  
  // Generate recommendations
  const recommendations = generateRecommendations(components, duplicates, circularDependencies, qualityMetrics);
  
  return {
    components,
    duplicates,
    circularDependencies,
    qualityMetrics,
    recommendations
  };
}

/**
 * Calculate code quality metrics
 */
function calculateQualityMetrics(
  components: ComponentDefinition[],
  duplicates: DuplicateCodeMatch[],
  circularDependencies: CircularDependency[]
): CodeQualityMetrics {
  const totalComponents = components.length;
  const totalRelationships = components.reduce((sum, comp) => sum + (comp.relationships?.length || 0), 0);
  
  // Calculate average complexity (based on methods and relationships)
  const averageComplexity = totalComponents === 0 ? 0 : 
    components.reduce((sum, comp) => {
      const methodComplexity = (comp.methods?.length || 0) * 2;
      const relationshipComplexity = (comp.relationships?.length || 0);
      return sum + methodComplexity + relationshipComplexity;
    }, 0) / totalComponents;
  
  // Calculate duplicate code percentage
  const duplicateCodePercentage = totalComponents === 0 ? 0 :
    (duplicates.filter(d => d.similarity >= 0.85).length / totalComponents) * 100;
  
  // Count prop drilling issues
  const propDrillingIssues = components.reduce((sum, comp) => 
    sum + (comp.propDrilling?.length || 0), 0);
  
  // Calculate maintainability score (0-100)
  let maintainabilityScore = 100;
  
  // Deduct points for issues
  maintainabilityScore -= Math.min(duplicateCodePercentage * 2, 30); // Max 30 points for duplicates
  maintainabilityScore -= Math.min(circularDependencies.length * 10, 25); // Max 25 points for circular deps
  maintainabilityScore -= Math.min(propDrillingIssues * 2, 15); // Max 15 points for prop drilling
  maintainabilityScore -= Math.min((averageComplexity - 5) * 3, 20); // Max 20 points for complexity
  
  maintainabilityScore = Math.max(0, maintainabilityScore);
  
  // Determine overall health
  let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  if (maintainabilityScore >= 85) overallHealth = 'excellent';
  else if (maintainabilityScore >= 70) overallHealth = 'good';
  else if (maintainabilityScore >= 50) overallHealth = 'fair';
  else overallHealth = 'poor';
  
  return {
    totalComponents,
    totalRelationships,
    averageComplexity: Math.round(averageComplexity * 10) / 10,
    duplicateCodePercentage: Math.round(duplicateCodePercentage * 10) / 10,
    circularDependencyCount: circularDependencies.length,
    propDrillingIssues,
    maintainabilityScore: Math.round(maintainabilityScore),
    overallHealth
  };
}

/**
 * Generate actionable recommendations based on analysis
 */
function generateRecommendations(
  components: ComponentDefinition[],
  duplicates: DuplicateCodeMatch[],
  circularDependencies: CircularDependency[],
  metrics: CodeQualityMetrics
): CodeRecommendation[] {
  const recommendations: CodeRecommendation[] = [];
  
  // Duplicate code recommendations
  const { exactDuplicates, nearDuplicates } = groupDuplicatesBySeverity(duplicates);
  
  if (exactDuplicates.length > 0) {
    recommendations.push({
      type: 'duplicate',
      severity: 'high',
      title: 'Exact Duplicate Code Detected',
      description: `Found ${exactDuplicates.length} exact duplicates that should be consolidated immediately.`,
      affectedComponents: [...new Set(exactDuplicates.flatMap(d => [d.sourceEntity, d.targetEntity]))],
      suggestedActions: [
        'Extract common functionality into shared utilities or custom hooks',
        'Create reusable components for repeated UI patterns',
        'Use composition patterns to reduce code duplication',
        'Consider implementing a shared library for common business logic'
      ]
    });
  }
  
  if (nearDuplicates.length > 0) {
    recommendations.push({
      type: 'duplicate',
      severity: 'medium',
      title: 'Similar Code Patterns Found',
      description: `Found ${nearDuplicates.length} near-duplicate code blocks that could benefit from refactoring.`,
      affectedComponents: [...new Set(nearDuplicates.flatMap(d => [d.sourceEntity, d.targetEntity]))],
      suggestedActions: [
        'Review similar code patterns for potential consolidation',
        'Extract common patterns into reusable functions',
        'Consider using strategy pattern for similar but different implementations'
      ]
    });
  }
  
  // Circular dependency recommendations
  if (circularDependencies.length > 0) {
    const criticalCircular = circularDependencies.filter(cd => cd.severity === 'high');
    
    recommendations.push({
      type: 'circular-dependency',
      severity: criticalCircular.length > 0 ? 'critical' : 'high',
      title: 'Circular Dependencies Detected',
      description: `Found ${circularDependencies.length} circular dependencies that can cause runtime issues and make code harder to maintain.`,
      affectedComponents: [...new Set(circularDependencies.flatMap(cd => cd.cycle))],
      suggestedActions: [
        'Break circular dependencies by introducing interfaces or abstract classes',
        'Move shared logic to a separate module',
        'Use dependency injection to invert control',
        'Consider restructuring the module hierarchy'
      ]
    });
  }
  
  // Complexity recommendations
  if (metrics.averageComplexity > 10) {
    const complexComponents = components
      .filter(comp => (comp.methods?.length || 0) > 8)
      .map(comp => comp.name);
      
    recommendations.push({
      type: 'complexity',
      severity: metrics.averageComplexity > 15 ? 'high' : 'medium',
      title: 'High Component Complexity',
      description: `Average component complexity is ${metrics.averageComplexity}, which may indicate over-complex components.`,
      affectedComponents: complexComponents,
      suggestedActions: [
        'Break down large components into smaller, focused components',
        'Extract complex logic into custom hooks',
        'Use composition to reduce component responsibility',
        'Consider splitting components by concern (UI vs logic)'
      ]
    });
  }
  
  // Prop drilling recommendations
  if (metrics.propDrillingIssues > 3) {
    const propDrillingComponents = components
      .filter(comp => comp.propDrilling && comp.propDrilling.length > 0)
      .map(comp => comp.name);
      
    recommendations.push({
      type: 'prop-drilling',
      severity: metrics.propDrillingIssues > 6 ? 'high' : 'medium',
      title: 'Prop Drilling Issues',
      description: `Detected ${metrics.propDrillingIssues} instances of potential prop drilling, which can make components tightly coupled.`,
      affectedComponents: propDrillingComponents,
      suggestedActions: [
        'Consider using React Context for shared state',
        'Implement state management solutions like Redux or Zustand',
        'Use component composition to avoid passing props through multiple layers',
        'Extract shared logic into custom hooks'
      ]
    });
  }
  
  // Coupling recommendations
  const highlyConnectedComponents = components
    .filter(comp => (comp.relationships?.length || 0) > 8)
    .map(comp => comp.name);
    
  if (highlyConnectedComponents.length > 0) {
    recommendations.push({
      type: 'coupling',
      severity: 'medium',
      title: 'High Component Coupling',
      description: `Found ${highlyConnectedComponents.length} components with many dependencies, indicating tight coupling.`,
      affectedComponents: highlyConnectedComponents,
      suggestedActions: [
        'Review and reduce unnecessary dependencies',
        'Use interfaces to decouple concrete implementations',
        'Apply the Single Responsibility Principle',
        'Consider using event-driven architecture for loose coupling'
      ]
    });
  }
  
  // Positive reinforcement for good practices
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'complexity',
      severity: 'low',
      title: 'Excellent Code Quality',
      description: 'Your codebase demonstrates good practices with minimal issues detected.',
      affectedComponents: [],
      suggestedActions: [
        'Continue following current coding practices',
        'Consider adding more unit tests to maintain quality',
        'Document architectural decisions for future maintainers',
        'Regular code reviews help maintain this quality level'
      ]
    });
  }
  
  return recommendations;
}

/**
 * Get health score color coding
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get health status badge variant
 */
export function getHealthBadgeVariant(health: string): 'default' | 'secondary' | 'destructive' {
  switch (health) {
    case 'excellent':
    case 'good':
      return 'default';
    case 'fair':
      return 'secondary';
    case 'poor':
      return 'destructive';
    default:
      return 'secondary';
  }
}