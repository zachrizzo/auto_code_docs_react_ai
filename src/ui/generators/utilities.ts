"use client";

/**
 * Utility functions for component documentation generator
 */

import type { ComponentDefinition } from "../../core/types";

/**
 * Deduplicate components by name to prevent multiple entries of the same component
 * @param components List of components to deduplicate
 * @returns Deduplicated list of components
 */
export function deduplicateComponents(
  components: ComponentDefinition[]
): ComponentDefinition[] {
  // Create a Map to track processed components by name+path for O(1) lookups
  const processedComponentsMap = new Map<string, ComponentDefinition>();

  // First pass: identify the best component to keep for each unique name+path combination
  for (const component of components) {
    // Use both name and filePath to identify components uniquely
    const key = `${component.name}:${component.filePath || "unknown"}`;

    // If we've never seen this component before, add it
    if (!processedComponentsMap.has(key)) {
      processedComponentsMap.set(key, component);
    } else {
      // We already have a component with this name and path
      const existing = processedComponentsMap.get(key)!;

      // Choose the better component to keep (prefer ones with more details)
      const currentHasMoreInfo =
        (component.description && !existing.description) ||
        (component.props?.length || 0) > (existing.props?.length || 0) ||
        (component.methods?.length || 0) > (existing.methods?.length || 0);

      if (currentHasMoreInfo) {
        processedComponentsMap.set(key, component);
      }
    }
  }

  // Second pass: process child components recursively
  function processComponent(
    component: ComponentDefinition
  ): ComponentDefinition {
    // Create a deep clone of the component to avoid mutation issues
    const processedComponent = { ...component };

    // Process child components recursively and deduplicate them
    if (
      processedComponent.childComponents &&
      processedComponent.childComponents.length > 0
    ) {
      const uniqueChildren: ComponentDefinition[] = [];
      const childKeySet = new Set<string>();

      for (const child of processedComponent.childComponents) {
        // Use both name and filePath to identify children uniquely
        const childKey = `${child.name}:${child.filePath || "unknown"}`;

        // Only process this child if we haven't already seen a component with this name+path in this subtree
        if (!childKeySet.has(childKey)) {
          childKeySet.add(childKey);

          // Use the best version of this component that we've identified, or the current one if not found
          const bestComponent = processedComponentsMap.has(childKey)
            ? processedComponentsMap.get(childKey)!
            : child;

          // Process it recursively to handle its own children
          const processedChild = processComponent(bestComponent);
          uniqueChildren.push(processedChild);
        }
      }

      // Replace the children with the unique set
      processedComponent.childComponents = uniqueChildren;
    }

    return processedComponent;
  }

  // Process all components and build the final result
  const result: ComponentDefinition[] = [];
  const addedKeys = new Set<string>();

  for (const component of components) {
    const key = `${component.name}:${component.filePath || "unknown"}`;

    if (!addedKeys.has(key)) {
      // Get the best version of this component
      const bestComponent = processedComponentsMap.get(key)!;

      // Process it recursively to handle its children
      const processedComponent = processComponent(bestComponent);
      result.push(processedComponent);
      addedKeys.add(key);
    }
  }

  console.log(`Found ${components.length} components before UI deduplication`);
  console.log(`${result.length} components after UI deduplication`);

  return result;
}
